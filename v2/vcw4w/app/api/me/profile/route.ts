import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { botTesterBlocked, isBotTester } from "@/lib/bot-auth";
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
    .select("display_name,public_handle,email,family_role,age_band,created_at,is_profile_public,ll_balance,ll_earned,ll_received,ll_given")
    .eq("id", u.id)
    .maybeSingle();
  if (error) return dbFail("api/me/profile", error, "Unable to load profile.");
  return ok({ profile: row ?? null });
}

export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  // Bot tester sessions (POST /api/bot/login email+password) can play but
  // never change the user profile.
  if (isBotTester(req)) return fail(botTesterBlocked(), 403);
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
    if (k !== "display_name" && k !== "public_handle" && k !== "age_band" && k !== "family_role" && k !== "is_profile_public") {
      return fail("Invalid profile field.", 400);
    }
  }
  const name = input.display_name === undefined ? undefined : cleanDisplayName(input.display_name);
  const handle = input.public_handle === undefined ? undefined : cleanHandle(input.public_handle);
  if (input.display_name !== undefined && !name) return fail("Display name needs 2-40 characters.", 400);
  if (input.public_handle !== undefined && !handle) {
    return fail("Handle needs 3-40 letters, numbers, _ or -.", 400);
  }
  // age_band is a self-declared content band for full (13+) accounts only:
  // teen (13-17) or adult (18+). "kid" (0-12) is NEVER valid here — under-13s
  // have no direct account (COPPA); they play on parent-created Child
  // sub-accounts. "unknown" is legacy read-only: existing rows keep working
  // (treated as teen-restricted), but new writes must pick teen or adult.
  // No DOB is ever collected to verify the band (data minimization).
  const band = input.age_band === undefined ? undefined : isAgeBand(input.age_band);
  if (input.age_band !== undefined && band === null) return fail("Invalid age band.", 400);
  if (band === "kid") {
    return fail(
      "Full accounts are 13+ only (Teen 13-17 or Adult 18+). Under 13 plays on a parent-created Child account in Account → Family.",
      400,
    );
  }
  if (band === "unknown" && input.age_band !== undefined) {
    return fail("Choose your age band: Teen (13-17) or Adult (18+).", 400);
  }
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
  // is_profile_public: public 💌 stats by default; shy users may hide them.
  // Coerce truthy/falsy; undefined leaves the flag untouched.
  const isPublic = input.is_profile_public === undefined ? undefined : Boolean(input.is_profile_public);
  // user_id is forced from the session; RLS re-checks it. A client-supplied
  // id field is ignored entirely.
  // TOCTOU guard: re-check kids AFTER the update when opting out — a child
  // created in the race window flips the role back to parent instead of
  // leaving solo-with-kids.
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(name !== undefined ? { display_name: name } : {}),
      ...(handle !== undefined ? { public_handle: handle } : {}),
      ...(band !== undefined ? { age_band: band } : {}),
      ...(role !== undefined ? { family_role: role } : {}),
      ...(isPublic !== undefined ? { is_profile_public: isPublic } : {}),
    })
    .eq("id", u.id);
  if (!error && role === "solo") {
    try {
      const service = serviceClient();
      const { count: after } = await service.from("kid_accounts").select("id", { count: "exact", head: true }).eq("parent_id", u.id);
      if ((after ?? 0) > 0) {
        await service.from("profiles").update({ family_role: "parent" }).eq("id", u.id);
        return fail("A child account appeared during the update; staying as parent.", 409);
      }
    } catch {
      // re-check is best-effort; the pre-check above already gated
    }
  }
  if (error) {
    // 409 only on unique-violation; all other DB faults are generic 500 to
    // avoid a handle-existence oracle.
    const code = String((error as { code?: string }).code ?? "");
    if (code === "23505") return fail("That public handle is unavailable.", 409);
    return dbFail("api/me/profile", error, "Unable to update profile.");
  }
  return ok({});
}
