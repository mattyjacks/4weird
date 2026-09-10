import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// GET /api/clans/[slug] — public clan + visible posts.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan, error } = await supabase
    .from("clans")
    .select("id,slug,name,description,owner_id,created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !clan) return fail("Clan not found.", 404);
  const row = clan as { id: string } & Record<string, unknown>;
  const { data: posts } = await supabase
    .from("clan_posts")
    .select("id,clan_id,author_id,title,body,image_url,created_at")
    .eq("clan_id", row.id)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: members } = await supabase
    .from("clan_members")
    .select("user_id,role")
    .eq("clan_id", row.id)
    .limit(200);
  return ok({ clan, posts: posts ?? [], memberCount: (members ?? []).length });
}

// POST /api/clans/[slug] with { action: "join" } — join the clan (auth).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-join:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { error } = await supabase.rpc("join_clan", { p_clan_id: clanId });
  if (error) return fail("Unable to join clan.", 500);
  return ok({ joined: true });
}
