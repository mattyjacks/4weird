"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  vocrehabSummarizeRun,
  type VocrehabGameEvent,
  type VocrehabGameEventKind,
  type VocrehabGameId,
} from "@/lib/vocrehab-games";
import {
  makeSeed as vocrehabRandomSeed,
  parseSeed as vocrehabParseSeed,
} from "@/lib/vocrehab-seed";

export interface VocrehabGameRunProps {
  vocrehabEmit: (kind: VocrehabGameEventKind, detail?: Record<string, unknown>) => void;
  vocrehabFinish: (summary?: Record<string, unknown>) => void;
  vocrehabExtraTimeSec: number;
  vocrehabRunKey: number;
  vocrehabSeed?: string;
  vocrehabNewSeed?: () => void;
  vocrehabTemplateState?: Record<string, unknown>;
}

interface VocrehabGameFrameProps {
  vocrehabGameId: VocrehabGameId;
  vocrehabTitle: string;
  vocrehabInstructions: string;
  vocrehabPracticeSteps: string[];
  vocrehabTimeLimitSec: number | null;
  vocrehabExitHref: string;
  vocrehabSeed?: string;
  /** Start directly in no-timer practice when the game is a planning tool. */
  vocrehabStartInPractice?: boolean;
  /** Start directly in the game workspace for calendar-first planning games. */
  vocrehabStartInWorkspace?: boolean;
  children: (run: VocrehabGameRunProps) => React.ReactNode;
}

type VocrehabPhase = "intro" | "practice" | "countdown" | "run" | "results";

const VOCREHAB_MAX_EVENTS = 200;
const VOCREHAB_EXTRA_TIME_SEC = 60;

function vocrehabFormatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function VocrehabGameFrame({
  vocrehabGameId,
  vocrehabTitle,
  vocrehabInstructions,
  vocrehabPracticeSteps,
  vocrehabTimeLimitSec,
  vocrehabExitHref,
  vocrehabSeed: vocrehabSeedProp,
  vocrehabStartInPractice = false,
  vocrehabStartInWorkspace = false,
  children,
}: VocrehabGameFrameProps) {
  const [vocrehabPhase, setVocrehabPhase] = useState<VocrehabPhase>(vocrehabStartInWorkspace ? "run" : vocrehabStartInPractice ? "practice" : "intro");
  const [vocrehabPaused, setVocrehabPaused] = useState(false);
  const [vocrehabCountdown, setVocrehabCountdown] = useState(3);
  const [vocrehabRemainingMs, setVocrehabRemainingMs] = useState<number | null>(
    vocrehabTimeLimitSec === null ? null : vocrehabTimeLimitSec * 1000,
  );
  const [vocrehabExtraTimeSec, setVocrehabExtraTimeSec] = useState(0);
  const [vocrehabRunKey, setVocrehabRunKey] = useState(0);
  const [vocrehabSummary, setVocrehabSummary] = useState("");
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");
  const [vocrehabAnnounce, setVocrehabAnnounce] = useState(`${vocrehabTitle}. Introduction.`);

  // Telemetry + timing live in state (not refs) so the render-prop
  // callbacks never close over a ref — keeps react-hooks/refs clean.
  // Re-render cost is nil: the countdown already re-renders every 500ms,
  // and event appends coincide with user actions.
  const [vocrehabEvents, setVocrehabEvents] = useState<VocrehabGameEvent[]>([]);
  const [vocrehabRunStartMs, setVocrehabRunStartMs] = useState(0);
  const [vocrehabPausedTotalMs, setVocrehabPausedTotalMs] = useState(0);
  const [vocrehabEndAtMs, setVocrehabEndAtMs] = useState<number | null>(null);
  const [vocrehabPauseStartMs, setVocrehabPauseStartMs] = useState(0);
  const [vocrehabRemainingOnPauseMs, setVocrehabRemainingOnPauseMs] = useState(0);
  const [vocrehabFinished, setVocrehabFinished] = useState(false);
  const [vocrehabSummaryExtra, setVocrehabSummaryExtra] = useState<Record<string, unknown>>({});
  // Seed: `?seed=` replay wins when valid, else a fresh random shuffle.
  // Resolved once per run key so retries deal fresh (replay stays pinned).
  const [vocrehabSeedOverride, setVocrehabSeedOverride] = useState<string | null>(null);
  const [vocrehabUrlSeed] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : vocrehabParseSeed(new URLSearchParams(window.location.search).get("seed")),
  );
  const [vocrehabTemplateState, setVocrehabTemplateState] = useState<Record<string, unknown> | undefined>(undefined);
  const [vocrehabTemplateStatus, setVocrehabTemplateStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [vocrehabTemplateKey] = useState(() => {
    if (typeof window === "undefined") return { id: null, kidId: null };
    const params = new URLSearchParams(window.location.search);
    return { id: params.get("savedStateId"), kidId: params.get("kid_id") };
  });
  useEffect(() => {
    if (!vocrehabTemplateKey.id) return;
    let active = true;
    const params = new URLSearchParams({ id: vocrehabTemplateKey.id });
    if (vocrehabTemplateKey.kidId) params.set("kid_id", vocrehabTemplateKey.kidId);
    fetch(`/api/vocrehab/saved-states?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load this setup.");
        return response.json() as Promise<{ saved_state?: { game_id?: string; state?: unknown } }>;
      })
      .then((payload) => {
        if (!active) return;
        const state = payload.saved_state?.state;
        if (payload.saved_state?.game_id !== vocrehabGameId || !state || typeof state !== "object" || Array.isArray(state)) {
          throw new Error("This setup does not match this game.");
        }
        setVocrehabTemplateState(state as Record<string, unknown>);
        setVocrehabTemplateStatus("loaded");
      })
      .catch(() => {
        if (!active) return;
        setVocrehabTemplateState(undefined);
        setVocrehabTemplateStatus("error");
      });
    return () => { active = false; };
  }, [vocrehabTemplateKey, vocrehabGameId]);
  const vocrehabSeed = useMemo(
    () =>
      vocrehabParseSeed(vocrehabSeedOverride ?? vocrehabUrlSeed ?? vocrehabSeedProp ?? null) ?? vocrehabRandomSeed(),
    [vocrehabSeedOverride, vocrehabUrlSeed, vocrehabSeedProp, vocrehabRunKey],
  );
  const vocrehabNewSeed = useCallback(() => {
    setVocrehabSeedOverride(vocrehabRandomSeed());
  }, []);
  // Announcement flags are touched only inside effects, never during render.
  const announced60Ref = useRef(false);
  const announced10Ref = useRef(false);

  const vocrehabEmit = useCallback(
    (kind: VocrehabGameEventKind, detail?: Record<string, unknown>) => {
      // Fail-open cap: truncate past 200 events, never throw.
      if (vocrehabEvents.length >= VOCREHAB_MAX_EVENTS) return;
      const stamp = Math.max(0, Math.round(performance.now() - vocrehabRunStartMs - vocrehabPausedTotalMs));
      setVocrehabEvents((prev) =>
        prev.length >= VOCREHAB_MAX_EVENTS
          ? prev
          : [...prev, { t_ms: stamp, kind, detail: detail ?? {} }],
      );
    },
    [vocrehabEvents.length, vocrehabRunStartMs, vocrehabPausedTotalMs],
  );

  const vocrehabFinish = useCallback(
    (summary?: Record<string, unknown>) => {
      if (vocrehabFinished) return;
      setVocrehabFinished(true);
      // Seed rides in every save + export so counselors see and replay it.
      const extra = { ...(summary ?? {}), seed: vocrehabSeed };
      setVocrehabSummaryExtra(extra);
      const stamp = Math.max(0, Math.round(performance.now() - vocrehabRunStartMs - vocrehabPausedTotalMs));
      const completeEvent: VocrehabGameEvent = { t_ms: stamp, kind: "complete", detail: extra };
      const all =
        vocrehabEvents.length >= VOCREHAB_MAX_EVENTS ? vocrehabEvents : [...vocrehabEvents, completeEvent];
      setVocrehabEvents(all);
      setVocrehabSummary(vocrehabSummarizeRun(vocrehabGameId, all));
      setVocrehabSaveState("idle");
      setVocrehabPhase("results");
      setVocrehabAnnounce(`${vocrehabTitle} finished. Results are shown below.`);
    },
    [vocrehabFinished, vocrehabEvents, vocrehabRunStartMs, vocrehabPausedTotalMs, vocrehabGameId, vocrehabTitle, vocrehabSeed],
  );

  // Countdown ticker (no pause/exit in this state by design).
  // State writes happen in the timer subscription callback, never the effect body.
  useEffect(() => {
    if (vocrehabPhase !== "countdown") return;
    const id = window.setTimeout(() => {
      if (vocrehabCountdown <= 0) {
        const now = performance.now();
        setVocrehabRunStartMs(now);
        setVocrehabPausedTotalMs(0);
        setVocrehabFinished(false);
        const limitMs =
          vocrehabTimeLimitSec === null ? null : (vocrehabTimeLimitSec + vocrehabExtraTimeSec) * 1000;
        setVocrehabEndAtMs(limitMs === null ? null : now + limitMs);
        setVocrehabRemainingMs(limitMs);
        setVocrehabEvents([{ t_ms: 0, kind: "start", detail: { extraTimeSec: vocrehabExtraTimeSec, seed: vocrehabSeed } }]);
        setVocrehabPhase("run");
        setVocrehabAnnounce(`${vocrehabTitle} run started.`);
      } else {
        setVocrehabCountdown((c) => c - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [vocrehabPhase, vocrehabCountdown, vocrehabTimeLimitSec, vocrehabExtraTimeSec, vocrehabTitle, vocrehabSeed]);

  // Run timer: performance.now deltas, never wall-clock math.
  useEffect(() => {
    if (vocrehabPhase !== "run" || vocrehabPaused) return;
    if (vocrehabEndAtMs === null) return;
    const endAt = vocrehabEndAtMs;
    const id = window.setInterval(() => {
      const left = endAt - performance.now();
      if (left <= 0) {
        window.clearInterval(id);
        setVocrehabRemainingMs(0);
        vocrehabEmit("complete", { reason: "time-up", seed: vocrehabSeed });
        vocrehabFinish();
        return;
      }
      setVocrehabRemainingMs(left);
      if (left <= 60000 && !announced60Ref.current) {
        announced60Ref.current = true;
        setVocrehabAnnounce("One minute left.");
      }
      if (left <= 10000 && !announced10Ref.current) {
        announced10Ref.current = true;
        setVocrehabAnnounce("Ten seconds left.");
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [vocrehabPhase, vocrehabPaused, vocrehabEndAtMs, vocrehabEmit, vocrehabFinish, vocrehabSeed]);

  const vocrehabStartPractice = useCallback(() => {
    setVocrehabPhase("practice");
    setVocrehabAnnounce(`${vocrehabTitle} practice round. No timer.`);
  }, [vocrehabTitle]);

  const vocrehabStartRun = useCallback(() => {
    announced60Ref.current = false;
    announced10Ref.current = false;
    setVocrehabSummaryExtra({});
    setVocrehabCountdown(3);
    setVocrehabPhase("countdown");
    setVocrehabAnnounce(`${vocrehabTitle} starting in 3 seconds.`);
  }, [vocrehabTitle]);

  const vocrehabTogglePause = useCallback(() => {
    if (vocrehabPhase !== "run") return;
    if (!vocrehabPaused) {
      const now = performance.now();
      setVocrehabPauseStartMs(now);
      setVocrehabRemainingOnPauseMs(vocrehabEndAtMs === null ? 0 : Math.max(0, vocrehabEndAtMs - now));
      setVocrehabPaused(true);
      vocrehabEmit("pause", {});
      setVocrehabAnnounce("Paused. Your progress is kept.");
    } else {
      const now = performance.now();
      const pausedFor = now - vocrehabPauseStartMs;
      setVocrehabPausedTotalMs((t) => t + pausedFor);
      if (vocrehabEndAtMs !== null) {
        setVocrehabEndAtMs(now + vocrehabRemainingOnPauseMs);
      }
      setVocrehabPaused(false);
      vocrehabEmit("resume", {});
      setVocrehabAnnounce("Resumed.");
    }
  }, [
    vocrehabPhase,
    vocrehabPaused,
    vocrehabEndAtMs,
    vocrehabPauseStartMs,
    vocrehabRemainingOnPauseMs,
    vocrehabEmit,
  ]);

  const vocrehabAddExtraTime = useCallback(() => {
    if (vocrehabExtraTimeSec > 0 || vocrehabTimeLimitSec === null) return;
    setVocrehabExtraTimeSec(VOCREHAB_EXTRA_TIME_SEC);
    setVocrehabEndAtMs((e) => (e === null ? e : e + VOCREHAB_EXTRA_TIME_SEC * 1000));
    vocrehabEmit("help", { extraTime: true });
    setVocrehabAnnounce("Added 60 seconds of extra time. No penalty — speed is informational only.");
  }, [vocrehabExtraTimeSec, vocrehabTimeLimitSec, vocrehabEmit]);

  const vocrehabRetry = useCallback((seed: string) => {
    setVocrehabEvents([]);
    setVocrehabSummaryExtra({});
    setVocrehabSeedOverride(seed);
    setVocrehabFinished(false);
    setVocrehabPaused(false);
    setVocrehabPausedTotalMs(0);
    setVocrehabExtraTimeSec(0);
    setVocrehabRemainingMs(vocrehabTimeLimitSec === null ? null : vocrehabTimeLimitSec * 1000);
    setVocrehabRunKey((k) => k + 1);
    setVocrehabSaveState("idle");
    setVocrehabPhase("intro");
    setVocrehabAnnounce(`${vocrehabTitle}. Ready to play this round again.`);
  }, [vocrehabTimeLimitSec, vocrehabTitle]);

  const vocrehabSendToProfile = useCallback(async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: vocrehabGameId,
          events: vocrehabEvents.slice(0, VOCREHAB_MAX_EVENTS),
          summary: { ...vocrehabSummaryExtra, display_summary: vocrehabSummary, seed: vocrehabSeed },
        }),
      });
      if (res.status === 401) {
        setVocrehabSaveState("guest");
        return;
      }
      if (!res.ok) {
        setVocrehabSaveState("error");
        return;
      }
      setVocrehabSaveState("saved");
    } catch {
      // Fail-open: a network blip never destroys the local result.
      setVocrehabSaveState("error");
    }
  }, [vocrehabGameId, vocrehabEvents, vocrehabSummaryExtra, vocrehabSummary, vocrehabSeed]);

  // Stable run-props identity so the render-prop child does not remount on
  // every 500ms timer tick; callbacks close over state only (no refs).
  const vocrehabRunProps = useMemo(
    () => ({
      vocrehabEmit,
      vocrehabFinish,
      vocrehabExtraTimeSec,
      vocrehabRunKey,
      vocrehabSeed,
      vocrehabNewSeed,
      vocrehabTemplateState,
    }),
    [vocrehabEmit, vocrehabFinish, vocrehabExtraTimeSec, vocrehabRunKey, vocrehabSeed, vocrehabNewSeed, vocrehabTemplateState],
  );

  const timed = vocrehabTimeLimitSec !== null;

  return (
    <section aria-label={vocrehabTitle} className="vocrehab-game-frame space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {vocrehabAnnounce}
      </p>

      {vocrehabTemplateKey.id && vocrehabTemplateStatus === "idle" && <p role="status" className="text-sm">Loading saved setup…</p>}
      {vocrehabTemplateStatus === "loading" && <p role="status" className="text-sm">Loading saved setup…</p>}
      {vocrehabTemplateStatus === "error" && <p role="status" className="text-sm">This saved setup could not be opened. You can still start a fresh round.</p>}

      {vocrehabPhase === "intro" && (
        <div className="vocrehab-game-intro space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">How this game works</h2>
          <p>{vocrehabInstructions}</p>
          <p className="text-sm text-muted-foreground">
            {timed
              ? `The timed run is ${vocrehabTimeLimitSec / 60} minutes. You can pause, take extra time (+60 seconds, no penalty), or exit — progress is kept. There is no fail state and retry always counts the same.`
              : "There is no timer. Take your time, and replay to try other paths."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={vocrehabStartPractice} className="rounded border px-4 py-2 font-medium">
              Try practice (no timer)
            </button>
            <button
              type="button"
              onClick={vocrehabStartRun}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              {timed ? "Start timed run" : "Start"}
            </button>
            <Link href={vocrehabExitHref} className="rounded border px-4 py-2 font-medium">
              Exit
            </Link>
          </div>
        </div>
      )}

      {vocrehabPhase === "practice" && (
        <div className="vocrehab-game-practice space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">Practice round</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {vocrehabPracticeSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={vocrehabStartRun}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              {timed ? "Start timed run" : "Start"}
            </button>
            <Link href={vocrehabExitHref} className="rounded border px-4 py-2 font-medium">
              Exit
            </Link>
          </div>
        </div>
      )}

      {vocrehabPhase === "countdown" && (
        <div className="vocrehab-game-countdown rounded-lg border p-5 text-center" aria-hidden="true">
          <p className="text-4xl font-bold tabular-nums">{vocrehabCountdown}</p>
          <p className="text-sm text-muted-foreground">Get ready…</p>
        </div>
      )}

      {vocrehabPhase === "run" && (
        <div className="vocrehab-game-run space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            {timed && vocrehabRemainingMs !== null && (
              <p role="timer" aria-label={`${vocrehabFormatClock(vocrehabRemainingMs / 1000)} remaining`} className="text-lg font-semibold tabular-nums">
                ⏱ {vocrehabFormatClock(vocrehabRemainingMs / 1000)} left
              </p>
            )}
            {!timed && <p className="text-sm text-muted-foreground">◷ No timer — take your time.</p>}
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={vocrehabTogglePause} aria-pressed={vocrehabPaused} className="rounded border px-3 py-1.5 text-sm font-medium">
                {vocrehabPaused ? "Resume" : "Pause"}
              </button>
              {timed && vocrehabExtraTimeSec === 0 && (
                <button type="button" onClick={vocrehabAddExtraTime} className="rounded border px-3 py-1.5 text-sm font-medium">
                  +60s extra time
                </button>
              )}
              <Link href={vocrehabExitHref} className="rounded border px-3 py-1.5 text-sm font-medium">
                Exit
              </Link>
            </div>
          </div>
          {vocrehabPaused ? (
            <div className="rounded-lg border p-5 text-center">
              <p className="font-semibold">❚❚ Paused — your progress is kept.</p>
              <button
                type="button"
                onClick={vocrehabTogglePause}
                className="mt-2 rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                Resume
              </button>
            </div>
          ) : (
            children(vocrehabRunProps)
          )}
        </div>
      )}

      {vocrehabPhase === "results" && (
        <div className="vocrehab-game-results space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">✓ What happened</h2>
          <p>{vocrehabSummary}</p>
          <p className="text-sm text-muted-foreground">Round seed {vocrehabSeed} — save it to replay this exact round</p>
          <div className="text-sm">
            <p className="font-medium">What this suggests</p>
            <p className="text-muted-foreground">
              This is one short activity, not a verdict about you. It suggests supports to try, not scores to
              worry about. Your counselor can help decide what it means.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium">What to try next</p>
            <p className="text-muted-foreground">
              Replay this same round, try a new round, send this run to your profile, or keep exploring the practice games.
            </p>
          </div>
          {vocrehabSaveState === "saved" && (
            <p role="status" className="text-sm font-medium">
              ✓ Saved to your profile.
            </p>
          )}
          {vocrehabSaveState === "guest" && (
            <p role="status" className="text-sm font-medium">
              Sign in to save runs to your profile. Your result above is still yours to keep.
            </p>
          )}
          {vocrehabSaveState === "error" && (
            <p role="status" className="text-sm font-medium">
              Could not save right now — your result above is safe. Try sending again.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => vocrehabRetry(vocrehabSeed)} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
              Replay same round
            </button>
            <button type="button" onClick={() => vocrehabRetry(vocrehabRandomSeed())} className="rounded border px-4 py-2 font-medium">
              Try a new round
            </button>
            <button
              type="button"
              onClick={vocrehabSendToProfile}
              disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
              className="rounded border px-4 py-2 font-medium disabled:opacity-50"
            >
              {vocrehabSaveState === "saving" ? "Sending…" : "Send to profile"}
            </button>
            <Link href={vocrehabExitHref} className="rounded border px-4 py-2 font-medium">
              Back to Work & Life Practice Games
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
