import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clientIp } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isClanType } from "@/lib/clan-types";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// GET /api/clans?type=hclan|sclan|bclan; public list of clans.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clans-list:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const type = isClanType(new URL(req.url).searchParams.get("type"));
  const supabase = await createClient();
  let query = supabase
    .from("clans")
    .select("id,slug,name,description,owner_id,created_at,clan_type,upkeep_status")
    .order("created_at", { ascending: false })
    .limit(100);
  if (type) query = query.eq("clan_type", type);
  const { data, error } = await query;
  if (error) return fail("Unable to load clans.", 500);
  return ok({ clans: data ?? [] });
}

// POST /api/clans; create a clan (auth, via create_clan RPC).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-create:${u.id}`, 5, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const slug = isClanSlug(input.slug);
  const name = String(input.name ?? "").trim().slice(0, 60);
  const description = String(input.description ?? "").trim().slice(0, 500);
  const clanType = isClanType(input.clan_type) || "sclan";
  void clientIp(req);
  if (!slug || name.length < 2) return fail("Invalid clan (slug a-z0-9-, name 2-60 chars).", 400);
  const { data: rpcData, error } = await supabase.rpc("create_clan", {
    p_slug: slug,
    p_name: name,
    p_description: description,
    p_clan_type: clanType,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/slug taken/i.test(msg)) return fail("Slug taken.", 409);
    if (/clan type/i.test(msg)) return fail("Invalid clan type (hclan, sclan, bclan).", 400);
    if (/invalid|login/i.test(msg)) return fail("Invalid clan.", 400);
    return fail("Unable to create clan.", 500);
  }
  return ok({ clan: rpcData }, 201);
}
