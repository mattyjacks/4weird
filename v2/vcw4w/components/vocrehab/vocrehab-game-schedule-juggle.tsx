"use client";

import { useRef, useState } from "react";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";

const VOCREHAB_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const VOCREHAB_SLOTS = ["Morning", "Afternoon", "Evening"] as const;

interface VocrehabBlock {
  id: string;
  label: string;
}

const VOCREHAB_BLOCKS: readonly VocrehabBlock[] = [
  { id: "shift1", label: "Shift A" },
  { id: "shift2", label: "Shift B" },
  { id: "shift3", label: "Shift C" },
  { id: "training", label: "Training block" },
];

interface VocrehabConstraint {
  id: string;
  title: string;
  blocked: readonly string[];
  why: string;
}

// Cell key: `${day}-${slot}`.
const VOCREHAB_CONSTRAINTS: readonly VocrehabConstraint[] = [
  {
    id: "transport",
    title: "Transport windows",
    blocked: ["Mon-Evening", "Tue-Evening", "Wed-Evening", "Thu-Evening", "Fri-Evening"],
    why: "the bus does not run weekday evenings",
  },
  {
    id: "medication",
    title: "Medication appointment",
    blocked: ["Wed-Morning"],
    why: "a Wednesday morning appointment",
  },
  {
    id: "childcare",
    title: "Childcare pickup",
    blocked: ["Sat-Afternoon"],
    why: "Saturday afternoon pickup",
  },
  {
    id: "rest",
    title: "Rest day",
    blocked: ["Sun-Morning", "Sun-Afternoon", "Sun-Evening"],
    why: "Sunday is a protected rest day",
  },
  {
    id: "class",
    title: "Class",
    blocked: ["Tue-Afternoon", "Thu-Afternoon"],
    why: "class meets Tuesday and Thursday afternoons",
  },
];

function vocrehabConflictFor(cell: string): VocrehabConstraint | null {
  return VOCREHAB_CONSTRAINTS.find((c) => c.blocked.includes(cell)) ?? null;
}

