"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  vocrehabGame2InteropChannel,
  vocrehabScoreTimePunch,
  type VocrehabGame2Event,
} from "@/lib/vocrehab-games2";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectTimePunch } from "@/lib/vocrehab-seed-pools2";
import { templateString, useVocrehabTemplateState } from "./use-vocrehab-template-state";

interface VocrehabShiftTask {
  id: string;
  label: string;
  openAt: number;
  closeAt: number;
}

const VOCREHAB_SHIFT_END = 180;
const VOCREHAB_GRACE_AT = 90;
const VOCREHAB_GRACE_SEC = 20;
const VOCREHAB_EXTRA_SEC = 60;

interface VocrehabGameTimePunchProps {
  vocrehabSeed?: string;
  vocrehabRunKey?: number;
  vocrehabTemplateState?: Record<string, unknown>;
}

type VocrehabTaskState = "upcoming" | "open" | "done" | "missed";
type VocrehabSaveState = "idle" | "saving" | "saved" | "guest" | "error";

function vocrehabClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function VocrehabGameTimePunch(props: VocrehabGameTimePunchProps = {}): React.ReactNode {
  const template = useVocrehabTemplateState("time-punch", props.vocrehabTemplateState);
  const [vocrehabStarted, setVocrehabStarted] = useState(false);
  const [vocrehabElapsed, setVocrehabElapsed] = useState(0);
  const [vocrehabPaused, setVocrehabPaused] = useState(false);
  const [vocrehabStates, setVocrehabStates] = useState<Record<string, VocrehabTaskState>>({});
  const [vocrehabEarly, setVocrehabEarly] = useState(0);
  const [vocrehabGrace, setVocrehabGrace] = useState(false);
  const [vocrehabExtra, setVocrehabExtra] = useState(0);
  const [vocrehabDone, setVocrehabDone] = useState(false);
  const [vocrehabSave, setVocrehabSave] = useState<VocrehabSaveState>("idle");
  const [vocrehabNote, setVocrehabNote] = useState("Shift Punch. A three-minute morning shift.");
  const startRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const endAtRef = useRef(0);
  const eventsRef = useRef<VocrehabGame2Event[]>([]);
  const graceFiredRef = useRef(false);
  const finishedRef = useRef(false);
  const vocrehabRunKey = props.vocrehabRunKey ?? 0;
  const vocrehabSeed = useMemo(
    () => parseSeed(props.vocrehabSeed ?? null) ?? makeSeed(),
    [props.vocrehabSeed, vocrehabRunKey],
  );
  const vocrehabDeal = useMemo(
    () => vocrehabSelectTimePunch(vocrehabSeed),
    [vocrehabSeed, vocrehabRunKey],
  );
  const boundedNumber = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
  const shiftDuration = boundedNumber(template.state?.shiftDurationSec, VOCREHAB_SHIFT_END, 60, 900);
  const graceAt = boundedNumber(template.state?.graceAtSec, VOCREHAB_GRACE_AT, 30, shiftDuration - 10);
  const graceDuration = boundedNumber(template.state?.graceDurationSec, VOCREHAB_GRACE_SEC, 0, 180);
  const templateTasks = Array.isArray(template.state?.tasks) ? template.state.tasks.slice(0, 12) : null;
  const VOCREHAB_TASKS: VocrehabShiftTask[] = templateTasks?.map((raw, index) => {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    const id = templateString(row.id, 80) ?? `provider-task-${index + 1}`;
    const label = templateString(row.label, 160);
    const openAt = boundedNumber(row.openAt, -1, 0, shiftDuration);
    const closeAt = boundedNumber(row.closeAt, -1, 1, shiftDuration);
    if (!label || openAt >= closeAt) return null;
    return { id, label, openAt, closeAt };
  }).filter((task): task is VocrehabShiftTask => task !== null) ?? vocrehabDeal.tasks;

  const vocrehabEnd = shiftDuration + vocrehabExtra;

  function vocrehabPush(kind: VocrehabGame2Event["kind"], detail: Record<string, unknown>): void {
    if (eventsRef.current.length >= 200) return;
    const t = startRef.current === 0 ? 0 : Math.max(0, Math.round(performance.now() - startRef.current - pausedTotalRef.current));
    eventsRef.current.push({ t_ms: t, kind, detail });
  }

  function vocrehabStart(): void {
    startRef.current = performance.now();
    pausedTotalRef.current = 0;
    endAtRef.current = performance.now() + shiftDuration * 1000;
    eventsRef.current = [{ t_ms: 0, kind: "start", detail: { game: "time-punch" } }];
    finishedRef.current = false;
    graceFiredRef.current = false;
    setVocrehabStates({});
    setVocrehabEarly(0);
    setVocrehabGrace(false);
    setVocrehabExtra(0);
    setVocrehabDone(false);
    setVocrehabSave("idle");
    setVocrehabStarted(true);
    setVocrehabNote("Shift started. Watch each task window.");
  }

  useEffect(() => {
    if (!vocrehabStarted || vocrehabPaused || vocrehabDone) return;
    const id = window.setInterval(() => {
      const elapsed = Math.max(0, (performance.now() - startRef.current - pausedTotalRef.current) / 1000);
      setVocrehabElapsed(elapsed);
      if (!graceFiredRef.current && elapsed >= graceAt) {
        graceFiredRef.current = true;
        setVocrehabGrace(true);
        vocrehabPush("interrupt", { reason: "late-bus", graceSec: graceDuration });
        setVocrehabNote("Late bus: remaining windows extended by 20 seconds. No penalty.");
      }
      if (performance.now() >= endAtRef.current && !finishedRef.current) {
        finishedRef.current = true;
        vocrehabPush("complete", { reason: "shift-end", seed: vocrehabSeed });
        setVocrehabDone(true);
        setVocrehabNote("Shift over. Results are shown below.");
        try {
          new BroadcastChannel(vocrehabGame2InteropChannel).postMessage({
            type: "vocrehab:game:completed",
            game: "time-punch",
          });
        } catch {
          /* fail-open: bus unavailable */
        }
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [vocrehabStarted, vocrehabPaused, vocrehabDone, vocrehabSeed, graceAt, graceDuration]);

  function vocrehabWindow(task: VocrehabShiftTask): { open: number; close: number } {
    const shift = vocrehabGrace && task.openAt >= graceAt ? graceDuration : 0;
    return { open: task.openAt + shift, close: task.closeAt + shift };
  }

  function vocrehabStateOf(task: VocrehabShiftTask): VocrehabTaskState {
    const saved = vocrehabStates[task.id];
    if (saved === "done" || saved === "missed") return saved;
    const w = vocrehabWindow(task);
    if (vocrehabElapsed > w.close) return "missed";
    if (vocrehabElapsed >= w.open) return "open";
    return "upcoming";
  }

  function vocrehabPunch(task: VocrehabShiftTask): void {
    const st = vocrehabStateOf(task);
    if (st === "done" || st === "missed" || vocrehabDone) return;
    if (st === "open") {
      setVocrehabStates((p) => ({ ...p, [task.id]: "done" }));
      vocrehabPush("action", { task: task.id, result: "on-time" });
      setVocrehabNote(`${task.label} punched on time.`);
    } else {
      setVocrehabEarly((e) => e + 1);
      vocrehabPush("error", { task: task.id, result: "early" });
      setVocrehabNote(`${task.label} is not open yet — wait for its window. Eagerness noted, no harm done.`);
    }
  }

  function vocrehabTogglePause(): void {
    if (!vocrehabStarted || vocrehabDone) return;
    if (!vocrehabPaused) {
      pauseStartRef.current = performance.now();
      setVocrehabPaused(true);
      vocrehabPush("pause", {});
      setVocrehabNote("Paused. Your shift clock is stopped.");
    } else {
      const gap = performance.now() - pauseStartRef.current;
      pausedTotalRef.current += gap;
      endAtRef.current += gap;
      setVocrehabPaused(false);
      vocrehabPush("resume", {});
      setVocrehabNote("Resumed.");
    }
  }

  function vocrehabAddExtra(): void {
    if (vocrehabExtra > 0 || vocrehabDone) return;
    setVocrehabExtra(VOCREHAB_EXTRA_SEC);
    endAtRef.current += VOCREHAB_EXTRA_SEC * 1000;
    vocrehabPush("help", { extraTime: true });
    setVocrehabNote("Added 60 seconds. No penalty — pace is informational only.");
  }

  async function vocrehabSend(): Promise<void> {
    setVocrehabSave("saving");
    try {
      vocrehabPush("complete", { seed: vocrehabSeed, headline: score.headline, band: score.band });
      const savedRun = await fetch("/api/vocrehab/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game_id: "time-punch", events: eventsRef.current.slice(0, 200), summary: { ...score, seed: vocrehabSeed } }) });
      setVocrehabSave(savedRun.status === 401 ? "guest" : savedRun.ok ? "saved" : "error");
    } catch {
      setVocrehabSave("error");
    }
  }

  const doneCount = VOCREHAB_TASKS.filter((t) => vocrehabStateOf(t) === "done").length;
  const missedCount = VOCREHAB_TASKS.filter((t) => vocrehabStateOf(t) === "missed").length;
  const score = vocrehabScoreTimePunch({
    onTime: doneCount,
    early: vocrehabEarly,
    missed: missedCount,
    total: VOCREHAB_TASKS.length,
    usedGrace: vocrehabGrace,
  });

  return (
    <section aria-label="Shift Punch game" className="vocrehab-game-punch space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {vocrehabNote}
      </p>

      {!vocrehabStarted && (
        <div className="vocrehab-game-intro space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">How this game works</h2>
          <p>
            Work a three-minute morning shift. Six tasks each open a time window — punch a task
            while its window is lit. Punching early is just eagerness; missing a window happens.
            Partway through, a late bus extends your remaining windows. Pause, extra time, retry —
            always available, never penalized.
          </p>
          <div className="flex flex-wrap gap-2">
            {template.loading ? <p role="status">Loading your shift plan…</p> : null}
            {template.error ? <p role="status">The assigned shift plan could not be loaded. You can still play the standard shift.</p> : null}
            <button type="button" disabled={template.loading || VOCREHAB_TASKS.length === 0} onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
              Clock in
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to Work & Life Practice Games
            </Link>
          </div>
        </div>
      )}

      {vocrehabStarted && !vocrehabDone && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <p className="text-lg font-semibold tabular-nums">⏱ {vocrehabClock(vocrehabEnd - vocrehabElapsed)} left</p>
            {vocrehabGrace && <p className="text-sm font-medium">🚌 Late-bus grace active (+{graceDuration}s windows)</p>}
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={vocrehabTogglePause} aria-pressed={vocrehabPaused} className="rounded border px-3 py-1.5 text-sm font-medium">
                {vocrehabPaused ? "Resume" : "Pause"}
              </button>
              {vocrehabExtra === 0 && (
                <button type="button" onClick={vocrehabAddExtra} className="rounded border px-3 py-1.5 text-sm font-medium">
                  +60s extra time
                </button>
              )}
            </div>
          </div>
          {vocrehabPaused ? (
            <div className="rounded-lg border p-5 text-center">
              <p className="font-semibold">❚❚ Paused — your shift clock is stopped.</p>
              <button type="button" onClick={vocrehabTogglePause} className="mt-2 rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
                Resume
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {VOCREHAB_TASKS.map((task) => {
                const st = vocrehabStateOf(task);
                const w = vocrehabWindow(task);
                return (
                  <li key={task.id} className="vocrehab-punch-row flex flex-wrap items-center gap-2 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{task.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Window {vocrehabClock(w.open)}–{vocrehabClock(w.close)}
                        {st === "open" && " ● OPEN NOW"}
                        {st === "done" && " ✓ punched"}
                        {st === "missed" && " — window passed"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => vocrehabPunch(task)}
                      disabled={st === "done" || st === "missed"}
                      className="rounded border px-4 py-2 font-medium disabled:opacity-50"
                    >
                      {st === "done" ? "Punched ✓" : st === "missed" ? "Missed" : "Punch"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {vocrehabDone && (
        <div className="vocrehab-game-results space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">✓ What happened</h2>
          <p>{score.headline}</p>
          <p className="text-sm">
            <span className="font-medium">Support band: {score.band}</span>
            <span className="text-muted-foreground"> (bands describe supports, never grades)</span>
          </p>
          <div className="text-sm">
            <p className="font-medium">What to try next</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {score.supports.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          {vocrehabSave === "saved" && <p role="status" className="text-sm font-medium">✓ Saved to your profile.</p>}
          {vocrehabSave === "guest" && <p role="status" className="text-sm font-medium">Sign in to save runs to your profile. Your result above is still yours to keep.</p>}
          {vocrehabSave === "error" && <p role="status" className="text-sm font-medium">Could not save right now — your result above is safe. Try sending again.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
              Retry
            </button>
            <button
              type="button"
              onClick={vocrehabSend}
              disabled={vocrehabSave === "saving" || vocrehabSave === "saved"}
              className="rounded border px-4 py-2 font-medium disabled:opacity-50"
            >
              {vocrehabSave === "saving" ? "Sending…" : "Send to profile"}
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to Work & Life Practice Games
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
