"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  vocrehabGame2AssessmentPayload,
  vocrehabGame2InteropChannel,
  vocrehabScoreTimePunch,
  type VocrehabGame2Event,
} from "@/lib/vocrehab-games2";

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

const VOCREHAB_TASKS: VocrehabShiftTask[] = [
  { id: "open", label: "Unlock front door + lights", openAt: 5, closeAt: 35 },
  { id: "mail", label: "Sort morning mail", openAt: 25, closeAt: 65 },
  { id: "restock", label: "Restock supply shelf", openAt: 55, closeAt: 100 },
  { id: "calls", label: "Return morning callbacks", openAt: 95, closeAt: 140 },
  { id: "lunch", label: "Cover lunch phones", openAt: 130, closeAt: 175 },
  { id: "close", label: "Lock up + set alarm", openAt: 160, closeAt: 200 },
];

type VocrehabTaskState = "upcoming" | "open" | "done" | "missed";
type VocrehabSaveState = "idle" | "saving" | "saved" | "guest" | "error";

function vocrehabClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function VocrehabGameTimePunch(): React.ReactNode {
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

  const vocrehabEnd = VOCREHAB_SHIFT_END + vocrehabExtra;

  function vocrehabPush(kind: VocrehabGame2Event["kind"], detail: Record<string, unknown>): void {
    if (eventsRef.current.length >= 200) return;
    const t = startRef.current === 0 ? 0 : Math.max(0, Math.round(performance.now() - startRef.current - pausedTotalRef.current));
    eventsRef.current.push({ t_ms: t, kind, detail });
  }

  function vocrehabStart(): void {
    startRef.current = performance.now();
    pausedTotalRef.current = 0;
    endAtRef.current = performance.now() + VOCREHAB_SHIFT_END * 1000;
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
      if (!graceFiredRef.current && elapsed >= VOCREHAB_GRACE_AT) {
        graceFiredRef.current = true;
        setVocrehabGrace(true);
        vocrehabPush("interrupt", { reason: "late-bus", graceSec: VOCREHAB_GRACE_SEC });
        setVocrehabNote("Late bus: remaining windows extended by 20 seconds. No penalty.");
      }
      if (performance.now() >= endAtRef.current && !finishedRef.current) {
        finishedRef.current = true;
        vocrehabPush("complete", { reason: "shift-end" });
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
  }, [vocrehabStarted, vocrehabPaused, vocrehabDone]);

  function vocrehabWindow(task: VocrehabShiftTask): { open: number; close: number } {
    const shift = vocrehabGrace && task.openAt >= VOCREHAB_GRACE_AT ? VOCREHAB_GRACE_SEC : 0;
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
      const body = vocrehabGame2AssessmentPayload("time-punch", score);
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setVocrehabSave("guest");
        return;
      }
      setVocrehabSave(res.ok ? "saved" : "error");
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
            <button type="button" onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
              Clock in
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to arcade
            </Link>
          </div>
        </div>
      )}

      {vocrehabStarted && !vocrehabDone && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <p className="text-lg font-semibold tabular-nums">⏱ {vocrehabClock(vocrehabEnd - vocrehabElapsed)} left</p>
            {vocrehabGrace && <p className="text-sm font-medium">🚌 Late-bus grace active (+20s windows)</p>}
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
              Back to arcade
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
