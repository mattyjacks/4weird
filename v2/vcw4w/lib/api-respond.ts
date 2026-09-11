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

type DbErrorShape = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

/**
 * Database-failure responder. Logs the real Postgres/PostgREST error
 * server-side (code + message + details, truncated) so Vercel/server logs
 * always show WHY a query failed, while the client gets a stable public
 * message; raw PG text (constraint names, schema hints) must never leak to
 * browsers, where it both confuses players and aids probing.
 */
export function dbFail(
  route: string,
  error: unknown,
  publicMessage = "Backend temporarily unavailable. Try again shortly.",
  status = 500,
): NextResponse {
  const e = (error ?? {}) as DbErrorShape;
  console.error(`[api] ${route} db error`, {
    code: String(e.code ?? "").slice(0, 16),
    message: String(e.message ?? error ?? "unknown").slice(0, 300),
    details: String(e.details ?? "").slice(0, 300),
    hint: String(e.hint ?? "").slice(0, 200),
  });
  return fail(publicMessage, status);
}

/**
 * RPC-failure router. Our SECURITY DEFINER RPCs raise validation failures
 * with plain `raise exception`, which PostgREST surfaces as code P0001 -
 * those map to client statuses via rpcStatus(). ANY other code (23503
 * foreign-key, 42P01 undefined table, PGRST*, …) is a database-side fault:
 * log it via dbFail and return 500 instead of leaking PG internals with a
 * misleading 400.
 */
export function rpcFail(
  route: string,
  error: { code?: string; message?: string } | null,
  toStatus: (message: string) => number,
  fallbackMessage = "Backend temporarily unavailable. Try again shortly.",
): NextResponse {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  if (code === "P0001" || code === "") return fail(message || fallbackMessage, toStatus(message));
  return dbFail(route, error, fallbackMessage, 500);
}
