import { NextResponse } from "next/server";

/**
 * Shared JSON helpers for API routes ported from the legacy auth-app.
 *
 * Success payloads carry `success: true` alongside the data fields so both
 * the legacy static-site callers and the v2 Next.js components (which read
 * fields like `balance`, `rows`, `profile`, `saves`, `claimed` directly)
 * keep working against this single deploy. Errors carry
 * `{ success: false, error }`, which the v2 dashboard also reads via
 * `body.error`.
 */

const noStore = { "Cache-Control": "private, no-store" };

export function ok(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json({ success: true, ...body }, {
    status,
    headers: { ...noStore, ...extraHeaders },
  });
}

export function fail(
  message: string,
  status = 500,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { success: false, error: String(message).slice(0, 200) },
    { status, headers: { ...noStore, ...extraHeaders } },
  );
}
