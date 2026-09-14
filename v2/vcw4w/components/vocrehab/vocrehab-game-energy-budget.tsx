"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { makeSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectEnergy } from "@/lib/vocrehab-seed-pools3";
import { vocrehabEmit as vocrehabPostInterop } from "@/lib/vocrehab-interop";

const VOCREHAB_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const VOCREHAB_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
const VOCREHAB_WEEK_BUDGET = 12;
const VOCREHAB_DAY_PACE = 4;
const VOCREHAB_MAX_EVENTS = 200;
const VOCREHAB_RUNS_KEY = "vocrehab-energy-runs-v1";

type VocrehabDay = (typeof VOCREHAB_DAYS)[number];
type VocrehabSlot = (typeof VOCREHAB_SLOTS)[number];
type VocrehabPhase = "intro" | "practice" | "run" | "results";

interface VocrehabPaletteBlock {
  id: string;
  label: string;
  cost: number;
  hint: string;
  kind: string;
}

type VocrehabEventKind = "start" | "action" | "error" | "help" | "pause" | "resume" | "complete";

interface VocrehabRunEvent {
  t_ms: number;
  kind: VocrehabEventKind;
  detail: Record<string, unknown>;
}

function vocrehabBlockById(
  palette: readonly VocrehabPaletteBlock[],
  id: string,
): VocrehabPaletteBlock | null {
  return palette.find((b) => b.id === id) ?? null;
}

function vocrehabCellKey(day: VocrehabDay, slot: VocrehabSlot): string {
  return `${day}-${slot}`;
}

