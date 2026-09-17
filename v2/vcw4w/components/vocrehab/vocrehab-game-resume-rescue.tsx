"use client";

// VocRehab micro-game 6 (CHEAP ss2 slice): Resume Rescue.
// Self-contained phases (intro / practice / countdown / run / results) that
// mirror VocrehabGameFrame, because the shared frame + lib registry are owned
// by lane C3 and carry no "resume-rescue" game id yet. The run-phase view
// below takes VocrehabGameRunProps so it can drop straight into the frame
// once C3 registers the id — until then this wrapper owns the phases and
// forwards VocrehabGameEvent objects through { onEvent, onDone }.
// Imports from the frame module and the games lib are type-only (read-only).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectResume, type VocrehabResumePoolLine } from "@/lib/vocrehab-seed-pools3";
import { templateString, useVocrehabTemplateState } from "./use-vocrehab-template-state";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import type { VocrehabGameEvent, VocrehabGameEventKind } from "@/lib/vocrehab-games";

export interface VocrehabResumeRescueProps {
  onEvent?: (event: VocrehabGameEvent) => void;
  onDone?: (summary: Record<string, unknown>) => void;
  vocrehabSeed?: string;
  vocrehabTemplateState?: Record<string, unknown>;
}

type VocrehabResumeRunProps = VocrehabGameRunProps & { vocrehabTemplateState?: Record<string, unknown> };

type VocrehabResumePhase = "intro" | "practice" | "countdown" | "run" | "results";
type VocrehabResumeIssue = "typo" | "vague-verb" | "missing-number" | "clean";
type VocrehabResumeStep = "spot" | "rewrite";

interface VocrehabResumeLine {
  id: string;
  text: string;
  issue: VocrehabResumeIssue;
  why: string;
  rewrites: readonly [string, string, string];
  rewriteIndex: number;
}

interface VocrehabSpotOption {
  id: VocrehabResumeIssue;
  label: string;
}

const VOCREHAB_SPOT_OPTIONS: readonly VocrehabSpotOption[] = [
  { id: "typo", label: "Typo or spelling slip" },
  { id: "vague-verb", label: "Vague verb" },
  { id: "missing-number", label: "Missing number or result" },
  { id: "clean", label: "Looks clean" },
];

const VOCREHAB_PRACTICE_LINE: VocrehabResumeLine = {
  id: "practice-1",
  text: "Helped customers and answerd questions at the front desk.",
  issue: "typo",
  why: "“answerd” should be “answered” — a spelling slip employers notice.",
  rewrites: [
    "Answered customer questions at the front desk and directed visitors to the right team.",
    "Did front desk stuff and helped people.",
    "Answerd questions for customers at the desk area.",
  ],
  rewriteIndex: 0,
};

// Seeded resume lines: 8 sampled from the pool (bank 16, play 8). Each pool
// line carries its own fix + hint; the spot category is derived from the hint
// text and the rewrite trio is [fix, original, next-line fix] rotated by
// position, so every seed replays the same fair, answerable set.
function vocrehabResumeIssueFor(hint: string): VocrehabResumeIssue {
  if (/number|digit/i.test(hint)) return "missing-number";
  if (/verb|starting style/i.test(hint)) return "vague-verb";
  return "typo";
}

function vocrehabResumeBuildLines(pool: readonly VocrehabResumePoolLine[]): VocrehabResumeLine[] {
  if (pool.length === 0) return [];
  return pool.map((line, i) => {
    const distractor = pool[(i + 1) % pool.length].fix;
    const rot = i % 3;
    const ordered: readonly [string, string, string] = [line.fix, line.text, distractor];
    const rewrites: readonly [string, string, string] = [
      ordered[(rot + 0) % 3],
      ordered[(rot + 1) % 3],
      ordered[(rot + 2) % 3],
    ];
    return {
      id: line.id,
      text: line.text,
      issue: vocrehabResumeIssueFor(line.errorHint),
      why: line.errorHint,
      rewrites,
      rewriteIndex: (3 - rot) % 3,
    };
  });
}

