import {
  SHADOW_IT_WHY_BAD_MD,
  scoreShadowRisk,
  type ShadowSensitivity,
} from "@/lib/shadow-it";
import { SUSPICIOUS_SIGNALS } from "@/lib/it-alerts";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/it/reports?unapproved=3&sensitivity=high&people=20
// Demo-safe: no auth, no persistence. Scores shadow-IT risk + signal list.
// Abuse hardening: per-IP throttle (60 GET/min), bounded query parsing,
// generic errors (no stack leaks).
const SENSITIVITIES: ShadowSensitivity[] = ["low", "medium", "high", "critical"];

function numParam(value: string | null, fallback: number, max: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.floor(n));
}

export async function GET(req: Request) {
  try {
    const rl = rateLimit(`it-reports-get:${clientIp(req)}`, 60, 60_000);
    if (!rl.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(Math.max(1, rl.retryAfter)),
      });
    }
    const url = new URL(req.url);
    // Abuse hardening: clamp risk counts to sane ranges (unapproved 0-100,
    // people 0-10000); scoreShadowRisk clamps again defense-in-depth.
    const unapprovedApps = numParam(url.searchParams.get("unapproved"), 3, 100);
    const people = numParam(url.searchParams.get("people"), 20, 10_000);
    const raw = (url.searchParams.get("sensitivity") ?? "high")
      .trim()
      .toLowerCase()
      .slice(0, 20);
    const dataSensitivity: ShadowSensitivity = SENSITIVITIES.includes(
      raw as ShadowSensitivity,
    )
      ? (raw as ShadowSensitivity)
      : "high";

    const risk = scoreShadowRisk({ unapprovedApps, dataSensitivity, people });

    return ok({
      risk,
      signals: SUSPICIOUS_SIGNALS,
      why: SHADOW_IT_WHY_BAD_MD.slice(0, 800),
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return fail("Failed to build report.");
  }
}
