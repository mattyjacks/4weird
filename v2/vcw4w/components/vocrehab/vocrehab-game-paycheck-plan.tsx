"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeSeed } from "@/lib/vocrehab-seed";
import {
  vocrehabSelectPaycheck,
  type VocrehabPaycheckPoolScenario,
} from "@/lib/vocrehab-seed-pools3";

type VocrehabPaycheckPhase = "intro" | "practice" | "countdown" | "run" | "results";
type VocrehabPaycheckStep = "gross" | "allocate" | "curveball" | "roundDone";
type VocrehabPaycheckKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

interface VocrehabPaycheckEvent {
  t_ms: number;
  kind: VocrehabPaycheckKind;
  detail: Record<string, string | number | boolean>;
}

interface VocrehabPaycheckProps {
  vocrehabGameId?: string;
  vocrehabTimeLimitSec?: number;
  vocrehabOnComplete?: (vocrehabTelemetry: VocrehabPaycheckEvent[]) => void;
  vocrehabOnExit?: () => void;
  vocrehabSeed?: string;
  vocrehabRunKey?: number;
}

interface VocrehabPaycheckRound {
  vocrehabKey: string;
  vocrehabTitle: string;
  vocrehabWage: number;
  vocrehabHours: number;
  vocrehabDeductionRate: number;
  vocrehabDeductionLabel: string;
  vocrehabCurveball: string;
  vocrehabCurveballCost: number;
}

const VOCREHAB_PAYCHECK_MAX_EVENTS = 200;
const VOCREHAB_PAYCHECK_COUNTDOWN_SEC = 3;
const VOCREHAB_PAYCHECK_PRACTICE_WAGE = 16;
const VOCREHAB_PAYCHECK_PRACTICE_HOURS = 20;

function vocrehabPaycheckNum(vocrehabValue: unknown, vocrehabFallback: number): number {
  return typeof vocrehabValue === "number" && Number.isFinite(vocrehabValue)
    ? vocrehabValue
    : vocrehabFallback;
}

function vocrehabPaycheckStr(vocrehabValue: unknown, vocrehabFallback: string): string {
  return typeof vocrehabValue === "string" && vocrehabValue.length > 0
    ? vocrehabValue
    : vocrehabFallback;
}

function vocrehabPaycheckNorm(
  vocrehabRaw: VocrehabPaycheckPoolScenario,
  vocrehabIndex: number,
): VocrehabPaycheckRound {
  const vocrehabRec = vocrehabRaw as unknown as Record<string, unknown>;
  const vocrehabWage = Math.max(1, Math.round(vocrehabPaycheckNum(vocrehabRec.wage, 15)));
  const vocrehabHours = Math.max(1, Math.round(vocrehabPaycheckNum(vocrehabRec.hours, 25)));
  return {
    vocrehabKey: vocrehabPaycheckStr(vocrehabRec.id, `vocrehab-round-${vocrehabIndex + 1}`),
    vocrehabTitle: vocrehabPaycheckStr(vocrehabRec.title, `Paycheck ${vocrehabIndex + 1}`),
    vocrehabWage,
    vocrehabHours,
    vocrehabDeductionRate: vocrehabPaycheckNum(vocrehabRec.deductionRate, 0.15),
    vocrehabDeductionLabel: vocrehabPaycheckStr(vocrehabRec.deductionLabel, "Taxes + fees"),
    vocrehabCurveball: vocrehabPaycheckStr(
      vocrehabRec.curveball,
      "Bus pass renewal came due early.",
    ),
    vocrehabCurveballCost: Math.max(
      1,
      Math.round(vocrehabPaycheckNum(vocrehabRec.curveballCost, 40)),
    ),
  };
}

function vocrehabPaycheckMoney(vocrehabAmount: number): string {
  return `$${Math.round(vocrehabAmount).toLocaleString("en-US")}`;
}

function vocrehabPaycheckGrossOptions(
  vocrehabWage: number,
  vocrehabHours: number,
  vocrehabRound: number,
): number[] {
  const vocrehabGross = vocrehabWage * vocrehabHours;
  const vocrehabLow = Math.max(1, vocrehabGross - vocrehabWage);
  const vocrehabHigh = vocrehabGross + vocrehabWage;
  const vocrehabSets: number[][] = [
    [vocrehabGross, vocrehabLow, vocrehabHigh],
    [vocrehabLow, vocrehabGross, vocrehabHigh],
    [vocrehabLow, vocrehabHigh, vocrehabGross],
  ];
  return vocrehabSets[vocrehabRound % vocrehabSets.length];
}

