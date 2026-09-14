"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  vocrehabGame2AssessmentPayload,
  vocrehabGame2InteropChannel,
  vocrehabScoreToolMatch,
  type VocrehabGame2Event,
  type VocrehabToolMatchPick,
} from "@/lib/vocrehab-games2";

interface VocrehabJob {
  job: string;
  tools: [string, string, string, string];
  toolAnswer: number;
  gearNeeded: boolean;
  gearNote: string;
}

const VOCREHAB_JOBS: VocrehabJob[] = [
  {
    job: "Mop the lobby floor after lunch rush",
    tools: ["Wet mop + bucket", "Dry duster", "Leaf blower", "Paint roller"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Wet-floor sign + non-slip shoes.",
  },
  {
    job: "Replace the flickering bulb in hallway B",
    tools: ["Step ladder + spare bulb", "Hammer", "Garden hose", "Stapler"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Power off at the switch + gloves.",
  },
  {
    job: "File 40 invoices alphabetically",
    tools: ["File trays + labels", "Chainsaw", "Floor buffer", "Lawn mower"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — just good lighting.",
  },
  {
    job: "Assemble a flat-pack shelf for the break room",
    tools: ["Allen key + instructions", "Sledgehammer", "Hedge trimmer", "Microwave"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — keep small parts off the floor.",
  },
  {
    job: "Clear the blocked break-room sink drain",
    tools: ["Plunger + bucket", "Hair dryer", "Crowbar", "Extension cord"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Rubber gloves + eye protection.",
  },
  {
    job: "Water the office plants on floor 2",
    tools: ["Watering can", "Pressure washer", "Snow shovel", "Jackhammer"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — wipe spills so nobody slips.",
  },
  {
    job: "Hang the new safety poster in the warehouse",
    tools: ["Tape measure + level + pins", "Welding torch", "Cement mixer", "Leaf blower"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "High-visibility vest in the warehouse.",
  },
  {
    job: "Shred a box of old receipts",
    tools: ["Cross-cut shredder", "Paper clips", "Coffee maker", "Space heater"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — feed a few sheets at a time.",
  },
];

type VocrehabSaveState = "idle" | "saving" | "saved" | "guest" | "error";

export function VocrehabGameToolMatch(): React.ReactNode {
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
      vocrehabPush("complete", { picks: picks.length });
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
      const body = vocrehabGame2AssessmentPayload("tool-match", score);
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
            <button type="button" onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
              Open the crib
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to arcade
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
              Back to arcade
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
