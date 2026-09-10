import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid lobby.", 400);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const code = String(body.join_code ?? "").trim().toUpperCase();
  const { data: rpcData, error } = await supabase.rpc("join_lobby", {
    p_lobby: id,
    p_code: code || null,
  });
  if (error) return fail("Lobby unavailable or invite code is invalid.", 403);
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | null;
  return ok({ ...(row ?? {}) });
}
