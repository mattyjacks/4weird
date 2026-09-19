/**
 * VocRehab Resume Rescue game page (server component).
 *
 * Usage: route `app/vocrehab/play/resume-rescue/page.tsx`. Server metadata plus
 * canonical, practice-first copy, and the no-test promise; mounts the V1 game
 * board `VocrehabGameResumeRescue` (DS-VOCREHAB-V1, read-only; never edited
 * here) through its envelope-specified controlled props `{onEvent, onDone}`.
 *
 * Run-summary save: `onDone` is a server action that scores the run with the
 * landed V3 scorer (`lib/vocrehab-games3.ts`, read-only), shapes a
 * `kind: "readiness"` body with `vocrehabGame3AssessmentPayload`, and invokes
 * the POST handler of `/api/vocrehab/assessments` directly (same validator,
 * same auth, same table as the HTTP route; the route file itself is only
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
  title: "Resume Rescue: resume proofreading game | VocRehab",
  description:
    "VocRehab proofreading game: spot the typo, vague verb, or missing number in resume lines, then pick the professional rewrite. Three-minute scored run with a penalty-free extension.",
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

/** Telemetry observer: validates and drops (no I/O; the save happens onDone). */
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
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Resume Rescue
      </nav>
      <h1 className="text-xl font-bold">Resume Rescue: proofread like a hiring manager</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. The scored run gives you 3 minutes to spot
        each typo, vague verb, or missing number and pick the professional rewrite, and
        you can grant yourself 60 extra seconds with zero penalty. Fully keyboard
        playable: Tab to move, arrows to choose, Enter to confirm. Practice, not a test.
      </p>
      <VocrehabGameResumeRescue
        vocrehabSeed={seed}
        onEvent={vocrehabHandleResumeRescueEvent}
        onDone={vocrehabHandleResumeRescueDone}
      />
      <section aria-label="How to play Resume Rescue" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Warm up with the untimed practice rep. Each resume line hides exactly one
            flaw: a typo, a vague verb, or a missing number. Read the whole line
            before choosing, because skimmers miss the quiet errors.
          </li>
          <li>
            Spot the flaw, then pick the professional rewrite from the options. Strong
            rewrites add specifics: numbers, outcomes, and active verbs that tell a
            hiring manager what actually happened.
          </li>
          <li>
            Run the scored three-minute round when ready. The clock rewards steady
            eyes, and the 60 extra seconds carry zero penalty, so invoke them the
            moment rushing starts rather than after mistakes pile up.
          </li>
          <li>
            Play keyboard only at least once: Tab moves between lines, arrows choose
            the rewrite, Enter confirms. Many data entry and office setups are keyboard
            first, and this fluency transfers directly.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pull up your own resume draft beside the game if you have one. Every flaw
          you catch here becomes a line to check in your own document afterward. Two
          slow practice reps that name each error type aloud beat five fast rounds
          that blur together.
        </p>
      </section>
      <section aria-label="Resume Rescue scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Classify before you fix.</strong> Ask
            first: typo, vague verb, or missing number? Naming the flaw type focuses
            your eyes, and the habit carries straight into proofreading your own
            applications and cover letters.
          </li>
          <li>
            <strong className="text-foreground">Numbers beat adjectives.</strong> When
            choosing rewrites, prefer the option with concrete figures and outcomes
            over the one with impressive             sounding filler. Hiring managers skim for
            evidence, so train your taste on the V3 scorer standard: fixed lines with
            specifics win.
          </li>
          <li>
            <strong className="text-foreground">Bank the bonus minute early.</strong> The
            extension models a real accommodation: extra time, same standard. Taking it
            proactively at the first sign of rushing beats taking it after three
            rushed errors. Compare both approaches across seeds.
          </li>
          <li>
            <strong className="text-foreground">Turn misses into resume edits.</strong> Each
            error pattern you miss here, vague verbs especially, is likely sitting in
            your own resume right now. Fix the game lines, then fix yours with{" "}
            <Link href="/vocrehab/interview/resume" className="underline">the resume builder</Link>{" "}
            and note the improvement in{" "}
            <Link href="/vocrehab/course" className="underline">the course lessons</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="Resume Rescue questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">My resume has no typos. Is this still useful?</h3>
            <p>
              Probably more useful, because vague verbs and missing numbers hide in
              clean looking resumes. Most players discover their bullet points describe
              duties instead of results, which is exactly the upgrade hiring managers
              want to see.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Does the extra 60 seconds lower my score?</h3>
            <p>
              No. The extension never penalizes you, and the scorer rewards fixed lines
              regardless of pacing. Use it to protect accuracy, then compare extended
              and unextended runs to learn your honest working speed.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Can I play without a mouse?</h3>
            <p>
              Yes, fully. Tab moves, arrows choose, Enter confirms, and the whole round
              is completable keyboard only. If keyboard navigation feels awkward at
              first, that friction is itself valuable practice for office software.
              Find more drills on the{" "}
              <Link href="/vocrehab/play" className="underline">games index</Link>.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Resume Rescue measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The V3 scorer observes three proofreading qualities employers screen for:
          error detection, or spotting the planted typo, vague verb, or missing
          number; rewrite judgment, or choosing the professional revision with
          specifics; and composure, or holding accuracy across the three-minute clock
          and bouncing back after misses. Signed-in runs save through the assessments
          pipeline while guests keep results on screen, and both stay fail-open.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Job seekers polishing first resumes, career changers translating hands-on
          work into office language, and anyone whose applications vanish unanswered
          will find this drill directly relevant. If postings keep asking for detail
          orientation plus written communication, a steady scored run plus a visibly
          improved resume is the complete answer.
        </p>
      </section>
    </main>
  );
}
