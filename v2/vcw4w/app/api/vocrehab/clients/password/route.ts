import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getKidSession, hashKidPassword, hashKidToken, hashKidTokenLegacy, verifyKidPassword } from "@/lib/kid-session";
import { isLoginPassword, isPassword } from "@/lib/validate";

function kidToken(req: Request): { present: boolean; value: string | null } {
  const entries = (req.headers.get("cookie") ?? "").split(";").flatMap((part) => {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== "kid_session") return [];
    try { return [decodeURIComponent(part.slice(i + 1).trim())]; } catch { return [null]; }
  });
  if (!entries.length) return { present: false, value: null };
  if (entries.length !== 1 || typeof entries[0] !== "string" || !/^[0-9a-f]{64}$/.test(entries[0])) return { present: true, value: null };
  return { present: true, value: entries[0] };
}

/**
 * POST /api/vocrehab/clients/password { current_password, new_password }
 * Child self-service password change for the existing parent-owned child
 * account. VocRehab never creates a second identity or credential store.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const cookie = kidToken(req);
  if (!cookie.present || !cookie.value) return fail("Sign in to the child account to change its password.", 401);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  const currentPassword = isLoginPassword(input.current_password);
  const newPassword = isPassword(input.new_password);
  if (!currentPassword) return fail("Enter your current password.", 400);
  if (!newPassword) return fail("New password needs 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.", 400);

  const service = serviceClient();
  const session = await getKidSession(service, cookie.value);
  if (!session) return fail("Child session expired. Sign in again.", 401);
  const throttle = rateLimit(`vocrehab-kid-password:${session.kid.id}`, 5, 60_000);
  if (!throttle.allowed) return fail("Too many password changes. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });

  const { data: account, error: accountError } = await service.from("kid_accounts").select("password_hash").eq("id", session.kid.id).eq("parent_id", session.kid.parent_id).eq("status", "active").maybeSingle();
  if (accountError) return dbFail("vocrehab/clients/password", accountError);
  if (!account || !verifyKidPassword(currentPassword, String(account.password_hash))) return fail("Current password is incorrect.", 401);

  // The active browser remains signed in. Other devices are revoked before
  // changing the hash, so a DB error cannot leave stale sessions alive.
  const keep = new Set([hashKidToken(cookie.value), hashKidTokenLegacy(cookie.value)]);
  const { data: sessions, error: sessionsError } = await service.from("kid_sessions").select("id,token_hash").eq("kid_id", session.kid.id);
  if (sessionsError) return dbFail("vocrehab/clients/password", sessionsError);
  const staleIds = (sessions ?? []).filter((row) => !keep.has(String(row.token_hash))).map((row) => String(row.id));
  if (staleIds.length) {
    const { error } = await service.from("kid_sessions").delete().in("id", staleIds);
    if (error) return dbFail("vocrehab/clients/password", error);
  }
  const { data: updated, error: updateError } = await service.from("kid_accounts").update({ password_hash: hashKidPassword(newPassword) }).eq("id", session.kid.id).eq("parent_id", session.kid.parent_id).eq("status", "active").select("id").maybeSingle();
  if (updateError) return dbFail("vocrehab/clients/password", updateError);
  if (!updated) return fail("Child account is no longer active.", 401);
  return ok({ changed: true, notice: "Password changed. Other child account sessions have been signed out." });
}
