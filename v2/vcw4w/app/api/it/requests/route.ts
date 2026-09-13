import { MONITORING_NOTICE, type AppRequest } from "@/lib/it-command";
import { fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { rateLimit } from "@/lib/rate-limit";
import { globalBucket, ipBucketKey, throttleHeaders } from "@/lib/abuse-limit";
import { bodyByteSize, clampLimit, clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Demo-safe, monitored: no auth. In-memory only (resets on redeploy).
// No DB writes; Boss/IT review pending requests in logs.
// Abuse hardening: per-IP throttles (60 GET / 20 POST per min), strict
// input validation, generic errors (no stack leaks).

type StoredRequest = AppRequest & { at: string };

const requests: StoredRequest[] = [];
const MAX_REQUESTS = 100;
const APP_NAME_MAX = 80;
const REASON_MAX = 500;
const BODY_MAX_BYTES = 8192;

// True when v holds a C0 control (except tab/LF/CR, so multiline reasons
// stay legal) or DEL.
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

function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length === 0 || v.length > max) return null;
  if (hasBadControl(v)) return null;
  if (!hasVisible(v)) return null;
  return v;
}

// Secret-material guard: requests are stored in-memory and re-served via
// GET to anyone, so a pasted key/token would persist and leak to strangers.
// Reject credential-looking input with a generic 400 that never echoes the
// value and never logs it.
function looksLikeSecret(v: string): boolean {
  const s = String(v ?? "");
  if (
    /bot4weird_|vcw_live_|vcw-gateway|sb_secret_|sb_publishable_|service_role|sk-(live|proj|test)-|xox[bap]-|gh[op]_|github_pat_|sk-ant-|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{10,}/i.test(
      s,
    )
  ) {
    return true;
  }
  if (/(api[_-]?key|secret|token|password|passwd|pepper|private[_-]?key|bearer|authorization)\s*[:=]/i.test(s)) {
    return true;
  }
  // One 32+ char high-entropy token (key/hash material, no spaces).
  if (/[A-Za-z0-9+/=_-]{32,}/.test(s)) return true;
  return false;
}

function limited(scope: string, req: Request, limit: number) {
  const rl = rateLimit(`${scope}:${clientIp(req)}`, limit, 60_000);
  if (rl.allowed) return null;
  return fail("Rate limited. Try again shortly.", 429, {
    "Retry-After": String(Math.max(1, rl.retryAfter)),
  });
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}`;
  }
}

// GET /api/it/requests — list pending app requests (newest first).
export async function GET(req: Request) {
  try {
    const denied = limited("it-requests-get", req, 60);
    if (denied) return denied;
    // Abuse hardening: cap list length (max 100); store itself caps at 100.
    const limit = clampLimit(new URL(req.url).searchParams.get("limit"), MAX_REQUESTS, 100);
    const sliced = requests.slice(0, limit);
    return ok({ requests: sliced, count: sliced.length, total: requests.length, notice: MONITORING_NOTICE });
  } catch {
    return fail("Failed to load requests.");
  }
}

// POST /api/it/requests — { appName (2-80), reason (5-500) }.
export async function POST(req: Request) {
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  try {
    const denied = limited("it-requests-post", req, 20);
    if (denied) return denied;
    // Distributed shield: the in-memory store is per instance, so cap spam
    // across all instances too (keeps one botnet from stuffing every replica).
    const postDist = await globalBucket(ipBucketKey(req, "it-requests-post"), 100, 3600);
    if (postDist && !postDist.allowed) {
      return fail("Rate limited. Try again shortly.", 429, throttleHeaders(postDist.retryAfter));
    }
    const body = (await req.json().catch(() => null)) as {
      appName?: unknown;
      reason?: unknown;
    } | null;
    if (!body || bodyByteSize(body) > BODY_MAX_BYTES) {
      return fail("Request body too large.", 413);
    }
    const appName = cleanField(body.appName, APP_NAME_MAX);
    if (!appName || appName.length < 2) {
      return fail("appName must be 2-80 characters.", 400);
    }
    if (looksLikeSecret(appName)) {
      return fail("Do not include secrets, keys, or tokens in request fields.", 400);
    }
    const reason = cleanField(body.reason, REASON_MAX);
    if (!reason || reason.length < 5) {
      return fail("reason must be 5-500 characters.", 400);
    }
    if (looksLikeSecret(reason)) {
      return fail("Do not include secrets, keys, or tokens in request fields.", 400);
    }

    const request: StoredRequest = {
      id: newId(),
      appName,
      reason,
      status: "pending",
      at: new Date().toISOString(),
    };
    requests.unshift(request);
    if (requests.length > MAX_REQUESTS) requests.length = MAX_REQUESTS;

    return ok({ request, notice: MONITORING_NOTICE }, 201);
  } catch {
    return fail("Failed to save request.");
  }
}
