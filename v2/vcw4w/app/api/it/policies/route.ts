import {
  BLOCKED_CATEGORIES_DEFAULT,
  POLICY_TEMPLATES,
  guardrailMessage,
  isAppAllowed,
} from "@/lib/it-policy";
import { fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { MONITORING_NOTICE } from "@/lib/it-command";
import { rateLimit } from "@/lib/rate-limit";
import { bodyByteSize, clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/it/policies — public policy templates + default blocked list, no auth.
// POST /api/it/policies { check } — public allow-check, no auth.
// Abuse hardening: per-IP throttles (60 GET / 20 POST per min), strict
// input validation, generic errors (no stack leaks).

const CHECK_MAX = 80;
const BODY_MAX_BYTES = 8192;

// True when v holds a C0 control (except tab/LF/CR) or DEL.
function hasBadControl(v: string): boolean {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c === 127) return true;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) return true;
  }
  return false;
}

// True when v holds at least one printable char: rejects empty,
// whitespace-only, and control-char-only input.
function hasVisible(v: string): boolean {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c > 32 && c !== 127) return true;
  }
  return false;
}

function cleanCheck(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length < 1 || v.length > CHECK_MAX) return null;
  if (hasBadControl(v)) return null;
  if (!hasVisible(v)) return null;
  return v;
}

function limited(scope: string, req: Request, limit: number) {
  const rl = rateLimit(`${scope}:${clientIp(req)}`, limit, 60_000);
  if (rl.allowed) return null;
  return fail("Rate limited. Try again shortly.", 429, {
    "Retry-After": String(Math.max(1, rl.retryAfter)),
  });
}

// GET /api/it/policies — public policy templates + default blocked list, no auth.
export async function GET(req: Request) {
  try {
    const denied = limited("it-policies-get", req, 60);
    if (denied) return denied;
    return ok({
      templates: POLICY_TEMPLATES,
      blockedDefault: BLOCKED_CATEGORIES_DEFAULT,
    });
  } catch {
    return fail("Failed to load policies.");
  }
}

// POST /api/it/policies { check } — public allow-check, no auth.
export async function POST(req: Request) {
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  try {
    const denied = limited("it-policies-post", req, 20);
    if (denied) return denied;
    const body = (await req.json().catch(() => null)) as { check?: unknown } | null;
    if (!body || bodyByteSize(body) > BODY_MAX_BYTES) {
      return fail("Request body too large.", 413);
    }
    const check = cleanCheck(body.check);
    if (!check) return fail("Provide an app slug or category to check (1-80 characters).", 400);
    return ok({
      allowed: isAppAllowed(check),
      message: guardrailMessage(check),
      notice: MONITORING_NOTICE,
    });
  } catch {
    return fail("Failed to check policy.");
  }
}
