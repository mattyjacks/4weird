/**
 * Fridge v2 cloud-save session bridge (DS-FRIDGE-05, games lane).
 *
 * Serializes the SAME FridgeSession mobile <-> desktop against
 * `GET/PUT/DELETE /api/saves?game=&slot=` (see app/api/saves/route.ts):
 * - slots 0-3 only; payloads must stay <= 1 MiB (413 above that).
 * - slot 0 is the cheat-proof safety slot: the API strips any client-supplied
 *   `cheat_mode` marker there, and a DB trigger enforces the same invariant.
 * - DELETE is revoked at the DB layer (410 from the client): a cheated save
 *   must never be laundered via delete/recreate.
 * - `data` must be a plain JSON object (strict shape allowlist, DS-SEC-GAMES-01).
 *
 * Pure TypeScript: no imports, no DOM, no secrets. SSR-safe — safe to import
 * from server components, route handlers, and the fridgesimulator bundle
 * glue (window.FridgeCloudSave).
 */

/** One fridge simulator run's portable state. */
export type FridgeSession = {
  /** In-game day counter (>= 1). */
  day: number;
  /** Player cash balance (can go negative on a bad day). */
  money: number;
  /** Total run deaths (fridge wipe-outs). */
  deaths: number;
  /** Stocked food counts by food slug, e.g. `{ apple: 3, pizza: 1 }`. */
  inventory: Record<string, number>;
  /** Unlocked/visited country codes or names. */
  countries: string[];
  /** Last-write epoch millis; drives mergeSessions (newest wins). */
  updatedAt: number;
};

/** Byte cap mirroring `maxBytes` in app/api/saves/route.ts (413 above it). */
export const FRIDGE_MAX_SAVE_BYTES = 1024 * 1024;

/** Fail-open defaults for a fresh run. */
export const DEFAULT_FRIDGE_SESSION: FridgeSession = {
  day: 1,
  money: 0,
  deaths: 0,
  inventory: {},
  countries: [],
  updatedAt: 0,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function utf8Bytes(text: string): number {
  try {
    // TextEncoder is global in browsers, Node >= 11, and edge runtimes.
    return new TextEncoder().encode(text).length;
  } catch {
    // Fallback: worst-case UTF-8 length estimate without globals.
    let bytes = 0;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          i += 1;
        } else bytes += 3;
      } else bytes += 3;
    }
    return bytes;
  }
}

function sanitizeInventory(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (key.length === 0 || key.length > 128) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (!isFiniteNumber(count)) continue;
    out[key] = count;
  }
  return out;
}

function sanitizeCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    if (entry.length === 0 || entry.length > 128) continue;
    out.push(entry);
  }
  return out;
}

/** Fail-open field normalization shared by deserialize + merge. */
function normalizeSession(value: FridgeSession): FridgeSession {
  const day = Math.floor(toFiniteNumber(value?.day, DEFAULT_FRIDGE_SESSION.day));
  const money = toFiniteNumber(value?.money, DEFAULT_FRIDGE_SESSION.money);
  const deathsRaw = Math.floor(toFiniteNumber(value?.deaths, DEFAULT_FRIDGE_SESSION.deaths));
  return {
    day: day >= 1 ? day : 1,
    money,
    deaths: deathsRaw >= 0 ? deathsRaw : 0,
    inventory: sanitizeInventory(value?.inventory),
    countries: sanitizeCountries(value?.countries),
    updatedAt: toFiniteNumber(value?.updatedAt, DEFAULT_FRIDGE_SESSION.updatedAt),
  };
}

/**
 * Serialize a session to the JSON string stored as `data` in /api/saves.
 * Throws when the UTF-8 payload exceeds 1 MiB (the API would 413 it).
 */
export function serializeFridgeSession(session: FridgeSession): string {
  const clean = normalizeSession(session);
  const json = JSON.stringify(clean);
  if (utf8Bytes(json) > FRIDGE_MAX_SAVE_BYTES) {
    throw new Error(
      `FridgeSession exceeds ${FRIDGE_MAX_SAVE_BYTES} bytes and cannot be cloud-saved.`,
    );
  }
  return json;
}

/**
 * Parse a stored JSON string back into a FridgeSession.
 * Fail-open: any malformed input, wrong shape, or bad field falls back to
 * DEFAULT_FRIDGE_SESSION values per-field — never throws, never bricks load.
 */
export function deserializeFridgeSession(json: string): FridgeSession {
  if (typeof json !== "string" || json.length === 0) return { ...DEFAULT_FRIDGE_SESSION };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ...DEFAULT_FRIDGE_SESSION };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ...DEFAULT_FRIDGE_SESSION };
  }
  return normalizeSession(parsed as FridgeSession);
}

/**
 * Pick the winning session between a local and a remote copy.
 * Newest `updatedAt` wins; ties go to remote (cloud is the tie-breaker so
 * two devices converge). Inputs are normalized fail-open; the winner is
 * returned as a fresh copy. Non-finite/missing timestamps count as 0.
 */
export function mergeSessions(local: FridgeSession, remote: FridgeSession): FridgeSession {
  const a = normalizeSession(local);
  const b = normalizeSession(remote);
  const winner = b.updatedAt >= a.updatedAt ? b : a;
  return {
    day: winner.day,
    money: winner.money,
    deaths: winner.deaths,
    inventory: { ...winner.inventory },
    countries: [...winner.countries],
    updatedAt: winner.updatedAt,
  };
}
