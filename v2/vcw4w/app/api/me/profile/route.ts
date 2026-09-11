import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { cleanDisplayName, cleanHandle, jsonBytes } from "@/lib/validate";
import { isAgeBand } from "@/lib/family";

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
    .select("display_name,public_handle,email,family_role,age_band,created_at")
    .eq("id", u.id)
    .maybeSingle();
  if (error) return dbFail("api/me/profile", error, "Unable to load profile.");
  return ok({ profile: row ?? null });
}

export async function PATCH(req: Request) {
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
  // Reject unexpected fields (mass-assignment guard).
  for (const k of Object.keys(input)) {
    if (k !== "display_name" && k !== "public_handle" && k !== "age_band" && k !== "family_role") {
      return fail("Invalid profile field.", 400);
    }
  }
  const name = cleanDisplayName(input.display_name);
  const handle = input.public_handle === undefined ? undefined : cleanHandle(input.public_handle);
  if (!name) return fail("Display name needs 2-40 characters.", 400);
  if (input.public_handle !== undefined && !handle) {
    return fail("Handle needs 3-40 letters, numbers, _ or -.", 400);
  }
  // age_band is a self-declared content band: kid/teen bands get the same
  // Adults-gating as Kids Mode (no DOB is ever collected to verify it).
  const band = input.age_band === undefined ? undefined : isAgeBand(input.age_band);
  if (input.age_band !== undefined && band === null) return fail("Invalid age band.", 400);
  // family_role: anyone may opt IN to parent; opting out requires zero kids.
  const role = input.family_role === undefined ? undefined : String(input.family_role);
  if (role !== undefined && role !== "parent" && role !== "solo") return fail("Invalid family role.", 400);
  if (role === "solo") {
    try {
      const service = serviceClient();
      const { count } = await service.from("kid_accounts").select("id", { count: "exact", head: true }).eq("parent_id", u.id);
      if ((count ?? 0) > 0) return fail("Close your child accounts first.", 409);
    } catch {
      return fail("Server misconfigured.", 500);
    }
  }
  // user_id is forced from the session; RLS re-checks it. A client-supplied
  // id field is ignored entirely.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name,
      ...(handle !== undefined ? { public_handle: handle } : {}),
      ...(band !== undefined ? { age_band: band } : {}),
      ...(role !== undefined ? { family_role: role } : {}),
    })
    .eq("id", u.id);
  if (error) {
    // 409 only on unique-violation; all other DB faults are generic 500 to
    // avoid a handle-existence oracle.
    const code = String((error as { code?: string }).code ?? "");
    if (code === "23505") return fail("That public handle is unavailable.", 409);
    return dbFail("api/me/profile", error, "Unable to update profile.");
  }
  return ok({});
}
