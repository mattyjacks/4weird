import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp } from "@/lib/validate";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit } from "@/lib/rate-limit";
import { isClanType } from "@/lib/clan-types";


function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

// GET /api/clans/[slug]/economy; public wallet/upkeep/ledger/channels view,
// plus Clan Supporter Status (exact lifetime totals + tiers), Total Clan
// Support, and the tribute/commons status. Supporter + tribute RPCs are
// best-effort here (pre-migration DBs return the legacy economy shape).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase
    .from("clans")
    .select("id,slug,name,clan_type,upkeep_status,upkeep_grace_until")
    .eq("slug", slug)
    .maybeSingle();
  const clanRow = clan as { id?: string } | null;
  if (!clanRow?.id) return fail("Clan not found.", 404);
  const [{ data: wallet }, { data: ledger }, { data: channels }, { data: rate }] = await Promise.all([
    supabase.from("clan_wallets").select("balance,updated_at").eq("clan_id", clanRow.id).maybeSingle(),
    supabase
      .from("clan_cost_ledger")
      .select("kind,qty,gross,cut,provider,note,created_at")
      .eq("clan_id", clanRow.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("clan_monetization")
      .select("id,kind,label,target_url,active")
      .eq("clan_id", clanRow.id)
      .limit(25),
    supabase.rpc("clan_minute_rate", { p_clan_id: clanRow.id }),
  ]);
  let supporters: unknown = null;
  let tribute: unknown = null;
  try {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.rpc("clan_supporter_status", { p_clan: clanRow.id }),
      supabase.rpc("clan_tribute_status", { p_clan: clanRow.id }),
    ]);
    supporters = s ?? null;
    tribute = t ?? null;
  } catch {
    // Pre-migration: supporters + tribute stay null, economy still renders.
  }
  return ok({ clan, wallet: wallet ?? { balance: 0 }, ledger: ledger ?? [], channels: channels ?? [], rate: rate ?? null, supporters, tribute });
}

