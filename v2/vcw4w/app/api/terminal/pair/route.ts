import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  PAIR_CODE_TTL_MS,
  issuePairCode,
  parseTarget,
  type TerminalTarget,
} from "@/app/api/terminal/_lib/store";

/**
 * POST /api/terminal/pair — issue a one-time desktop pairing code.
 *
 * Body: { target?: "virtual|<uuid>" | "local" | "mock" } (default "local").
 * Returns { code, expiresInSec } — the code is shown ONCE (e.g. by the
 * desktop app or the terminal's `desktop pair issue` helper) and verified
 * via POST /api/terminal/session. Codes are single-use, 10-minute TTL,
 * stored hashed. The raw code is NEVER written to logs.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`terminal:pair:${clientIp(req)}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const raw = (body ?? {}) as Record<string, unknown>;
  const requested = typeof raw.target === "string" && raw.target.trim() ? raw.target : "local";
  let target: TerminalTarget | null = parseTarget(requested);
  if (!target) {
    return fail('Invalid target. Use "local", "mock", or "virtual|<desktop-id>".', 400);
  }
  // A code for a not-yet-paired local app carries no device ref yet.
  if (target.kind === "local") {
    target = { kind: "local", ref: null, label: "user desktop app (pairing required)" };
  }

  const issued = issuePairCode(target);
  return ok({
    code: issued.code,
    expiresInSec: Math.floor(PAIR_CODE_TTL_MS / 1000),
    target: target.label,
    note: "One-time code: it expires in 10 minutes and burns on first use. Run: desktop pair <code>",
  });
}
