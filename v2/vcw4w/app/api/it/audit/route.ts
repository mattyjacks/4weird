import { MONITORING_NOTICE } from "@/lib/it-command";
import {
  AUDIT_ACTIONS,
  AUDIT_EXPORT_MAX,
  AUDIT_RETENTION_DAYS,
  buildAuditEvent,
} from "@/lib/it-audit";
import { fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { rateLimit } from "@/lib/rate-limit";
import { bodyByteSize, clampLimit, clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Demo-safe: no auth, no persistence. GET serves sample rows;
// POST validates and echoes back the built event (nothing stored).
// Abuse hardening: per-IP throttles (60 GET / 20 POST per min), strict
// input validation, generic errors (no stack leaks).

const ACTOR_MAX = 80;
const TARGET_MAX = 300;
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

function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length === 0 || v.length > max) return null;
  if (hasBadControl(v)) return null;
  if (!hasVisible(v)) return null;
  return v;
}

// Secret-material guard: POST echoes the built event back verbatim, so a
// pasted key/token would be re-served (and land in logs/caches). Reject
// credential-looking input with a generic 400 that never echoes the value
// and never logs it — the rejection must not preserve what it refused.
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
  // Normal app names and sentences never contain such a token.
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

const DEMO_EVENTS = [
  buildAuditEvent("it_admin", "login", "console"),
  buildAuditEvent("boss", "app.approve", "Figma"),
  buildAuditEvent("employee", "file.upload", "report.pdf"),
  buildAuditEvent("employee", "agent.book", "demo-agent"),
  buildAuditEvent("it_admin", "policy.update", "approved-apps"),
];

// GET /api/it/audit — 5 sample audit rows + disclosure.
export async function GET(req: Request) {
  try {
    const denied = limited("it-audit-get", req, 60);
    if (denied) return denied;
    // Abuse hardening: cap list length (max 100) and never exceed the
    // export ceiling (AUDIT_EXPORT_MAX=1000) so no unbounded export.
    const url = new URL(req.url);
    const listLimit = clampLimit(url.searchParams.get("limit"), DEMO_EVENTS.length, 100);
    const limit = Math.min(listLimit, AUDIT_EXPORT_MAX);
    return ok({
      events: DEMO_EVENTS.slice(0, limit),
      count: Math.min(DEMO_EVENTS.length, limit),
      total: DEMO_EVENTS.length,
      notice: MONITORING_NOTICE,
      retentionDays: AUDIT_RETENTION_DAYS,
    });
  } catch {
    return fail("Failed to load audit events.");
  }
}

// POST /api/it/audit — { actor (1-80), action (in AUDIT_ACTIONS), target? }.
export async function POST(req: Request) {
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  try {
    const denied = limited("it-audit-post", req, 20);
    if (denied) return denied;
    const body = (await req.json().catch(() => null)) as {
      actor?: unknown;
      action?: unknown;
      target?: unknown;
    } | null;
    if (!body || bodyByteSize(body) > BODY_MAX_BYTES) {
      return fail("Request body too large.", 413);
    }
    const actor = cleanField(body.actor, ACTOR_MAX);
    if (!actor) {
      return fail("actor must be 1-80 characters.", 400);
    }
    if (looksLikeSecret(actor)) {
      return fail("Do not include secrets, keys, or tokens in audit fields.", 400);
    }
    const action = typeof body.action === "string" ? body.action.trim() : "";
    if (!AUDIT_ACTIONS.includes(action)) {
      return fail(`action must be one of: ${AUDIT_ACTIONS.join(", ")}.`, 400);
    }
    // Target is optional: missing/blank means "". A present-but-blank
    // (whitespace-only) value is also treated as "" rather than rejected.
    let target = "";
    const rawTarget = body.target;
    if (rawTarget !== undefined && rawTarget !== null && String(rawTarget).trim() !== "") {
      const cleaned = cleanField(rawTarget, TARGET_MAX);
      if (cleaned === null) {
        return fail("target must be 0-300 characters.", 400);
      }
      if (looksLikeSecret(cleaned)) {
        return fail("Do not include secrets, keys, or tokens in audit fields.", 400);
      }
      target = cleaned;
    }

    const event = buildAuditEvent(actor, action, target);
    return ok({ event, notice: MONITORING_NOTICE }, 201);
  } catch {
    return fail("Failed to build audit event.");
  }
}