function vocrehabPaycheckBand(vocrehabPoints: number): {
  vocrehabBand: string;
  vocrehabSuggests: string;
  vocrehabNext: string;
} {
  if (vocrehabPoints >= 8) {
    return {
      vocrehabBand: "Thriving Tracker",
      vocrehabSuggests: "You read a pay stub, split it three ways, and absorbed surprises.",
      vocrehabNext: "Try this plan with a real pay stub and a trusted person.",
    };
  }
  if (vocrehabPoints >= 5) {
    return {
      vocrehabBand: "Steady Planner",
      vocrehabSuggests: "Your core math is solid. Curveballs are the growth edge.",
      vocrehabNext: "Replay one round and cover the curveball from Fun first.",
    };
  }
  return {
    vocrehabBand: "Growing Starter",
    vocrehabSuggests: "Budgeting is a new muscle. Practice reps build it fast.",
    vocrehabNext: "Replay the practice round, then run again with no rush.",
  };
}

const vocrehabPaycheckPanel: React.CSSProperties = {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "24px",
  border: "2px solid #1e293b",
  borderRadius: "12px",
  background: "#f8fafc",
  color: "#0f172a",
  fontFamily: "system-ui, sans-serif",
};

const vocrehabPaycheckBtn: React.CSSProperties = {
  display: "inline-block",
  margin: "6px 8px 6px 0",
  padding: "10px 18px",
  border: "2px solid #1e293b",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "16px",
  cursor: "pointer",
};

const vocrehabPaycheckPrimary: React.CSSProperties = {
  ...vocrehabPaycheckBtn,
  background: "#1e293b",
  color: "#ffffff",
};

const vocrehabPaycheckInput: React.CSSProperties = {
  width: "120px",
  padding: "8px",
  margin: "4px 8px 4px 0",
  border: "2px solid #1e293b",
  borderRadius: "8px",
  fontSize: "16px",
  background: "#ffffff",
  color: "#0f172a",
};

