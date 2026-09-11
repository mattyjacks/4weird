import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, supabaseUrl } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { meterLunaCheck, meterTransfer } from "@/lib/clan-meter";
import { logValleynetAction, valleynetCheck } from "@/lib/valleynet";
import type { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function isChannelSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,30}$/.test(s) ? s : "";
}

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
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
    return /\/storage\/v1\/object\/(public\/)?clan-images\//.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

type ChanRow = {
  id: string;
  clan_id: string;
  slug: string;
  name: string;
  topic: string;
  kind: string;
  readonly: boolean;
};

async function resolveChannel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  channel: string,
): Promise<{ error: NextResponse | null; clanId: string; chan: ChanRow | null }> {
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return { error: fail("Clan not found.", 404), clanId: "", chan: null };
  const chanSlug = isChannelSlug(channel);
  const byId = isUuid(channel);
  let query = supabase
    .from("clan_channels")
    .select("id,clan_id,slug,name,topic,kind,readonly,position")
    .eq("clan_id", clanId);
  query = chanSlug ? query.eq("slug", chanSlug) : byId ? query.eq("id", byId) : query.eq("slug", "__never__");
  const { data: chan } = await query.maybeSingle();
  if (!chan) return { error: fail("Channel not found.", 404), clanId, chan: null };
  return { error: null, clanId, chan: chan as ChanRow };
}

// GET /api/clans/[slug]/channels/[channel]?limit=&before=; public message
// history (visible only, newest last for chat rendering, pins first).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; channel: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clan-msgs:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { slug: rawSlug, channel: rawChan } = await params;
  const slug = isClanSlug(rawSlug);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { clanId, chan, error } = await resolveChannel(supabase, slug, rawChan);
  if (error) return error;
  if (!chan) return fail("Channel not found.", 404);
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 50));
  const before = url.searchParams.get("before") ?? "";
  let query = supabase
    .from("clan_messages")
    .select("id,author_id,body,image_url,reply_to,status,pinned,created_at,edited_at")
    .eq("channel_id", chan.id)
    .eq("status", "visible")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  const { data: messages, error: msgError } = await query;
  if (msgError) return fail("Unable to load messages.", 500);
  const rows = ((messages ?? []) as { id: string }[]).reverse();
  const ids = rows.map((m) => m.id);
  let reactions: unknown[] = [];
  if (ids.length) {
    const { data: reacts } = await supabase
      .from("clan_message_reactions")
      .select("message_id,user_id,emoji")
      .in("message_id", ids)
      .limit(500);
    reactions = reacts ?? [];
  }
  const payload = { channel: chan, messages: rows, reactions };
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    void meterTransfer(supabase, clanId, bytes, "api");
  } catch {
    // Metering never breaks a read.
  }
  return ok(payload);
}

// POST /api/clans/[slug]/channels/[channel] {body, image_url?, reply_to?} -
// member-only chat send. Valley Net screens every message (Luna metered),
// delinquent wallets refuse, and the message pays the standard server-cost fee.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; channel: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: rawSlug, channel: rawChan } = await params;
  const slug = isClanSlug(rawSlug);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-msg:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const text = String(input.body ?? "").trim().slice(0, 2000);
  const imageUrl = String(input.image_url ?? "").trim().slice(0, 2000);
  const replyTo = isUuid(input.reply_to);
  if (!text) return fail("Message body required.", 400);
  if (imageUrl && !isOwnClanImageUrl(imageUrl)) {
    return fail("image_url must come from /api/clans/upload.", 400);
  }
  const { clanId, chan, error } = await resolveChannel(supabase, slug, rawChan);
  if (error) return error;
  if (!chan) return fail("Channel not found.", 404);
  // Read-only channels (e.g. #announcements) are mod-only. Checked BEFORE any
  // fee so a refused send never charges the server-cost fee.
  if (chan.readonly) {
    const { data: isMod } = await supabase.rpc("clan_is_moderator", {
      p_clan_id: clanId,
      p_user_id: u.id,
    });
    if (!isMod) return fail("Only owners/mods can post here.", 403);
  }

  const valley = await valleynetCheck(text);
  void meterLunaCheck(supabase, clanId, 1);
  if (valley.verdict === "block") {
    await logValleynetAction({
      clanId,
      targetType: "comment",
      verdict: "block",
      reasons: valley.reasons,
      actorId: u.id,
    });
    return fail("Valley Net blocked this message (spam shield).", 403);
  }
  const status = valley.verdict === "quarantine" ? "pending" : "visible";
  if (status === "pending") {
    await logValleynetAction({
      clanId,
      targetType: "comment",
      verdict: "quarantine",
      reasons: valley.reasons.length ? valley.reasons : ["luna-review"],
      actorId: u.id,
    });
  }

  const feeBytes = new TextEncoder().encode(text).length;
  const { error: feeError } = await supabase.rpc("meter_clan_posting_fee", {
    p_clan_id: clanId,
    p_kind: "message",
    p_bytes: feeBytes,
    p_has_image: Boolean(imageUrl),
  });
  if (feeError) {
    const msg = String(feeError.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/read-only/i.test(msg)) return fail("Read-only channel.", 403);
    if (/upkeep delinquent/i.test(msg))
      return fail("This clan's upkeep is delinquent; chat is paused until it is funded.", 402);
    if (/insufficient balance/i.test(msg))
      return fail("Insufficient Vibe Coins for the server-cost fee.", 402);
    return fail("Unable to charge the server-cost fee.", 500);
  }

  const { data: rpcData, error: msgError } = await supabase.rpc("post_clan_message", {
    p_channel_id: chan.id,
    p_body: text,
    p_image_url: imageUrl || null,
    p_reply_to: replyTo || null,
    p_status: status,
  });
  if (msgError) {
    const msg = String(msgError.message ?? "");
    if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
    if (/read-only/i.test(msg)) return fail("Only owners/mods can post here.", 403);
    if (/reply/i.test(msg)) return fail("Reply target not found.", 400);
    if (/invalid/i.test(msg)) return fail("Invalid message.", 400);
    return fail("Unable to send message.", 500);
  }
  try {
    await supabase.rpc("award_clan_xp", { p_clan_id: clanId, p_reason: "comment", p_xp: 3 });
  } catch {
    // XP is garnish, never a send failure.
  }
  return ok({ message: rpcData }, 201);
}
