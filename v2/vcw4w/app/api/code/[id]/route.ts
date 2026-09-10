import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if ((body as Record<string, unknown> | null)?.submit !== true) return fail("Invalid request.", 400);
  const { error } = await supabase
    .from("code_submissions")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("owner_id", u.id)
    .eq("status", "draft");
  if (error) return fail("Unable to submit.", 500);
  return ok({});
}
