import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const enabled = (body as Record<string, unknown> | null)?.enabled;
  if (typeof enabled !== "boolean") return fail("Invalid request.", 400);
  const { data: rpcData, error } = await supabase.rpc("set_creator_monetization", {
    p_submission: id,
    p_enabled: enabled,
  });
  if (error || !rpcData) return fail("Only approved projects can enter monetization setup.", 403);
  return ok({ status: enabled ? "ready" : "not_ready" });
}
