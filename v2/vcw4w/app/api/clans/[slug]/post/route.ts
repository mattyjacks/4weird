import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, supabaseUrl } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// image_url must be a clan-images URL issued by our own upload route.
function isOwnClanImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u.length > 2000) return false;
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  if (!u.includes("clan-images")) return false;
  try {
    const parsed = new URL(u);
    const base = (supabaseUrl() ?? "").trim();
    if (base) {
      try {
        if (parsed.host === new URL(base).host) return true;
      } catch {
        return false;
      }
    }
    // Fallback: same-origin relative Supabase storage path containing bucket.
    return /\/storage\/v1\/object\/(public\/)?clan-images\//.test(u);
  } catch {
    return false;
  }
}

// POST /api/clans/[slug]/post — member-only, Luna-moderated.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
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
  if (!title || !postBody.trim()) return fail("Title and body required.", 400);
  if (postBody.length > 8000) return fail("Body too long (8000 max).", 400);
  if (imageUrl && !isOwnClanImageUrl(imageUrl)) {
    return fail("image_url must come from /api/clans/upload.", 400);
  }
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);

  // Valley Net automod: block refuses + logs, quarantine forces pending + logs.
  const valley = await valleynetCheck(`${title}\n${postBody}`);
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
  const mod = await moderateText(`${title}\n${postBody}`);
  const status = valley.verdict === "quarantine" || !mod.allowed || mod.heuristicHit ? "pending" : "visible";
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
      return fail("This clan's upkeep is delinquent — posting is paused until it is funded.", 402);
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
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
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
  return ok({ id, status }, 201);
}
