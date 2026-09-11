import { NextResponse } from "next/server";

/**
 * Capped JSON body reader for mutating API routes (DoS hardening).
 *
 * SERVER-ONLY (imports next/server): route handlers only, never import from
 * a client component.
 *
 * Why: `await req.json()` parses an unbounded body into memory before any
 * field-level cap runs. An attacker can POST megabytes of JSON to burn
 * CPU/RAM per request (JSON.parse of a huge body blocks the event loop).
 * This helper rejects oversize bodies with 413 BEFORE parsing, using the
 * Content-Length pre-check plus a post-read length check (length lies are
 * caught by the second gate). Empty/unparseable bodies keep the legacy
 * 400 "Invalid JSON body." so callers' error contracts don't change.
 */

export type CappedJson =
  | { body: unknown }
  | { error: NextResponse };

export async function readCappedJson(req: Request, maxBytes = 16 * 1024): Promise<CappedJson> {
  const noStore = { "Cache-Control": "private, no-store" };
  const tooLarge = () =>
    NextResponse.json({ success: false, error: "Request body too large." }, { status: 413, headers: noStore });
  const badJson = () =>
    NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400, headers: noStore });
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return { error: tooLarge() };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: badJson() };
  }
  if (!text || text.length > maxBytes) {
    return { error: text ? tooLarge() : badJson() };
  }
  try {
    return { body: JSON.parse(text) as unknown };
  } catch {
    return { error: badJson() };
  }
}