function vocrehabTemplateLines(state?: Record<string, unknown>): VocrehabResumePoolLine[] | null {
  if (!Array.isArray(state?.lines)) return null;
  return state.lines.slice(0, 12).map((raw, index) => {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    const text = templateString(row.text, 500);
    const fix = templateString(row.fix, 500);
    const errorHint = templateString(row.errorHint, 300) ?? "Review this resume line and choose a stronger version.";
    if (!text || !fix) return null;
    return {
      id: templateString(row.id, 80) ?? `provider-line-${index + 1}`,
      text,
      fix,
      errorHint,
      strengthNote: templateString(row.strengthNote, 240) ?? "You practiced making this resume line clearer.",
    };
  }).filter((line): line is VocrehabResumePoolLine => line !== null);
}

function vocrehabIssueLabel(issue: VocrehabResumeIssue): string {
  const found = VOCREHAB_SPOT_OPTIONS.find((o) => o.id === issue);
  return found ? found.label : issue;
}

function vocrehabRunSummaryText(spot: number, rewrite: number, total: number): string {
  const bits: string[] = [];
  if (spot >= 8) bits.push("spotted resume slip-ups with a sharp eye");
  else if (spot >= 5) bits.push("caught most of the resume slip-ups");
  else bits.push("kept working through every tricky line");
  if (rewrite >= 8) bits.push("picked strong professional rewrites");
  else if (rewrite >= 5) bits.push("picked solid rewrites most of the time");
  else bits.push("explored what makes a rewrite sound professional");
  return (
    `You reviewed ${total} resume lines: ${spot} sharp catches and ${rewrite} strong rewrites. ` +
    `You ${bits.join(" and ")}. This is one short activity, not a verdict — ` +
    `it suggests proofreading supports to try, not scores to worry about.`
  );
}

