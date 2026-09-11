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
 *   unitunite:read  - GET /api/unitunite/rooms, /api/unitunite/rooms/[id]/messages
 *   unitunite:send  - POST /api/unitunite/rooms (open a room), /api/unitunite/rooms/[id]/messages (send)
 *                     UnitUnite sends from a bot key are ALWAYS labeled [BOT].
  *   code:submit    - POST /api/code/zip (game .zip submissions, ≤50 MB)
 *   code:audit     - POST /api/code/[id]/audit (coin-metered code audit)
 *   code:review    - moderator review queue reads/triage (admin-gated)
 *   vault:read     - GET  /api/vault/blobs (own-scope reads only)
 *   vault:write    - POST /api/vault/blobs (own-scope writes only)
 *   vault:share    - POST /api/vault/shares (scoped share links)
 *   vault:quarantine - moderator quarantine actions (admin-gated)
 *   meshy:generate - POST /api/meshy/generate (coin-metered Meshy tasks)
 *   meshy:read     - GET  /api/meshy/ops, /api/meshy/status
 *   ai:autosave    - POST /api/ai/autosave (vault autosave of AI artifacts)
 *   ai:read        - GET  /api/ai/artifacts (own-scope artifact reads)
 *   vcw:read       - GET /api/vcw/gateway/* + /api/vcw/* reads
 *   vcw:write      - POST gateway dispatch + VCW run writes
 *
 * Bot login (POST /api/bot/login): bots log in with EITHER a `bot4weird_`
 * API key OR an email + password. The email+password path mints a normal
 * Supabase session PLUS a `bot_tester=1` marker cookie: the tester session
 * can play and test the site, but profile writes (PATCH /api/me/profile)
 * and destructive actions (POST /api/my/rights, bot key/identity
 * management) refuse it with 403. API-key callers never hold a session at
 * all, so they carry no profile/destructive power either. Owners hand a
 * bot the tester login instead of a full /api/auth/login session.
 *
 * Scope separation is strict: clan scopes never grant code/vault/meshy
 * access and vice versa. keyHasScope() is checked per route; an empty
 * subset still means "all scopes" for legacy keys only.
 *
 * A bot acts AS the linked human account: bot requests resolve to the
 * owning user's id, and clan posts/comments carry author_id = that user.
 * Membership rules are identical to humans (must join before posting).
 *
 * Security (quantum-hardened, state-actor grade):
 * - Secrets are `bot4weird_` + 32 chars from [A-Za-z0-9] (~190 bits;
 *   Grover ~95 bits). Legacy 20-char rows still verify but new issuance
 *   is always 32 chars. Malformed presents are rejected BEFORE any KDF
 *   (CPU-DoS gate against AI-speed online guessing).
 * - Stored as scrypt(pepper + key, salt=bot4weird-v2$<prefix>, N=32768,r=8,p=1).
 *   The per-prefix salt kills one-rainbow-cracks-all bulk attacks on DB leak;
 *   the `vcw_live_` gateway family uses a separate `vcw-gateway-v2$` domain so
 *   the shared pepper cannot cross-verify. Pepper REQUIRED: >=16 chars verify
 *   legacy rows, >=32 strong-random chars required to ISSUE (human-memorable
 *   passwords are rejected — use `openssl rand -hex 32`, never a password).
 *   Rotation is non-breaking via BOT_KEY_PEPPER_PREVIOUS (verify current then
 *   previous, opportunistically rehash to current on next successful use).
 *   Legacy static-salt N=16384/N=32768 + sha256 rows still verify via fallback
 *   and are rehashed forward.
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
import { isIpAllowed, lowBalanceTripLine, type IpMode } from "@/lib/bot-key-policy";
import { serviceClient, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/service";

export const BOT_KEY_TAG = "bot4weird_";
/** 32 chars x 62-symbol alphabet = ~190 bits classical, ~95 bits PQ (Grover). */
export const BOT_KEY_SUFFIX_LEN = 32;
/** Legacy suffix length (pre-quantum-hardening rows still verify). */
export const BOT_KEY_SUFFIX_LEN_LEGACY = 20;

export const BOT_SCOPES = [
  "clans:read",
  "clans:join",
  "clans:post",
  "clans:comment",
  "clans:report",
  "identity:read",
  "unitunite:read",
  "unitunite:send",
  "code:submit",
  "code:audit",
  "code:review",
  "vault:read",
  "vault:write",
  "vault:share",
  "vault:quarantine",
  "meshy:generate",
  "meshy:read",
  "ai:autosave",
  "ai:read",
  "vcw:read",
  "vcw:write",
] as const;

