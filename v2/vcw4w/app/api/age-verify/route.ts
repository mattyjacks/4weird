import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "node:crypto";
import { sameOrigin } from "@/lib/csrf";
import { checkDob } from "@/lib/age-gate";
import {
  SERVER_BAND_LABEL,
  allowedServerBandsFor,
  isServerAgeBand,
  type ServerAgeBand,
} from "@/lib/mmo-age";

/**
 * POST /api/age-verify — band-attestation issuer for MMORPG server entry.
 *
 * Body: { dob: "YYYY-MM-DD" } -> sets an httpOnly signed `mmo-band-attest`
 * cookie carrying ONLY the derived band (kids|teens|adults) + expiry, then
 * responds { band, allowedBands }. The date of birth is used once, purely in
 * memory, to derive the band and is NEVER persisted (no DB, no logs, no
 * localStorage, no cookie payload), never forwarded to any other service,
 * and never echoed back in any response. Only the band attestation leaves
 * this route.
 *
 * GET /api/age-verify — returns the currently attested band from the signed
 * cookie: { band, allowedBands } or { band: null } when absent/invalid.
 *
 * DELETE /api/age-verify — clears the attestation cookie (Try Again / reset).
 *
 * RANK RULE (mirrors lib/mmo-age.ts canEnterServer, rank(player) >=
 * rank(server)): adults (rank 2) enter all servers, teens (rank 1) enter
 * kids + teens servers, kids (rank 0) and unattested guests enter kids
 * servers only. Guests fail CLOSED to the kids band — see
 * `attestedBandAllows`. lib/mmo-age.ts itself is owned by the AGE10 crew and
 * is imported read-only here, never re-landed.
 *
 * JOIN-API RE-CHECK: server join routes (e.g. POST /api/mmorpg/join, owned by
 * other lanes — wiring requested via QUEUE, not edited here) must call
 * `readAttestedBand(req)` and deny when it disagrees with the caller's
 * claimed band. Never trust a client-sent `playerBand` alone.
 */

const COOKIE_NAME = "mmo-band-attest";
const COOKIE_TTL_SECONDS = 12 * 60 * 60; // 12h attestation window

/** Rank for the entry rule: rank(player) >= rank(server) admits. */
export const MMO_BAND_RANK: Record<ServerAgeBand, number> = {
  kids: 0,
  teens: 1,
  adults: 2,
};

/**
 * Signing secret: explicit env in prod, otherwise an ephemeral per-process
 * secret (attestations survive only until restart — fail-closed across
 * deploys, never a checked-in forgeable fallback). No secrets are committed.
 */
const ATTEST_SECRET: string =
  process.env.MMO_AGE_ATTEST_SECRET && process.env.MMO_AGE_ATTEST_SECRET.length >= 16
    ? process.env.MMO_AGE_ATTEST_SECRET
    : randomBytes(32).toString("hex");

function sign(band: ServerAgeBand, exp: number): string {
  return createHmac("sha256", ATTEST_SECRET).update(`${band}.${exp}`).digest("hex");
}

function buildToken(band: ServerAgeBand): { value: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  return { value: `${band}.${exp}.${sign(band, exp)}`, exp };
}

/**
 * Verify a raw cookie value. Returns the band on a valid unexpired
 * signature, else null (fail-closed: forged/expired/malformed -> no band).
 */
export function verifyAttestedToken(raw: string | null | undefined): ServerAgeBand | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [band, expRaw, sig] = parts as [string, string, string];
  if (!isServerAgeBand(band)) return null;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp * 1000 <= Date.now()) return null;
  const expected = sign(band, exp);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i += 1) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  return band;
}

/**
 * Server-side re-check helper for join routes: read the request's
 * attestation cookie and return its band, or null for guests/forgeries.
 * Join handlers must treat null as kids-only (never as "no restriction").
 */
export function readAttestedBand(req: NextRequest | Request): ServerAgeBand | null {
  const raw =
    req instanceof NextRequest
      ? (req.cookies.get(COOKIE_NAME)?.value ?? null)
      : (req.headers.get("cookie") ?? "")
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${COOKIE_NAME}=`))
          ?.slice(COOKIE_NAME.length + 1) ?? null;
  return verifyAttestedToken(raw ? decodeURIComponent(raw) : null);
}

/**
 * Rank comparison for an attested-or-guest viewer against a server band:
 * guests (null) enter kids servers only. Equivalent to lib/mmo-age.ts
 * canEnterServer with null mapped to kids — the single convergence point for
 * "unverified means kids-only".
 */
export function attestedBandAllows(
  attested: ServerAgeBand | null,
  serverBand: ServerAgeBand,
): boolean {
  const viewer: ServerAgeBand = attested ?? "kids";
  return MMO_BAND_RANK[viewer] >= MMO_BAND_RANK[serverBand];
}

/** Derive the band from a DOB purely in memory (nothing stored). */
function bandForDob(dobISO: string): ServerAgeBand | null {
  if (typeof dobISO !== "string") return null;
  if (checkDob(dobISO, 18).ok) return "adults";
  if (checkDob(dobISO, 13).ok) return "teens";
  // A well-formed but under-13 DOB is kids; garbage/future is null (400).
  if (checkDob(dobISO, 0).ok) return "kids";
  return null;
}

function attestResponse(band: ServerAgeBand | null, status: number) {
  const res = NextResponse.json(
    band
      ? {
          band,
          label: SERVER_BAND_LABEL[band],
          allowedBands: allowedServerBandsFor(band),
        }
      : { band: null, allowedBands: ["kids"] as ServerAgeBand[] },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
  return res;
}

export async function POST(req: NextRequest) {
  // Cookie-state mutation (issues the signed httpOnly attestation cookie):
  // a cross-site POST could otherwise plant an attacker-chosen band
  // (e.g. adults) on the victim's browser and bypass the age gate.
  // Fail closed: missing Origin AND Referer is rejected (lib/csrf.ts).
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { band: null, reason: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { band: null, reason: "Request body must be valid JSON." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const { dob } = (body ?? {}) as Record<string, unknown>;
  // The DOB below is used once in memory to derive the band, then dropped
  // with this request scope: never written to any store, log, or cookie,
  // never forwarded, never echoed in the response.
  const band = bandForDob(typeof dob === "string" ? dob : "");
  if (!band) {
    return NextResponse.json(
      { band: null, reason: "dob must be a valid past date as YYYY-MM-DD." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const res = attestResponse(band, 200);
  const { value } = buildToken(band);
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_TTL_SECONDS,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const band = readAttestedBand(req);
  return attestResponse(band, band ? 200 : 401);
}

export async function DELETE(req: NextRequest) {
  // Cookie-state mutation (clears the attestation cookie): same CSRF bar
  // as POST so a cross-site request cannot downgrade/reset the victim.
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { band: null, reason: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const res = NextResponse.json(
    { band: null, cleared: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
