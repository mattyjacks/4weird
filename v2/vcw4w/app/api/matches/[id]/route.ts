import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  const { data: match, error } = await supabase
    .from("game_matches")
    .select("id,phone_id,desktop_id,phone_state,desktop_state,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !match) return fail("Match not found.", 404);
  return ok({ match });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const state = (body as Record<string, unknown> | null)?.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) return fail("Invalid state.", 400);
  const allowed = new Set(["x", "y", "score", "alive"]);
  const clean: Record<string, number | boolean> = {};
  for (const k of Object.keys(state as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    const v = (state as Record<string, unknown>)[k];
    if (k === "alive" && typeof v === "boolean") {
      clean[k] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      clean[k] = Math.max(-1000, Math.min(2000, v));
    }
  }
  const { data: rpcData, error } = await supabase.rpc("update_match_state", {
    p_match: id,
    p_state: clean,
  });
  if (error || !rpcData) return fail("Match update denied.", 403);
  return ok({});
}