export interface BotIdentity {
  userId: string;
  username: string | null;
  humanId: string;
  keyId: string;
  prefix: string;
  /** Scope subset carried by this key (empty = all BOT_SCOPES). */
  scopes: string[];
  /** Logging tier carried by this key (full | half | none). */
  loggingMode: string;
}

const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function pepper(): string {
  const p = process.env.BOT_KEY_PEPPER ?? "";
  // Fail closed: without a pepper the stored hash is a fast unsalted
  // sha256(key) vulnerable to offline brute force on DB leak.
  // 16 chars keeps legacy deploys verifying; 32+ strong-random chars
  // (`openssl rand -hex 32`) is the quantum margin — warn once below that.
  // Human-memorable passwords must never be used: they carry ~30-40 bits of
  // entropy and fall to AI-assisted dictionary guessing after any DB leak.
  if (!p || p.length < 16) {
    throw new Error("BOT_KEY_PEPPER missing or too short (>=16 chars required, 32+ recommended).");
  }
  return p;
}

/** Previous pepper (rotation window): verify-only, never used for new hashes. */
function previousPepper(): string {
  const p = process.env.BOT_KEY_PEPPER_PREVIOUS ?? "";
  return p.length >= 16 ? p : "";
}

/** All peppers to try on verify: current first, previous second (deduped). */
export function allPeppers(): string[] {
  const out: string[] = [];
  const cur = process.env.BOT_KEY_PEPPER ?? "";
  if (cur.length >= 16) out.push(cur);
  const prev = previousPepper();
  if (prev && !out.includes(prev)) out.push(prev);
  return out;
}

/** True when the pepper meets the 256-bit post-quantum margin (>=32 chars). */
export function botPepperQuantumReady(): boolean {
  return (process.env.BOT_KEY_PEPPER ?? "").length >= 32;
}

/**
 * Strength gate for ISSUANCE (state-actor grade): >=32 chars AND looks
 * machine-generated. Rejects human-memorable passwords even at 32+ chars:
 * requires 64-hex (openssl rand -hex 32) OR >=3 of 4 char classes with no
 * 4-in-a-row repeat. Verify-only paths stay at >=16 so rotation never locks
 * out legacy rows; issuance fails closed instead.
 */
export function isStrongPepper(p: string): boolean {
  const v = String(p ?? "");
  if (v.length < 32) return false;
  if (/^[0-9a-f]{64}$/i.test(v)) return true; // openssl rand -hex 32
  if (/^[A-Za-z0-9+/=_-]{43,}$/.test(v) && /(?:[A-Z][\s\S]*[a-z][\s\S]*[0-9]|[0-9][\s\S]*[A-Z][\s\S]*[a-z])/.test(v)) {
    let classes = 0;
    if (/[a-z]/.test(v)) classes += 1;
    if (/[A-Z]/.test(v)) classes += 1;
    if (/[0-9]/.test(v)) classes += 1;
    if (/[^A-Za-z0-9]/.test(v)) classes += 1;
    if (classes >= 3 && !/(.)\1\1\1/.test(v)) return true;
  }
  // Long passphrases: 6+ words still count when 48+ chars (diceware margin).
  if (v.length >= 48 && v.split(/[\s_-]+/).filter(Boolean).length >= 6) return true;
  return false;
}

/** True when the current pepper is strong enough to issue NEW keys. */
export function botPepperIssuanceReady(): boolean {
  return isStrongPepper(process.env.BOT_KEY_PEPPER ?? "");
}

