import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp, isLoginPassword } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { parseKidHandle } from "@/lib/family";
import { getKidSession, kidSessionCookie, newKidToken, verifyKidPassword } from "@/lib/kid-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/kid-login {handle: "name#1234", password}; child sign-in
 * WITHOUT a Supabase user. Verifies the scrypt password, mints a 30-day
 * token session, and sets an httpOnly `kid_session` cookie. Strictly
 * IP-rate-limited (credential-stuffing shield for the 4-digit namespace).
 */
export async function POST(req: NextRequest) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const ip = clientIp(req);
  const throttle = rateLimit(`kid-login:${ip}`, 10, 60_000);
  if (!throttle.allowed) {
    return fail("Too many login attempts. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const parsed = parseKidHandle(input.handle);
  const password = isLoginPassword(input.password);
  if (!parsed || !password) return fail("Enter your handle (name#1234) and password.", 400);
  // Per-handle throttle: the discriminator namespace is small enough to
  // enumerate, so distributed IPs must not parallel-guess one handle.
  const handleKey = `${parsed.username.toLowerCase()}#${parsed.discriminator}`;
  const handleThrottle = rateLimit(`kid-login-handle:${handleKey}`, 10, 60_000);
  if (!handleThrottle.allowed) {
    return fail("Too many login attempts. Try again shortly.", 429, { "Retry-After": String(handleThrottle.retryAfter) });
  }
  let service;
  try {
    service = serviceClient();
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const { data: kid, error } = await service
    .from("kid_accounts")
    .select("id, username, discriminator, password_hash, age_band, status")
    .eq("username", parsed.username)
    .eq("discriminator", parsed.discriminator)
    .maybeSingle();
  if (error) return dbFail("api/family/kid-login", error, "Login is down. Try again shortly.");
  // One generic failure: no handle oracle, no status oracle.
  if (!kid || kid.status !== "active" || !verifyKidPassword(password, String(kid.password_hash))) {
    return fail("Wrong handle or password.", 401);
  }
  const { token, tokenHash } = newKidToken();
  const { error: sessionError } = await service.from("kid_sessions").insert({
    kid_id: kid.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (sessionError) return dbFail("api/family/kid-login", sessionError, "Login is down. Try again shortly.");
  await service.from("kid_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", kid.id);
  // Cap live sessions per child (shared-device hygiene, server efficiency).
  const { data: live } = await service.from("kid_sessions").select("id,created_at").eq("kid_id", kid.id).order("created_at", { ascending: false });
  const extras = (Array.isArray(live) ? live : []).slice(5);
  if (extras.length) {
    await service.from("kid_sessions").delete().in("id", extras.map((s) => String((s as { id: string }).id)));
  }
  const me = await getKidSession(service, token);
  const res = ok({
    handle: `${kid.username}#${kid.discriminator}`,
    age_band: kid.age_band,
    balance: me?.balance ?? 0,
    seconds_today: me?.secondsToday ?? 0,
    daily_minutes: (me?.controls?.daily_minutes as number | null) ?? null,
    in_window: me?.inWindow ?? true,
  });
  const cookie = kidSessionCookie(token);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

/** GET resolves the calling client: parent user, child session, or neither. */
export async function GET(req: NextRequest) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let service;
  try {
    service = serviceClient();
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const token = req.cookies.get("kid_session")?.value ?? null;
  const kid = await getKidSession(service, token);
  if (!kid) return ok({ parent: data?.user ? { id: data.user.id } : null, kid: null });
  return ok({
    parent: data?.user ? { id: data.user.id } : null,
    kid: {
      id: kid.kid.id,
      handle: `${kid.kid.username}#${kid.kid.discriminator}`,
      age_band: kid.kid.age_band,
      balance: kid.balance,
      seconds_today: kid.secondsToday,
      daily_minutes: kid.controls?.daily_minutes ?? null,
      allowed_start: kid.controls ? String(kid.controls.allowed_start).slice(0, 5) : null,
      allowed_end: kid.controls ? String(kid.controls.allowed_end).slice(0, 5) : null,
      monthly_cap_coins: Number(kid.controls?.monthly_cap_coins ?? 0),
      in_window: kid.inWindow,
    },
  });
}