// Run-phase view. Props match VocrehabGameRunProps so this view can move
// into VocrehabGameFrame unchanged once the game id is registered.
// Identity reset is owned by the parent via React `key` (fresh mount = fresh
// state), so this view holds no reset effect.
function VocrehabResumeRescueRun({ vocrehabEmit, vocrehabFinish, vocrehabSeed, vocrehabRunKey, vocrehabTemplateState }: VocrehabResumeRunProps) {
  // Seeded lines, resolved once per run key.
  const vocrehabSelected = useMemo(() => {
    const seed = vocrehabSeed ?? makeSeed();
    return { seed, lines: vocrehabResumeBuildLines(vocrehabTemplateLines(vocrehabTemplateState) ?? vocrehabSelectResume(seed).lines) };
  }, [vocrehabSeed, vocrehabRunKey, vocrehabTemplateState]);
  const vocrehabLines = vocrehabSelected.lines;
  const [vocrehabIndex, setVocrehabIndex] = useState(0);
  const [vocrehabStep, setVocrehabStep] = useState<VocrehabResumeStep>("spot");
  const [vocrehabSpotPicked, setVocrehabSpotPicked] = useState<VocrehabResumeIssue | null>(null);
  const [vocrehabRewritePicked, setVocrehabRewritePicked] = useState<number | null>(null);
  const [vocrehabSpotScore, setVocrehabSpotScore] = useState(0);
  const [vocrehabRewriteScore, setVocrehabRewriteScore] = useState(0);
  const [vocrehabFeedback, setVocrehabFeedback] = useState<string | null>(null);
  const [vocrehabReducedMotion, setVocrehabReducedMotion] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const doneRef = useRef(false);

  // Reduced-motion subscription only — the initial value comes from the lazy
  // useState initializer above, so the effect body never writes state itself.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setVocrehabReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const line = vocrehabLines[vocrehabIndex];
  const isLast = vocrehabIndex >= vocrehabLines.length - 1;

  const vocrehabAnswerSpot = useCallback(
    (choice: VocrehabResumeIssue) => {
      if (vocrehabStep !== "spot" || vocrehabSpotPicked !== null || !line) return;
      setVocrehabSpotPicked(choice);
      if (choice === line.issue) {
        const next = vocrehabSpotScore + 1;
        setVocrehabSpotScore(next);
        vocrehabEmit("action", { line: line.id, phase: "spot", choice, spotScore: next });
        setVocrehabFeedback(
          line.issue === "clean"
            ? "Nice catch — that line is already clean, and you trusted your eye."
            : `Nice catch — ${line.why} Now pick the strongest rewrite.`,
        );
      } else {
        vocrehabEmit("error", { line: line.id, phase: "spot", choice, expected: line.issue });
        setVocrehabFeedback(
          `Not quite — this one is “${vocrehabIssueLabel(line.issue)}”: ${line.why} Mistakes are fixable here — now pick the strongest rewrite.`,
        );
      }
      setVocrehabStep("rewrite");
    },
    [vocrehabStep, vocrehabSpotPicked, line, vocrehabSpotScore, vocrehabEmit],
  );

  const vocrehabAnswerRewrite = useCallback(
    (choice: number) => {
      if (vocrehabStep !== "rewrite" || vocrehabRewritePicked !== null || !line) return;
      setVocrehabRewritePicked(choice);
      if (choice === line.rewriteIndex) {
        const next = vocrehabRewriteScore + 1;
        setVocrehabRewriteScore(next);
        vocrehabEmit("action", { line: line.id, phase: "rewrite", choice, rewriteScore: next });
        setVocrehabFeedback("Strong pick — that rewrite is specific, professional, and believable.");
      } else {
        vocrehabEmit("error", { line: line.id, phase: "rewrite", choice, expected: line.rewriteIndex });
        setVocrehabFeedback("Good effort — the strongest rewrite names the skill and, where it fits, the number.");
      }
    },
    [vocrehabStep, vocrehabRewritePicked, line, vocrehabRewriteScore, vocrehabEmit],
  );

  // Keyboard shortcuts: 1–4 for spot-the-error, 1–3 for rewrites.
  // Buttons stay natively focusable; this is an accelerator, not the only path.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const n = Number.parseInt(e.key, 10);
      if (Number.isNaN(n)) return;
      if (vocrehabStep === "spot" && n >= 1 && n <= VOCREHAB_SPOT_OPTIONS.length) {
        vocrehabAnswerSpot(VOCREHAB_SPOT_OPTIONS[n - 1].id);
      } else if (vocrehabStep === "rewrite" && line && n >= 1 && n <= line.rewrites.length) {
        vocrehabAnswerRewrite(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vocrehabStep, line, vocrehabAnswerSpot, vocrehabAnswerRewrite]);

  const vocrehabNext = () => {
    if (vocrehabRewritePicked === null || !line) return;
    if (isLast) {
      if (doneRef.current) return;
      doneRef.current = true;
      vocrehabEmit("action", {
        finishedLines: vocrehabLines.length,
        spotScore: vocrehabSpotScore,
        rewriteScore: vocrehabRewriteScore,
      });
      vocrehabFinish({
        spotCorrect: vocrehabSpotScore,
        rewriteCorrect: vocrehabRewriteScore,
        total: vocrehabLines.length,
        seed: vocrehabSelected.seed,
      });
      return;
    }
    setVocrehabIndex((i) => i + 1);
    setVocrehabStep("spot");
    setVocrehabSpotPicked(null);
    setVocrehabRewritePicked(null);
    setVocrehabFeedback(null);
  };

  if (!line) return null;

  return (
    <div className="vocrehab-game-resume-rescue space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Line {vocrehabIndex + 1} of {vocrehabLines.length} ·{" "}
        {vocrehabStep === "spot" ? "Step 1: spot the issue" : "Step 2: pick the rewrite"} ·{" "}
        {vocrehabSpotScore + vocrehabRewriteScore} strong choices so far
      </p>
      <figure className="rounded-lg border bg-card p-4">
        <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resume line
        </figcaption>
        <blockquote className="mt-1 font-mono text-base">“{line.text}”</blockquote>
      </figure>

      {vocrehabStep === "spot" && (
        <div
          className="grid gap-2 sm:grid-cols-2"
          role="group"
          aria-label={`Spot the issue in line ${vocrehabIndex + 1}`}
        >
          {VOCREHAB_SPOT_OPTIONS.map((option, i) => (
            <button
              key={option.id}
              type="button"
              onClick={() => vocrehabAnswerSpot(option.id)}
              aria-pressed={vocrehabSpotPicked === option.id}
              className={
                "rounded border px-3 py-2 text-left font-medium " +
                (vocrehabReducedMotion ? "" : "transition-colors ") +
                "aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              }
            >
              <span aria-hidden="true" className="mr-2 text-muted-foreground">
                {i + 1}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {vocrehabStep === "rewrite" && (
        <ol className="grid gap-2" aria-label={`Pick the professional rewrite for line ${vocrehabIndex + 1}`}>
          {line.rewrites.map((rewrite, i) => {
            const picked = vocrehabRewritePicked === i;
            const revealed = vocrehabRewritePicked !== null;
            const isBest = i === line.rewriteIndex;
            return (
              <li key={`${line.id}-rewrite-${i}`}>
                <button
                  type="button"
                  onClick={() => vocrehabAnswerRewrite(i)}
                  disabled={revealed}
                  aria-pressed={picked}
                  className={
                    "w-full rounded border px-3 py-2 text-left font-medium disabled:cursor-default " +
                    (revealed && isBest ? "border-green-600 " : "") +
                    (vocrehabReducedMotion ? "" : "transition-colors ") +
                    "aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  }
                >
                  <span aria-hidden="true" className="mr-2 text-muted-foreground">
                    {i + 1}
                  </span>
                  {rewrite}
                  {revealed && isBest && <span className="ml-2 text-sm">✓ strongest</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {vocrehabFeedback && (
        <div className="rounded-lg border p-3" role="alert">
          <p className="text-sm">{vocrehabFeedback}</p>
        </div>
      )}

      <button
        type="button"
        onClick={vocrehabNext}
        disabled={vocrehabRewritePicked === null}
        className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        {isLast ? "Finish review" : "Next line"}
      </button>
    </div>
  );
}

export default function VocrehabGameResumeRescue({ onEvent, onDone, vocrehabSeed, vocrehabTemplateState }: VocrehabResumeRescueProps) {
  const template = useVocrehabTemplateState("resume-rescue", vocrehabTemplateState);
  const [vocrehabPhase, setVocrehabPhase] = useState<VocrehabResumePhase>("intro");
  const [vocrehabCountdown, setVocrehabCountdown] = useState(3);
  const [vocrehabRunKey, setVocrehabRunKey] = useState(0);
  const [vocrehabSummary, setVocrehabSummary] = useState("");
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");
  const [vocrehabAnnounce, setVocrehabAnnounce] = useState("Resume Rescue. Introduction.");
  const [vocrehabPracticeStep, setVocrehabPracticeStep] = useState<VocrehabResumeStep>("spot");
  const [vocrehabPracticePicked, setVocrehabPracticePicked] = useState<number | string | null>(null);

  // Seeded selection, resolved once per run key; the inner run receives the
  // resolved seed so both agree on the same line set.
  const vocrehabSelected = useMemo(() => {
    const seed = vocrehabSeed ?? makeSeed();
    const lines = vocrehabTemplateLines(template.state) ?? vocrehabSelectResume(seed).lines;
    return { seed, lineCount: lines.length };
  }, [vocrehabSeed, vocrehabRunKey, template.state]);
  const vocrehabLineCount = vocrehabSelected.lineCount;

  const eventsRef = useRef<VocrehabGameEvent[]>([]);
  const startRef = useRef(0);
  const summaryRef = useRef<Record<string, unknown>>({});

  const vocrehabNow = useCallback(() => {
    if (!startRef.current) return 0;
    return Math.max(0, Math.round(performance.now() - startRef.current));
  }, []);

  const vocrehabEmit = useCallback(
    (kind: VocrehabGameEventKind, detail?: Record<string, unknown>) => {
      if (eventsRef.current.length >= 200) return;
      const event: VocrehabGameEvent = { t_ms: vocrehabNow(), kind, detail: detail ?? {} };
      eventsRef.current.push(event);
      onEvent?.(event);
    },
    [vocrehabNow, onEvent],
  );

  const vocrehabFinish = useCallback(
    (summary?: Record<string, unknown>) => {
      const spot = typeof summary?.["spotCorrect"] === "number" ? (summary["spotCorrect"] as number) : 0;
      const rewrite =
        typeof summary?.["rewriteCorrect"] === "number" ? (summary["rewriteCorrect"] as number) : 0;
      const total = typeof summary?.["total"] === "number" ? (summary["total"] as number) : vocrehabLineCount;
      const text = vocrehabRunSummaryText(spot, rewrite, total);
      summaryRef.current = { ...summary, seed: vocrehabSelected.seed, spotCorrect: spot, rewriteCorrect: rewrite, total };
      setVocrehabSummary(text);
      setVocrehabSaveState("idle");
      setVocrehabPhase("results");
      setVocrehabAnnounce("Resume Rescue finished. Results are shown below.");
      onDone?.({ ...summary, seed: vocrehabSelected.seed });
    },
    [onDone, vocrehabLineCount, vocrehabSelected],
  );

  const vocrehabRunProps: VocrehabResumeRunProps = {
    vocrehabEmit,
    vocrehabFinish,
    vocrehabSeed: vocrehabSelected.seed,
    vocrehabExtraTimeSec: 0,
    vocrehabRunKey,
    vocrehabTemplateState: template.state,
  };

  // Countdown ticker: plain numerals, no animation (safe for reduced motion).
  // Phase transitions happen inside the timer callback (subscription path),
  // never as direct writes in the effect body.
  useEffect(() => {
    if (vocrehabPhase !== "countdown") return;
    if (vocrehabCountdown <= 0) {
      const id = window.setTimeout(() => {
        startRef.current = performance.now();
        const startEvent: VocrehabGameEvent = {
          t_ms: 0,
          kind: "start",
          detail: { lines: vocrehabLineCount },
        };
        eventsRef.current = [startEvent];
        onEvent?.(startEvent);
        setVocrehabPhase("run");
        setVocrehabAnnounce(`Resume Rescue run started. Line 1 of ${vocrehabLineCount}.`);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setVocrehabCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [vocrehabPhase, vocrehabCountdown, onEvent, vocrehabLineCount]);

  const vocrehabStartPractice = useCallback(() => {
    setVocrehabPracticeStep("spot");
    setVocrehabPracticePicked(null);
    setVocrehabPhase("practice");
    setVocrehabAnnounce("Resume Rescue practice round. No timer.");
  }, []);

  const vocrehabStartRun = useCallback(() => {
    setVocrehabCountdown(3);
    setVocrehabPhase("countdown");
    setVocrehabAnnounce("Resume Rescue starting in 3 seconds.");
  }, []);

  const vocrehabRetry = useCallback(() => {
    eventsRef.current = [];
    setVocrehabRunKey((k) => k + 1);
    setVocrehabSummary("");
    setVocrehabSaveState("idle");
    setVocrehabPhase("intro");
    setVocrehabAnnounce("Resume Rescue. Ready for another try.");
  }, []);

  const vocrehabSaveRun = useCallback(async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: "resume-rescue", events: eventsRef.current.slice(0, 200), summary: summaryRef.current }),
      });
      setVocrehabSaveState(res.status === 401 ? "guest" : res.ok ? "saved" : "error");
    } catch {
      setVocrehabSaveState("error");
    }
  }, []);

  const vocrehabPracticeSpot = (choice: VocrehabResumeIssue) => {
    if (vocrehabPracticePicked !== null) return;
    setVocrehabPracticePicked(choice);
    setVocrehabPracticeStep("rewrite");
  };

  const vocrehabPracticeRewrite = (choice: number) => {
    if (vocrehabPracticeStep !== "rewrite") return;
    setVocrehabPracticePicked(choice);
  };

  return (
    <section aria-label="Resume Rescue" className="vocrehab-game-resume-rescue-shell space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {vocrehabAnnounce}
      </p>

      {vocrehabPhase === "intro" && (
        <div className="space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">How this game works</h2>
          <p>
            You are proofreading resume lines. For each of {vocrehabLineCount} lines, first spot the issue — a typo, a
            vague verb, a missing number, or nothing at all — then pick the most professional rewrite.
            There is no timer and no fail state; retry always counts the same.
          </p>
          <div className="flex flex-wrap gap-2">
            {template.loading ? <p role="status">Loading your resume practice…</p> : null}
            {template.error ? <p role="status">The assigned resume scenario could not be loaded. The standard lines are available.</p> : null}
            <button
              type="button"
              disabled={template.loading}
              onClick={vocrehabStartPractice}
              className="rounded border px-4 py-2 font-medium disabled:opacity-50"
            >
              Try practice (no timer)
            </button>
            <button
              type="button"
              disabled={template.loading || vocrehabLineCount === 0}
              onClick={vocrehabStartRun}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {vocrehabPhase === "practice" && (
        <div className="space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">Practice round</h2>
          <p className="font-mono text-base">“{VOCREHAB_PRACTICE_LINE.text}”</p>
          {vocrehabPracticeStep === "spot" ? (
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Practice: spot the issue">
              {VOCREHAB_SPOT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => vocrehabPracticeSpot(option.id)}
                  className="rounded border px-3 py-2 text-left font-medium"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                {vocrehabPracticePicked === VOCREHAB_PRACTICE_LINE.issue
                  ? "Nice catch — that is a typo. Now pick the strongest rewrite."
                  : `Good try — the issue here is “${vocrehabIssueLabel(VOCREHAB_PRACTICE_LINE.issue)}”. Now pick the strongest rewrite.`}
              </p>
              <ol className="mt-2 grid gap-2" aria-label="Practice: pick the rewrite">
                {VOCREHAB_PRACTICE_LINE.rewrites.map((rewrite, i) => (
                  <li key={`practice-rewrite-${i}`}>
                    <button
                      type="button"
                      onClick={() => vocrehabPracticeRewrite(i)}
                      aria-pressed={vocrehabPracticePicked === i}
                      className="w-full rounded border px-3 py-2 text-left font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {rewrite}
                      {typeof vocrehabPracticePicked === "number" &&
                        i === VOCREHAB_PRACTICE_LINE.rewriteIndex && (
                          <span className="ml-2 text-sm">✓ strongest</span>
                        )}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={vocrehabStartRun}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {vocrehabPhase === "countdown" && (
        <div className="rounded-lg border p-5 text-center" aria-hidden="true">
          <p className="text-4xl font-bold tabular-nums">{vocrehabCountdown}</p>
          <p className="text-sm text-muted-foreground">Get ready…</p>
        </div>
      )}

      {vocrehabPhase === "run" && (
        <VocrehabResumeRescueRun
          key={vocrehabRunKey}
          vocrehabEmit={vocrehabRunProps.vocrehabEmit}
          vocrehabFinish={vocrehabRunProps.vocrehabFinish}
          vocrehabExtraTimeSec={vocrehabRunProps.vocrehabExtraTimeSec}
          vocrehabRunKey={vocrehabRunProps.vocrehabRunKey}
          vocrehabTemplateState={vocrehabRunProps.vocrehabTemplateState}
        />
      )}

      {vocrehabPhase === "results" && (
        <div className="space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">✓ What happened</h2>
          <p>{vocrehabSummary}</p>
          {vocrehabSaveState === "saved" && <p role="status" className="text-sm">✓ Saved to your profile.</p>}
          {vocrehabSaveState === "guest" && <p role="status" className="text-sm">Sign in to save runs to your profile.</p>}
          {vocrehabSaveState === "error" && <p role="status" className="text-sm">Could not save this run right now. Your result is still shown here.</p>}
          <div className="text-sm">
            <p className="font-medium">What to try next</p>
            <p className="text-muted-foreground">
              Retry the game to try other lines, or keep exploring the practice games. Retries always count
              the same.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={vocrehabSaveRun} disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"} className="rounded border px-4 py-2 font-medium disabled:opacity-50">
              {vocrehabSaveState === "saving" ? "Saving…" : "Save this run"}
            </button>
            <button
              type="button"
              onClick={vocrehabRetry}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