export default function VocrehabGamePaycheckPlan(vocrehabProps: VocrehabPaycheckProps): React.ReactNode {
  const vocrehabGameId = vocrehabProps.vocrehabGameId ?? "vocrehab-paycheck-plan";
  const [vocrehabPhase, setVocrehabPhase] = useState<VocrehabPaycheckPhase>("intro");
  const [vocrehabPaused, setVocrehabPaused] = useState(false);
  const [vocrehabReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [vocrehabCount, setVocrehabCount] = useState(VOCREHAB_PAYCHECK_COUNTDOWN_SEC);
  const [vocrehabRound, setVocrehabRound] = useState(0);
  const [vocrehabStep, setVocrehabStep] = useState<VocrehabPaycheckStep>("gross");
  const [vocrehabPracticeTries, setVocrehabPracticeTries] = useState(0);
  const [vocrehabPracticeDone, setVocrehabPracticeDone] = useState(false);
  const [vocrehabPracticeMsg, setVocrehabPracticeMsg] = useState("");
  const [vocrehabGrossTries, setVocrehabGrossTries] = useState(0);
  const [vocrehabGrossMsg, setVocrehabGrossMsg] = useState("");
  const [vocrehabSave, setVocrehabSave] = useState("0");
  const [vocrehabNeeds, setVocrehabNeeds] = useState("0");
  const [vocrehabFun, setVocrehabFun] = useState("0");
  const [vocrehabAllocTries, setVocrehabAllocTries] = useState(0);
  const [vocrehabAllocMsg, setVocrehabAllocMsg] = useState("");
  const [vocrehabCurveMsg, setVocrehabCurveMsg] = useState("");
  const [vocrehabCurveTries, setVocrehabCurveTries] = useState(0);
  const [vocrehabPoints, setVocrehabPoints] = useState(0);
  const [vocrehabPointsLog, setVocrehabPointsLog] = useState<number[]>([]);
  const [vocrehabSent, setVocrehabSent] = useState(false);
  const [vocrehabShowNumbers, setVocrehabShowNumbers] = useState(false);

  const vocrehabStartRef = useRef(0);
  const vocrehabPausedTotalRef = useRef(0);
  const vocrehabPauseStartRef = useRef(0);
  const vocrehabEventsRef = useRef<VocrehabPaycheckEvent[]>([]);
  const vocrehabTimersRef = useRef<number[]>([]);

  // Seeded budget scenarios: every seed replays the same fair 3-round set.
  const vocrehabSelected = useMemo(() => {
    const seed = vocrehabProps.vocrehabSeed ?? makeSeed();
    return vocrehabSelectPaycheck(seed);
  }, [vocrehabProps.vocrehabSeed, vocrehabProps.vocrehabRunKey]);
  const vocrehabSeed = vocrehabSelected.seed;
  const vocrehabScenarios: readonly VocrehabPaycheckPoolScenario[] = vocrehabSelected.scenarios;
  const vocrehabRounds: VocrehabPaycheckRound[] = vocrehabScenarios
    .slice(0, 3)
    .map((vocrehabS, vocrehabI) => vocrehabPaycheckNorm(vocrehabS, vocrehabI));
  const vocrehabActive: VocrehabPaycheckRound | null =
    vocrehabRounds.length > 0 ? vocrehabRounds[Math.min(vocrehabRound, vocrehabRounds.length - 1)] : null;
  const vocrehabGross = vocrehabActive ? vocrehabActive.vocrehabWage * vocrehabActive.vocrehabHours : 0;
  const vocrehabDeductions = vocrehabActive
    ? Math.round(vocrehabGross * vocrehabActive.vocrehabDeductionRate)
    : 0;
  const vocrehabNet = vocrehabGross - vocrehabDeductions;
  const vocrehabSaveN = Math.max(0, Math.round(Number(vocrehabSave) || 0));
  const vocrehabNeedsN = Math.max(0, Math.round(Number(vocrehabNeeds) || 0));
  const vocrehabFunN = Math.max(0, Math.round(Number(vocrehabFun) || 0));
  const vocrehabAllocated = vocrehabSaveN + vocrehabNeedsN + vocrehabFunN;
  const vocrehabRemaining = vocrehabNet - vocrehabAllocated;

  function vocrehabPush(vocrehabKind: VocrehabPaycheckKind, vocrehabDetail: Record<string, string | number | boolean>): void {
    if (vocrehabEventsRef.current.length >= VOCREHAB_PAYCHECK_MAX_EVENTS) return;
    const vocrehabT =
      vocrehabStartRef.current === 0
        ? 0
        : Math.max(
            0,
            Math.round(performance.now() - vocrehabStartRef.current - vocrehabPausedTotalRef.current),
          );
    vocrehabEventsRef.current.push({ t_ms: vocrehabT, kind: vocrehabKind, detail: vocrehabDetail });
  }

  function vocrehabClearTimers(): void {
    vocrehabTimersRef.current.forEach((vocrehabT) => window.clearTimeout(vocrehabT));
    vocrehabTimersRef.current = [];
  }

  useEffect(() => {
    return () => {
      vocrehabClearTimers();
    };
  }, []);

  useEffect(() => {
    if (vocrehabPhase !== "countdown") return;
    vocrehabPush("action", { phase: "countdown", seconds: VOCREHAB_PAYCHECK_COUNTDOWN_SEC });
    for (let vocrehabI = 1; vocrehabI <= VOCREHAB_PAYCHECK_COUNTDOWN_SEC; vocrehabI += 1) {
      const vocrehabId = window.setTimeout(() => {
        setVocrehabCount(VOCREHAB_PAYCHECK_COUNTDOWN_SEC - vocrehabI);
      }, vocrehabI * 1000);
      vocrehabTimersRef.current.push(vocrehabId);
    }
    const vocrehabGo = window.setTimeout(() => {
      setVocrehabRound(0);
      setVocrehabStep("gross");
      setVocrehabPhase("run");
      vocrehabPush("action", { phase: "run", round: 1 });
    }, VOCREHAB_PAYCHECK_COUNTDOWN_SEC * 1000 + 200);
    vocrehabTimersRef.current.push(vocrehabGo);
    return () => {
      vocrehabClearTimers();
    };
  }, [vocrehabPhase]);

  useEffect(() => {
    if (vocrehabPhase !== "run") return;
    if (typeof vocrehabProps.vocrehabTimeLimitSec !== "number") return;
    const vocrehabLimitMs = Math.max(1, vocrehabProps.vocrehabTimeLimitSec) * 1000;
    const vocrehabId = window.setTimeout(() => {
      vocrehabPush("interrupt", { reason: "time-limit", game: vocrehabGameId });
      setVocrehabPhase("results");
      vocrehabPush("complete", { game: vocrehabGameId, points: vocrehabPoints, seed: vocrehabSeed });
    }, vocrehabLimitMs);
    vocrehabTimersRef.current.push(vocrehabId);
    return () => {
      window.clearTimeout(vocrehabId);
    };
  }, [vocrehabPhase, vocrehabProps.vocrehabTimeLimitSec, vocrehabGameId, vocrehabPoints, vocrehabSeed]);

  function vocrehabBeginPractice(): void {
    vocrehabStartRef.current = performance.now();
    vocrehabPausedTotalRef.current = 0;
    vocrehabEventsRef.current = [{ t_ms: 0, kind: "start", detail: { game: vocrehabGameId } }];
    setVocrehabPracticeTries(0);
    setVocrehabPracticeDone(false);
    setVocrehabPracticeMsg("");
    setVocrehabPhase("practice");
    vocrehabPush("action", { phase: "practice" });
  }

  function vocrehabAnswerPractice(vocrehabPick: number): void {
    const vocrehabAnswer = VOCREHAB_PAYCHECK_PRACTICE_WAGE * VOCREHAB_PAYCHECK_PRACTICE_HOURS;
    if (vocrehabPick === vocrehabAnswer) {
      setVocrehabPracticeDone(true);
      setVocrehabPracticeMsg(
        `Correct. ${vocrehabPaycheckMoney(VOCREHAB_PAYCHECK_PRACTICE_WAGE)} x ${VOCREHAB_PAYCHECK_PRACTICE_HOURS} hours = ${vocrehabPaycheckMoney(vocrehabAnswer)} gross.`,
      );
      vocrehabPush("action", { phase: "practice", correct: true, tries: vocrehabPracticeTries + 1 });
    } else {
      setVocrehabPracticeTries((vocrehabT) => vocrehabT + 1);
      setVocrehabPracticeMsg("Not quite. Multiply wage by hours, then try again.");
      vocrehabPush("help", { phase: "practice", correct: false });
    }
  }

  function vocrehabBeginCountdown(): void {
    setVocrehabPaused(false);
    setVocrehabCount(VOCREHAB_PAYCHECK_COUNTDOWN_SEC);
    setVocrehabPhase("countdown");
  }

  function vocrehabAnswerGross(vocrehabPick: number): void {
    if (!vocrehabActive) return;
    if (vocrehabPick === vocrehabGross) {
      if (vocrehabGrossTries === 0) {
        setVocrehabPoints((vocrehabP) => vocrehabP + 1);
        setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 1]);
      } else {
        setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 0]);
      }
      setVocrehabGrossMsg(`Correct. Gross is ${vocrehabPaycheckMoney(vocrehabGross)}.`);
      vocrehabPush("action", {
        round: vocrehabRound + 1,
        step: "gross",
        correct: true,
        tries: vocrehabGrossTries + 1,
      });
      setVocrehabStep("allocate");
      setVocrehabSave("0");
      setVocrehabNeeds("0");
      setVocrehabFun("0");
      setVocrehabAllocTries(0);
      setVocrehabAllocMsg("");
    } else {
      setVocrehabGrossTries((vocrehabT) => vocrehabT + 1);
      setVocrehabGrossMsg("Not quite. Gross = wage x hours. Try again.");
      vocrehabPush("error", { round: vocrehabRound + 1, step: "gross", correct: false });
    }
  }

  function vocrehabLockAllocation(): void {
    if (!vocrehabActive) return;
    if (vocrehabRemaining !== 0) {
      setVocrehabAllocTries((vocrehabT) => vocrehabT + 1);
      setVocrehabAllocMsg(
        vocrehabRemaining > 0
          ? `${vocrehabPaycheckMoney(vocrehabRemaining)} still unassigned. Every dollar needs a job.`
          : `Over budget by ${vocrehabPaycheckMoney(-vocrehabRemaining)}. Trim a bucket.`,
      );
      vocrehabPush("error", { round: vocrehabRound + 1, step: "allocate", remaining: vocrehabRemaining });
      return;
    }
    if (vocrehabAllocTries === 0) {
      setVocrehabPoints((vocrehabP) => vocrehabP + 1);
      setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 1]);
    } else {
      setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 0]);
    }
    vocrehabPush("action", {
      round: vocrehabRound + 1,
      step: "allocate",
      save: vocrehabSaveN,
      needs: vocrehabNeedsN,
      fun: vocrehabFunN,
      tries: vocrehabAllocTries + 1,
    });
    setVocrehabStep("curveball");
    setVocrehabCurveTries(0);
    setVocrehabCurveMsg("");
  }

  function vocrehabCoverCurveball(vocrehabBucket: "save" | "needs" | "fun"): void {
    if (!vocrehabActive) return;
    const vocrehabCost = vocrehabActive.vocrehabCurveballCost;
    const vocrehabFunds =
      vocrehabBucket === "save" ? vocrehabSaveN : vocrehabBucket === "needs" ? vocrehabNeedsN : vocrehabFunN;
    if (vocrehabFunds < vocrehabCost) {
      setVocrehabCurveTries((vocrehabT) => vocrehabT + 1);
      setVocrehabCurveMsg(
        `That bucket holds ${vocrehabPaycheckMoney(vocrehabFunds)}, short of ${vocrehabPaycheckMoney(vocrehabCost)}. Pick a bucket that covers it.`,
      );
      vocrehabPush("error", { round: vocrehabRound + 1, step: "curveball", bucket: vocrehabBucket });
      return;
    }
    if (vocrehabCurveTries === 0) {
      setVocrehabPoints((vocrehabP) => vocrehabP + 1);
      setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 1]);
    } else {
      setVocrehabPointsLog((vocrehabL) => [...vocrehabL, 0]);
    }
    if (vocrehabBucket === "save") setVocrehabSave(String(vocrehabSaveN - vocrehabCost));
    if (vocrehabBucket === "needs") setVocrehabNeeds(String(vocrehabNeedsN - vocrehabCost));
    if (vocrehabBucket === "fun") setVocrehabFun(String(vocrehabFunN - vocrehabCost));
    vocrehabPush("action", { round: vocrehabRound + 1, step: "curveball", bucket: vocrehabBucket, cost: vocrehabCost });
    setVocrehabCurveMsg(
      `Covered ${vocrehabPaycheckMoney(vocrehabCost)} from ${vocrehabBucket === "save" ? "Save" : vocrehabBucket === "needs" ? "Needs" : "Fun"}.`,
    );
    setVocrehabStep("roundDone");
  }

  function vocrehabNextRound(): void {
    if (vocrehabRound + 1 >= vocrehabRounds.length) {
      setVocrehabPhase("results");
      vocrehabPush("complete", { game: vocrehabGameId, points: vocrehabPoints, rounds: vocrehabRounds.length, seed: vocrehabSeed });
      return;
    }
    setVocrehabRound((vocrehabR) => vocrehabR + 1);
    setVocrehabStep("gross");
    setVocrehabGrossTries(0);
    setVocrehabGrossMsg("");
    setVocrehabAllocMsg("");
    setVocrehabCurveMsg("");
    setVocrehabSave("0");
    setVocrehabNeeds("0");
    setVocrehabFun("0");
    vocrehabPush("action", { phase: "run", round: vocrehabRound + 2 });
  }

  function vocrehabPause(): void {
    if (vocrehabPhase === "countdown") return;
    vocrehabPauseStartRef.current = performance.now();
    setVocrehabPaused(true);
    vocrehabPush("pause", { phase: vocrehabPhase });
  }

  function vocrehabResume(): void {
    vocrehabPausedTotalRef.current += performance.now() - vocrehabPauseStartRef.current;
    setVocrehabPaused(false);
    vocrehabPush("resume", { phase: vocrehabPhase });
  }

  function vocrehabExit(): void {
    vocrehabPush("interrupt", { reason: "exit", phase: vocrehabPhase });
    vocrehabClearTimers();
    if (vocrehabProps.vocrehabOnExit) vocrehabProps.vocrehabOnExit();
  }

  function vocrehabRetry(): void {
    vocrehabStartRef.current = performance.now();
    vocrehabPausedTotalRef.current = 0;
    vocrehabEventsRef.current = [{ t_ms: 0, kind: "start", detail: { game: vocrehabGameId, retry: true } }];
    setVocrehabPaused(false);
    setVocrehabRound(0);
    setVocrehabStep("gross");
    setVocrehabGrossTries(0);
    setVocrehabGrossMsg("");
    setVocrehabAllocMsg("");
    setVocrehabCurveMsg("");
    setVocrehabSave("0");
    setVocrehabNeeds("0");
    setVocrehabFun("0");
    setVocrehabPoints(0);
    setVocrehabPointsLog([]);
    setVocrehabSent(false);
    setVocrehabShowNumbers(false);
    setVocrehabPracticeDone(false);
    setVocrehabPracticeMsg("");
    setVocrehabPhase("practice");
  }

  function vocrehabSend(): void {
    vocrehabPush("complete", { game: vocrehabGameId, points: vocrehabPoints, sent: true, seed: vocrehabSeed });
    if (vocrehabProps.vocrehabOnComplete) vocrehabProps.vocrehabOnComplete([...vocrehabEventsRef.current]);
    setVocrehabSent(true);
  }

  const vocrehabBand = vocrehabPaycheckBand(vocrehabPoints);

  return (
    <section className="vocrehab-paycheck-plan" style={vocrehabPaycheckPanel} aria-label="Paycheck Planner game">
      <p style={{ margin: "0 0 8px", fontSize: "14px" }}>VocRehab Arcade: first-paycheck budgeting</p>
      <h2 style={{ margin: "0 0 12px", fontSize: "24px" }}>Paycheck Planner</h2>

      {vocrehabPhase !== "intro" && vocrehabPhase !== "results" && (
        <div style={{ marginBottom: "12px" }}>
          {vocrehabPhase !== "countdown" && !vocrehabPaused && (
            <button type="button" style={vocrehabPaycheckBtn} onClick={vocrehabPause}>
              Pause
            </button>
          )}
          {vocrehabPhase !== "countdown" && (
            <button type="button" style={vocrehabPaycheckBtn} onClick={vocrehabExit}>
              Exit
            </button>
          )}
          {vocrehabPhase === "run" && vocrehabRounds.length > 0 && (
            <span style={{ marginLeft: "8px", fontSize: "14px" }}>
              Round {Math.min(vocrehabRound + 1, vocrehabRounds.length)} of {vocrehabRounds.length}
            </span>
          )}
        </div>
      )}

      {vocrehabPaused && (
        <div className="vocrehab-paycheck-paused" style={{ padding: "16px", border: "2px dashed #1e293b", borderRadius: "8px" }}>
          <h3 style={{ marginTop: 0 }}>Paused</h3>
          <p>Take your time. The clock is frozen while paused.</p>
          <button type="button" style={vocrehabPaycheckPrimary} onClick={vocrehabResume} autoFocus>
            Resume
          </button>
          <button type="button" style={vocrehabPaycheckBtn} onClick={vocrehabExit}>
            Exit
          </button>
        </div>
      )}

      {!vocrehabPaused && vocrehabPhase === "intro" && (
        <div className="vocrehab-paycheck-intro">
          <p>
            Your first paycheck is here. Turn wage x hours into a plan: cover deductions, split the
            rest across Save, Needs, and Fun, then handle a curveball. Three rounds, no rush.
          </p>
          <ul>
            <li>Gross pay = hourly wage x hours worked.</li>
            <li>Net pay = gross minus deductions.</li>
            <li>Every net dollar gets a job: Save, Needs, or Fun.</li>
          </ul>
          <p style={{ fontSize: "14px" }}>
            Keyboard only: Tab to move, Enter or Space to choose, type numbers in the boxes.
            {vocrehabReduced ? " Reduced motion is on." : ""}
          </p>
          <button type="button" style={vocrehabPaycheckPrimary} onClick={vocrehabBeginPractice} autoFocus>
            Start practice
          </button>
        </div>
      )}

      {!vocrehabPaused && vocrehabPhase === "practice" && (
        <div className="vocrehab-paycheck-practice">
          <h3 style={{ marginTop: 0 }}>Practice: find the gross</h3>
          <p>
            Wage {vocrehabPaycheckMoney(VOCREHAB_PAYCHECK_PRACTICE_WAGE)} x {VOCREHAB_PAYCHECK_PRACTICE_HOURS} hours.
            What is the gross?
          </p>
          <div>
            {[VOCREHAB_PAYCHECK_PRACTICE_WAGE * VOCREHAB_PAYCHECK_PRACTICE_HOURS - 20,
              VOCREHAB_PAYCHECK_PRACTICE_WAGE * VOCREHAB_PAYCHECK_PRACTICE_HOURS,
              VOCREHAB_PAYCHECK_PRACTICE_WAGE * VOCREHAB_PAYCHECK_PRACTICE_HOURS + 20].map(
              (vocrehabOpt) => (
                <button
                  key={vocrehabOpt}
                  type="button"
                  style={vocrehabPaycheckBtn}
                  onClick={() => vocrehabAnswerPractice(vocrehabOpt)}
                  disabled={vocrehabPracticeDone}
                >
                  {vocrehabPaycheckMoney(vocrehabOpt)}
                </button>
              ),
            )}
          </div>
          {vocrehabPracticeMsg !== "" && <p role="status">{vocrehabPracticeMsg}</p>}
          {vocrehabPracticeDone && (
            <button type="button" style={vocrehabPaycheckPrimary} onClick={vocrehabBeginCountdown} autoFocus>
              Start the run
            </button>
          )}
        </div>
      )}

      {!vocrehabPaused && vocrehabPhase === "countdown" && (
        <div className="vocrehab-paycheck-countdown" aria-live="polite">
          <h3 style={{ marginTop: 0 }}>Get ready</h3>
          <p style={{ fontSize: "48px", margin: "8px 0" }}>{vocrehabCount > 0 ? vocrehabCount : "Go"}</p>
          <p style={{ fontSize: "14px" }}>Round 1 paycheck is printing.</p>
        </div>
      )}

      {!vocrehabPaused && vocrehabPhase === "run" && vocrehabActive === null && (
        <div className="vocrehab-paycheck-empty">
          <p role="status">Paycheck scenarios are still loading. Please check back soon.</p>
          <button type="button" style={vocrehabPaycheckBtn} onClick={vocrehabExit}>
            Exit
          </button>
        </div>
      )}

      {!vocrehabPaused && vocrehabPhase === "run" && vocrehabActive !== null && (
        <div className="vocrehab-paycheck-run">
          <h3 style={{ marginTop: 0 }}>{vocrehabActive.vocrehabTitle}</h3>
          <p>
            Wage {vocrehabPaycheckMoney(vocrehabActive.vocrehabWage)} x {vocrehabActive.vocrehabHours} hours.
            Deductions ({vocrehabActive.vocrehabDeductionLabel}): {vocrehabPaycheckMoney(vocrehabDeductions)}.
          </p>

          {vocrehabStep === "gross" && (
            <div className="vocrehab-paycheck-gross">
              <p><strong>Step 1:</strong> What is the gross pay?</p>
              <div>
                {vocrehabPaycheckGrossOptions(
                  vocrehabActive.vocrehabWage,
                  vocrehabActive.vocrehabHours,
                  vocrehabRound,
                ).map((vocrehabOpt) => (
                  <button key={vocrehabOpt} type="button" style={vocrehabPaycheckBtn} onClick={() => vocrehabAnswerGross(vocrehabOpt)}>
                    {vocrehabPaycheckMoney(vocrehabOpt)}
                  </button>
                ))}
              </div>
              {vocrehabGrossMsg !== "" && <p role="status">{vocrehabGrossMsg}</p>}
            </div>
          )}

          {vocrehabStep === "allocate" && (
            <div className="vocrehab-paycheck-allocate">
              <p>
                <strong>Step 2:</strong> Split the net {vocrehabPaycheckMoney(vocrehabNet)} across
                Save, Needs, and Fun. Remaining: {vocrehabPaycheckMoney(vocrehabRemaining)}.
              </p>
              <div>
                <label>
                  Save ${" "}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={vocrehabSave}
                    onChange={(vocrehabE) => setVocrehabSave(vocrehabE.target.value)}
                    style={vocrehabPaycheckInput}
                    aria-label="Save dollars"
                  />
                </label>
                <label>
                  Needs ${" "}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={vocrehabNeeds}
                    onChange={(vocrehabE) => setVocrehabNeeds(vocrehabE.target.value)}
                    style={vocrehabPaycheckInput}
                    aria-label="Needs dollars"
                  />
                </label>
                <label>
                  Fun ${" "}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={vocrehabFun}
                    onChange={(vocrehabE) => setVocrehabFun(vocrehabE.target.value)}
                    style={vocrehabPaycheckInput}
                    aria-label="Fun dollars"
                  />
                </label>
              </div>
              <button
                type="button"
                style={vocrehabPaycheckPrimary}
                onClick={vocrehabLockAllocation}
                disabled={vocrehabRemaining !== 0}
              >
                Lock in budget
              </button>
              {vocrehabAllocMsg !== "" && <p role="status">{vocrehabAllocMsg}</p>}
            </div>
          )}

          {vocrehabStep === "curveball" && (
            <div className="vocrehab-paycheck-curveball">
              <p>
                <strong>Step 3: curveball.</strong> {vocrehabActive.vocrehabCurveball} Cost:{" "}
                {vocrehabPaycheckMoney(vocrehabActive.vocrehabCurveballCost)}. Which bucket covers it?
              </p>
              <p style={{ fontSize: "14px" }}>
                Save {vocrehabPaycheckMoney(vocrehabSaveN)} / Needs {vocrehabPaycheckMoney(vocrehabNeedsN)} /
                Fun {vocrehabPaycheckMoney(vocrehabFunN)}
              </p>
              <div>
                <button type="button" style={vocrehabPaycheckBtn} onClick={() => vocrehabCoverCurveball("save")}>
                  Cover from Save
                </button>
                <button type="button" style={vocrehabPaycheckBtn} onClick={() => vocrehabCoverCurveball("needs")}>
                  Cover from Needs
                </button>
                <button type="button" style={vocrehabPaycheckBtn} onClick={() => vocrehabCoverCurveball("fun")}>
                  Cover from Fun
                </button>
              </div>
              {vocrehabCurveMsg !== "" && <p role="status">{vocrehabCurveMsg}</p>}
            </div>
          )}

          {vocrehabStep === "roundDone" && (
            <div className="vocrehab-paycheck-rounddone">
              <p role="status">
                Round {vocrehabRound + 1} done. {vocrehabCurveMsg} Remaining plan: Save{" "}
                {vocrehabPaycheckMoney(vocrehabSaveN)}, Needs {vocrehabPaycheckMoney(vocrehabNeedsN)},
                Fun {vocrehabPaycheckMoney(vocrehabFunN)}.
              </p>
              <button type="button" style={vocrehabPaycheckPrimary} onClick={vocrehabNextRound} autoFocus>
                {vocrehabRound + 1 >= vocrehabRounds.length ? "See results" : "Next paycheck"}
              </button>
            </div>
          )}
        </div>
      )}

      {vocrehabPhase === "results" && (
        <div className="vocrehab-paycheck-results" aria-live="polite">
          <h3 style={{ marginTop: 0 }}>Results: {vocrehabBand.vocrehabBand}</h3>
          <p><strong>What happened:</strong> You planned {vocrehabRounds.length} paychecks, splitting net pay three ways and covering every curveball.</p>
          <p><strong>What it suggests:</strong> {vocrehabBand.vocrehabSuggests}</p>
          <p><strong>What to try next:</strong> {vocrehabBand.vocrehabNext}</p>
          <button
            type="button"
            style={vocrehabPaycheckBtn}
            onClick={() => setVocrehabShowNumbers((vocrehabS) => !vocrehabS)}
            aria-expanded={vocrehabShowNumbers}
          >
            {vocrehabShowNumbers ? "Hide details" : "Show details"}
          </button>
          {vocrehabShowNumbers && (
            <p style={{ fontSize: "14px" }}>
              First-try wins by step: {vocrehabPointsLog.length > 0 ? vocrehabPointsLog.join(", ") : "none recorded"}.
              Each 1 means first-try success, each 0 means you recovered after a miss. Recovery counts too.
            </p>
          )}
          <div style={{ marginTop: "12px" }}>
            <button type="button" style={vocrehabPaycheckPrimary} onClick={vocrehabRetry}>
              Retry
            </button>
            <button type="button" style={vocrehabPaycheckBtn} onClick={vocrehabSend} disabled={vocrehabSent}>
              {vocrehabSent ? "Sent to profile" : "Send to profile"}
            </button>
          </div>
          <p style={{ fontSize: "14px" }}>Signed in? Send this run to your profile. Guests: sign in to save.</p>
        </div>
      )}
    </section>
  );
}
