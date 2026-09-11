import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { validatePodPolicyInput } from "@/lib/pod-idle";

export const dynamic = "force-dynamic";

/**
 * POST /api/desktop/[id]/policy — change YOUR pod's idle lifecycle
 * (warn-chime minutes, stop grace, terminate hours). Creator-only (404
 * otherwise). Body accepts warn_minutes / stop_grace_minutes /
 * terminate_hours (camelCase aliases work too); omitted keys reset to the
 * account default (NULL). Every change also refreshes last_activity_at so
 * editing the policy counts as tending the pod.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`desktop:policy:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Desktop not found.", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const pick = (snake: string, camel: string) =>
    input[snake] !== undefined ? input[snake] : input[camel];
  const has = (snake: string, camel: string) => input[snake] !== undefined || input[camel] !== undefined;
  const checked = validatePodPolicyInput({
    warnMinutes: pick("warn_minutes", "warnMinutes"),
    stopGraceMinutes: pick("stop_grace_minutes", "stopGraceMinutes"),
    terminateHours: pick("terminate_hours", "terminateHours"),
  });
  if (!checked.ok) return fail(checked.error, 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Desktop lookup unavailable.", 503);
  }
  const patch: Record<string, number | string | null> = {
    last_activity_at: new Date().toISOString(),
  };
  if (has("warn_minutes", "warnMinutes")) patch.warn_minutes = pick("warn_minutes", "warnMinutes") == null || pick("warn_minutes", "warnMinutes") === "" ? null : checked.value.warnMinutes;
  if (has("stop_grace_minutes", "stopGraceMinutes"))
    patch.stop_grace_minutes =
      pick("stop_grace_minutes", "stopGraceMinutes") == null || pick("stop_grace_minutes", "stopGraceMinutes") === ""
        ? null
        : checked.value.stopGraceMinutes;
  if (has("terminate_hours", "terminateHours"))
    patch.terminate_hours =
      pick("terminate_hours", "terminateHours") == null || pick("terminate_hours", "terminateHours") === ""
        ? null
        : checked.value.terminateHours;
  const { data: row, error } = await svc
    .from("desktop_pods")
    .update(patch)
    .eq("id", id)
    .eq("user_id", data.user.id)
    .select("id,warn_minutes,stop_grace_minutes,terminate_hours")
    .maybeSingle();
  if (error) return dbFail("POST /api/desktop/[id]/policy", error, "Unable to update policy.");
  if (!row) return fail("Desktop not found.", 404);
  return ok({ ok: true, policy: row });
}
