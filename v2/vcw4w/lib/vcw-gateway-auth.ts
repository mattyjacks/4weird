/**
 * VCW Hybrid Gateway authentication (Option C).
 *
 * SERVER-ONLY: imports the service-role client. Never import from a client
 * component.
 *
 * A gateway caller resolves from exactly one credential, tried in order:
 *   (a) Supabase session user -> mode "session" (full read + write).
 *   (b) Bot key (x-bot-key / Authorization Bearer) carrying a vcw scope
 *       (`vcw:read` or `vcw:write`) -> mode "bot".
 *   (c) Gateway key (`vcw_live_` via x-vcw-key / x-gateway-key /
 *       Authorization Bearer), looked up on public.vcw_api_keys by prefix
 *       (first 8 chars of the random suffix) with scrypt-or-sha256
 *       verification, exactly like lib/bot-auth (pepper required; legacy
 *       sha256 rows still verify) -> mode "gateway".
 *
 * Security (mirrors lib/bot-auth):
 * - Only scrypt(pepper + key) is stored; without a pepper every gateway-key
 *   lookup fails closed (null), never with an unhashed comparison.
 * - Full keys are never logged.
 * - Hash comparison is constant-time (timingSafeEqual over every prefix
 *   candidate); unknown prefixes still burn a dummy compare.
 * - `revoked` is read from the database on every request.
 * - All failures collapse to one uniform signal: null ("Authentication
 *   required." at the route layer). This module never throws.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { botPepperConfigured, keyHasScope, resolveBotKey, sha256Hash } from "@/lib/bot-auth";
import { VCW_GATEWAY_KEY_TAG } from "@/lib/vcw-gateway";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export type VcwCallerMode = "session" | "bot" | "gateway";

export interface VcwCaller {
  userId: string;
  keyId: string | null;
  mode: VcwCallerMode;
  scopes: string[];
}

export const VCW_READ_SCOPE = "vcw:read";
export const VCW_WRITE_SCOPE = "vcw:write";

/** Prefix: first 8 chars of the RANDOM suffix (after the `vcw_live_` tag). */
export function vcwGatewayKeyPrefixFromSecret(key: string): string {
  const suffix = key.startsWith(VCW_GATEWAY_KEY_TAG) ? key.slice(VCW_GATEWAY_KEY_TAG.length) : key;
  return suffix.slice(0, 8);
}