export default function VocrehabGameScheduleJuggle({ vocrehabEmit, vocrehabFinish }: VocrehabGameRunProps) {
  const [vocrehabSelected, setVocrehabSelected] = useState<string | null>(null);
  const [vocrehabPlaced, setVocrehabPlaced] = useState<Record<string, string>>({});
  const [vocrehabNote, setVocrehabNote] = useState<string | null>(null);
  const [vocrehabResolved, setVocrehabResolved] = useState(0);
  const doneRef = useRef(false);

  const cellOf = (blockId: string): string | null => {
    const found = Object.entries(vocrehabPlaced).find(([, b]) => b === blockId);
    return found ? found[0] : null;
  };

  const vocrehabPlace = (cell: string) => {
    if (!vocrehabSelected) {
      setVocrehabNote("Pick a shift or the training block first, then choose a day and time.");
      return;
    }
    const occupant = vocrehabPlaced[cell];
    if (occupant && occupant !== vocrehabSelected) {
      const label = VOCREHAB_BLOCKS.find((b) => b.id === occupant)?.label ?? occupant;
      setVocrehabNote(`${cell.replace("-", " ")} already holds ${label}. Move it first with its Remove button.`);
      vocrehabEmit("error", { cell, conflict: "occupied" });
      return;
    }
    const conflict = vocrehabConflictFor(cell);
    setVocrehabPlaced((p) => ({ ...p, [cell]: vocrehabSelected }));
    const label = VOCREHAB_BLOCKS.find((b) => b.id === vocrehabSelected)?.label ?? vocrehabSelected;
    if (conflict) {
      vocrehabEmit("error", { cell, block: vocrehabSelected, constraint: conflict.id });
      setVocrehabNote(
        `Heads up: ${label} on ${cell.replace("-", " ")} clashes with ${conflict.title.toLowerCase()} — ${conflict.why}. Use Remove to free it and try another slot. Nothing is graded here.`,
      );
    } else {
      vocrehabEmit("action", { cell, block: vocrehabSelected });
      setVocrehabNote(null);
    }
  };

  const vocrehabRemove = (blockId: string) => {
    const cell = cellOf(blockId);
    if (!cell) return;
    const hadConflict = vocrehabConflictFor(cell) !== null;
    setVocrehabPlaced((p) => {
      const next = { ...p };
      delete next[cell];
      return next;
    });
    if (hadConflict) {
      setVocrehabResolved((r) => r + 1);
      vocrehabEmit("action", { removed: blockId, corrected: true });
    }
    setVocrehabNote(null);
  };

  const placedCount = new Set(Object.values(vocrehabPlaced)).size;
  const conflicts = Object.keys(vocrehabPlaced).filter((cell) => vocrehabConflictFor(cell) !== null);

  const vocrehabDone = () => {
    if (doneRef.current || placedCount < VOCREHAB_BLOCKS.length || conflicts.length > 0) return;
    doneRef.current = true;
    vocrehabFinish({ placements: Object.keys(vocrehabPlaced).length, conflictsResolved: vocrehabResolved });
  };

  return (
    <div className="vocrehab-game-schedule-juggle space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Placed {placedCount} of {VOCREHAB_BLOCKS.length} blocks (3 shifts + 1 training) · Conflicts:{" "}
        {conflicts.length === 0 ? "✓ none" : `✗ ${conflicts.length} to fix`}
      </p>
      <div className="rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Constraint cards (5)</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {VOCREHAB_CONSTRAINTS.map((c) => (
            <li key={c.id}>
              <strong>{c.title}:</strong> blocked because {c.why}.
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Blocks to place">
        {VOCREHAB_BLOCKS.map((b) => {
          const cell = cellOf(b.id);
          return (
            <span key={b.id} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm">
              <button
                type="button"
                onClick={() => setVocrehabSelected(b.id)}
                aria-pressed={vocrehabSelected === b.id}
                className="font-medium aria-pressed:underline"
                aria-label={`Place ${b.label}${cell ? `, currently ${cell.replace("-", " ")}` : ""}`}
              >
                {cell ? `✓ ${b.label}` : `○ ${b.label}`}
              </button>
              {cell && (
                <button
                  type="button"
                  onClick={() => vocrehabRemove(b.id)}
                  className="rounded border px-1.5 text-xs"
                  aria-label={`Remove ${b.label} from ${cell.replace("-", " ")}`}
                >
                  Remove
                </button>
              )}
            </span>
          );
        })}
      </div>
      {vocrehabNote && (
        <p className="rounded-lg border p-3 text-sm" role="status">
          {vocrehabNote}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-muted-foreground">
            7-day grid. Pick a block above, then choose a cell. Blocked cells show ▲ plus a reason — never red
            errors.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="border p-2 text-left">Time</th>
              {VOCREHAB_DAYS.map((d) => (
                <th key={d} scope="col" className="border p-2">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VOCREHAB_SLOTS.map((slot) => (
              <tr key={slot}>
                <th scope="row" className="border p-2 text-left">{slot}</th>
                {VOCREHAB_DAYS.map((day) => {
                  const cell = `${day}-${slot}`;
                  const occupant = vocrehabPlaced[cell];
                  const conflict = vocrehabConflictFor(cell);
                  const label = occupant ? VOCREHAB_BLOCKS.find((b) => b.id === occupant)?.label : null;
                  return (
                    <td key={cell} className="border p-1">
                      <button
                        type="button"
                        onClick={() => vocrehabPlace(cell)}
                        aria-label={`${day} ${slot}${label ? `, holds ${label}` : ", empty"}${conflict ? `, blocked: ${conflict.title}` : ""}`}
                        className="block min-h-11 w-full rounded px-1 py-1 text-xs"
                      >
                        {label ? (
                          <span>■ {label}{conflict ? " ▲" : ""}</span>
                        ) : conflict ? (
                          <span>▲ Blocked ({conflict.title})</span>
                        ) : (
                          <span>○ Open</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={vocrehabDone}
        disabled={placedCount < VOCREHAB_BLOCKS.length || conflicts.length > 0}
        className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        Finish schedule
      </button>
    </div>
  );
}
