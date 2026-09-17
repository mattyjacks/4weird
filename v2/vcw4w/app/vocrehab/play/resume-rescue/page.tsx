/**
 * VocRehab Resume Rescue game page (server component).
 *
 * Usage: route `app/vocrehab/play/resume-rescue/page.tsx`. Server metadata plus
 * canonical, practice-first copy, and the no-test promise; mounts the V1 game
 * board `VocrehabGameResumeRescue` (DS-VOCREHAB-V1, read-only — never edited
 * here) through its envelope-specified controlled props `{onEvent, onDone}`.
 *
 * Run-summary save: `onDone` is a server action that scores the run with the
 * landed V3 scorer (`lib/vocrehab-games3.ts`, read-only), shapes a
 * `kind: "readiness"` body with `vocrehabGame3AssessmentPayload`, and invokes
 * the POST handler of `/api/vocrehab/assessments` directly (same validator,
 * same auth, same table as the HTTP route — the route file itself is only
 * imported, never edited). Guest (401) and network failures resolve
 * fail-open: the local result always stays on screen.
 */

import type { Metadata } from "next";
import Link from "next/link";
import VocrehabGameResumeRescue from "@/components/vocrehab/vocrehab-game-resume-rescue";
import { parseSeed } from "@/lib/vocrehab-seed";
import { POST as vocrehabAssessmentsPost } from "@/app/api/vocrehab/assessments/route";
import {
  vocrehabGame3AssessmentPayload,
  vocrehabScoreResumeRescue,
  type VocrehabResumeRescuePick,
} from "@/lib/vocrehab-games3";

export const metadata: Metadata = {
  title: "Resume Rescue — VocRehab Practice Arcade",
  description:
    "Practice proofreading resume lines — spot the typo, vague verb, or missing number, then pick the professional rewrite. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/resume-rescue" },
};

const VOCREHAB_RESUME_RESCUE_EVENT_KINDS: readonly string[] = [
  "start",
  "action",
  "error",
  "help",
  "pause",
  "resume",
  "interrupt",
  "complete",
];

function vocrehabIntFromSummary(
  record: Record<string, unknown>,
  key: string,
  max: number,
): number | null {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(Math.max(Math.floor(value), 0), max);
}

function vocrehabPicksFromSummary(summary: unknown): VocrehabResumeRescuePick[] {
  if (typeof summary !== "object" || summary === null) return [];
  const picks = (summary as { picks?: unknown }).picks;
  if (!Array.isArray(picks)) return [];
  return picks.slice(0, 32).map((entry) => {
    const row = (
      typeof entry === "object" && entry !== null ? entry : {}
    ) as Record<string, unknown>;
    return {
      fixed: row.fixed === true,
      onTime: row.onTime === true,
      bouncedBack: row.bouncedBack === true,
    };
  });
}

/** Telemetry observer: validates and drops (no I/O — the save happens onDone). */
async function vocrehabHandleResumeRescueEvent(event?: unknown): Promise<void> {
  "use server";
  if (typeof event !== "object" || event === null) return;
  const kind = (event as { kind?: unknown }).kind;
  if (typeof kind !== "string") return;
  if (!VOCREHAB_RESUME_RESCUE_EVENT_KINDS.includes(kind)) return;
}

interface VocrehabResumeRescueSaveResult {
  saved: boolean;
  status: number;
  reason?: string;
}

/** Run-summary save: score with V3, POST-shape `kind=readiness` into the assessments route. */
async function vocrehabHandleResumeRescueDone(
  summary?: unknown,
): Promise<VocrehabResumeRescueSaveResult> {
  "use server";
  if (typeof summary !== "object" || summary === null) {
    return { saved: false, status: 400, reason: "empty-summary" };
  }
  const record = summary as Record<string, unknown>;
  let picks = vocrehabPicksFromSummary(record);
  if (picks.length === 0) {
    // V1 posts aggregate counts ({spotCorrect, rewriteCorrect, total}), not
    // per-line picks: synthesize a count-preserving pick list for the V3
    // scorer (fixed ≈ mean of the two sub-scores; per-line timing unobserved).
    const total = vocrehabIntFromSummary(record, "total", 32);
    if (total === null || total <= 0) {
      return { saved: false, status: 400, reason: "no-score" };
    }
    const spot = vocrehabIntFromSummary(record, "spotCorrect", total) ?? 0;
    const rewrite = vocrehabIntFromSummary(record, "rewriteCorrect", total) ?? 0;
    const fixedCount = Math.round((spot + rewrite) / 2);
    picks = Array.from({ length: total }, (_, i) => ({
      fixed: i < fixedCount,
      onTime: i < fixedCount,
      bouncedBack: false,
    }));
  }
  const score = vocrehabScoreResumeRescue(picks);
  const body = vocrehabGame3AssessmentPayload("resume-rescue", score);
  try {
    const req = new Request("https://vocrehab.local/api/vocrehab/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await vocrehabAssessmentsPost(req);
    if (res.status === 401) {
      return { saved: false, status: 401, reason: "guest" };
    }
    return { saved: res.ok, status: res.status };
  } catch {
    // Fail-open: a save blip never destroys the local result.
    return { saved: false, status: 0, reason: "error" };
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Resume Rescue
      </nav>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. The scored run gives you 3 minutes to spot
        each typo, vague verb, or missing number and pick the professional rewrite — and
        you can grant yourself 60 extra seconds with zero penalty. Fully keyboard
        playable: Tab to move, arrows to choose, Enter to confirm. Practice, not a test.
      </p>
      <VocrehabGameResumeRescue
        vocrehabSeed={seed}
        onEvent={vocrehabHandleResumeRescueEvent}
        onDone={vocrehabHandleResumeRescueDone}
      />
    </main>
  );
}
