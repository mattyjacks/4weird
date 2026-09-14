/**
 * VocRehab inbox-sprint phishing drill client island (envelope DS-BUILD2-01).
 *
 * Usage: rendered by `app/vocrehab/play/inbox-sprint/drill/page.tsx` (server).
 * This file holds ALL hook logic + the shared `VocrehabGameFrame` wiring
 * (read-only — owned by C4) via render prop, which cannot cross the
 * server/client boundary. The C4 inbox-sprint component and its page are never
 * imported or edited here; drill data + scorer come from
 * `@/lib/vocrehab-inbox-drill`.
 *
 * The drill runner posts its summary to `/api/vocrehab/assessments` with
 * kind=readiness (read-only: that route is never edited here) behind an
 * explicit opt-in button, mirroring `app/vocrehab/discover/readiness/page.tsx`.
 * Fully keyboard-playable: every choice is a native button, debriefs are
 * announced via role=status, and progress is exposed via role=status.
 */

"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import VocrehabGameFrame, {
  type VocrehabGameRunProps,
} from "@/components/vocrehab/vocrehab-game-frame";
import {
  vocrehabInboxDrillScenarios,
  vocrehabScoreInboxDrill,
  type VocrehabInboxDrillAction,
  type VocrehabInboxDrillVerdict,
} from "@/lib/vocrehab-inbox-drill";

const VOCREHAB_DRILL_VERDICTS: readonly { id: VocrehabInboxDrillVerdict; label: string }[] = [
  { id: "legit", label: "Looks legit" },
  { id: "phish", label: "Looks like phishing" },
];

const VOCREHAB_DRILL_ACTIONS: readonly { id: VocrehabInboxDrillAction; label: string }[] = [
  { id: "reply", label: "Reply now" },
  { id: "schedule", label: "Schedule" },
  { id: "file", label: "File" },
  { id: "flag", label: "Flag" },
];

