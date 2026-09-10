import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { cleanDisplayName, cleanHandle, jsonBytes } from "@/lib/validate";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const { data: row, error } = await supabase
    .from("profiles")
    .select("display_name,public_handle,email,created_at")
    .eq("id", u.id)
    .maybeSingle();
  if (error) return dbFail("api/me/profile", error, "Unable to load profile.");
  return ok({ profile: row ?? null });
}

export async function PATCH(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Profile request is too large.", 413);
  }
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const throttle = rateLimit(`profile-patch:${u.id}`, 20);
  if (!throttle.allowed) {
    return fail("Too many profile updates. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  // content-length is client-controlled: enforce size on the parsed body too.
  if (jsonBytes(input) > maxRequestBytes) return fail("Profile request is too large.", 413);
  const name = cleanDisplayName(input.display_name);
  const handle = input.public_handle === undefined ? undefined : cleanHandle(input.public_handle);
  if (!name) return fail("Display name needs 2-40 characters.", 400);
  if (input.public_handle !== undefined && !handle) {
    return fail("Handle needs 3-40 letters, numbers, _ or -.", 400);
  }
  // user_id is forced from the session; RLS re-checks it. A client-supplied
  // id field is ignored entirely.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, ...(handle !== undefined ? { public_handle: handle } : {}) })
    .eq("id", u.id);
  if (error) return fail("That public handle is unavailable.", 409);
  return ok({});
}
