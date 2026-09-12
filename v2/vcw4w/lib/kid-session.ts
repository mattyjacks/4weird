import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { KID_SESSION_DAYS, type KidAccount, type KidControls } from "@/lib/family";

/**
 * Child-credential crypto. Passwords are scrypt-hashed in the API route
 * (never in SQL, so hashes never appear in Postgres logs); session tokens
 * are 256-bit secrets stored as SHA-256 hex (lookup by equality, the raw
 * token lives only in the httpOnly cookie).
 */

/** Pepper for kid token hashes (256-bit PQ margin): KID_TOKEN_PEPPER, else BOT_KEY_PEPPER. */
function kidTokenPepper(): string {
  return process.env.KID_TOKEN_PEPPER ?? process.env.BOT_KEY_PEPPER ?? "";
}

/** Pinned PQ KDF cost (maxmem REQUIRED: N=32768/r=8 exceeds Node's 32 MiB
 *  default scrypt cap and throws without it - see lib/bot-auth SCRYPT_PQ). */
export const SCRYPT_PQ_KID = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function hashKidPassword(password: string): string {
  // 32-byte salt + pinned N=32768 cost. Format stays `scrypt$salt$derived`
  // so legacy rows (16-byte salt, default cost) still verify below.
  const salt = randomBytes(32).toString("hex");
  const derived = scryptSync(password, salt, 64, { ...SCRYPT_PQ_KID }).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyWithCost(
  password: string,
  salt: string,
  expected: string,
  opts?: { N: number; r: number; p: number; maxmem?: number },
): boolean {
  try {
    const derived = opts
      ? scryptSync(password, salt, 64, { maxmem: 64 * 1024 * 1024, ...opts })
      : scryptSync(password, salt, 64);
    const ref = Buffer.from(expected, "hex");
    if (derived.length !== ref.length) return false;
    return timingSafeEqual(derived, ref);
  } catch {
    return false;
  }
}

export function verifyKidPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, expected] = String(stored).split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    // New cost first, then legacy default cost (N=16384) for pre-hardening rows.
    if (verifyWithCost(password, salt, expected, { ...SCRYPT_PQ_KID })) return true;
    return verifyWithCost(password, salt, expected);
  } catch {
    return false;
  }
}

/** Burn ~1 KDF so unknown-handle misses cost like a real password verify. */
export function dummyKidPasswordVerify(): void {
  try {
    scryptSync(randomBytes(8), randomBytes(16).toString("hex"), 64, { ...SCRYPT_PQ_KID });
  } catch {
    // best-effort only
  }
}

export function newKidToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashKidToken(token) };
}

export function hashKidToken(token: string): string {
  const t = String(token);
  const pepper = kidTokenPepper();
  // Peppered when configured (DB leak alone can't brute-force); legacy
  // unpeppered rows verify via hashKidTokenLegacy + opportunistic rehash.
  if (pepper.length >= 16) return createHash("sha256").update(`${pepper}|${t}`).digest("hex");
  return createHash("sha256").update(t).digest("hex");
}

/** Pre-hardening token hash (verify-only for legacy rows). */
export function hashKidTokenLegacy(token: string): string {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function randomDiscriminator(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export type KidSession = {
  kid: KidAccount & { parent_id: string };
  controls: KidControls | null;
  balance: number;
  secondsToday: number;
  inWindow: boolean;
};

/** Resolve the `kid_session` cookie to a live child session (service client). */
export async function getKidSession(
  service: SupabaseClient,
  rawToken: string | null | undefined,
): Promise<KidSession | null> {
  const token = String(rawToken ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  // Peppered lookup first, legacy unpeppered fallback (pre-hardening rows).
  const tokenHash = hashKidToken(token);
  const legacyHash = hashKidTokenLegacy(token);
  let session: { kid_id: string; expires_at: string } | null = null;
  // Remember which hash matched: the liveness refresh below must update by
  // the matched hash (a peppered row matched by tokenHash; a legacy row by
  // legacyHash). Updating a peppered session by the legacy hash touches 0
  // rows and silently drops the sliding refresh.
  let matchedHash = tokenHash;
  {
    const { data } = await service
      .from("kid_sessions")
      .select("kid_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    session = (data as { kid_id: string; expires_at: string } | null) ?? null;
    if (!session && legacyHash !== tokenHash) {
      const { data: legacy } = await service
        .from("kid_sessions")
        .select("kid_id, expires_at")
        .eq("token_hash", legacyHash)
        .maybeSingle();
      session = (legacy as { kid_id: string; expires_at: string } | null) ?? null;
      if (session) matchedHash = legacyHash;
    }
  }
  if (!session || new Date(String(session.expires_at)).getTime() <= Date.now()) return null;
  const { data: kid } = await service
    .from("kid_accounts")
    .select("id, parent_id, username, discriminator, age_band, status, created_at, last_login_at")
    .eq("id", session.kid_id)
    .maybeSingle();
  if (!kid || kid.status !== "active") return null;
  const [{ data: controls }, { data: wallet }, { data: day }] = await Promise.all([
    service.from("kid_controls").select("*").eq("kid_id", kid.id).maybeSingle(),
    service.from("kid_wallet_ledger").select("delta").eq("kid_id", kid.id),
    service.from("kid_play_days").select("seconds").eq("kid_id", kid.id).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle(),
  ]);
  const balance = (Array.isArray(wallet) ? wallet : []).reduce((sum, row) => sum + Number(row.delta ?? 0), 0);
  // Window check mirrors kid_in_window() for display; the RPCs enforce it.
  let inWindow = true;
  try {
    if (controls) {
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: controls.timezone || "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
      const now = fmt.format(new Date());
      const start = String(controls.allowed_start).slice(0, 5);
      const end = String(controls.allowed_end).slice(0, 5);
      inWindow = start <= end ? now >= start && now <= end : now >= start || now <= end;
    }
  } catch {
    inWindow = true;
  }
  // Sliding 7-day refresh + opportunistic pepper rehash: extend expiry when
  // <48h remain so active kids stay signed in without 30-day bearer windows.
  // Legacy unpeppered rows are rehashed to the peppered form on next use.
  try {
    const expiresMs = new Date(String(session.expires_at)).getTime();
    const patch: Record<string, string> = { last_seen_at: new Date().toISOString() };
    if (expiresMs - Date.now() < 48 * 3600 * 1000) {
      patch.expires_at = new Date(Date.now() + KID_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    }
    if (matchedHash === legacyHash && legacyHash !== tokenHash) patch.token_hash = tokenHash;
    await service.from("kid_sessions").update(patch).eq("token_hash", matchedHash);
  } catch {
    // liveness/refresh must never break play
  }
  return {
    kid,
    controls: controls ?? null,
    balance: Math.round(balance * 100) / 100,
    secondsToday: Number(day?.seconds ?? 0),
    inWindow,
  };
}

export function kidSessionCookie(token: string): {
  name: string;
  value: string;
  options: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number };
} {
  return {
    name: "kid_session",
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: KID_SESSION_DAYS * 24 * 60 * 60,
    },
  };
}

export function clearKidSessionCookie(): {
  name: string;
  value: string;
  options: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number };
} {
  const c = kidSessionCookie("");
  c.options.maxAge = 0;
  return c;
}