function vocrehabReadRuns(): number {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return 0;
    const raw = window.localStorage.getItem(VOCREHAB_RUNS_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export default function VocrehabGameEnergyBudget(vocrehabProps: { vocrehabSeed?: string } = {}) {
  // Seeded weekly menu: every seed replays the same fair 6-item set.
  const vocrehabPool = useMemo(() => {
    const seed = vocrehabProps.vocrehabSeed ?? makeSeed();
    const selection = vocrehabSelectEnergy(seed);
    return {
      seed,
      palette: selection.items.map((item) => ({
        id: item.id,
        label: item.label,
        cost: item.cost,
        hint: item.strengthNote,
        kind: item.kind,
      })),
    };
  }, [vocrehabProps.vocrehabSeed]);
  const vocrehabSeed = vocrehabPool.seed;
  const vocrehabPalette: readonly VocrehabPaletteBlock[] = vocrehabPool.palette;
  const vocrehabWorkLabel = vocrehabPalette.find((b) => b.kind === "work")?.label ?? "Work shift";
  const vocrehabRestLabel = vocrehabPalette.find((b) => b.kind === "rest")?.label ?? "Rest";
  const [vocrehabPhase, setVocrehabPhase] = useState<VocrehabPhase>("intro");
  const [vocrehabPaused, setVocrehabPaused] = useState(false);
  const [vocrehabSelected, setVocrehabSelected] = useState<string | null>(null);
  const [vocrehabPlaced, setVocrehabPlaced] = useState<Record<string, string>>({});
  const [vocrehabNote, setVocrehabNote] = useState<string | null>(null);
  const [vocrehabHint, setVocrehabHint] = useState<string | null>(null);
  const [vocrehabAnnounce, setVocrehabAnnounce] = useState("Energy Budget. Introduction.");
  const [vocrehabSummary, setVocrehabSummary] = useState("");
  const [vocrehabRuns, setVocrehabRuns] = useState<number>(() => vocrehabReadRuns());
  const [vocrehabPracticeRemoved, setVocrehabPracticeRemoved] = useState(false);

  const eventsRef = useRef<VocrehabRunEvent[]>([]);
  const runStartRef = useRef(0);
  const finishedRef = useRef(false);

  const vocrehabNow = useCallback(() => {
    try {
      return Math.max(0, Math.round(performance.now() - runStartRef.current));
    } catch {
      return 0;
    }
  }, []);

  // Scored-run event log with a fail-open 200-event cap (frame precedent).
  const vocrehabRecord = useCallback(
    (kind: VocrehabEventKind, detail?: Record<string, unknown>) => {
      if (vocrehabPhase !== "run" || finishedRef.current) return;
      if (eventsRef.current.length >= VOCREHAB_MAX_EVENTS) return;
      try {
        eventsRef.current.push({ t_ms: vocrehabNow(), kind, detail: detail ?? {} });
      } catch {
        // Fail-open: logging never breaks play.
      }
    },
    [vocrehabPhase, vocrehabNow],
  );

  const vocrehabDayTotal = useCallback(
    (day: VocrehabDay, board: Record<string, string>): number => {
      let total = 0;
      for (const slot of VOCREHAB_SLOTS) {
        const block = vocrehabBlockById(vocrehabPalette, board[vocrehabCellKey(day, slot)] ?? "");
        if (block) total += block.cost;
      }
      return total;
    },
    [vocrehabPalette],
  );

  const vocrehabWeekTotal = useCallback(
    (board: Record<string, string>): number => {
      return VOCREHAB_DAYS.reduce((sum, day) => sum + vocrehabDayTotal(day, board), 0);
    },
    [vocrehabDayTotal],
  );

  // A "free evening" is an evening slot holding nothing or only a rest-kind block.
  const vocrehabFreeEvenings = useCallback(
    (board: Record<string, string>): VocrehabDay[] => {
      return VOCREHAB_DAYS.filter((day) => {
        const occupant = board[vocrehabCellKey(day, "Evening")];
        if (!occupant) return true;
        return vocrehabBlockById(vocrehabPalette, occupant)?.kind === "rest";
      });
    },
    [vocrehabPalette],
  );

  const vocrehabPlace = (day: VocrehabDay, slot: VocrehabSlot) => {
    const cell = vocrehabCellKey(day, slot);
    if (vocrehabPhase !== "practice" && vocrehabPhase !== "run") return;
    if (vocrehabPaused) {
      setVocrehabNote("The game is paused. Press Resume to keep planning.");
      return;
    }
    if (!vocrehabSelected) {
      setVocrehabNote("Pick a block from the palette first, then choose a day and time.");
      return;
    }
    const block = vocrehabBlockById(vocrehabPalette, vocrehabSelected);
    if (!block) return;
    const occupant = vocrehabPlaced[cell];
    if (occupant && occupant !== vocrehabSelected) {
      const label = vocrehabBlockById(vocrehabPalette, occupant)?.label ?? occupant;
      setVocrehabNote(
        `${day} ${slot} already holds ${label}. Use its Remove button to free it first, then place ${block.label}. Nothing is graded here.`,
      );
      return;
    }
    if (occupant === vocrehabSelected) {
      setVocrehabNote(`${block.label} is already planned for ${day} ${slot}.`);
      return;
    }
    if (block.cost >= 3) {
      const heavy =
        VOCREHAB_SLOTS.map((s) => vocrehabPlaced[vocrehabCellKey(day, s)] ?? "")
          .map((id) => vocrehabBlockById(vocrehabPalette, id))
          .find((b) => b !== null && b.cost >= 3) ?? null;
      if (heavy) {
        setVocrehabNote(
          `${day} already has its high-energy ${heavy.label} block. High-energy blocks are powerful, so one per day keeps the week steady. Try a lighter block instead.`,
        );
        return;
      }
    }
    const next = { ...vocrehabPlaced, [cell]: block.id };
    setVocrehabPlaced(next);
    const total = vocrehabDayTotal(day, next);
    if (total > VOCREHAB_DAY_PACE) {
      setVocrehabNote(
        `Heads up: ${day} now uses ${total} tokens, which is a big day. That is fine to try — you could move something to a lighter day, or keep it and spend less elsewhere.`,
      );
    } else {
      setVocrehabNote(null);
    }
    setVocrehabAnnounce(`${block.label} placed on ${day} ${slot}. ${day} total ${total} tokens.`);
    vocrehabRecord("action", { cell, block: block.id, dayTotal: total });
  };

  const vocrehabRemove = (day: VocrehabDay, slot: VocrehabSlot) => {
    const cell = vocrehabCellKey(day, slot);
    const occupant = vocrehabPlaced[cell];
    if (!occupant) return;
    const label = vocrehabBlockById(vocrehabPalette, occupant)?.label ?? occupant;
    setVocrehabPlaced((prev) => {
      const next = { ...prev };
      delete next[cell];
      return next;
    });
    if (vocrehabPhase === "practice") setVocrehabPracticeRemoved(true);
    setVocrehabNote(`${label} removed from ${day} ${slot}. The tokens went back to your week.`);
    setVocrehabAnnounce(`${label} removed from ${day} ${slot}.`);
    vocrehabRecord("action", { removed: occupant, cell, corrected: true });
  };

  const vocrehabHintTap = () => {
    if (vocrehabPhase !== "run") return;
    vocrehabRecord("help", { hint: true });
    const week = vocrehabWeekTotal(vocrehabPlaced);
    const free = vocrehabFreeEvenings(vocrehabPlaced);
    setVocrehabHint(
      week > VOCREHAB_WEEK_BUDGET
        ? `Gentle idea: the week uses ${week} of ${VOCREHAB_WEEK_BUDGET} tokens. Try swapping a higher-cost block for ${vocrehabRestLabel}, or moving something to a lighter day.`
        : free.length === 0
          ? `Gentle idea: every evening is busy. Leaving one evening with only ${vocrehabRestLabel} protects recovery time.`
          : `Gentle idea: ${vocrehabRestLabel} is the lightest way to hold a slot. An evening with only ${vocrehabRestLabel} keeps that evening protected.`,
    );
    setVocrehabAnnounce("Hint shown. No penalty for asking.");
  };

  const vocrehabStartPractice = () => {
    setVocrehabPlaced({});
    setVocrehabSelected(null);
    setVocrehabNote(null);
    setVocrehabHint(null);
    setVocrehabPracticeRemoved(false);
    setVocrehabPhase("practice");
    setVocrehabAnnounce("Energy Budget practice round. No timer, nothing scored.");
  };

  const vocrehabStartRun = () => {
    eventsRef.current = [];
    finishedRef.current = false;
    runStartRef.current = performance.now();
    setVocrehabPlaced({});
    setVocrehabSelected(null);
    setVocrehabNote(null);
    setVocrehabHint(null);
    setVocrehabPaused(false);
    setVocrehabPhase("run");
    setVocrehabAnnounce("Energy Budget scored run started. Place blocks for Monday to Friday.");
    try {
      eventsRef.current.push({ t_ms: 0, kind: "start", detail: { budget: VOCREHAB_WEEK_BUDGET } });
    } catch {
      // Fail-open.
    }
  };

  const vocrehabTogglePause = () => {
    if (vocrehabPhase !== "run") return;
    if (!vocrehabPaused) {
      setVocrehabPaused(true);
      vocrehabRecord("pause", {});
      setVocrehabAnnounce("Paused. Your progress is kept.");
    } else {
      setVocrehabPaused(false);
      if (eventsRef.current.length < VOCREHAB_MAX_EVENTS) {
        try {
          eventsRef.current.push({ t_ms: vocrehabNow(), kind: "resume", detail: {} });
        } catch {
          // Fail-open.
        }
      }
      setVocrehabAnnounce("Resumed.");
    }
  };

  const vocrehabFinishRun = () => {
    if (vocrehabPhase !== "run" || finishedRef.current) return;
    const week = vocrehabWeekTotal(vocrehabPlaced);
    const covered = VOCREHAB_DAYS.filter((day) =>
      VOCREHAB_SLOTS.some((slot) => vocrehabPlaced[vocrehabCellKey(day, slot)]),
    );
    const free = vocrehabFreeEvenings(vocrehabPlaced);
    if (week > VOCREHAB_WEEK_BUDGET) {
      vocrehabRecord("error", { reason: "over-budget", weekTotal: week, budget: VOCREHAB_WEEK_BUDGET });
      setVocrehabNote(
        `The week uses ${week} of ${VOCREHAB_WEEK_BUDGET} tokens — a little over. That is okay, it just needs trimming before finishing. Try swapping a block for Rest or moving something to a lighter day.`,
      );
      setVocrehabAnnounce("Week is over budget. Adjust the plan and try finishing again.");
      return;
    }
    if (covered.length < VOCREHAB_DAYS.length) {
      const missing = VOCREHAB_DAYS.filter((day) => !covered.includes(day)).join(", ");
      setVocrehabNote(`Almost there — ${missing} still ${missing.includes(",") ? "need" : "needs"} at least one block. Every weekday gets a little energy.`);
      return;
    }
    if (free.length === 0) {
      setVocrehabNote(
        "One more kind touch: every evening is busy. Leave one evening with nothing or only Rest so the week has protected recovery time.",
      );
      return;
    }
    finishedRef.current = true;
    const detail = { weekTotal: week, freeEvenings: free.length, budget: VOCREHAB_WEEK_BUDGET, seed: vocrehabSeed };
    try {
      if (eventsRef.current.length < VOCREHAB_MAX_EVENTS) {
        eventsRef.current.push({ t_ms: vocrehabNow(), kind: "complete", detail });
      }
    } catch {
      // Fail-open.
    }

    // Strengths-first summary — observations and supports, never grades or percentiles.
    const strengths: string[] = [
      `You planned the whole week inside ${VOCREHAB_WEEK_BUDGET} energy tokens, using ${week}.`,
    ];
    if (free.length >= 2) {
      strengths.push(`You protected ${free.length} evenings for rest (${free.join(", ")}), which guards recovery time.`);
    } else {
      strengths.push(`You kept ${free[0]} evening free, so the week has protected recovery time.`);
    }
    const heavyDays = VOCREHAB_DAYS.filter((day) =>
      VOCREHAB_SLOTS.some(
        (slot) =>
          (vocrehabBlockById(vocrehabPalette, vocrehabPlaced[vocrehabCellKey(day, slot)] ?? "")?.cost ?? 0) >= 3,
      ),
    );
    if (heavyDays.length > 0) {
      strengths.push(`You gave high-energy blocks their own space on ${heavyDays.join(", ")} without doubling them up.`);
    } else {
      strengths.push("You kept the week steady with shifts, appointments, and rest — a calm mix.");
    }
    const next = vocrehabReadRuns() + 1;
    try {
      window.localStorage.setItem(VOCREHAB_RUNS_KEY, String(next));
    } catch {
      // Fail-open: private mode never blocks results.
    }
    setVocrehabRuns(next);
    setVocrehabSummary(
      `${strengths.join(" ")} Balanced weeks finished so far: ${next}. This is one short activity, not a verdict about you — a counselor can help decide what it means.`,
    );
    setVocrehabPhase("results");
    setVocrehabAnnounce("Energy Budget finished. Results are shown below.");

    // Best-effort save (games2 precedent): fail-open and silent.
    try {
      void fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "energy-budget",
          events: eventsRef.current.slice(0, VOCREHAB_MAX_EVENTS),
          summary: detail,
        }),
      }).catch(() => undefined);
    } catch {
      // Fail-open: never surface save problems in the game.
    }
    try {
      vocrehabPostInterop("vocrehab:game:completed", { game: "energy-budget", ...detail });
    } catch {
      // Fail-open: interop never breaks results.
    }
  };

  const vocrehabRetry = () => {
    eventsRef.current = [];
    finishedRef.current = false;
    setVocrehabPaused(false);
    setVocrehabPhase("intro");
    setVocrehabNote(null);
    setVocrehabHint(null);
    setVocrehabAnnounce("Energy Budget. Ready for another try.");
  };

  const weekTotal = vocrehabWeekTotal(vocrehabPlaced);
  const practicePlacedWork = Object.values(vocrehabPlaced).some(
    (id) => vocrehabBlockById(vocrehabPalette, id)?.kind === "work",
  );
  const practicePlacedRest = Object.values(vocrehabPlaced).some(
    (id) => vocrehabBlockById(vocrehabPalette, id)?.kind === "rest",
  );

  return (
    <section aria-label="Energy Budget" className="vocrehab-game-energy-budget space-y-4">
      <p aria-live="polite" role="status" className="vocrehab-energy-announce sr-only">
        {vocrehabAnnounce}
      </p>

      {vocrehabPhase === "intro" && (
        <div className="vocrehab-energy-intro space-y-3 rounded-lg border p-5">
          <h2 className="vocrehab-energy-title text-xl font-semibold">Energy Budget</h2>
          <p className="vocrehab-energy-instructions">
            You have {VOCREHAB_WEEK_BUDGET} energy tokens for the Monday to Friday week. Plan Morning,
            Afternoon, and Evening blocks from this week&apos;s menu:{" "}
            {vocrehabPalette.map((b) => `${b.label} (${b.cost})`).join(", ")}. Blocks costing 3 or more
            are limited to one per day. Keep the week within budget and leave one evening with only rest.
          </p>
          <p className="vocrehab-energy-comfort text-sm text-muted-foreground">
            There is no timer and no fail state. Practice first, then try the scored run. Retry always
            counts the same.
            {vocrehabRuns > 0 ? ` Balanced weeks finished so far: ${vocrehabRuns}.` : ""}
          </p>
          <div className="vocrehab-energy-intro-actions flex flex-wrap gap-2">
            <button
              type="button"
              onClick={vocrehabStartPractice}
              className="vocrehab-energy-btn rounded border px-4 py-2 font-medium"
            >
              Try practice (no timer)
            </button>
            <button
              type="button"
              onClick={vocrehabStartRun}
              className="vocrehab-energy-btn rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Start scored run
            </button>
            <Link href="/vocrehab/play" className="vocrehab-energy-btn rounded border px-4 py-2 font-medium">
              Exit
            </Link>
          </div>
        </div>
      )}

      {vocrehabPhase === "practice" && (
        <div className="vocrehab-energy-practice space-y-3 rounded-lg border p-5">
          <h2 className="vocrehab-energy-title text-xl font-semibold">Practice round</h2>
          <ol className="vocrehab-energy-steps list-decimal space-y-1 pl-5">
            <li>{practicePlacedWork ? "✓ " : ""}Pick {vocrehabWorkLabel} and place it anywhere.</li>
            <li>{practicePlacedRest ? "✓ " : ""}Place {vocrehabRestLabel} in an evening to protect it.</li>
            <li>{vocrehabPracticeRemoved ? "✓ " : ""}Remove a block with its Remove button.</li>
          </ol>
          <div className="vocrehab-energy-practice-actions flex flex-wrap gap-2">
            <button
              type="button"
              onClick={vocrehabStartRun}
              className="vocrehab-energy-btn rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Start scored run
            </button>
            <Link href="/vocrehab/play" className="vocrehab-energy-btn rounded border px-4 py-2 font-medium">
              Exit
            </Link>
          </div>
          <div className="vocrehab-energy-board-wrap">
            <VocrehabEnergyBoard
              placed={vocrehabPlaced}
              palette={vocrehabPalette}
              selected={vocrehabSelected}
              onSelect={setVocrehabSelected}
              onPlace={vocrehabPlace}
              onRemove={vocrehabRemove}
              paused={false}
              dayTotal={(day) => vocrehabDayTotal(day, vocrehabPlaced)}
              weekTotal={weekTotal}
            />
          </div>
          {vocrehabNote && (
            <p className="vocrehab-energy-note rounded-lg border p-3 text-sm" role="status">
              {vocrehabNote}
            </p>
          )}
        </div>
      )}

      {vocrehabPhase === "run" && (
        <div className="vocrehab-energy-run space-y-3">
          <div className="vocrehab-energy-toolbar flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <p className="vocrehab-energy-week text-sm font-medium" role="status">
              Week: {weekTotal} of {VOCREHAB_WEEK_BUDGET} tokens
              {weekTotal > VOCREHAB_WEEK_BUDGET ? " — a little over, easy to trim" : ""}
            </p>
            <div className="vocrehab-energy-toolbar-actions ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={vocrehabTogglePause}
                aria-pressed={vocrehabPaused}
                className="vocrehab-energy-btn rounded border px-3 py-1.5 text-sm font-medium"
              >
                {vocrehabPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={vocrehabHintTap}
                className="vocrehab-energy-btn rounded border px-3 py-1.5 text-sm font-medium"
              >
                Hint
              </button>
              <Link
                href="/vocrehab/play"
                className="vocrehab-energy-btn rounded border px-3 py-1.5 text-sm font-medium"
              >
                Exit
              </Link>
            </div>
          </div>
          {vocrehabPaused ? (
            <div className="vocrehab-energy-paused rounded-lg border p-5 text-center">
              <p className="vocrehab-energy-paused-text font-semibold">❚❚ Paused — your progress is kept.</p>
              <button
                type="button"
                onClick={vocrehabTogglePause}
                className="vocrehab-energy-btn mt-2 rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                Resume
              </button>
            </div>
          ) : (
            <>
              <VocrehabEnergyBoard
                placed={vocrehabPlaced}
                palette={vocrehabPalette}
                selected={vocrehabSelected}
                onSelect={setVocrehabSelected}
                onPlace={vocrehabPlace}
                onRemove={vocrehabRemove}
                paused={vocrehabPaused}
                dayTotal={(day) => vocrehabDayTotal(day, vocrehabPlaced)}
                weekTotal={weekTotal}
              />
              {vocrehabNote && (
                <p className="vocrehab-energy-note rounded-lg border p-3 text-sm" role="status">
                  {vocrehabNote}
                </p>
              )}
              {vocrehabHint && (
                <p className="vocrehab-energy-hint rounded-lg border p-3 text-sm" role="status">
                  {vocrehabHint}
                </p>
              )}
              <button
                type="button"
                onClick={vocrehabFinishRun}
                className="vocrehab-energy-btn rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                Finish week
              </button>
            </>
          )}
        </div>
      )}

      {vocrehabPhase === "results" && (
        <div className="vocrehab-energy-results space-y-3 rounded-lg border p-5">
          <h2 className="vocrehab-energy-title text-xl font-semibold">✓ What happened</h2>
          <p className="vocrehab-energy-summary">{vocrehabSummary}</p>
          <div className="vocrehab-energy-next text-sm">
            <p className="vocrehab-energy-next-title font-medium">What this suggests</p>
            <p className="vocrehab-energy-next-body text-muted-foreground">
              This is one short activity, not a verdict about you. It suggests supports to try, not scores
              to worry about. Your counselor can help decide what it means.
            </p>
          </div>
          <div className="vocrehab-energy-try text-sm">
            <p className="vocrehab-energy-try-title font-medium">What to try next</p>
            <p className="vocrehab-energy-try-body text-muted-foreground">
              Retry the game to try another rhythm, or keep exploring the arcade.
            </p>
          </div>
          <div className="vocrehab-energy-results-actions flex flex-wrap gap-2">
            <button
              type="button"
              onClick={vocrehabRetry}
              className="vocrehab-energy-btn rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Retry
            </button>
            <Link href="/vocrehab/play" className="vocrehab-energy-btn rounded border px-4 py-2 font-medium">
              Back to arcade
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

interface VocrehabEnergyBoardProps {
  palette: readonly VocrehabPaletteBlock[];
  placed: Record<string, string>;
  selected: string | null;
  onSelect: (id: string) => void;
  onPlace: (day: VocrehabDay, slot: VocrehabSlot) => void;
  onRemove: (day: VocrehabDay, slot: VocrehabSlot) => void;
  paused: boolean;
  dayTotal: (day: VocrehabDay) => number;
  weekTotal: number;
}

function VocrehabEnergyBoard(props: VocrehabEnergyBoardProps) {
  const { palette, placed, selected, onSelect, onPlace, onRemove, paused, dayTotal, weekTotal } = props;
  return (
    <div className="vocrehab-energy-board space-y-3">
      <p className="vocrehab-energy-week text-sm text-muted-foreground" role="status">
        Week total: {weekTotal} of {VOCREHAB_WEEK_BUDGET} tokens
      </p>
      <div className="vocrehab-energy-palette flex flex-wrap gap-1.5" role="group" aria-label="Energy blocks">
        {palette.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            aria-pressed={selected === b.id}
            aria-label={`${b.label}, ${b.cost} ${b.cost === 1 ? "token" : "tokens"}. ${b.hint}`}
            title={b.hint}
            disabled={paused}
            className="vocrehab-energy-palette-btn rounded border px-2 py-1 text-sm font-medium aria-pressed:underline disabled:opacity-50"
          >
            {selected === b.id ? "● " : "○ "}
            {b.label} ({b.cost})
          </button>
        ))}
      </div>
      <div className="vocrehab-energy-grid overflow-x-auto">
        <table className="vocrehab-energy-table w-full border-collapse text-sm">
          <caption className="vocrehab-energy-caption pb-2 text-left text-muted-foreground">
            Monday to Friday grid. Pick a block above, then choose a cell. Day totals update as you plan —
            gentle notes guide, never red errors.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="vocrehab-energy-th border p-2 text-left">
                Time
              </th>
              {VOCREHAB_DAYS.map((day) => (
                <th key={day} scope="col" className="vocrehab-energy-th border p-2">
                  {day} ({dayTotal(day)})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VOCREHAB_SLOTS.map((slot) => (
              <tr key={slot}>
                <th scope="row" className="vocrehab-energy-th border p-2 text-left">
                  {slot}
                </th>
                {VOCREHAB_DAYS.map((day) => {
                  const cell = vocrehabCellKey(day, slot);
                  const occupant = placed[cell];
                  const block = occupant ? vocrehabBlockById(palette, occupant) : null;
                  return (
                    <td key={cell} className="vocrehab-energy-td border p-1">
                      <button
                        type="button"
                        onClick={() => onPlace(day, slot)}
                        disabled={paused}
                        aria-label={`${day} ${slot}${block ? `, holds ${block.label}` : ", empty"}`}
                        className="vocrehab-energy-cell block min-h-11 w-full rounded px-1 py-1 text-xs disabled:opacity-50"
                      >
                        {block ? (
                          <span className="vocrehab-energy-placed">
                            ■ {block.label} ({block.cost})
                          </span>
                        ) : (
                          <span className="vocrehab-energy-open">○ Open</span>
                        )}
                      </button>
                      {block && (
                        <button
                          type="button"
                          onClick={() => onRemove(day, slot)}
                          disabled={paused}
                          aria-label={`Remove ${block.label} from ${day} ${slot}`}
                          className="vocrehab-energy-remove mt-1 w-full rounded border px-1.5 text-xs disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
