import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function asUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

// GET /api/clans/[slug]/events; public upcoming events.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clan-events:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { data: events } = await supabase
    .from("clan_events")
    .select("id,channel_id,title,description,starts_at,created_at")
    .eq("clan_id", clanId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);
  return ok({ events: events ?? [] });
}

// POST /api/clans/[slug]/events {title, description?, starts_at, channel_id?} -
// owner/mod only. starts_at must be a future ISO timestamp.
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
  const throttle = rateLimit(`clan-event:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim().slice(0, 120);
  const description = String(input.description ?? "").trim().slice(0, 1000);
  const startsAt = String(input.starts_at ?? "");
  const channelId = asUuid(input.channel_id);
  if (!title) return fail("Title required.", 400);
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
    return fail("starts_at must be a future ISO timestamp.", 400);
  }
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { data: rpcData, error } = await supabase.rpc("create_clan_event", {
    p_clan_id: clanId,
    p_title: title,
    p_description: description,
    p_starts_at: new Date(startsAt).toISOString(),
    p_channel_id: channelId || null,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/not a moderator/i.test(msg)) return fail("Only owners/mods can schedule events.", 403);
    if (/future/i.test(msg)) return fail("starts_at must be in the future.", 400);
    return fail("Unable to schedule event.", 500);
  }
  return ok({ event: rpcData }, 201);
}
