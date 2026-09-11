import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  hasServerSupabase,
  serviceClient,
  supabaseServiceRoleKey,
} from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp, isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "DELETE MY DATA";
const REQUEST_TTL_MS = 30 * 60 * 1000;
const CONFIRM_COOLDOWN_MS = 30 * 1000;
const SUPPORT_EMAIL = "matt@mattyjacks.com";

function ipHash(req: Request): string {
  const salt = process.env.SIGNUP_IP_HASH_SALT ?? "";
  const raw = salt ? `${salt}|${clientIp(req)}` : clientIp(req);
  return createHash("sha256").update(raw).digest("hex");
}

async function logRequest(
  userId: string,
  email: string | null,
  type: "export" | "delete",
  status: "requested" | "confirmed" | "completed" | "denied" | "expired",
  req: Request,
  note?: string,
) {
  try {
    await serviceClient()
      .from("privacy_requests")
      .insert({
        user_id: userId,
        email,
        type,
        status,
        ip_hash: ipHash(req),
        ...(note ? { note: note.slice(0, 500) } : {}),
        ...(status === "confirmed" ? { confirmed_at: new Date().toISOString() } : {}),
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      });
  } catch {
    // Audit logging is best-effort; never block the rights flow on it.
  }
}

// ---------------------------------------------------------------------------
// GET ?action=export — access/portability: JSON dump of the caller's own data.
// Auth + same-origin are not needed for GET shape, but auth IS required and
// tight per-account rate limits stop bulk harvesting / spam.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const action = new URL(req.url).searchParams.get("action");
  if (action !== "export") return fail("Unknown rights action.", 400);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Sign in to export your data.", 401);

  const perUser = rateLimit(`rights-export:${u.id}`, 5, 60 * 60 * 1000);
  if (!perUser.allowed) {
    return fail("Export limit reached (5 per hour). Try again later.", 429, {
      "Retry-After": String(perUser.retryAfter),
    });
  }
  const perIp = rateLimit(`rights-export-ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!perIp.allowed) {
    return fail("Too many export requests from this network. Try again later.", 429, {
      "Retry-After": String(perIp.retryAfter),
    });
  }

  async function pick(table: string, columns: string, match: Record<string, string>, limit = 200) {
    try {
      let q = supabase.from(table).select(columns).limit(limit);
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
      const { data: rows, error } = await q;
      if (error) return null;
      return rows;
    } catch {
      return null;
    }
  }

  const id = u.id;
  const [profile, settings, saves, cheatSettings, globalCheats, statEvents, friendshipsA, friendshipsB, messagesSent, messagesGot] =
    await Promise.all([
      pick("profiles", "id,email,display_name,public_handle,created_at,updated_at", { id }, 1),
      pick("account_settings", "user_id,theme,notifications,created_at,updated_at", { user_id: id }, 1),
      pick("game_saves", "id,game_slug,slot,schema_version,data,created_at,updated_at", { user_id: id }),
      pick("cheat_settings", "user_id,game_slug,enabled,created_at", { user_id: id }),
      pick("global_cheat_settings", "user_id,enabled,created_at", { user_id: id }, 1),
      pick("game_stat_events", "game_slug,active_seconds,actions,kills,deaths,created_at", { user_id: id }, 1000),
      pick("friendships", "id,requester_id,addressee_id,status,created_at", { requester_id: id }),
      pick("friendships", "id,requester_id,addressee_id,status,created_at", { addressee_id: id }),
      pick("direct_messages", "id,recipient_id,body,created_at,read_at", { sender_id: id }, 500),
      pick("direct_messages", "id,sender_id,body,created_at,read_at", { recipient_id: id }, 500),
    ]);

  const [submissions, lobbyHost, lobbyGuest, presence, queue, matchesPhone, matchesDesk, daily, refCode, refAsInviter, refAsInvitee] =
    await Promise.all([
      pick("code_submissions", "id,title,status,monetization_status,created_at,updated_at", { owner_id: id }, 100),
      // join_code / guest secrets never exported.
      pick("game_lobbies", "id,game_slug,status,max_players,created_at", { host_id: id }, 100),
      pick("game_lobbies", "id,game_slug,status,created_at", { guest_id: id }, 100),
      pick("game_presence", "id,game_slug,status,updated_at", { user_id: id }, 100),
      pick("game_match_queue", "id,game_slug,status,created_at", { user_id: id }, 1),
      pick("game_matches", "id,game_slug,result,created_at", { phone_id: id }, 100),
      pick("game_matches", "id,game_slug,result,created_at", { desktop_id: id }, 100),
      pick("daily_claims", "id,claimed_on,streak,coins,created_at", { user_id: id }, 1),
      pick("referral_codes", "code,created_at", { user_id: id }, 1),
      pick("referrals", "id,invitee_id,status,created_at", { inviter_id: id }, 200),
      pick("referrals", "id,inviter_id,status,created_at", { invitee_id: id }, 1),
    ]);

  const [clanMemberships, clanPosts, clanComments, clanReports, clansOwned, botIdentities, listings, bookings, ledger, grants] =
    await Promise.all([
      pick("clan_members", "clan_id,role,created_at", { user_id: id }),
      pick("clan_posts", "id,clan_id,title,body,image_url,status,created_at", { author_id: id }),
      pick("clan_comments", "id,post_id,body,status,created_at", { author_id: id }, 500),
      pick("clan_reports", "id,target_type,target_id,category,status,created_at", { reporter_id: id }),
      pick("clans", "id,slug,name,description,created_at", { owner_id: id }, 100),
      pick("bot_identities", "username,human_id,created_at", { user_id: id }, 10),
      // Escrow/provider internals never exported — public card only.
      pick("agent_listings", "id,name,runtime,provider_code,price_cents_per_hour,status,created_at", { owner_id: id }, 100),
      pick("rental_bookings", "id,listing_id,status,hours,created_at", { renter_id: id }, 100),
      pick("coin_ledger", "id,delta,reason,created_at", { user_id: id }, 500),
      pick("coin_grants", "id,coins,created_at", { user_id: id }, 200),
    ]);

  // Bot key secrets are NEVER exported (shown once at issue); metadata only.
  // bot_api_keys is keyed directly by user_id: id,user_id,label,prefix,
  // created_at,last_used_at,revoked. key_hash is never selected.
  let botKeys: unknown = null;  try {
    const { data: keys, error: keysError } = await supabase
      .from("bot_api_keys")
      .select("id,label,prefix,created_at,last_used_at,revoked")
      .eq("user_id", id)
      .limit(50);
    botKeys = keysError ? null : (keys ?? []);
  } catch {
    botKeys = null;
  }

  let balance: number | null = null;
  try {
    const { data: b } = await supabase.rpc("coin_balance");
    if (typeof b === "number") balance = b;
  } catch {
    balance = null;
  }

  // Family: child accounts WITHOUT secrets (password hashes and session
  // tokens are never exported — same rule as bot key secrets). Scoped to
  // this parent's kids only (the service client bypasses RLS, so scope here).
  let family: unknown = null;
  try {
    const { data: kids } = await supabase.from("kid_accounts")
      .select("id,username,discriminator,age_band,status,created_at,last_login_at")
      .eq("parent_id", id)
      .limit(10);
    const kidIds = (Array.isArray(kids) ? kids : []).map((k) => String((k as { id: string }).id));
    let controls: unknown = [], wallet: unknown = [], days: unknown = [];
    if (kidIds.length) {
      const [c, w, d] = await Promise.all([
        supabase.from("kid_controls").select("kid_id,daily_minutes,allowed_start,allowed_end,timezone,monthly_cap_coins,hard_stop,updated_at").in("kid_id", kidIds),
        supabase.from("kid_wallet_ledger").select("id,kid_id,delta,reason,created_at").in("kid_id", kidIds).limit(500),
        supabase.from("kid_play_days").select("kid_id,day,seconds").in("kid_id", kidIds).limit(365),
      ]);
      controls = c.data ?? [];
      wallet = w.data ?? [];
      days = d.data ?? [];
    }
    family = { kids: kids ?? [], controls, wallet, days };
  } catch {
    family = null;
  }

  await logRequest(id, u.email ?? null, "export", "completed", req);

  return ok({
    exportedAt: new Date().toISOString(),
    account: { id, email: u.email ?? null },
    profile,
    settings,
    games: { saves, cheatSettings, globalCheats, statEvents, queue, presence, lobbiesHosted: lobbyHost, lobbiesJoined: lobbyGuest, matchesAsPhone: matchesPhone, matchesAsDesktop: matchesDesk },
    social: { friendshipsRequested: friendshipsA, friendshipsReceived: friendshipsB, messagesSent, messagesReceived: messagesGot },
    creator: { submissions },
    clans: { memberships: clanMemberships, posts: clanPosts, comments: clanComments, reportsFiled: clanReports, clansOwned },
    bots: { identities: botIdentities, keys: botKeys },
    family,
    economy: { balance, ledger, grants, daily, referralCode: refCode, referralsAsInviter: refAsInviter, referralsAsInvitee: refAsInvitee },
    rentals: { listings, bookings },
  });
}

// ---------------------------------------------------------------------------
// POST { action: "request-delete" } — step 1: open a 30-minute deletion window.
// POST { action: "confirm-delete", requestId, confirmation } — step 2: erase.
// Only the signed-in holder can delete their OWN account. Anything else
// (family of a deceased user, authorized agents) goes through email review.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  if (!supabaseServiceRoleKey()) {
    return fail(`Deletion service is unavailable right now. Email ${SUPPORT_EMAIL} for help.`, 503);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Sign in with the account you want to delete.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");

  const service = serviceClient();

  if (action === "request-delete") {
    const perUser = rateLimit(`rights-del-req:${u.id}`, 3, 60 * 60 * 1000);
    if (!perUser.allowed) {
      return fail("Too many deletion requests. Wait an hour or email support for help.", 429, {
        "Retry-After": String(perUser.retryAfter),
      });
    }
    const perIp = rateLimit(`rights-del-req-ip:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (!perIp.allowed) {
      return fail("Too many requests from this network. Try again later.", 429, {
        "Retry-After": String(perIp.retryAfter),
      });
    }

    // Reuse an unexpired pending request instead of minting duplicates.
    const { data: existing } = await service
      .from("privacy_requests")
      .select("id,created_at,status")
      .eq("user_id", u.id)
      .eq("type", "delete")
      .in("status", ["requested", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const age = Date.now() - new Date((existing as { created_at: string }).created_at).getTime();
      if (age < REQUEST_TTL_MS) {
        const created = new Date((existing as { created_at: string }).created_at).getTime();
        return ok({
          pending: true,
          requestId: (existing as { id: string }).id,
          expiresAt: new Date(created + REQUEST_TTL_MS).toISOString(),
          cooldownSeconds: Math.max(0, Math.ceil((CONFIRM_COOLDOWN_MS - age) / 1000)),
          mustType: CONFIRM_PHRASE,
        });
      }
      await service.from("privacy_requests").update({ status: "expired" }).eq("id", (existing as { id: string }).id);
    }

    // Abuse brake: at most 3 deletion requests per 30 days per account.
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await service
      .from("privacy_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("type", "delete")
      .gte("created_at", monthAgo);
    if ((count ?? 0) >= 3) {
      return fail(`Deletion-request limit reached. Email ${SUPPORT_EMAIL} for help.`, 429);
    }

    // Warn early if shared-ownership cleanup will be needed (enforced again
    // at confirm time against fresh data).
    let sharedClanWarning: string | null = null;
    try {
      const { data: owned } = await service.from("clans").select("id,name").eq("owner_id", u.id).limit(25);
      if (owned && owned.length) {
        const { count: others } = await service
          .from("clan_members")
          .select("clan_id", { count: "exact", head: true })
          .in("clan_id", (owned as Array<{ id: string }>).map((c) => c.id))
          .neq("user_id", u.id);
        if ((others ?? 0) > 0) {
          sharedClanWarning =
            "You still own clans with other members. Delete those clans (or ask us to transfer them) before confirming, or confirmation will be refused.";
        }
      }
    } catch {
      sharedClanWarning = null;
    }

    const { data: inserted, error } = await service
      .from("privacy_requests")
      .insert({ user_id: u.id, email: u.email ?? null, type: "delete", status: "requested", ip_hash: ipHash(req) })
      .select("id,created_at")
      .single();
    if (error || !inserted) return fail("Could not open a deletion request. Try again.", 500);
    const created = new Date((inserted as { created_at: string }).created_at).getTime();

    return ok({
      pending: true,
      requestId: (inserted as { id: string }).id,
      expiresAt: new Date(created + REQUEST_TTL_MS).toISOString(),
      cooldownSeconds: Math.ceil(CONFIRM_COOLDOWN_MS / 1000),
      mustType: CONFIRM_PHRASE,
      sharedClanWarning,
    });
  }

  if (action === "confirm-delete") {
    const perUser = rateLimit(`rights-del-confirm:${u.id}`, 5, 60 * 60 * 1000);
    if (!perUser.allowed) {
      return fail("Too many confirmation attempts. Wait a while and try again.", 429, {
        "Retry-After": String(perUser.retryAfter),
      });
    }
    const requestId = String(input.requestId ?? "");
    const confirmation = String(input.confirmation ?? "");
    if (!isUuid(requestId)) return fail("Unknown deletion request.", 404);
    if (confirmation !== CONFIRM_PHRASE) return fail(`Type ${CONFIRM_PHRASE} exactly to confirm.`, 400);

    const { data: pr } = await service
      .from("privacy_requests")
      .select("id,user_id,status,created_at")
      .eq("id", requestId)
      .maybeSingle();
    const row = pr as { id: string; user_id: string; status: string; created_at: string } | null;
    if (!row || row.user_id !== u.id || (row.status !== "requested" && row.status !== "confirmed")) {
      return fail("Unknown deletion request.", 404);
    }
    const age = Date.now() - new Date(row.created_at).getTime();
    if (age > REQUEST_TTL_MS) {
      await service.from("privacy_requests").update({ status: "expired" }).eq("id", row.id);
      return fail("This deletion request expired. Open a new one to continue.", 410);
    }
    if (age < CONFIRM_COOLDOWN_MS) {
      return fail(`Wait ${Math.ceil((CONFIRM_COOLDOWN_MS - age) / 1000)} more seconds, then confirm again.`, 429);
    }

    // Blockers are checked BEFORE anything is erased. clans.owner_id is
    // the single ownership column (080000 wins; the 090000 created_by
    // variant never materializes when 080000 applied first). Ownership
    // queries are fail-closed: any lookup error refuses with guidance
    // instead of risking other users data.
    const { data: owned, error: ownedError } = await service.from("clans").select("id").eq("owner_id", u.id).limit(25);
    if (ownedError) {
      await service.from("privacy_requests").update({ status: "denied", note: "clan ownership lookup failed" }).eq("id", row.id);
      return fail(`Could not verify clan ownership. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
    }
    const ownedList = (owned as Array<{ id: string }> | null) ?? [];
    if (ownedList.length) {
      const { count: others, error: othersError } = await service
        .from("clan_members")
        .select("clan_id", { count: "exact", head: true })
        .in("clan_id", ownedList.map((cc) => cc.id))
        .neq("user_id", u.id);
      if (othersError) {
        await service.from("privacy_requests").update({ status: "denied", note: "clan membership lookup failed" }).eq("id", row.id);
        return fail(`Could not verify clan membership. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
      }
      if ((others ?? 0) > 0) {
        await service.from("privacy_requests").update({ status: "denied", note: "shared clan ownership" }).eq("id", row.id);
        return fail(
          `You own a clan with other members. Delete it first (or email ${SUPPORT_EMAIL} to transfer ownership), then request deletion again.`,
          409,
        );
      }
    }
    // Listings booked by other renters: deleting them would cascade-erase
    // other users booking rows, so refuse with guidance instead.
    const { data: myListings, error: listingsError } = await service.from("agent_listings").select("id").eq("owner_id", u.id).limit(50);
    if (listingsError) {
      await service.from("privacy_requests").update({ status: "denied", note: "listing lookup failed" }).eq("id", row.id);
      return fail(`Could not verify rental listings. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
    }
    const myListingIds = ((myListings as Array<{ id: string }> | null) ?? []).map((ll) => ll.id);
    if (myListingIds.length) {
      const { count: foreignBookings, error: bookingsError } = await service
        .from("rental_bookings")
        .select("id", { count: "exact", head: true })
        .in("listing_id", myListingIds)
        .neq("renter_id", u.id);
      if (bookingsError) {
        await service.from("privacy_requests").update({ status: "denied", note: "booking lookup failed" }).eq("id", row.id);
        return fail(`Could not verify rental bookings. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
      }
      if ((foreignBookings ?? 0) > 0) {
        await service.from("privacy_requests").update({ status: "denied", note: "foreign bookings on owned listings" }).eq("id", row.id);
        return fail(
          `One of your agent listings has bookings by other users. Clear those bookings first (or email ${SUPPORT_EMAIL}), then confirm deletion.`,
          409,
        );
      }
    }
    // Solely-owned orgs with other members cannot cascade either.
    const { data: myOrgs, error: orgsError } = await service.from("orgs").select("id").eq("owner_id", u.id).limit(25);
    if (orgsError) {
      await service.from("privacy_requests").update({ status: "denied", note: "org lookup failed" }).eq("id", row.id);
      return fail(`Could not verify organizations. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
    }
    const myOrgIds = ((myOrgs as Array<{ id: string }> | null) ?? []).map((oo) => oo.id);
    if (myOrgIds.length) {
      const { count: fellowMembers, error: membersError } = await service
        .from("org_members")
        .select("org_id", { count: "exact", head: true })
        .in("org_id", myOrgIds)
        .neq("user_id", u.id);
      if (membersError) {
        await service.from("privacy_requests").update({ status: "denied", note: "org membership lookup failed" }).eq("id", row.id);
        return fail(`Could not verify organization members. Email ${SUPPORT_EMAIL} and we will finish deletion manually.`, 503);
      }
      if ((fellowMembers ?? 0) > 0) {
        await service.from("privacy_requests").update({ status: "denied", note: "shared org ownership" }).eq("id", row.id);
        return fail(
          `You solely own an organization with other members. Transfer or delete it first (or email ${SUPPORT_EMAIL}), then confirm deletion.`,
          409,
        );
      }
    }
    try {
      const { data: active } = await service
        .from("rental_bookings")
        .select("id", { count: "exact" })
        .eq("renter_id", u.id)
        .eq("status", "active")
        .limit(1);
      if (active && (active as unknown[]).length) {
        return fail("You have an active rental booking with escrowed coins. End it first, then confirm deletion.", 409);
      }
    } catch {
      // Bookings table shape differs; fall through.
    }

    await service.from("privacy_requests").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", row.id);

    // Erase user rows (service_role bypasses RLS, including tables the
    // client itself can no longer delete, e.g. cheat-marked saves).
    // Fail-closed: every wipe reports errors; incomplete erasure refuses
    // with 500 + denied audit instead of false deleted:true.
    const wipeErrors: string[] = [];
    async function wipe(table: string, col: string) {
      try {
        const { error } = await service.from(table).delete().eq(col, u!.id);
        if (error) wipeErrors.push(`${table}:${error.code ?? error.message}`);
      } catch (err) {
        wipeErrors.push(`${table}:${String((err as Error)?.message ?? err).slice(0, 80)}`);
      }
    }
    async function wipeEither(table: string, a: string, b: string) {
      await wipe(table, a);
      await wipe(table, b);
    }

    await wipe("game_match_queue", "user_id");
    await wipeEither("game_matches", "phone_id", "desktop_id");
    await wipe("game_presence", "user_id");
    await wipe("signup_ip_credits", "user_id");
    await wipe("account_settings", "user_id");
    await wipe("global_cheat_settings", "user_id");
    await wipe("cheat_settings", "user_id");
    await wipe("game_stat_events", "user_id");
    await wipe("game_saves", "user_id");
    await wipeEither("friendships", "requester_id", "addressee_id");
    // DMs are shared rows: delete own sent copies, redact (not delete) the
    // counterpart's inbox copy so the other user's history survives.
    await wipe("direct_messages", "sender_id");
    try {
      const { error: redactErr } = await service
        .from("direct_messages")
        .update({ body: "[deleted]", read_at: new Date().toISOString() })
        .eq("recipient_id", u!.id);
      if (redactErr) wipeErrors.push(`direct_messages-redact:${redactErr.code ?? redactErr.message}`);
    } catch (err) {
      wipeErrors.push(`direct_messages-redact:${String((err as Error)?.message ?? err).slice(0, 80)}`);
    }
    await wipe("code_submissions", "owner_id");
    await wipe("daily_claims", "user_id");
    await wipe("referral_codes", "user_id");
    await wipeEither("referrals", "inviter_id", "invitee_id");
    await wipe("game_lobbies", "host_id");
    try {
      await service.from("game_lobbies").update({ guest_id: null }).eq("guest_id", u.id);
    } catch { /* best-effort */ }

    // Safety evidence is preserved but de-identified: reports stay for
    // authority review with the reporter link removed (CSAM rows especially
    // must survive under legal hold).
    try {
      await service.from("clan_reports").update({ reporter_id: null }).eq("reporter_id", u.id);
    } catch { /* best-effort */ }
    await wipe("clan_comments", "author_id");
    await wipe("clan_posts", "author_id");
    await wipe("clan_members", "user_id");
    // Clans the user solely owns go with the account (cascade clears the rest).
    // Shared clans were refused above, so this cannot strand other members.
    await wipe("clans", "owner_id");

    // Clan images: remove the user's uploads from storage + index, best-effort.
    try {
      const { data: imgs } = await service.from("clan_images").select("id,storage_path").eq("uploader_id", u.id).limit(200);
      const list = (imgs as Array<{ id: string; storage_path: string }> | null) ?? [];
      if (list.length) {
        try {
          await service.storage.from("clan-images").remove(list.map((i) => i.storage_path));
        } catch { /* best-effort */ }
        await wipe("clan_images", "uploader_id");
      }
    } catch { /* best-effort */ }

    // Bots: bot_identities is keyed by user_id (PK) and bot_api_keys too.
    // Secrets were never stored; hashes die here.
    await wipe("bot_api_keys", "user_id");
    await wipe("bot_identities", "user_id");

    await wipe("rental_bookings", "renter_id");
    await wipe("agent_listings", "owner_id");

    // Teams/enterprise memberships (orgs solely owned that cannot cascade
    // will surface below as a 409 with email guidance).
    for (const [table, col] of [
      ["org_members", "user_id"],
      ["org_invites", "email"],
      ["team_members", "user_id"],
      ["team_invites", "email"],
      ["project_members", "user_id"],
      ["room_members", "user_id"],
      ["room_messages", "sender_id"],
      ["team_api_keys", "created_by"],
      ["org_invites", "created_by"],
      ["team_invites", "created_by"],
    ] as Array<[string, string]>) {
      try {
        if (col === "email" && u.email) await service.from(table).delete().eq(col, u.email);
        else if (col !== "email") await service.from(table).delete().eq(col, u.id);
      } catch { /* best-effort */ }
    }

    // Money records for this user, then the profile row itself.
    await wipe("coin_ledger", "user_id");
    await wipe("coin_grants", "user_id");
    try {
      const { error: profErr } = await service.from("profiles").delete().eq("id", u.id);
      if (profErr) wipeErrors.push(`profiles:${profErr.code ?? profErr.message}`);
    } catch (err) {
      wipeErrors.push(`profiles:${String((err as Error)?.message ?? err).slice(0, 80)}`);
    }

    if (wipeErrors.length) {
      await service
        .from("privacy_requests")
        .update({ status: "denied", note: `incomplete erasure: ${wipeErrors.slice(0, 5).join("; ").slice(0, 400)}` })
        .eq("id", row.id);
      return fail("Deletion incomplete — some records could not be erased. Try again or email support.", 500);
    }

    const { error: adminError } = await service.auth.admin.deleteUser(u.id);
    if (adminError) {
      await service
        .from("privacy_requests")
        .update({ status: "denied", note: `auth delete failed: ${String(adminError.message).slice(0, 200)}` })
        .eq("id", row.id);
      // Most common cause: solely-owned orgs/clans with RESTRICT guards.
      return fail(
        `Automatic deletion hit a shared-ownership record. Email ${SUPPORT_EMAIL} from your account email and we will finish it manually.`,
        409,
      );
    }

    await service
      .from("privacy_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", row.id);

    try {
      await supabase.auth.signOut();
    } catch {
      // Client clears session cookies regardless.
    }
    return ok({ deleted: true });
  }

  return fail("Unknown rights action.", 400);
}
