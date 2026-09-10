import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{2,40}$/.test(s) ? s : "";
}

// GET /api/orgs — orgs I belong to (RLS already scopes to member/public).
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: orgs, error } = await supabase
    .from("orgs")
    .select("id,slug,name,visibility,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return fail("Unable to load orgs.", 500);
  return ok({ orgs: orgs ?? [] });
}

// POST /api/orgs — create an org (caller becomes owner via create_org RPC).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`org-create:${u.id}`, 5, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const slug = isSlug(input.slug);
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!slug || name.length < 2) return fail("Invalid org (slug a-z0-9-, name 2-80).", 400);
  const { data: org, error } = await supabase.rpc("create_org", { p_slug: slug, p_name: name });
  if (error) {
    if (/slug taken/i.test(error.message)) return fail("Slug taken.", 409);
    return fail("Unable to create org.", 500);
  }
  return ok({ org }, 201);
}
