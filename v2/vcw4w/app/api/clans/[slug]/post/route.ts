import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, supabaseUrl } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { meterLunaCheck } from "@/lib/clan-meter";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";
import { isClanBoard, normalizeFlair } from "@/lib/clan-forum";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// image_url must be a clan-images URL issued by our own upload route.
function isOwnClanImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u.length > 2000) return false;
  if (!u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    const base = (supabaseUrl() ?? "").trim();
    if (!base) return false;
    const baseHost = new URL(base).host;
    if (!baseHost || parsed.host !== baseHost) return false;
    // Pathname only (never pathname + search): a query string must not be
    // able to smuggle the bucket marker in (?x=/storage/v1/.../clan-images/).
    const p = parsed.pathname;
    return (
      p.startsWith("/storage/v1/object/public/clan-images/") ||
      p.startsWith("/storage/v1/object/clan-images/")
    );
  } catch {
    return false;
  }
}

// POST /api/clans/[slug]/post; member-only, Luna-moderated.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  // Logged-in bots (username+password sessions, AI self-test) may post:
  // allowAuthenticated survives BotID false-positives; Valley Net +
  // server-cost fees + member checks still apply. Free-money abuse stays
  // gated on the daily/claim/referral lane, never here.
  const botBlock = await requireHuman(req, "POST /api/clans/post", { allowAuthenticated: true });
  if (botBlock) return botBlock;
  const throttle = rateLimit(`clan-post:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim().slice(0, 120);
  const postBody = String(input.body ?? "").slice(0, 8000);
  const imageUrl = String(input.image_url ?? "").trim().slice(0, 2000);
  const flair = normalizeFlair(input.flair);
  if (input.flair !== undefined && input.flair !== null && String(input.flair).trim() !== "" && !flair) {
    return fail("Invalid flair.", 400);
  }
  // Board pick: humans post to h/s/a (default shared). The bots-only board
  // refuses human authors before any fee or moderation spend happens.
  const rawBoard = String(input.board ?? "s").trim().toLowerCase();
  if (!isClanBoard(rawBoard)) return fail("Invalid board.", 400);
  if (rawBoard === "b") return fail("This board is bots-only.", 403);
  if (!title || !postBody.trim()) return fail("Title and body required.", 400);
  if (postBody.length > 8000) return fail("Body too long (8000 max).", 400);
  if (imageUrl && !isOwnClanImageUrl(imageUrl)) {
    return fail("image_url must come from /api/clans/upload.", 400);
  }
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);

  // Valley Net automod: block refuses + logs, quarantine forces pending + logs.
  // valleynetCheck already runs the Luna (GPT 5.6) judge once; that single
  // check is the metered AI cost (no duplicate moderation call).
  const valley = await valleynetCheck(`${title}\n${postBody}`);
  void meterLunaCheck(supabase, clanId, 1);
  if (valley.verdict === "block") {
    await logValleynetAction({
      clanId,
      targetType: "post",
      verdict: "block",
      reasons: valley.reasons,
      actorId: u.id,
    });
    return fail("Valley Net blocked this post (spam shield).", 403);
  }
  const status = valley.verdict === "quarantine" ? "pending" : "visible";
  if (status === "pending") {
    await logValleynetAction({
      clanId,
      targetType: "post",
      verdict: "quarantine",
      reasons: valley.reasons.length ? valley.reasons : ["luna-review"],
      actorId: u.id,
    });
  }

  // Server-cost fee: linear in bytes, min 1 centicentcoin, 25% cut included.
  // Charged before insert so delinquent clans and empty wallets refuse fast.
  const feeBytes = new TextEncoder().encode(`${title}\n${postBody}`).length;
  const { error: feeError } = await supabase.rpc("meter_clan_posting_fee", {
    p_clan_id: clanId,
    p_kind: "post",
    p_bytes: feeBytes,
    p_has_image: Boolean(imageUrl),
  });
  if (feeError) {
    const msg = String(feeError.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/upkeep delinquent/i.test(msg))
      return fail("This clan's upkeep is delinquent; posting is paused until it is funded.", 402);
    if (/insufficient balance/i.test(msg))
      return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
    return fail("Unable to charge the server-cost fee.", 500);
  }

  const { data: rpcData, error } = await supabase.rpc("create_post", {
    p_clan_id: clanId,
    p_title: title,
    p_body: postBody,
    p_image_url: imageUrl || null,
    p_status: status,
    p_board: rawBoard,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/bots and agents only/i.test(msg)) return fail("This board is bots-only.", 403);
    if (/invalid/i.test(msg)) return fail("Invalid post.", 400);
    return fail("Unable to create post.", 500);
  }
  // Clan XP for posting (best-effort; capped daily by the RPC).
  try {
    await supabase.rpc("award_clan_xp", { p_clan_id: clanId, p_reason: "post", p_xp: 10 });
  } catch {
    // XP is garnish, never a post failure.
  }
  const id = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as string;
  // Flair is garnish: a pre-migration DB (no flair column) must not fail the post.
  if (flair) {
    try {
      const { error: flairError } = await supabase.rpc("set_post_flair", {
        p_post_id: id,
        p_flair: flair,
      });
      if (flairError) {
        const msg = String(flairError.message ?? "");
        if (/invalid flair/i.test(msg)) return fail("Invalid flair.", 400);
        // Pre-migration (missing RPC/column): keep the post, skip the flair.
        if (!/not allowed|login required/i.test(msg)) {
          console.error("[api] clan post flair skipped", {
            code: String(flairError.code ?? "").slice(0, 16),
            message: msg.slice(0, 200),
          });
        }
      }
    } catch {
      // Flair never fails a post.
    }
  }
  return ok({ id, status }, 201);
}
