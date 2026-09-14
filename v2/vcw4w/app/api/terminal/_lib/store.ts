/**
 * Terminal → desktop relay store (DS-OCT-04, web lane).
 *
 * Server-only, in-memory pairing-code + session store backing
 * app/api/terminal/*. Colocated under _lib so it is never a route
 * (underscore-prefixed segments are excluded from App Router routing).
 *
 * Security notes:
 * - Pairing codes are one-time, TTL-bound, and stored only as SHA-256
 *   hashes. Raw codes are NEVER logged (log lines carry no code material).
 * - Sessions are random 128-bit ids carried in an httpOnly cookie;
 *   the cookie value is an opaque key, never the session payload.
 * - Single-process memory: dev + single-instance deploys round-trip.
 *   A lookup miss fails OPEN as "unpaired" (never throws, never 500s).
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const TERMINAL_SESSION_COOKIE = "terminal_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PAIR_CODE_TTL_MS = 10 * 60 * 1000;

export type TerminalTargetKind = "virtual" | "local" | "mock";

export interface TerminalTarget {
  kind: TerminalTargetKind;
  /** Virtual-desktop row id (uuid), "loopback" for mock, or device label. */
  ref: string | null;
  label: string;
}

interface PairEntry {
  hash: Buffer;
  target: TerminalTarget;
  expiresAt: number;
  consumed: boolean;
}

interface SessionEntry {
  target: TerminalTarget;
  createdAt: number;
  lastSeenAt: number;
}

const pairCodes = new Map<string, PairEntry>();
const sessions = new Map<string, SessionEntry>();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hashCode(code: string): Buffer {
  return createHash("sha256").update(code, "utf8").digest();
}

function prune(now: number): void {
  for (const [id, e] of pairCodes) {
    if (e.consumed || e.expiresAt <= now) pairCodes.delete(id);
  }
  for (const [id, s] of sessions) {
    if (s.lastSeenAt + SESSION_TTL_MS <= now) sessions.delete(id);
  }
  // Memory cap: keep the maps bounded under abuse.
  if (pairCodes.size > 500) {
    const oldest = [...pairCodes.keys()].slice(0, pairCodes.size - 500);
    for (const k of oldest) pairCodes.delete(k);
  }
  if (sessions.size > 2000) {
    const oldest = [...sessions.keys()].slice(0, sessions.size - 2000);
    for (const k of oldest) sessions.delete(k);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const bytes = randomBytes(8);
  let raw = "";
  for (const b of bytes) raw += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/**
 * Parse a link target such as "virtual|<uuid>", "virtual|mock",
 * "local", or "mock". Returns null when the descriptor is malformed.
 * Never throws.
 */
export function parseTarget(input: unknown): TerminalTarget | null {
  const text = String(input ?? "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === "mock") {
    return { kind: "mock", ref: "loopback", label: "mock loopback (local test session)" };
  }
  if (lower === "local") {
    return { kind: "local", ref: null, label: "user desktop app (pairing required)" };
  }
  const pipe = text.indexOf("|");
  if (pipe > 0) {
    const kind = text.slice(0, pipe).toLowerCase();
    const ref = text.slice(pipe + 1).trim();
    if (kind === "virtual" && ref.toLowerCase() === "mock") {
      return { kind: "mock", ref: "loopback", label: "mock loopback (local test session)" };
    }
    if (kind === "virtual" && UUID_RE.test(ref)) {
      return { kind: "virtual", ref, label: `virtual desktop ${ref.slice(0, 8)}…` };
    }
    return null;
  }
  if (lower === "virtual") return null; // needs a ref: virtual|<id>
  return null;
}

/** Issue a one-time pairing code bound to a target. Never logs the code. */
export function issuePairCode(target: TerminalTarget): { code: string; expiresAt: number } {
  const now = Date.now();
  prune(now);
  const code = makeCode();
  const id = randomUUID();
  pairCodes.set(id, {
    hash: hashCode(code),
    target,
    expiresAt: now + PAIR_CODE_TTL_MS,
    consumed: false,
  });
  return { code, expiresAt: now + PAIR_CODE_TTL_MS };
}

/**
 * Verify a one-time code with constant-time comparison. Consumes the code
 * on success. Returns the bound target or null. Never logs the code.
 */
export function verifyPairCode(code: unknown): TerminalTarget | null {
  const text = String(code ?? "").trim().toUpperCase();
  if (!text || text.length > 32) return null;
  const now = Date.now();
  prune(now);
  const candidate = hashCode(text);
  for (const [, e] of pairCodes) {
    if (e.consumed || e.expiresAt <= now) continue;
    if (e.hash.length !== candidate.length) continue;
    let match = false;
    try {
      match = timingSafeEqual(e.hash, candidate);
    } catch {
      match = false;
    }
    if (match) {
      e.consumed = true;
      return e.target;
    }
  }
  return null;
}

/** Create a session for an already-authorized target. Returns the opaque id. */
export function createSession(target: TerminalTarget): string {
  prune(Date.now());
  const id = randomUUID();
  const now = Date.now();
  sessions.set(id, { target, createdAt: now, lastSeenAt: now });
  return id;
}

/** Look up a session. Misses fail open as null (unpaired), never throw. */
export function getSession(id: unknown): SessionEntry | null {
  const key = String(id ?? "").trim();
  if (!key || key.length > 128) return null;
  const s = sessions.get(key);
  if (!s) return null;
  if (s.lastSeenAt + SESSION_TTL_MS <= Date.now()) {
    sessions.delete(key);
    return null;
  }
  s.lastSeenAt = Date.now();
  return s;
}

/** Destroy a session. Always succeeds (idempotent). */
export function destroySession(id: unknown): void {
  const key = String(id ?? "").trim();
  if (key) sessions.delete(key);
}

/** Cookie flags for the opaque session id: httpOnly, never carries secrets. */
export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
