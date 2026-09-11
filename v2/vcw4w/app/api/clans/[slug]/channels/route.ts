import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function isChannelSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,30}$/.test(s) ? s : "";
}

// GET /api/clans/[slug]/channels; public channel list (+ member roles for
// the sidebar, message counts, minute rate, upkeep state).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clan-channels:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const [
    { data: channels },
    { data: members },
    { data: roles },
    { data: memberRoles },
    { data: events },
    { data: rate },
  ] = await Promise.all([
    supabase
      .from("clan_channels")
      .select("id,slug,name,topic,kind,position,readonly,created_at")
      .eq("clan_id", clanId)
      .order("position", { ascending: true })
      .limit(50),
    supabase.from("clan_members").select("user_id,role,joined_at").eq("clan_id", clanId).limit(200),
    supabase.from("clan_roles").select("id,name,color,position").eq("clan_id", clanId).order("position", { ascending: false }).limit(50),
    supabase.from("clan_member_roles").select("user_id,role_id").eq("clan_id", clanId).limit(500),
    supabase
      .from("clan_events")
      .select("id,channel_id,title,description,starts_at,created_at")
      .eq("clan_id", clanId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20),
    supabase.rpc("clan_minute_rate", { p_clan_id: clanId }),
  ]);
  return ok({
    channels: channels ?? [],
    members: members ?? [],
    roles: roles ?? [],
    memberRoles: memberRoles ?? [],
    events: events ?? [],
    rate: rate ?? null,
  });
}

// POST /api/clans/[slug]/channels {slug, name, topic?, kind?}; owner/mod only.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-chan-create:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const channelSlug = isChannelSlug(input.slug ?? input.name);
  const name = String(input.name ?? "").trim().slice(0, 40);
  const topic = String(input.topic ?? "").trim().slice(0, 200);
  const kind = String(input.kind ?? "chat");
  if (!channelSlug || !name) return fail("Channel slug + name required.", 400);
  if (!["chat", "forum", "announce", "events", "media"].includes(kind)) {
    return fail("Invalid kind (chat, forum, announce, events, media).", 400);
  }
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { data: rpcData, error } = await supabase.rpc("create_clan_channel", {
    p_clan_id: clanId,
    p_slug: channelSlug,
    p_name: name,
    p_topic: topic,
    p_kind: kind,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/not a moderator/i.test(msg)) return fail("Only owners/mods can create channels.", 403);
    if (/taken/i.test(msg)) return fail("Channel slug taken.", 409);
    if (/invalid|required/i.test(msg)) return fail("Invalid channel.", 400);
    return fail("Unable to create channel.", 500);
  }
  return ok({ channel: rpcData }, 201);
}
