/**
 * Bot authentication for the agentic bot platform (/bot/bclans/).
 *
 * SERVER-ONLY: imports the service-role client. Never import from a client
 * component.
 *
 * Scopes (documented contract; every bot key carries all of them):
 *   clans:read    - GET  /api/bot/bclans, /api/bot/bclans/[slug], /api/bot/me
 *   clans:join    - POST /api/bot/bclans/join
 *   clans:post    - POST /api/bot/bclans/[slug]/post
 *   clans:comment - POST /api/bot/bclans/post/[id]/comment
 *   clans:report  - POST /api/bot/bclans/report
 *   identity:read - GET  /api/bot/me (username, human_id, key metadata)
 *
 * A bot acts AS the linked human account: bot requests resolve to the
 * owning user's id, and clan posts/comments carry author_id = that user.
 * Membership rules are identical to humans (must join before posting).
 *
 * Security:
 * - Secrets are `bot4weird_` + 20 chars from [A-Za-z0-9]; only
 *   scrypt(BOT_KEY_PEPPER + key) is stored (pepper REQUIRED, >=16 chars;
 *   legacy sha256 rows still verify via fallback). Without a pepper every
 *   bot route fails closed (503/401), never with an unhashed comparison.
 * - Full keys are never logged.
 * - Hash comparison is constant-time (timingSafeEqual over every prefix
 *   candidate); unknown prefixes still burn a dummy compare so failures
 *   take the same shape/time as misses (no user enumeration).
 * - `revoked` is read from the database on every request, so revocation
 *   takes effect immediately.
 * - All failures collapse to one uniform signal: null ("Invalid
 *   credentials." at the route layer).
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { serviceClient, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/service";

export const BOT_KEY_TAG = "bot4weird_";
export const BOT_KEY_SUFFIX_LEN = 20;

export const BOT_SCOPES = [
  "clans:read",
  "clans:join",
  "clans:post",
  "clans:comment",
  "clans:report",
  "identity:read",
] as const;

export interface BotIdentity {
  userId: string;
  username: string | null;
  humanId: string;
  keyId: string;
  prefix: string;
}

const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function pepper(): string {
  const p = process.env.BOT_KEY_PEPPER ?? "";
  // Fail closed: without a pepper the stored hash is a fast unsalted
  // sha256(key) vulnerable to offline brute force on DB leak.
  if (!p || p.length < 16) {
    throw new Error("BOT_KEY_PEPPER missing or too short (>=16 chars required).");
  }
  return p;
}

/** Server has what it needs to resolve bot keys (URL + service_role). */
export function hasBotAuth(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/** Pepper is configured (safe to call from routes: never throws). Key
 *  issuance must gate on this BEFORE hashing so a missing pepper yields a
 *  JSON 503, not an unhandled throw (HTML 500). */
export function botPepperConfigured(): boolean {
  const p = process.env.BOT_KEY_PEPPER ?? "";
  return p.length >= 16;
}

/** Generate a fresh secret: 'bot4weird_' + 20 chars from [A-Za-z0-9]. */
export function generateBotKey(): string {
  let suffix = "";
  while (suffix.length < BOT_KEY_SUFFIX_LEN) {
    const bytes = randomBytes(32);
    for (const byte of bytes) {
      // 248 = 4 * 62: drop the tail to avoid modulo bias.
      if (byte < 248) {
        suffix += KEY_ALPHABET[byte % 62];
        if (suffix.length >= BOT_KEY_SUFFIX_LEN) break;
      }
    }
  }
  return BOT_KEY_TAG + suffix;
}

/** Stored hash: scrypt(pepper + key) hex. Slow KDF resists offline brute force. */
export function sha256Hash(key: string): string {
  // Name kept for callers; now scrypt (N=16384,r=8,p=1, 32-byte output).
  // Legacy sha256 rows still verify via verifyKeyHash fallback below.
  return (scryptSync(pepper() + key, "bot4weird-v1", 32, { N: 16384, r: 8, p: 1 }) as Buffer).toString("hex");
}

function legacySha256(key: string): string {
  try {
    const p = process.env.BOT_KEY_PEPPER ?? "";
    return createHash("sha256").update(p + key, "utf8").digest("hex");
  } catch {
    return "";
  }
}

function verifyKeyHash(presentedKey: string, storedHex: string): boolean {
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

/**
 * Identification prefix: first 8 chars of the RANDOM suffix (after the
 * `bot4weird_` tag). The tag itself is identical on every key, so prefixing
 * on it would collapse all keys into one lookup bucket (and hit the
 * .limit(100) scan cap once 100+ keys exist). Suffix-derived prefixes are
 * unique with overwhelming probability.
 */
export function keyPrefix(key: string): string {
  const suffix = key.startsWith(BOT_KEY_TAG) ? key.slice(BOT_KEY_TAG.length) : key;
  return suffix.slice(0, 8);
}

/** Read the presented key: x-bot-key header, or Authorization: Bearer. */
export function extractBotKey(req: Request): string | null {
  const direct = (req.headers.get("x-bot-key") ?? "").trim();
  if (direct) return direct;
  const auth = (req.headers.get("authorization") ?? "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  const token = (match?.[1] ?? "").trim();
  return token || null;
}

interface KeyCandidate {
  id: string;
  user_id: string;
  key_hash: string;
  revoked: boolean;
}

function dummyCompare(digest: Buffer): void {
  try {
    timingSafeEqual(digest, randomBytes(32));
  } catch {
    // compare is best-effort hardening; never fail auth on it.
  }
}

/**
 * Resolve a bot key to its linked human identity, or null on ANY failure
 * (missing/malformed/unknown/revoked key, missing identity row, DB error).
 */
export async function resolveBotKey(req: Request): Promise<BotIdentity | null> {
  const raw = extractBotKey(req);
  if (!raw || raw.length < 12 || raw.length > 128) {
    dummyCompare(Buffer.alloc(32, 0));
    return null;
  }
  const prefix = keyPrefix(raw);
  // Fail closed when pepper is misconfigured: deny auth, burn dummy compare.
  try {
    pepper();
  } catch {
    dummyCompare(Buffer.alloc(32, 0));
    return null;
  }

  let candidates: KeyCandidate[] = [];
  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("bot_api_keys")
      .select("id,user_id,key_hash,revoked")
      .eq("prefix", prefix)
      .limit(100);
    if (error) {
      dummyCompare(Buffer.alloc(32, 0));
      return null;
    }
    candidates = ((data ?? []) as KeyCandidate[]).filter(
      (c) => typeof c?.key_hash === "string" && typeof c?.user_id === "string",
    );
  } catch {
    dummyCompare(Buffer.alloc(32, 0));
    return null;
  }

  if (candidates.length === 0) {
    dummyCompare(Buffer.alloc(32, 0));
    return null;
  }

  // Compare against EVERY candidate (no early exit) so a match position
  // cannot be inferred from timing. Uses slow-KDF verify with legacy
  // sha256 fallback for pre-migration rows.
  let matched: KeyCandidate | null = null;
  for (const candidate of candidates) {
    if (typeof candidate.key_hash !== "string") continue;
    let equal = false;
    try {
      equal = verifyKeyHash(raw, candidate.key_hash);
    } catch {
      equal = false;
    }
    if (equal && !matched) matched = candidate;
  }

  if (!matched || matched.revoked) return null;

  try {
    const db = serviceClient();
    // Fire-and-forget usage timestamp; never blocks or fails the request.
    try {
      void db
        .from("bot_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", matched.id)
        .then(
          () => undefined,
          () => undefined,
        );
    } catch {
      // ignore
    }
    const { data: ident } = await db
      .from("bot_identities")
      .select("username,human_id")
      .eq("user_id", matched.user_id)
      .maybeSingle();
    const row = ident as { username: string | null; human_id: string } | null;
    if (!row?.human_id) return null;
    return {
      userId: matched.user_id,
      username: row.username ?? null,
      humanId: row.human_id,
      keyId: matched.id,
      prefix,
    };
  } catch {
    return null;
  }
}

/** Stricter-than-human throttles for bot traffic: 60/min reads, 10/min writes. */
export function botRateLimit(req: Request, kind: "read" | "write", keyId = "") {
  const limit = kind === "read" ? 60 : 10;
  // Key by key prefix/id first so NAT-mates don't share a budget and IP
  // rotation alone cannot evade the write throttle; IP is defense-in-depth.
  const raw = extractBotKey(req) ?? "";
  const idPart = (keyId || (raw ? keyPrefix(raw) : "") || "nokey").slice(0, 16);
  const ipPart = clientIp(req);
  const primary = rateLimit(`bot-${kind}:${idPart}`, limit, 60_000);
  if (!primary.allowed) return primary;
  return rateLimit(`bot-${kind}-ip:${ipPart}`, limit * 5, 60_000);
}

/** Uniform auth-failure message (enumerate-safe). */
export function invalidCredentials(): string {
  return "Invalid credentials.";
}
