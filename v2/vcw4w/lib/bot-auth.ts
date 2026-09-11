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
 *   sha256(BOT_KEY_PEPPER + key) is stored (pepper optional, default '').
 * - Full keys are never logged.
 * - Hash comparison is constant-time (timingSafeEqual over every prefix
 *   candidate); unknown prefixes still burn a dummy compare so failures
 *   take the same shape/time as misses (no user enumeration).
 * - `revoked` is read from the database on every request, so revocation
 *   takes effect immediately.
 * - All failures collapse to one uniform signal: null ("Invalid
 *   credentials." at the route layer).
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";
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
  return process.env.BOT_KEY_PEPPER ?? "";
}

/** Server has what it needs to resolve bot keys (URL + service_role). */
export function hasBotAuth(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
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

/** Stored hash: sha256 hex of (pepper + key). Pepper defaults to ''. */
export function sha256Hash(key: string): string {
  return createHash("sha256").update(pepper() + key, "utf8").digest("hex");
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
  const digest = Buffer.from(sha256Hash(raw), "hex");

  let candidates: KeyCandidate[] = [];
  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("bot_api_keys")
      .select("id,user_id,key_hash,revoked")
      .eq("prefix", prefix)
      .limit(100);
    if (error) {
      dummyCompare(digest);
      return null;
    }
    candidates = ((data ?? []) as KeyCandidate[]).filter(
      (c) => typeof c?.key_hash === "string" && typeof c?.user_id === "string",
    );
  } catch {
    dummyCompare(digest);
    return null;
  }

  if (candidates.length === 0) {
    dummyCompare(digest);
    return null;
  }

  // Compare against EVERY candidate (no early exit) so a match position
  // cannot be inferred from timing.
  let matched: KeyCandidate | null = null;
  for (const candidate of candidates) {
    let stored: Buffer;
    try {
      stored = Buffer.from(candidate.key_hash, "hex");
    } catch {
      continue;
    }
    if (stored.length !== 32) continue;
    let equal = false;
    try {
      equal = timingSafeEqual(stored, digest);
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
export function botRateLimit(req: Request, kind: "read" | "write") {
  const limit = kind === "read" ? 60 : 10;
  return rateLimit(`bot-${kind}:${clientIp(req)}`, limit, 60_000);
}

/** Uniform auth-failure message (enumerate-safe). */
export function invalidCredentials(): string {
  return "Invalid credentials.";
}