// POST /api/clans/[slug]/economy; owner + member + public revenue actions.
// { action: "fund", coins }; owner moves personal coins into the wallet.
// { action: "donate", coins } - ANY member chips in for upkeep (1:1, no cut).
// { action: "channel", kind, label, target_url? }; owner adds a channel.
// { action: "type", clan_type }; owner switches hclan/sclan/bclan.
// { action: "ad-view", channel_id }; signed-in callers only (the RPC revoked
// anon in the security audit), IP-throttled + per-account hourly cap, credits 0.01.
// { action: "affiliate-click", channel_id }; same guards, credits 0.05.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);

  if (action === "ad-view" || action === "affiliate-click") {
    const channelId = isUuid(input.channel_id);
    if (!channelId) return fail("Invalid channel.", 400);
    // Revenue mints clan-wallet coins, so callers must be signed in: the
    // credit_clan_channel_revenue RPC revoked anon in the security audit
    // (authenticated-only grant), and anonymous calls died there with a 500.
    // Fail fast with an honest 401 instead of a money-path round trip.
    const { data: revAuth } = await supabase.auth.getUser();
    const revUser = revAuth?.user;
    if (!revUser) return fail("Login required.", 401);
    const ip = clientIp(req) || "unknown";
    const throttle = rateLimit(`clan-rev:${channelId}:${ip}`, action === "ad-view" ? 10 : 3, 3_600_000);
    if (!throttle.allowed) return fail("Too many requests.", 429);
    // Distributed shield: revenue credits mint value, so cap them per account
    // across all instances (a single account rotating IPs must not farm the
    // per-IP throttle into an open mint; the RPC stays the atomic authority).
    const revDist = await globalBucket(acctBucketKey("clan-rev-hour", revUser.id), 60, 3600);
    if (revDist && !revDist.allowed) {
      return fail("Too many requests. Try again shortly.", 429, throttleHeaders(revDist.retryAfter));
    }
    const { data: rpcData, error } = await supabase.rpc("credit_clan_channel_revenue", {
      p_channel_id: channelId,
      p_event: action === "ad-view" ? "view" : "click",
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not found|inactive|not payable|invalid/i.test(msg)) return fail("Channel not payable.", 400);
      return fail("Unable to credit revenue.", 500);
    }
    return ok({ credited: rpcData });
  }

  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-econ:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  if (action === "fund") {
    const coins = Math.round(Number(input.coins) * 100) / 100;
    if (!Number.isFinite(coins) || coins < 0.01 || coins > 100000) {
      return fail("Amount must be 0.01..100000 coins.", 400);
    }
    const { data: rpcData, error } = await supabase.rpc("fund_clan_wallet", {
      p_clan_id: clanId,
      p_coins: coins,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the owner/i.test(msg)) return fail("Only the clan owner can fund the wallet.", 403);
      if (/insufficient balance/i.test(msg)) return fail("Insufficient Vibe Coins.", 402);
      if (/amount|invalid|login/i.test(msg)) return fail("Invalid funding amount.", 400);
      return fail("Unable to fund wallet.", 500);
    }
    return ok({ funded: rpcData });
  }

  if (action === "donate") {
    const coins = Math.round(Number(input.coins) * 100) / 100;
    if (!Number.isFinite(coins) || coins < 0.01 || coins > 100000) {
      return fail("Amount must be 0.01..100000 coins.", 400);
    }
    const { data: rpcData, error } = await supabase.rpc("donate_clan_upkeep", {
      p_clan_id: clanId,
      p_coins: coins,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/join the clan/i.test(msg)) return fail("Join the clan to donate.", 403);
      if (/insufficient balance/i.test(msg)) return fail("Insufficient Vibe Coins.", 402);
      if (/amount|invalid|login/i.test(msg)) return fail("Invalid donation amount.", 400);
      return fail("Unable to donate.", 500);
    }
    return ok({ donated: rpcData });
  }

  if (action === "channel") {
    const kind = String(input.kind ?? "");
    if (!["house-ad", "affiliate", "sponsor"].includes(kind)) {
      return fail("Invalid kind (house-ad, affiliate, sponsor).", 400);
    }
    const label = String(input.label ?? "").trim().slice(0, 120);
    const targetUrl = String(input.target_url ?? "").trim().slice(0, 2048);
    if (!label) return fail("Label required.", 400);
    if (targetUrl && !targetUrl.startsWith("https://")) {
      return fail("target_url must be https.", 400);
    }
    const { data: rpcData, error } = await supabase.rpc("add_clan_channel", {
      p_clan_id: clanId,
      p_kind: kind,
      p_label: label,
      p_target_url: targetUrl,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the owner/i.test(msg)) return fail("Only the clan owner can add channels.", 403);
      if (/invalid|label|url/i.test(msg)) return fail("Invalid channel.", 400);
      return fail("Unable to add channel.", 500);
    }
    return ok({ channel: rpcData }, 201);
  }

  if (action === "type") {
    const clanType = isClanType(input.clan_type);
    if (!clanType) return fail("Invalid clan type (hclan, sclan, bclan).", 400);
    // Leaving hclan dissolves the human-only guarantee: require explicit
    // confirmation and refuse silent downgrades.
    if (clanType !== "hclan" && String(input.confirmLeaveHclan ?? "") !== "yes") {
      return fail("Leaving hclan requires { confirmLeaveHclan: 'yes' }; members joined a human-only clan.", 400);
    }
    const { error } = await supabase.rpc("set_clan_type", { p_clan_id: clanId, p_clan_type: clanType });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the owner/i.test(msg)) return fail("Only the clan owner can change the type.", 403);
      if (/invalid/i.test(msg)) return fail("Invalid clan type.", 400);
      return fail("Unable to change type.", 500);
    }
    return ok({ clan_type: clanType });
  }

  return fail("Invalid action (fund, donate, channel, type, ad-view, affiliate-click).", 400);
}
