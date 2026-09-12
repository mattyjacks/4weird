import { NextResponse } from "next/server";
import {
  SHADOW_IT_WHY_BAD_MD,
  scoreShadowRisk,
  type ShadowSensitivity,
} from "@/lib/shadow-it";
import { SUSPICIOUS_SIGNALS } from "@/lib/it-alerts";

export const dynamic = "force-dynamic";

// GET /api/it/reports?unapproved=3&sensitivity=high&people=20
// Demo-safe: no auth, no persistence. Scores shadow-IT risk + signal list.
const SENSITIVITIES: ShadowSensitivity[] = ["low", "medium", "high", "critical"];

function numParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(1000, Math.floor(n));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const unapprovedApps = numParam(url.searchParams.get("unapproved"), 3);
    const people = numParam(url.searchParams.get("people"), 20);
    const raw = (url.searchParams.get("sensitivity") ?? "high").toLowerCase();
    const dataSensitivity: ShadowSensitivity = SENSITIVITIES.includes(
      raw as ShadowSensitivity,
    )
      ? (raw as ShadowSensitivity)
      : "high";

    const risk = scoreShadowRisk({ unapprovedApps, dataSensitivity, people });

    return NextResponse.json(
      {
        success: true,
        risk,
        signals: SUSPICIOUS_SIGNALS,
        why: SHADOW_IT_WHY_BAD_MD.slice(0, 800),
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to build report.",
      },
      { status: 500 },
    );
  }
}
