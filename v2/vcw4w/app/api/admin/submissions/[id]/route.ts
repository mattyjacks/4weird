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
  const role = (u.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return fail("Admin access required.", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const status = String((body as Record<string, unknown> | null)?.status ?? "");
  if (!["approved", "rejected"].includes(status)) return fail("Invalid review status.", 400);
  const { error } = await supabase
    .from("code_submissions")
    .update({ status })
    .eq("id", id)
    .eq("status", "submitted");
  if (error) return fail("Unable to record review.", 500);
  return ok({ status });
}