/** Read the presented gateway key: x-vcw-key, x-gateway-key, or Bearer. */
export function extractGatewayKey(req: Request): string | null {
  const direct =
    (req.headers.get("x-vcw-key") ?? "").trim() ||
    (req.headers.get("x-gateway-key") ?? "").trim();
  if (direct) return direct;
  const auth = (req.headers.get("authorization") ?? "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  const token = (match?.[1] ?? "").trim();
  if (token.startsWith(VCW_GATEWAY_KEY_TAG)) return token;
  return null;
}

function legacySha256(key: string): string {
  try {
    const p = process.env.BOT_KEY_PEPPER ?? "";
    return createHash("sha256").update(p + key, "utf8").digest("hex");
  } catch {
    return "";
  }
}

/** scrypt verify with legacy sha256 fallback (same pattern as bot-auth). */
function verifyGatewayKeyHash(presentedKey: string, storedHex: string): boolean {
  try {
    const a = Buffer.from(storedHex, "hex");
    if (a.length !== 32) return false;
    try {
      const b = Buffer.from(sha256Hash(presentedKey), "hex");
      if (b.length === 32 && timingSafeEqual(a, b)) return true;
    } catch {
      // fall through to legacy check
    }
    const legacy = Buffer.from(legacySha256(presentedKey), "hex");
    if (legacy.length !== 32) return false;
    return timingSafeEqual(a, legacy);
  } catch {
    return false;
  }
}

function dummyCompare(): void {
  try {
    timingSafeEqual(Buffer.alloc(32, 0), randomBytes(32));
  } catch {
    // compare is best-effort hardening; never fail auth on it.
  }
}

function todayDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Owner Vibe Coin balance (SUM of coin_ledger deltas). Null on DB error. */
async function ownerCoinBalance(userId: string): Promise<number | null> {
  try {
    const db = serviceClient();
    const { data, error } = await db.from("coin_ledger").select("delta").eq("user_id", userId).limit(5000);
    if (error) return null;
    const rows = (data ?? []) as { delta: unknown }[];
    let sum = 0;
    for (const r of rows) sum += Number(r.delta) || 0;
    return Math.round(sum * 100) / 100;
  } catch {
    return null;
  }
}

interface GatewayKeyCandidate {
  id: string;
  user_id: string;
  key_hash: string;
  revoked?: boolean | null;
  expires_at?: string | null;
  max_uses?: number | null;
  use_count?: number | null;
  lifetime_budget?: number | null;
  lifetime_spent?: number | null;
  daily_budget?: number | null;
  daily_spent?: number | null;
  daily_day?: string | null;
  hard_stop_enabled?: boolean | null;
  low_balance_floor?: number | null;
  scopes?: string[] | null;
}

/** Branch (c): resolve a `vcw_live_` key, or null on ANY failure. */
async function resolveGatewayKey(req: Request): Promise<VcwCaller | null> {
  const raw = extractGatewayKey(req);
  if (!raw || raw.length < 12 || raw.length > 128) {
    dummyCompare();
    return null;
  }
  // Fail closed without a pepper: deny gateway-key auth, burn dummy compare.
  // (Issuance already gates on botPepperConfigured; without it no key could
  // have been hashed with scrypt, so any comparison would be meaningless.)
  if (!botPepperConfigured()) {
    dummyCompare();
    return null;
  }
  // Gentle per-IP attempt throttle; exhaustion collapses to the uniform null.
  try {
    const throttle = rateLimit(`vcw:gateway:auth:${clientIp(req)}`, 120, 60_000);
    if (!throttle.allowed) {
      dummyCompare();
      return null;
    }
  } catch {
    // throttling is best-effort only; never fail auth on it.
  }
  const prefix = vcwGatewayKeyPrefixFromSecret(raw);

  let candidates: GatewayKeyCandidate[] = [];
  try {
    const db = serviceClient();
    // Explicit columns only: key hashes stay in memory for comparison and
    // never leave this module (never returned, never logged).
    const { data, error } = await db
      .from("vcw_api_keys")
      .select(
        "id,user_id,key_hash,revoked,expires_at,max_uses,use_count," +
          "lifetime_budget,lifetime_spent,daily_budget,daily_spent,daily_day," +
          "hard_stop_enabled,low_balance_floor,scopes",
      )
      .eq("prefix", prefix)
      .limit(100);
    if (error) {
      dummyCompare();
      return null;
    }
    candidates = ((data ?? []) as unknown as GatewayKeyCandidate[]).filter(
      (c) => typeof c?.key_hash === "string" && typeof c?.user_id === "string",
    );
  } catch {
    dummyCompare();
    return null;
  }

  if (candidates.length === 0) {
    dummyCompare();
    return null;
  }

  // Compare against EVERY candidate (no early exit) so a match position
  // cannot be inferred from timing.
  let matched: GatewayKeyCandidate | null = null;
  for (const candidate of candidates) {
    if (typeof candidate.key_hash !== "string") continue;
    let equal = false;
    try {
      equal = verifyGatewayKeyHash(raw, candidate.key_hash);
    } catch {
      equal = false;
    }
    if (equal && !matched) matched = candidate;
  }

  if (!matched || matched.revoked) return null;

  const now = Date.now();
  if (matched.expires_at && Date.parse(matched.expires_at) <= now) return null;
  if (Number(matched.max_uses) > 0 && Number(matched.use_count) >= Number(matched.max_uses)) {
    return null;
  }
  const effectiveDaily =
    String(matched.daily_day ?? "") === todayDay() ? Number(matched.daily_spent) || 0 : 0;
  if (Number(matched.lifetime_budget) > 0 && Number(matched.lifetime_spent) >= Number(matched.lifetime_budget)) {
    return null;
  }
  if (Number(matched.daily_budget) > 0 && effectiveDaily >= Number(matched.daily_budget)) {
    return null;
  }
  if (matched.hard_stop_enabled === false) {
    // Hard stop explicitly disabled: skip the balance gate below.
  } else if ((Number((matched as { low_balance_floor?: unknown }).low_balance_floor) || 0) > 0) {
    // Fail closed when the balance cannot be read and a floor is set;
    // a zero/absent floor never gates (fresh zero-balance users pass).
    const floor = Number((matched as { low_balance_floor?: unknown }).low_balance_floor) || 0;
    const balance = await ownerCoinBalance(matched.user_id);
    if (balance === null) return null;
    if (balance <= floor) return null;
  }

  // Fire-and-forget usage counters; never blocks or fails the request.
  try {
    const db = serviceClient();
    const day = todayDay();
    const rolled = String(matched.daily_day ?? "") !== day;
    void db
      .from("vcw_api_keys")
      .update({
        last_used_at: new Date().toISOString(),
        use_count: (Number(matched.use_count) || 0) + 1,
        daily_spent: rolled ? 0 : Number(matched.daily_spent) || 0,
        daily_day: day,
      })
      .eq("id", matched.id)
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // ignore
  }

  return {
    userId: matched.user_id,
    keyId: matched.id,
    mode: "gateway",
    scopes: Array.isArray(matched.scopes) ? matched.scopes : [],
  };
}

/**
 * Resolve the gateway caller: (a) Supabase session, (b) bot key with a vcw
 * scope, (c) `vcw_live_` gateway key. Never throws; null on ANY failure.
 */
export async function resolveVcwCaller(req: Request): Promise<VcwCaller | null> {
  try {
    // (a) Supabase session user.
    try {
      if (hasServerSupabase()) {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          return { userId: data.user.id, keyId: null, mode: "session", scopes: [] };
        }
      }
    } catch {
      // fall through to key auth
    }

    // (b) Bot key carrying a vcw scope.
    try {
      const bot = await resolveBotKey(req);
      if (bot && (keyHasScope(bot, VCW_READ_SCOPE) || keyHasScope(bot, VCW_WRITE_SCOPE))) {
        return { userId: bot.userId, keyId: bot.keyId, mode: "bot", scopes: bot.scopes };
      }
    } catch {
      // fall through to gateway auth
    }

    // (c) Gateway key.
    return await resolveGatewayKey(req);
  } catch {
    return null;
  }
}

/** Read access: session always; key callers need vcw:read (write implies read). */
export function vcwReadScope(caller: VcwCaller | null): boolean {
  if (!caller) return false;
  if (caller.mode === "session") return true;
  if (!caller.scopes || caller.scopes.length === 0) return true;
  return caller.scopes.includes(VCW_READ_SCOPE) || caller.scopes.includes(VCW_WRITE_SCOPE);
}

/** Write access: session always; key callers need vcw:write. */
export function vcwWriteScope(caller: VcwCaller | null): boolean {
  if (!caller) return false;
  if (caller.mode === "session") return true;
  if (!caller.scopes || caller.scopes.length === 0) return true;
  return caller.scopes.includes(VCW_WRITE_SCOPE);
}
