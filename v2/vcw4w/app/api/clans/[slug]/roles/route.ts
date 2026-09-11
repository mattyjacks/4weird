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

// GET /api/clans/[slug]/roles; public role catalog + assignments.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clan-roles:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const [{ data: roles }, { data: assignments }, { data: members }] = await Promise.all([
    supabase.from("clan_roles").select("id,name,color,position").eq("clan_id", clanId).order("position", { ascending: false }).limit(50),
    supabase.from("clan_member_roles").select("user_id,role_id").eq("clan_id", clanId).limit(500),
    supabase.from("clan_members").select("user_id,role").eq("clan_id", clanId).limit(200),
  ]);
  return ok({ roles: roles ?? [], assignments: assignments ?? [], members: members ?? [] });
}

// POST /api/clans/[slug]/roles; one action per call (owner/mod gated in RPCs):
// { action: "create", name, color? }; new custom role.
// { action: "assign", user_id, role_id }; grant a custom role to a member.
// { action: "member-role", user_id, role: "mod"|"member" }; owner-only
// promote/demote the built-in member role.
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
  const throttle = rateLimit(`clan-role:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);

  if (action === "create") {
    const name = String(input.name ?? "").trim().slice(0, 24);
    const color = String(input.color ?? "#22d3ee").trim();
    if (!name) return fail("Role name required.", 400);
    const { data: rpcData, error } = await supabase.rpc("create_clan_role", {
      p_clan_id: clanId,
      p_name: name,
      p_color: color,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not a moderator/i.test(msg)) return fail("Only owners/mods can create roles.", 403);
      if (/exists/i.test(msg)) return fail("Role exists.", 409);
      return fail("Unable to create role.", 500);
    }
    return ok({ role: rpcData }, 201);
  }

  if (action === "assign") {
    const userId = asUuid(input.user_id);
    const roleId = asUuid(input.role_id);
    if (!userId || !roleId) return fail("user_id + role_id required.", 400);
    const { error } = await supabase.rpc("assign_clan_role", {
      p_clan_id: clanId,
      p_user_id: userId,
      p_role_id: roleId,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not a moderator/i.test(msg)) return fail("Only owners/mods can assign roles.", 403);
      if (/not a member|not found/i.test(msg)) return fail("Member or role not found.", 404);
      return fail("Unable to assign role.", 500);
    }
    return ok({ assigned: true });
  }

  if (action === "member-role") {
    const userId = asUuid(input.user_id);
    const role = String(input.role ?? "").toLowerCase();
    if (!userId || !["mod", "member"].includes(role)) {
      return fail("user_id + role (mod|member) required.", 400);
    }
    const { error } = await supabase.rpc("set_clan_member_role", {
      p_clan_id: clanId,
      p_user_id: userId,
      p_role: role,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the owner/i.test(msg)) return fail("Only the clan owner can promote/demote.", 403);
      if (/not a member/i.test(msg)) return fail("Member not found.", 404);
      return fail("Unable to change role.", 500);
    }
    return ok({ role });
  }

  return fail("Invalid action (create, assign, member-role).", 400);
}
