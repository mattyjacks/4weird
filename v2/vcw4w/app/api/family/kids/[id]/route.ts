import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isPassword } from "@/lib/validate";
import { isAgeBand } from "@/lib/family";
import { hashKidPassword } from "@/lib/kid-session";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function idFrom(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isUuidLike(v: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(v);
}

function toMinutes(v: unknown): number | null | undefined {
  // undefined = leave unchanged; -1 = unlimited (NULL); else 0..1440.
  if (v === undefined) return undefined;
  if (v === null) return -1;
  const n = Number(v);
  if (!Number.isInteger(n) || n < -1 || n > 1440) return null;
  return n;
}

function toTime(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  const s = String(v).trim().slice(0, 5);
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s) ? `${s}:00` : null;
}

/**
 * PATCH /api/family/kids/[id] — parent updates one child: controls
 * (daily_minutes, allowed_start/end, timezone, monthly_cap_coins,
 * hard_stop), age_band, status (active|suspended), or password (rotates +
 * kills live sessions). Only supplied fields change.
 */
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const kidId = idFrom(req.url);
  if (!isUuidLike(kidId)) return fail("Invalid child account.", 400);
  const throttle = rateLimit(`family-patch:${u.id}`, 30);
  if (!throttle.allowed) {
    return fail("Too many requests. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(input)) {
    if (!["daily_minutes", "allowed_start", "allowed_end", "timezone", "monthly_cap_coins", "hard_stop", "age_band", "status", "password"].includes(k)) {
      return fail("Invalid field.", 400);
    }
  }
  const minutes = toMinutes(input.daily_minutes);
  if (minutes === null) return fail("daily_minutes must be -1 (unlimited) or 0..1440.", 400);
  const start = toTime(input.allowed_start);
  if (start === null) return fail("allowed_start must be HH:MM.", 400);
  const end = toTime(input.allowed_end);
  if (end === null) return fail("allowed_end must be HH:MM.", 400);
  const tz = input.timezone === undefined ? undefined : String(input.timezone).trim().slice(0, 64) || undefined;
  const cap = input.monthly_cap_coins === undefined ? undefined : Number(input.monthly_cap_coins);
  if (cap !== undefined && (!Number.isFinite(cap) || cap < 0 || cap > 100000000)) return fail("Invalid monthly cap.", 400);
  const hardStop = input.hard_stop === undefined ? undefined : Boolean(input.hard_stop);
  const band = input.age_band === undefined ? undefined : isAgeBand(input.age_band);
  if (input.age_band !== undefined && (band === null || band === "unknown")) return fail("age_band must be kid, teen, or adult.", 400);
  const status = input.status === undefined ? undefined : String(input.status);
  if (status !== undefined && status !== "active" && status !== "suspended") return fail("status must be active or suspended.", 400);

  const wantsControls =
    minutes !== undefined || start !== undefined || end !== undefined || tz !== undefined ||
    cap !== undefined || hardStop !== undefined || band !== undefined || status !== undefined;
  if (wantsControls) {
    // Merge over current controls so partial updates never reset siblings
    // to defaults (the RPC replaces start/end/tz/cap/hard_stop wholesale).
    let service;
    try {
      service = serviceClient();
    } catch {
      return fail("Server misconfigured.", 500);
    }
    const { data: current } = await service
      .from("kid_controls")
      .select("daily_minutes,allowed_start,allowed_end,timezone,monthly_cap_coins,hard_stop")
      .eq("kid_id", kidId)
      .maybeSingle();
    const cur = (current ?? {}) as Record<string, unknown>;
    const { error } = await supabase.rpc("set_kid_controls", {
      p_kid: kidId,
      p_daily_minutes: minutes !== undefined ? minutes : ((cur.daily_minutes as number | null) ?? null),
      p_start: start ?? (typeof cur.allowed_start === "string" ? cur.allowed_start.slice(0, 8) : null),
      p_end: end ?? (typeof cur.allowed_end === "string" ? cur.allowed_end.slice(0, 8) : null),
      p_tz: tz ?? (typeof cur.timezone === "string" ? cur.timezone : null),
      p_cap: cap ?? (cur.monthly_cap_coins !== undefined && cur.monthly_cap_coins !== null && Number.isFinite(Number(cur.monthly_cap_coins)) ? Number(cur.monthly_cap_coins) : null),
      p_hard_stop: hardStop ?? (typeof cur.hard_stop === "boolean" ? cur.hard_stop : null),
      p_age_band: band ?? null,
      p_status: status ?? null,
    });
    if (error) return rpcFail("api/family/kids:controls", error, rpcStatus, "Unable to update controls.");
  }
  if (input.password !== undefined) {
    const password = isPassword(input.password);
    if (!password) return fail("Password needs 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.", 400);
    const { error } = await supabase.rpc("set_kid_password", { p_kid: kidId, p_password_hash: hashKidPassword(password) });
    if (error) return rpcFail("api/family/kids:password", error, rpcStatus, "Unable to reset password.");
  }
  if (!wantsControls && input.password === undefined) return fail("Nothing to update.", 400);
  return ok({});
}

/**
 * DELETE /api/family/kids/[id] — close a child account. Remaining wallet
 * coins refund to the parent; sessions/controls/history cascade away.
 */
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const kidId = idFrom(req.url);
  if (!isUuidLike(kidId)) return fail("Invalid child account.", 400);
  const throttle = rateLimit(`family-delete:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many requests. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });
  }
  const { data: refunded, error } = await supabase.rpc("close_kid_account", { p_kid: kidId });
  if (error) return rpcFail("api/family/kids:close", error, rpcStatus, "Unable to close child account.");
  return ok({ refunded_coins: Number(refunded ?? 0) });
}
