import { APPROVED_APPS, listByCategory, searchApps } from "@/lib/approved-apps";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clampLimit, clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/it/apps?category=&q= — public approved-app catalog, no auth.
// Abuse hardening: per-IP throttle (60 GET/min), bounded + control-char
// screened query params, generic errors (no stack leaks).

const QUERY_MAX = 80;

// True when v holds a C0 control (except tab/LF/CR) or DEL.
function hasBadControl(v: string): boolean {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c === 127) return true;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) return true;
  }
  return false;
}

function cleanQuery(value: string | null): string {
  return (value ?? "").trim().slice(0, QUERY_MAX);
}

export async function GET(req: Request) {
  try {
    const rl = rateLimit(`it-apps-get:${clientIp(req)}`, 60, 60_000);
    if (!rl.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(Math.max(1, rl.retryAfter)),
      });
    }
    const { searchParams } = new URL(req.url);
    const category = cleanQuery(searchParams.get("category"));
    const q = cleanQuery(searchParams.get("q"));
    if (hasBadControl(category) || hasBadControl(q)) {
      return fail("Invalid query characters.", 400);
    }

    let apps = APPROVED_APPS;
    if (category) apps = listByCategory(category);
    if (q) {
      const hits = new Set(searchApps(q).map((a) => a.slug));
      apps = apps.filter((a) => hits.has(a.slug));
    }

    // Abuse hardening: cap list length (max 100) so callers cannot demand
    // unbounded catalogs; default serves the full catalog.
    const limit = clampLimit(searchParams.get("limit"), APPROVED_APPS.length, 100);
    const sliced = apps.slice(0, limit);
    return ok({ apps: sliced, count: sliced.length, total: apps.length });
  } catch {
    return fail("Failed to load approved apps.");
  }
}
