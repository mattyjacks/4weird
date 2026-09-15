import { NextResponse } from "next/server";
import { fail } from "@/lib/api-respond";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/validate";

const BUCKET = "feedback-screenshots";
const SIGNED_TTL_SECONDS = 60;

// GET /api/feedback/[id]/screenshot — admin-only server-signed screenshot
// redirect. The feedback-screenshots bucket is private (never public); this
// route verifies the caller via createClient auth + app_metadata role admin,
// loads the row's canonical screenshot_path with the service client, mints a
// short-lived signed storage URL, and redirects to it. No screenshot bytes
// or public URLs ever render in the admin queue — <img> tags point here.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return fail("Login required.", 401);
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return fail("Admin access required.", 403);

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid feedback id.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("feedback store not set up.", 503);
  }

  const { data: row, error } = await svc
    .from("feedback_reports")
    .select("screenshot_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("Unable to load screenshot.", 500);
  const path = (row as { screenshot_path?: unknown } | null)?.screenshot_path;
  if (typeof path !== "string" || path.length === 0) {
    return fail("No screenshot attached.", 404);
  }

  const { data: signed, error: signErr } = await svc.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    return fail("Unable to sign screenshot.", 500);
  }
  return NextResponse.redirect(signed.signedUrl, 302);
}
