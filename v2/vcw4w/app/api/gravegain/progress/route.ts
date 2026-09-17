import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";

export async function GET() {
  if (!hasServerSupabase()) return ok({ rows: [], signedIn: false });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return ok({ rows: [], signedIn: false });
  const { data: rows, error } = await supabase.from("gravegain_progress").select("kind,item_id,count").eq("user_id", data.user.id);
  if (error) return ok({ rows: [], signedIn: true, unavailable: true });
  return ok({ rows: rows ?? [], signedIn: true });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  if (!hasServerSupabase()) return fail("Sign in to sync progress across games.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Sign in to sync progress across games.", 401);
  const body = await req.json().catch(() => null) as { kind?: unknown; item_id?: unknown } | null;
  if (!body || !["lore", "mission"].includes(String(body.kind)) || typeof body.item_id !== "string" || !/^[a-z0-9-]{1,100}$/.test(body.item_id)) return fail("Invalid progress item.", 400);
  const { data: count, error } = await supabase.rpc("collect_gravegain_progress", { p_kind: body.kind, p_item_id: body.item_id });
  if (error) return fail("Progress sync is temporarily unavailable.", 503);
  return ok({ count });
}
