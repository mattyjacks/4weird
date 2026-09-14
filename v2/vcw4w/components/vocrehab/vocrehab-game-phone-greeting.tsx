"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  vocrehabGame2AssessmentPayload,
  vocrehabGame2InteropChannel,
  vocrehabScorePhoneGreeting,
  type VocrehabGame2Event,
  type VocrehabPhoneGreetingPick,
} from "@/lib/vocrehab-games2";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectPhone } from "@/lib/vocrehab-seed-pools2";

interface VocrehabCallOption {
  text: string;
  courtesy: 0 | 1 | 2;
}

interface VocrehabCall {
  caller: string;
  line: string;
  context: string;
  options: [VocrehabCallOption, VocrehabCallOption, VocrehabCallOption];
  recallQuestion: string;
  recallOptions: [string, string, string];
  recallAnswer: number;
}

interface VocrehabGamePhoneGreetingProps {
  vocrehabSeed?: string;
  vocrehabRunKey?: number;
}

type VocrehabSaveState = "idle" | "saving" | "saved" | "guest" | "error";

export function VocrehabGamePhoneGreeting(props: VocrehabGamePhoneGreetingProps = {}): React.ReactNode {
  const [vocrehabStarted, setVocrehabStarted] = useState(false);
  const [vocrehabCallIdx, setVocrehabCallIdx] = useState(0);
  const [vocrehabAwaitRecall, setVocrehabAwaitRecall] = useState(false);
  const [vocrehabPicks, setVocrehabPicks] = useState<VocrehabPhoneGreetingPick[]>([]);
  const [vocrehabPendingCourtesy, setVocrehabPendingCourtesy] = useState<0 | 1 | 2 | null>(null);
  const [vocrehabDone, setVocrehabDone] = useState(false);
  const [vocrehabSave, setVocrehabSave] = useState<VocrehabSaveState>("idle");
  const [vocrehabNote, setVocrehabNote] = useState("Front-Desk Hello. Six practice calls.");
  const startRef = useRef(0);
  const eventsRef = useRef<VocrehabGame2Event[]>([]);
  const vocrehabRunKey = props.vocrehabRunKey ?? 0;
  const vocrehabSeed = useMemo(
    () => parseSeed(props.vocrehabSeed ?? null) ?? makeSeed(),
    [props.vocrehabSeed, vocrehabRunKey],
  );
  const vocrehabDeal = useMemo(
    () => vocrehabSelectPhone(vocrehabSeed),
    [vocrehabSeed, vocrehabRunKey],
  );
  const VOCREHAB_CALLS: VocrehabCall[] = vocrehabDeal.callers;

  const vocrehabNow = useCallback((): number =>
    startRef.current === 0 ? 0 : Math.max(0, Math.round(performance.now() - startRef.current)),
  []);

  function vocrehabPush(kind: VocrehabGame2Event["kind"], detail: Record<string, unknown>): void {
    if (eventsRef.current.length >= 200) return;
    eventsRef.current.push({ t_ms: vocrehabNow(), kind, detail });
  }

  function vocrehabStart(): void {
    startRef.current = performance.now();
    eventsRef.current = [{ t_ms: 0, kind: "start", detail: { game: "phone-greeting" } }];
    setVocrehabStarted(true);
    setVocrehabNote(`Call 1 of ${VOCREHAB_CALLS.length}.`);
  }

  function vocrehabAnswer(optionIdx: number): void {
    const call = VOCREHAB_CALLS[vocrehabCallIdx];
    if (!call) return;
    const opt = call.options[optionIdx];
    if (!opt) return;
    setVocrehabPendingCourtesy(opt.courtesy);
    setVocrehabAwaitRecall(true);
    vocrehabPush("action", { call: vocrehabCallIdx, pick: optionIdx, courtesy: opt.courtesy });
    if (opt.courtesy === 0) vocrehabPush("error", { call: vocrehabCallIdx, reason: "off-putting reply" });
    setVocrehabNote(`Recall check for call ${vocrehabCallIdx + 1}.`);
  }

  function vocrehabRecall(optionIdx: number): void {
    const call = VOCREHAB_CALLS[vocrehabCallIdx];
    if (!call || vocrehabPendingCourtesy === null) return;
    const recall = optionIdx === call.recallAnswer;
    const picks = [...vocrehabPicks, { courtesy: vocrehabPendingCourtesy, recall }];
    setVocrehabPicks(picks);
    vocrehabPush("action", { call: vocrehabCallIdx, recall, detail: recall ? "remembered" : "missed" });
    setVocrehabPendingCourtesy(null);
    setVocrehabAwaitRecall(false);
    if (vocrehabCallIdx + 1 >= VOCREHAB_CALLS.length) {
      vocrehabPush("complete", { picks: picks.length, seed: vocrehabSeed });
      setVocrehabDone(true);
      setVocrehabNote("All calls finished. Results are shown below.");
      try {
        new BroadcastChannel(vocrehabGame2InteropChannel).postMessage({
          type: "vocrehab:game:completed",
          game: "phone-greeting",
        });
      } catch {
        /* fail-open: bus unavailable */
      }
    } else {
      setVocrehabCallIdx(vocrehabCallIdx + 1);
      setVocrehabNote(`Call ${vocrehabCallIdx + 2} of ${VOCREHAB_CALLS.length}.`);
    }
  }

  async function vocrehabSend(): Promise<void> {
    setVocrehabSave("saving");
    try {
      const score = vocrehabScorePhoneGreeting(vocrehabPicks);
      const base = vocrehabGame2AssessmentPayload("phone-greeting", score);
      const body = { ...base, payload: { ...base.payload, seed: vocrehabSeed } };
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

  const score = vocrehabScorePhoneGreeting(vocrehabPicks);
  const call = VOCREHAB_CALLS[vocrehabCallIdx];

  return (
    <section aria-label="Front-Desk Hello game" className="vocrehab-game-phone space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {vocrehabNote}
      </p>

      {!vocrehabStarted && (
        <div className="vocrehab-game-intro space-y-3 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">How this game works</h2>
          <p>
            You are the front desk for one morning. Six callers ring in — pick the warmest reply,
            then prove you listened by answering one recall question per call. No timer, no fail
            state. Retry any time; every try counts the same.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={vocrehabStart} className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground">
              Answer the first call
            </button>
            <Link href="/vocrehab/play" className="rounded border px-4 py-2 font-medium">
              Back to arcade
            </Link>
          </div>
        </div>
      )}

      {vocrehabStarted && !vocrehabDone && call && (
        <div className="vocrehab-game-run space-y-3 rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            Call {vocrehabCallIdx + 1} of {VOCREHAB_CALLS.length} ☎ {call.caller} is on the line
          </p>
          <blockquote className="rounded bg-muted p-3 text-lg">{call.line}</blockquote>
          <p className="text-sm text-muted-foreground">Background: {call.context}</p>
          {!vocrehabAwaitRecall && (
            <div className="space-y-2">
              <p className="font-medium">Pick your greeting:</p>
              {call.options.map((opt, i) => (
                <button
                  key={opt.text}
                  type="button"
                  onClick={() => vocrehabAnswer(i)}
                  className="block w-full rounded border p-3 text-left hover:bg-muted"
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}
          {vocrehabAwaitRecall && (
            <div className="space-y-2">
              <p className="font-medium">{call.recallQuestion}</p>
              {call.recallOptions.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => vocrehabRecall(i)}
                  className="block w-full rounded border p-3 text-left hover:bg-muted"
                >
                  {opt}
                </button>
              ))}
            </div>
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
            <button
              type="button"
              onClick={() => {
                setVocrehabPicks([]);
                setVocrehabCallIdx(0);
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