let pepperWarned = false;
/** Log-once guidance when a legacy 16-31 char pepper is in use. */
export function warnLegacyPepper(): void {
  if (pepperWarned || botPepperQuantumReady()) return;
  pepperWarned = true;
  try {
    console.warn("[bot-auth] BOT_KEY_PEPPER <32 chars: rotate to `openssl rand -hex 32` for PQ margin.");
  } catch {
    // logging must never break auth
  }
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

/** Generate a fresh secret: 'bot4weird_' + 32 chars from [A-Za-z0-9] (~190 bits). */
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

/** Pinned PQ KDF cost. N=32768/r=8 needs ~34 MiB, over Node's 32 MiB default
 *  scrypt cap — maxmem is set explicitly (without it every hash THROWS
 *  ERR_CRYPTO_INVALID_SCRYPT_PARAMS and all bot auth fails closed). */
export const SCRYPT_PQ = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/** Per-prefix v2 salt: one rainbow per 8-char bucket, not one for the whole table. */
export function botSaltFor(prefix: string): string {
  return `bot4weird-v2$${String(prefix ?? "").slice(0, 8)}`;
}

/** v2 hash with an explicit pepper (rotation-safe core). */
export function hashBotKeyForPepper(key: string, pepperVal: string): string {
  const prefix = keyPrefix(key);
  return (scryptSync(String(pepperVal) + key, botSaltFor(prefix), 32, { ...SCRYPT_PQ }) as Buffer).toString(
    "hex",
  );
}

/** Stored hash: scrypt(pepper + key, salt=v2$prefix) hex. Slow KDF resists offline brute force. */
export function sha256Hash(key: string): string {
  // Name kept for callers; now per-prefix v2 salt (N=32768,r=8,p=1, 32-byte output).
  // Static-salt v1 (both costs) + legacy sha256 rows still verify via
  // verifyKeyHash fallback across current + previous peppers.
  warnLegacyPepper();
  if (!botPepperIssuanceReady()) {
    // Issuance with a memorable/weak pepper would mint keys an AI farm can
    // crack after any DB leak. Fail closed here too (routes also gate with a
    // JSON 503); verify paths do NOT call this function.
    throw new Error("BOT_KEY_PEPPER must be 32+ strong-random chars to hash new keys.");
  }
  return hashBotKeyForPepper(key, pepper());
}

/** v1 static-salt hash at hardening cost, explicit pepper (verify-only). */
function hashBotKeyV1ForPepper(key: string, pepperVal: string): string {
  return (scryptSync(String(pepperVal) + key, "bot4weird-v1", 32, { ...SCRYPT_PQ }) as Buffer).toString("hex");
}

/** v1 static-salt hash at legacy cost, explicit pepper (verify-only). */
function hashBotKeyV1LegacyCostForPepper(key: string, pepperVal: string): string {
  return (scryptSync(String(pepperVal) + key, "bot4weird-v1", 32, { N: 16384, r: 8, p: 1 }) as Buffer).toString("hex");
}

function legacySha256ForPepper(key: string, pepperVal: string): string {
  try {
    return createHash("sha256").update(String(pepperVal) + key, "utf8").digest("hex");
  } catch {
    return "";
  }
}

function verifyKeyHash(presentedKey: string, storedHex: string): boolean {
  try {
    const a = Buffer.from(storedHex, "hex");
    if (a.length !== 32) return false;
    const peppers = allPeppers();
    // Current v2 per-prefix salt first (steady state: single KDF on hit).
    for (const pv of peppers) {
      try {
        const b = Buffer.from(hashBotKeyForPepper(presentedKey, pv), "hex");
        if (b.length === 32 && timingSafeEqual(a, b)) return true;
      } catch {
        // fall through to older-cost + legacy checks
      }
    }
    for (const pv of peppers) {
      try {
        const old = Buffer.from(hashBotKeyV1ForPepper(presentedKey, pv), "hex");
        if (old.length === 32 && timingSafeEqual(a, old)) return true;
      } catch {
        // fall through
      }
      try {
        const older = Buffer.from(hashBotKeyV1LegacyCostForPepper(presentedKey, pv), "hex");
        if (older.length === 32 && timingSafeEqual(a, older)) return true;
      } catch {
        // fall through to legacy check
      }
      try {
        const legacy = Buffer.from(legacySha256ForPepper(presentedKey, pv), "hex");
        if (legacy.length === 32 && timingSafeEqual(a, legacy)) return true;
      } catch {
        // keep trying next pepper
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** True when the stored row predates the current v2 hash (needs opportunistic rehash). */
function needsRehash(storedHex: string, presentedKey: string): boolean {
  try {
    const a = Buffer.from(storedHex, "hex");
    const cur = process.env.BOT_KEY_PEPPER ?? "";
    if (cur.length < 16) return true;
    const b = Buffer.from(hashBotKeyForPepper(presentedKey, cur), "hex");
    return !(a.length === 32 && b.length === 32 && timingSafeEqual(a, b));
  } catch {
    return true;
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

/**
 * Strict present format: tag + 32 (current) or 20 (legacy) alphanumerics.
 * Checked BEFORE any DB read or KDF so AI-speed garbage cannot burn scrypt
 * CPU (DoS) or probe the prefix-existence oracle cheaply.
 */
export function isValidBotKeyFormat(key: string): boolean {
  const v = String(key ?? "");
  if (!v.startsWith(BOT_KEY_TAG)) return false;
  const suffix = v.slice(BOT_KEY_TAG.length);
  if (suffix.length !== BOT_KEY_SUFFIX_LEN && suffix.length !== BOT_KEY_SUFFIX_LEN_LEGACY) return false;
  return /^[A-Za-z0-9]+$/.test(suffix);
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
  expires_at: string | null;
  max_uses: number;
  use_count: number;
  lifetime_budget: number;
  lifetime_spent: number;
  daily_budget: number;
  daily_spent: number;
  daily_day: string | null;
  hard_stop_enabled: boolean;
  low_balance_floor: number;
  low_balance_pct: number;
  ip_mode: string;
  ip_allowlist: string[];
  ip_blocklist: string[];
  scopes: string[];
  logging_mode: string;
}

const POLICY_COLUMNS =
  "id,user_id,key_hash,revoked,expires_at,max_uses,use_count," +
  "lifetime_budget,lifetime_spent,daily_budget,daily_spent,daily_day," +
  "hard_stop_enabled,low_balance_floor,low_balance_pct," +
  "ip_mode,ip_allowlist,ip_blocklist,scopes,logging_mode";

function todayDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Owner Vibe Coin balance (SUM of coin_ledger deltas). Null on DB error. */
async function ownerCoinBalance(userId: string): Promise<number | null> {
  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("coin_ledger")
      .select("delta")
      .eq("user_id", userId)
      .limit(5000);
    if (error) return null;
    const rows = (data ?? []) as { delta: unknown }[];
    let sum = 0;
    for (const r of rows) sum += Number(r.delta) || 0;
    return Math.round(sum * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Add metered spend (clan fees, log storage, …) to a key's lifetime + daily
 * counters, rolling the daily window. Fire-and-forget safe: never throws.
 */
export async function recordBotKeySpend(keyId: string, coins: number): Promise<void> {
  const amount = Math.round(Number(coins || 0) * 100) / 100;
  if (!keyId || !(amount > 0)) return;
  try {
    const db = serviceClient();
    const { data } = await db
      .from("bot_api_keys")
      .select("lifetime_spent,daily_spent,daily_day")
      .eq("id", keyId)
      .maybeSingle();
    const row = (data ?? {}) as {
      lifetime_spent?: unknown;
      daily_spent?: unknown;
      daily_day?: unknown;
    };
    const day = todayDay();
    const rolled = String(row.daily_day ?? "") !== day;
    await db
      .from("bot_api_keys")
      .update({
        lifetime_spent: Math.round(((Number(row.lifetime_spent) || 0) + amount) * 100) / 100,
        daily_spent: Math.round(((rolled ? 0 : Number(row.daily_spent) || 0) + amount) * 100) / 100,
        daily_day: day,
      })
      .eq("id", keyId);
  } catch {
    // spend accounting must never break the request it meters.
  }
}

/** Scope check against the key's subset (empty subset = all scopes). */
export function keyHasScope(bot: BotIdentity, scope: string): boolean {
  if (!bot.scopes || bot.scopes.length === 0) return true;
  return bot.scopes.includes(scope);
}

function dummyCompare(digest: Buffer): void {
  try {
    // Burn ~1 KDF so unknown-prefix misses cost roughly like a single
    // candidate verify (narrows the prefix-existence timing oracle without
    // burning 100x scrypt like a full bucket scan would).
    try {
      scryptSync(randomBytes(16), "bot4weird-v1", 32, { N: 16384, r: 8, p: 1 });
    } catch {
      // fall through to the cheap compare
    }
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
  if (!raw || !isValidBotKeyFormat(raw)) {
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
      .select(POLICY_COLUMNS)
      .eq("prefix", prefix)
      .limit(100);
    if (error) {
      dummyCompare(Buffer.alloc(32, 0));
      return null;
    }
    candidates = ((data ?? []) as unknown as KeyCandidate[]).filter(
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

  // ---- Power-manager policy enforcement (all denials collapse to null:
  // ---- the route layer answers the uniform "Invalid credentials."). ----
  const now = Date.now();
  if (matched.expires_at && Date.parse(matched.expires_at) <= now) return null;
  if (Number(matched.max_uses) > 0 && Number(matched.use_count) >= Number(matched.max_uses)) {
    return null;
  }
  try {
    const mode = (matched.ip_mode === "allowlist" || matched.ip_mode === "blocklist"
      ? matched.ip_mode
      : "disabled") as IpMode;
    if (
      !isIpAllowed(
        clientIp(req),
        mode,
        Array.isArray(matched.ip_allowlist) ? matched.ip_allowlist : [],
        Array.isArray(matched.ip_blocklist) ? matched.ip_blocklist : [],
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }
  // Daily window rolls over at UTC midnight: a stale daily_day means today's
  // spend is 0, even before the fire-and-forget counter catches up.
  const effectiveDaily =
    String(matched.daily_day ?? "") === todayDay() ? Number(matched.daily_spent) || 0 : 0;
  if (Number(matched.lifetime_budget) > 0 && Number(matched.lifetime_spent) >= Number(matched.lifetime_budget)) {
    return null;
  }
  if (Number(matched.daily_budget) > 0 && effectiveDaily >= Number(matched.daily_budget)) {
    return null;
  }
  if (matched.hard_stop_enabled) {
    const floor = Number(matched.low_balance_floor) || 0;
    const pct = Number(matched.low_balance_pct);
    const balance = await ownerCoinBalance(matched.user_id);
    // Fail closed when the balance cannot be read and a floor is set.
    if (balance === null) {
      if (floor > 0) return null;
    } else if (balance <= lowBalanceTripLine(floor, Number.isFinite(pct) ? pct : 10)) {
      return null;
    }
  }

  try {
    const db = serviceClient();
    // Fire-and-forget usage counters + opportunistic PQ rehash; never blocks
    // or fails the request. Rehash upgrades legacy N=16384/sha256 rows to
    // N=32768 on successful use (no forced rotation, no lockout).
    try {
      const day = todayDay();
      const rolled = String(matched.daily_day ?? "") !== day;
      const patch: Record<string, unknown> = {
        last_used_at: new Date().toISOString(),
        use_count: (Number(matched.use_count) || 0) + 1,
        daily_spent: rolled ? 0 : Number(matched.daily_spent) || 0,
        daily_day: day,
      };
      try {
        if (needsRehash(matched.key_hash, raw)) patch.key_hash = sha256Hash(raw);
      } catch {
        // keep counters even when rehash fails
      }
      void db
        .from("bot_api_keys")
        .update(patch)
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
      scopes: Array.isArray(matched.scopes) ? matched.scopes : [],
      loggingMode:
        matched.logging_mode === "full" || matched.logging_mode === "none"
          ? matched.logging_mode
          : "half",
    };
  } catch {
    return null;
  }
}

/** Stricter-than-human throttles for bot traffic — with an unlimited lane
 * for the owner's own automation.
 *
 * - `x-selftest-token: SELFTEST_BYPASS_TOKEN` (the AI testing its own
 *   website) → fully unlimited: returns allowed without touching budgets.
 *   The daily bonus never honors this (it passes allowTrustedMachine:false
 *   to the BotID gate), so self-test cannot mint free coins.
 * - Own `bot4weird_` keys → generous ceilings (600/min reads, 120/min
 *   writes): effectively "as many actions as they want" for testing and
 *   play. Coin fees, key budgets, and Valley Net remain the real throttles.
 */
export function botRateLimit(req: Request, kind: "read" | "write", keyId = "") {
  try {
    const secret = process.env.SELFTEST_BYPASS_TOKEN ?? "";
    if (secret) {
      const header = (req.headers.get("x-selftest-token") ?? "").trim();
      if (header && header.length === secret.length) {
        const ah = createHash("sha256").update(header, "utf8").digest();
        const bh = createHash("sha256").update(secret, "utf8").digest();
        if (ah.length === bh.length && timingSafeEqual(ah, bh)) {
          return { allowed: true, retryAfter: 0 };
        }
      }
    }
  } catch {
    // Self-test check must never break normal throttling.
  }
  const limit = kind === "read" ? 600 : 120;
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

/**
 * Restricted bot-tester session marker (POST /api/bot/login email+password
 * path). The login sets an httpOnly `bot_tester=1` cookie next to the
 * Supabase session; profile writes and destructive routes refuse any
 * request carrying it, so a bot given tester credentials can play/test but
 * can never change the user profile or destroy anything.
 */
export const BOT_TESTER_COOKIE = "bot_tester";

/** True when the request carries the bot-tester marker cookie. */
export function isBotTester(req: Request): boolean {
  try {
    const header = req.headers.get("cookie") ?? "";
    if (!header) return false;
    for (const part of header.split(";")) {
      const [name, ...rest] = part.split("=");
      if (name.trim() === BOT_TESTER_COOKIE && rest.join("=").trim() === "1") return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Uniform refusal for bot-tester sessions on profile/destructive routes. */
export function botTesterBlocked(): string {
  return "Bot tester sessions cannot change the user profile or perform destructive actions.";
}
