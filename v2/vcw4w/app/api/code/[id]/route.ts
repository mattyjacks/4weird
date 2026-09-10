import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`code-submit:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many submissions. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if ((body as Record<string, unknown> | null)?.submit !== true) return fail("Invalid request.", 400);
  const { data: updated, error } = await supabase
    .from("code_submissions")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("owner_id", u.id)
    .eq("status", "draft")
    .select("id");
  if (error) return fail("Unable to submit.", 500);
  if (!updated || updated.length === 0) return fail("Project not found.", 404);
  return ok({});
}
