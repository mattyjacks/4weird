"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  vocrehabGame2InteropChannel,
  vocrehabScoreToolMatch,
  type VocrehabGame2Event,
  type VocrehabToolMatchPick,
} from "@/lib/vocrehab-games2";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectToolMatch } from "@/lib/vocrehab-seed-pools2";
import { templateString, useVocrehabTemplateState } from "./use-vocrehab-template-state";

interface VocrehabJob {
  job: string;
  tools: [string, string, string, string];
  toolAnswer: number;
  gearNeeded: boolean;
  gearNote: string;
}

interface VocrehabGameToolMatchProps {
  vocrehabSeed?: string;
  vocrehabRunKey?: number;
  vocrehabTemplateState?: Record<string, unknown>;
}

type VocrehabSaveState = "idle" | "saving" | "saved" | "guest" | "error";

export function VocrehabGameToolMatch(props: VocrehabGameToolMatchProps = {}): React.ReactNode {
  const template = useVocrehabTemplateState("tool-match", props.vocrehabTemplateState);
  const [vocrehabStarted, setVocrehabStarted] = useState(false);
  const [vocrehabJobIdx, setVocrehabJobIdx] = useState(0);
  const [vocrehabTool, setVocrehabTool] = useState<number | null>(null);
  const [vocrehabGear, setVocrehabGear] = useState<boolean | null>(null);
  const [vocrehabPicks, setVocrehabPicks] = useState<VocrehabToolMatchPick[]>([]);
  const [vocrehabDone, setVocrehabDone] = useState(false);
  const [vocrehabSave, setVocrehabSave] = useState<VocrehabSaveState>("idle");
  const [vocrehabNote, setVocrehabNote] = useState("Tool Crib. Eight jobs to kit out.");
  const startRef = useRef(0);
  const eventsRef = useRef<VocrehabGame2Event[]>([]);
  const vocrehabRunKey = props.vocrehabRunKey ?? 0;
  const vocrehabSeed = useMemo(
    () => parseSeed(props.vocrehabSeed ?? null) ?? makeSeed(),
    [props.vocrehabSeed, vocrehabRunKey],
  );
  const vocrehabDeal = useMemo(
    () => vocrehabSelectToolMatch(vocrehabSeed),
    [vocrehabSeed, vocrehabRunKey],
  );
  const templateJobs = Array.isArray(template.state?.jobs) ? template.state.jobs.slice(0, 12) : null;
  const VOCREHAB_JOBS: VocrehabJob[] = templateJobs?.map((raw) => {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    const tools = Array.isArray(row.tools) ? row.tools.slice(0, 4).map((value) => templateString(value, 120)) : [];
    const answer = row.toolAnswer;
    const job = templateString(row.job, 160);
    const gearNote = templateString(row.gearNote, 300);
    if (!job || tools.length !== 4 || !tools.every(Boolean) || typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer > 3 || typeof row.gearNeeded !== "boolean" || !gearNote) return null;
    return { job, tools: tools as VocrehabJob["tools"], toolAnswer: answer, gearNeeded: row.gearNeeded, gearNote };
  }).filter((job): job is VocrehabJob => job !== null) ?? vocrehabDeal.jobs;

  function vocrehabPush(kind: VocrehabGame2Event["kind"], detail: Record<string, unknown>): void {
    if (eventsRef.current.length >= 200) return;
    const t = startRef.current === 0 ? 0 : Math.max(0, Math.round(performance.now() - startRef.current));
    eventsRef.current.push({ t_ms: t, kind, detail });
  }

  function vocrehabStart(): void {
    startRef.current = performance.now();
    eventsRef.current = [{ t_ms: 0, kind: "start", detail: { game: "tool-match" } }];
    setVocrehabStarted(true);
    setVocrehabNote(`Job 1 of ${VOCREHAB_JOBS.length}.`);
  }

  function vocrehabNext(): void {
    const job = VOCREHAB_JOBS[vocrehabJobIdx];
    if (!job || vocrehabTool === null || vocrehabGear === null) return;
    const pick: VocrehabToolMatchPick = {
      tool: vocrehabTool === job.toolAnswer,
      safety: vocrehabGear === job.gearNeeded,
    };
    const picks = [...vocrehabPicks, pick];
    setVocrehabPicks(picks);
    vocrehabPush("action", { job: vocrehabJobIdx, tool: pick.tool, safety: pick.safety });
    if (!pick.tool || !pick.safety) vocrehabPush("error", { job: vocrehabJobIdx, reason: "mismatch" });
    setVocrehabTool(null);
    setVocrehabGear(null);
    if (vocrehabJobIdx + 1 >= VOCREHAB_JOBS.length) {
      vocrehabPush("complete", { picks: picks.length, seed: vocrehabSeed });
      setVocrehabDone(true);
      setVocrehabNote("All jobs kitted out. Results are shown below.");
      try {
        new BroadcastChannel(vocrehabGame2InteropChannel).postMessage({
          type: "vocrehab:game:completed",
          game: "tool-match",
        });
      } catch {
        /* fail-open: bus unavailable */
      }
    } else {
      setVocrehabJobIdx(vocrehabJobIdx + 1);
      setVocrehabNote(`Job ${vocrehabJobIdx + 2} of ${VOCREHAB_JOBS.length}.`);
    }
  }

  async function vocrehabSend(): Promise<void> {
    setVocrehabSave("saving");
    try {
      const score = vocrehabScoreToolMatch(vocrehabPicks);
      vocrehabPush("complete", { ...score, seed: vocrehabSeed });
      const savedRun = await fetch("/api/vocrehab/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game_id: "tool-match", events: eventsRef.current.slice(0, 200), summary: { ...score, seed: vocrehabSeed } }) });
      setVocrehabSave(savedRun.status === 401 ? "guest" : savedRun.ok ? "saved" : "error");
    } catch {
      setVocrehabSave("error");
    }
  }

  const score = vocrehabScoreToolMatch(vocrehabPicks);
  const job = VOCREHAB_JOBS[vocrehabJobIdx];
  const vocrehabReady = vocrehabTool !== null && vocrehabGear !== null;

  return (
    <section aria-label="Tool Crib game" className="vocrehab-game-tools space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {vocrehabNote}
      </p>

      {!vocrehabStarted && (
        <div className="vocrehab-game-intro space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">How this game works</h2>
          <p>
            You run the tool crib for a day. Eight jobs come in — pick the right tool for each,
            then say whether safety gear is needed. No timer, no fail state. Wrong picks are
            coached, never punished, and retry counts the same as the first try.
          </p>
          <div className="flex flex-wrap gap-2">
            {template.loading ? <p role="status">Loading your starting jobs…</p> : null}
            {template.error ? <p role="status">The assigned scenario could not be loaded. You can still play the standard scenario.</p> : null}
            <button type="button" disabled={template.loading || VOCREHAB_JOBS.length === 0} onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
              Open the crib
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to Work & Life Practice Games
            </Link>
          </div>
        </div>
      )}

      {vocrehabStarted && !vocrehabDone && job && (
        <div className="vocrehab-game-run space-y-3 rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            Job {vocrehabJobIdx + 1} of {VOCREHAB_JOBS.length}
          </p>
          <p className="text-lg font-medium">{job.job}</p>
          <div className="space-y-2">
            <p className="font-medium">Pick the tool:</p>
            {job.tools.map((tool, i) => (
              <button
                key={tool}
                type="button"
                onClick={() => setVocrehabTool(i)}
                aria-pressed={vocrehabTool === i}
                className={`block w-full rounded border p-3 text-left hover:bg-muted ${vocrehabTool === i ? "border-primary font-semibold" : ""}`}
              >
                {tool}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-medium">Safety gear needed?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVocrehabGear(true)}
                aria-pressed={vocrehabGear === true}
                className={`rounded border px-4 py-2 font-medium ${vocrehabGear === true ? "border-primary font-semibold" : ""}`}
              >
                Yes, gear up
              </button>
              <button
                type="button"
                onClick={() => setVocrehabGear(false)}
                aria-pressed={vocrehabGear === false}
                className={`rounded border px-4 py-2 font-medium ${vocrehabGear === false ? "border-primary font-semibold" : ""}`}
              >
                No gear needed
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={vocrehabNext}
            disabled={!vocrehabReady}
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            {vocrehabJobIdx + 1 >= VOCREHAB_JOBS.length ? "Finish" : "Next job"}
          </button>
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
            <button
              type="button"
              onClick={() => {
                setVocrehabPicks([]);
                setVocrehabJobIdx(0);
                setVocrehabTool(null);
                setVocrehabGear(null);
                setVocrehabDone(false);
                setVocrehabSave("idle");
                vocrehabStart();
              }}
              className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
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
