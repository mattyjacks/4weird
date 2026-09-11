import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { KID_SESSION_DAYS, type KidAccount, type KidControls } from "@/lib/family";

/**
 * Child-credential crypto. Passwords are scrypt-hashed in the API route
 * (never in SQL, so hashes never appear in Postgres logs); session tokens
 * are 256-bit secrets stored as SHA-256 hex (lookup by equality, the raw
 * token lives only in the httpOnly cookie).
 */

export function hashKidPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyKidPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, expected] = String(stored).split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    const derived = scryptSync(password, salt, 64);
    const ref = Buffer.from(expected, "hex");
    if (derived.length !== ref.length) return false;
    return timingSafeEqual(derived, ref);
  } catch {
    return false;
  }
}

export function newKidToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashKidToken(token: string): string {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function randomDiscriminator(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
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
  const tokenHash = hashKidToken(token);
  const { data: session } = await service
    .from("kid_sessions")
    .select("kid_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
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
  await service.from("kid_sessions").update({ last_seen_at: new Date().toISOString() }).eq("token_hash", tokenHash);
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
