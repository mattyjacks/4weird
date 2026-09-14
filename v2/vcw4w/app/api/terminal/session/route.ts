import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  TERMINAL_SESSION_COOKIE,
  createSession,
  destroySession,
  getSession,
  parseTarget,
  sessionCookieOptions,
  verifyPairCode,
} from "@/app/api/terminal/_lib/store";

/**
 * Terminal ↔ desktop session endpoints (DS-OCT-04, web lane).
 *
 * GET /api/terminal/session — link status: { linked, target?, linkedAt? }.
 *   Never 500s: a missing/expired session reads as { linked: false }.
 * POST /api/terminal/session — pair ({ code }) OR direct-link
 *   ({ target: "virtual|<uuid>" | "mock" }) from the same-origin browser
 *   (user consent = being logged into the browser tab). Sets the opaque
 *   httpOnly session cookie. Codes are one-time and burn on first use.
 * DELETE /api/terminal/session — unlink: clears the cookie + session.
 *
 * No pairing codes, tokens, or cookie values are ever written to logs.
 */

async function readStatus() {
  try {
    const jar = await cookies();
    const sid = jar.get(TERMINAL_SESSION_COOKIE)?.value;
    const s = getSession(sid);
    if (!s) return ok({ linked: false });
    return ok({
      linked: true,
      target: s.target.label,
      kind: s.target.kind,
      linkedAt: new Date(s.createdAt).toISOString(),
    });
  } catch {
    return ok({ linked: false });
  }
}

export async function GET() {
  return readStatus();
}

export async function POST(req: Request) {
  const rl = rateLimit(`terminal:session:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  // Path 1: one-time pairing code (desktop app flow, mock loopback flow).
  if (typeof input.code === "string" && input.code.trim()) {
    const target = verifyPairCode(input.code);
    if (!target) {
      return fail("Unknown or expired pairing code. Issue a fresh one and retry: desktop pair issue", 401);
    }
    const sid = createSession(target);
    try {
      const jar = await cookies();
      jar.set(TERMINAL_SESSION_COOKIE, sid, sessionCookieOptions());
    } catch {
      return fail("Unable to store the session. Retry shortly.", 500);
    }
    return ok({ linked: true, target: target.label, kind: target.kind });
  }

  // Path 2: direct link of an already-owned virtual desktop (or the mock
  // loopback) from the same-origin browser tab. No code needed: the
  // browser session itself is the consent. Pod control itself stays in
  // the authenticated /api/desktop/* routes (read-only reuse, untouched).
  if (typeof input.target === "string" && input.target.trim()) {
    const target = parseTarget(input.target);
    if (!target) {
      return fail('Invalid target. Use "virtual|<desktop-id>" or "mock".', 400);
    }
    if (target.kind === "local") {
      return fail("A user desktop app must pair with a one-time code: desktop pair <code>", 400);
    }
    const sid = createSession(target);
    try {
      const jar = await cookies();
      jar.set(TERMINAL_SESSION_COOKIE, sid, sessionCookieOptions());
    } catch {
      return fail("Unable to store the session. Retry shortly.", 500);
    }
    return ok({ linked: true, target: target.label, kind: target.kind });
  }

  return fail("Provide { code } to pair or { target } to link.", 400);
}

export async function DELETE(req: Request) {
  const rl = rateLimit(`terminal:session:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  try {
    const jar = await cookies();
    destroySession(jar.get(TERMINAL_SESSION_COOKIE)?.value);
    jar.delete(TERMINAL_SESSION_COOKIE);
  } catch {
    // best-effort: unlink is idempotent, never 500s on cookie trouble.
  }
  return ok({ linked: false });
}