function VocrehabInboxDrillRunner({ vocrehabEmit, vocrehabFinish }: VocrehabGameRunProps) {
  const [vocrehabIndex, setVocrehabIndex] = useState(0);
  const [vocrehabStage, setVocrehabStage] = useState<"verdict" | "action" | "debrief">("verdict");
  const [vocrehabVerdicts, setVocrehabVerdicts] = useState<Record<string, VocrehabInboxDrillVerdict>>({});
  const [vocrehabActions, setVocrehabActions] = useState<Record<string, VocrehabInboxDrillAction>>({});
  const [vocrehabFinished, setVocrehabFinished] = useState(false);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<
    "idle" | "saving" | "saved" | "guest" | "error"
  >("idle");
  const doneRef = useRef(false);

  const scenario = vocrehabInboxDrillScenarios[vocrehabIndex];
  const answeredCount = Object.keys(vocrehabActions).length;

  const result = useMemo(
    () =>
      vocrehabScoreInboxDrill(
        vocrehabInboxDrillScenarios
          .filter((s) => vocrehabVerdicts[s.id] !== undefined && vocrehabActions[s.id] !== undefined)
          .map((s) => ({
            scenarioId: s.id,
            verdict: vocrehabVerdicts[s.id],
            action: vocrehabActions[s.id],
          })),
      ),
    [vocrehabVerdicts, vocrehabActions],
  );

  const vocrehabChooseVerdict = (verdict: VocrehabInboxDrillVerdict) => {
    if (!scenario || vocrehabStage !== "verdict") return;
    setVocrehabVerdicts((p) => ({ ...p, [scenario.id]: verdict }));
    if (verdict === scenario.verdict) {
      vocrehabEmit("action", { drill: "inbox-sprint-drill", scenario: scenario.id, stage: "verdict", correct: true });
    } else {
      vocrehabEmit("error", { drill: "inbox-sprint-drill", scenario: scenario.id, stage: "verdict", coached: true });
    }
    setVocrehabStage("action");
  };

  const vocrehabChooseAction = (action: VocrehabInboxDrillAction) => {
    if (!scenario || vocrehabStage !== "action") return;
    setVocrehabActions((p) => ({ ...p, [scenario.id]: action }));
    if (action === scenario.safeAction) {
      vocrehabEmit("action", { drill: "inbox-sprint-drill", scenario: scenario.id, stage: "action", safe: true });
    } else {
      vocrehabEmit("error", { drill: "inbox-sprint-drill", scenario: scenario.id, stage: "action", coached: true });
    }
    setVocrehabStage("debrief");
  };

  const vocrehabNext = () => {
    if (!scenario) return;
    if (vocrehabIndex + 1 >= vocrehabInboxDrillScenarios.length) {
      vocrehabDone();
      return;
    }
    setVocrehabIndex((i) => i + 1);
    setVocrehabStage("verdict");
  };

  const vocrehabDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setVocrehabFinished(true);
    setVocrehabSaveState("idle");
    vocrehabFinish({
      drill: "inbox-sprint-drill",
      answered: vocrehabInboxDrillScenarios.length,
      verdictHits: result.verdictHits,
      actionHits: result.actionHits,
      band: result.band,
    });
  };

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "readiness",
          payload: {
            drill: "inbox-sprint-drill",
            verdictHits: result.verdictHits,
            actionHits: result.actionHits,
            total: result.total,
          },
          profile: { band: result.band, strengths: result.strengths, supports: result.supports },
        }),
      });
      if (res.status === 401) {
        setVocrehabSaveState("guest");
        return;
      }
      setVocrehabSaveState(res.ok ? "saved" : "error");
    } catch {
      setVocrehabSaveState("error");
    }
  };

  if (vocrehabFinished) {
    return (
      <div className="vocrehab-inbox-drill-results space-y-3">
        <p className="text-sm text-muted-foreground" role="status">
          Drill complete — {result.verdictHits} of {result.total} calls right, {result.actionHits} of{" "}
          {result.total} safe actions.
        </p>
        <div aria-label="Drill summary" aria-live="polite" className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">✓ {result.summary}</h3>
          <p className="text-sm">
            <strong>Strengths:</strong> {result.strengths.join("; ")}
          </p>
          {result.supports.length > 0 && (
            <p className="text-sm">
              <strong>Supports that help:</strong> {result.supports.join("; ")}
            </p>
          )}
        </div>
        {vocrehabSaveState === "guest" && (
          <p role="status" className="text-sm font-medium">
            Sign in to save this drill to your readiness profile. Your result above is still yours to keep.
          </p>
        )}
        {vocrehabSaveState === "error" && (
          <p role="status" className="text-sm font-medium">
            Could not save right now — your result above is safe. Try again.
          </p>
        )}
        {vocrehabSaveState === "saved" && (
          <p role="status" className="text-sm font-medium">
            ✓ Saved to your readiness profile.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={vocrehabSave}
            disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            {vocrehabSaveState === "saving" ? "Saving…" : "Save to readiness profile"}
          </button>
          <Link href="/vocrehab/play/inbox-sprint" className="rounded border px-4 py-2 font-medium">
            Back to Inbox Sprint
          </Link>
        </div>
      </div>
    );
  }

  if (!scenario) return null;
  const chosenVerdict = vocrehabVerdicts[scenario.id];
  const chosenAction = vocrehabActions[scenario.id];

  return (
    <div className="vocrehab-inbox-drill space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Scenario {vocrehabIndex + 1} of {vocrehabInboxDrillScenarios.length} · Safe actions picked:{" "}
        {answeredCount}
      </p>

      <article aria-labelledby="vocrehab-drill-subject" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">From: {scenario.sender}</p>
        <h3 id="vocrehab-drill-subject" className="font-medium">
          ✉ {scenario.subject}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{scenario.bodySnippet}</p>
      </article>

      {vocrehabStage === "verdict" && (
        <fieldset>
          <legend className="font-medium">Step 1 — legit or phishing?</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOCREHAB_DRILL_VERDICTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => vocrehabChooseVerdict(v.id)}
                aria-pressed={chosenVerdict === v.id}
                className="rounded border px-3 py-1.5 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {v.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {vocrehabStage !== "verdict" && (
        <p className="text-sm" role="status">
          Your call: {chosenVerdict === "phish" ? "phishing" : "legit"} — now pick the safe action.
        </p>
      )}

      {vocrehabStage === "action" && (
        <fieldset>
          <legend className="font-medium">Step 2 — what is the safe action?</legend>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Safe action: ${scenario.subject}`}>
            {VOCREHAB_DRILL_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => vocrehabChooseAction(a.id)}
                aria-pressed={chosenAction === a.id}
                className="rounded border px-3 py-1.5 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {vocrehabStage === "debrief" && (
        <div className="space-y-2 rounded-lg border p-4" aria-live="polite">
          <h3 className="font-semibold">
            {chosenVerdict === scenario.verdict && chosenAction === scenario.safeAction
              ? "✓ Safe moves — nicely handled."
              : chosenVerdict === scenario.verdict
                ? "✓ Good call on legit-vs-phishing — one tweak on the action."
                : "Good rep — this one was tricky, and practice is exactly for this."}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {scenario.debrief.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={vocrehabNext}
            autoFocus
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            {vocrehabIndex + 1 >= vocrehabInboxDrillScenarios.length ? "Finish drill" : "Next message"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DrillClient() {
  return (
    <VocrehabGameFrame
      vocrehabGameId="inbox-sprint"
      vocrehabTitle="Inbox Phishing Drill"
      vocrehabInstructions="Read 12 mock messages. For each: first call legit or phishing, then pick the safe action (reply, schedule, file, or flag). Flagging anything pushy is always safe."
      vocrehabPracticeSteps={[
        "Read who it is from and what it asks — threats plus links mean pause.",
        "Call each message legit or phishing first; there is no penalty for a wrong call.",
        "Then pick the safe action: reply, schedule, file, or flag.",
      ]}
      vocrehabTimeLimitSec={null}
      vocrehabExitHref="/vocrehab/play/inbox-sprint"
    >
      {(run) => <VocrehabInboxDrillRunner {...run} />}
    </VocrehabGameFrame>
  );
}
