import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isPassword } from "@/lib/validate";
import { isKidBand, isKidUsername, MAX_KIDS_PER_PARENT } from "@/lib/family";
import { hashKidPassword, randomDiscriminator } from "@/lib/kid-session";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/**
 * GET /api/family/kids — the signed-in parent lists their child accounts
 * (handles, bands, balances, controls, today's play). Secrets (password
 * hashes, session tokens) never leave the database.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  let service;
  try {
    service = serviceClient();
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const { data: kids, error } = await service
    .from("kid_accounts")
    .select("id, username, discriminator, age_band, status, created_at, last_login_at")
    .eq("parent_id", u.id)
    .order("created_at", { ascending: true });
  if (error) return dbFail("api/family/kids", error, "Unable to load child accounts.");
  const list = Array.isArray(kids) ? kids : [];
  const ids = list.map((k) => String(k.id));
  const controls: Record<string, unknown> = {};
  const balances: Record<string, number> = {};
  const today: Record<string, number> = {};
  if (ids.length) {
    const [{ data: c }, { data: w }, { data: d }] = await Promise.all([
      service.from("kid_controls").select("*").in("kid_id", ids),
      service.from("kid_wallet_ledger").select("kid_id,delta").in("kid_id", ids),
      service.from("kid_play_days").select("kid_id,seconds").in("kid_id", ids).eq("day", new Date().toISOString().slice(0, 10)),
    ]);
    for (const row of (Array.isArray(c) ? c : []) as Array<Record<string, unknown>>) controls[String(row.kid_id)] = row;
    for (const row of (Array.isArray(w) ? w : []) as Array<{ kid_id: string; delta: number }>) {
      balances[row.kid_id] = Math.round(((balances[row.kid_id] ?? 0) + Number(row.delta ?? 0)) * 100) / 100;
    }
    for (const row of (Array.isArray(d) ? d : []) as Array<{ kid_id: string; seconds: number }>) {
      today[row.kid_id] = Number(row.seconds ?? 0);
    }
  }
  return ok({
    kids: list.map((k) => ({
      ...k,
      handle: `${k.username}#${k.discriminator}`,
      controls: controls[String(k.id)] ?? null,
      balance: balances[String(k.id)] ?? 0,
      seconds_today: today[String(k.id)] ?? 0,
    })),
  });
}

/**
 * POST /api/family/kids {username, password, age_band?} — create a child
 * account. The creator is promoted to a Parent account on first child.
 * Returns the `username#1234` handle (show it once — it IS the login).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`family-create:${u.id}`, 10);
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
  const username = isKidUsername(input.username);
  if (!username) return fail("Username needs 3-24 letters, numbers, _ or -.", 400);
  const password = isPassword(input.password);
  if (!password) {
    return fail("Password needs 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.", 400);
  }
  const band = isKidBand(input.age_band ?? "kid") ?? "kid";
  let service;
  try {
    service = serviceClient();
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const { count } = await service.from("kid_accounts").select("id", { count: "exact", head: true }).eq("parent_id", u.id);
  if ((count ?? 0) >= MAX_KIDS_PER_PARENT) return fail("Child account limit reached (10 per parent).", 400);
  const passwordHash = hashKidPassword(password);
  // Random discriminator, retry on collision (4 digits over few siblings:
  // collisions are rare; 8 attempts is plenty). The RPC runs as the parent's
  // own session (SECURITY DEFINER writes, auth.uid() proves parenthood).
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const discriminator = randomDiscriminator();
    const { data: row, error } = await supabase.rpc("create_kid_account", {
      p_username: username,
      p_discriminator: discriminator,
      p_password_hash: passwordHash,
      p_age_band: band,
    });
    if (!error) {
      const created = row as { username: string; discriminator: string } | null;
      return ok({
        kid: row,
        handle: `${created?.username ?? username}#${created?.discriminator ?? discriminator}`,
      }, 201);
    }
    const message = String((error as { message?: string }).message ?? "");
    if (!/handle taken/i.test(message)) return rpcFail("api/family/kids:create", error, rpcStatus, "Unable to create child account.");
  }
  return fail("Username is busy — try a different one.", 409);
}
