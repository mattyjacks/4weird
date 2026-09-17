"use client";

// vocrehab-schedule-store — schedule-juggle month state (strengths-first).
//
// A tiny useReducer + explicit-localStorage hook for the schedule-juggle
// monthly calendar. There is NO autosave: nothing is written to localStorage
// until the learner (or host UI) calls saveNow(). A saved snapshot is offered
// back on mount as a resume-vs-fresh choice via loadOffer.
//
// Version guard: snapshots whose `version` is not 2 are set aside and the
// learner starts from a fresh month — never a crash, never a red error.
//
// NOTE: this module is intentionally SJ-dependency-free (react only) so it
// can be adopted by any schedule-juggle host without pulling lane internals.

import { useCallback, useEffect, useReducer, useState } from "react";

/** Versioned localStorage key for the schedule-juggle month snapshot. */
export const STORAGE_KEY = "vocrehab-schedule-juggle-v2";

/** Current snapshot schema version. Unknown versions fall back to fresh. */
export const SCHEDULE_VERSION = 2 as const;

/** Calendar month anchor (monthIndex is 0-based: 0 = January). */
export interface MonthAnchor {
  year: number;
  monthIndex: number;
}

/** One learner-placed event on a day cell. */
export interface DayEvent {
  id: string;
  title: string;
  slot?: string;
  notes?: string;
}

/** Full persisted month state. */
export interface ScheduleState {
  version: typeof SCHEDULE_VERSION;
  presetId: string;
  difficulty: string;
  monthAnchor: MonthAnchor;
  // Free-form travel/address entries, lane-defined. Persisted ONLY via
  // explicit saveNow() — never autosaved.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addresses: any[];
  events: Record<string, DayEvent[]>;
  /** ISO timestamp of the last reducer touch. */
  updatedAt: string;
}

export type ScheduleAction =
  | { type: "hydrate"; state: ScheduleState }
  | { type: "resume"; state: ScheduleState }
  | { type: "setPreset"; presetId: string }
  | { type: "setDifficulty"; difficulty: string }
  | { type: "setMonth"; monthAnchor: MonthAnchor }
  | { type: "upsertEvent"; dayId: string; event: DayEvent }
  | { type: "removeEvent"; dayId: string; eventId: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: "setAddresses"; addresses: any[] }
  | { type: "clearMonth" }
  | { type: "clearAll" };

/** Resume-vs-fresh offer surfaced after the mount-time storage check. */
export interface LoadOffer {
  /** True when a valid v2 snapshot was found and restored. */
  available: boolean;
  /** ISO timestamp carried by the restored snapshot (null when fresh). */
  savedAt: string | null;
  /** Re-apply the restored snapshot (handy after trying a fresh start). */
  resume: () => void;
  /** Hide the offer; the current in-memory month is kept as-is. */
  dismiss: () => void;
}

const DEFAULT_PRESET_ID = "balanced-mornings";
const DEFAULT_DIFFICULTY = "steady";

function nowIso(): string {
  return new Date().toISOString();
}

function currentAnchor(): MonthAnchor {
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function clampAnchor(monthAnchor: MonthAnchor): MonthAnchor {
  const year = Number.isFinite(monthAnchor.year) ? Math.trunc(monthAnchor.year) : currentAnchor().year;
  const raw = Number.isFinite(monthAnchor.monthIndex) ? Math.trunc(monthAnchor.monthIndex) : 0;
  const monthIndex = Math.min(11, Math.max(0, raw));
  return { year, monthIndex };
}

/** Fresh month state — the strengths-first starting point for every learner. */
export function makeFreshSchedule(overrides?: Partial<ScheduleState>): ScheduleState {
  return {
    presetId: DEFAULT_PRESET_ID,
    difficulty: DEFAULT_DIFFICULTY,
    monthAnchor: currentAnchor(),
    addresses: [],
    events: {},
    updatedAt: nowIso(),
    ...overrides,
    version: SCHEDULE_VERSION,
  };
}

/** Runtime version guard: only version-2 snapshots are trusted. */
export function isScheduleStateV2(value: unknown): value is ScheduleState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== SCHEDULE_VERSION) return false;
  if (typeof candidate.presetId !== "string" || candidate.presetId.length > 64) return false;
  if (typeof candidate.difficulty !== "string" || candidate.difficulty.length > 32) return false;
  if (!Array.isArray(candidate.addresses) || candidate.addresses.length > 100) return false;
  if (typeof candidate.events !== "object" || candidate.events === null || Array.isArray(candidate.events)) return false;
  const anchor = candidate.monthAnchor as MonthAnchor | null | undefined;
  if (typeof anchor !== "object" || anchor === null) return false;
  if (!Number.isInteger(anchor.year) || anchor.year < 1970 || anchor.year > 2200) return false;
  if (!Number.isInteger(anchor.monthIndex) || anchor.monthIndex < 0 || anchor.monthIndex > 11) return false;
  for (const [dayId, events] of Object.entries(candidate.events as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayId) || !Array.isArray(events) || events.length > 100) return false;
    for (const event of events) {
      if (typeof event !== "object" || event === null || Array.isArray(event)) return false;
      const item = event as Record<string, unknown>;
      if (typeof item.id !== "string" || item.id.length > 128 || typeof item.title !== "string" || item.title.length > 160) return false;
      if (item.slot !== undefined && (typeof item.slot !== "string" || !/^\d{1,4}-\d{1,4}$/.test(item.slot))) return false;
      if (typeof item.notes === "string" && item.notes.length > 2048) return false;
    }
  }
  return true;
}

/** Read the stored snapshot; null when absent, unreadable, or not version 2. */
export function readStoredSchedule(): ScheduleState | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isScheduleStateV2(parsed)) return null;
    return { ...parsed, monthAnchor: clampAnchor(parsed.monthAnchor) };
  } catch {
    // Corrupt snapshot: set it aside quietly and start fresh.
    return null;
  }
}

function touch(state: ScheduleState): ScheduleState {
  return { ...state, updatedAt: nowIso() };
}

export function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case "hydrate":
    case "resume": {
      // Unknown versions fall back to a fresh month — strengths-first.
      if (!isScheduleStateV2(action.state)) return makeFreshSchedule();
      return { ...action.state, monthAnchor: clampAnchor(action.state.monthAnchor) };
    }
    case "setPreset":
      return touch({ ...state, presetId: action.presetId });
    case "setDifficulty":
      return touch({ ...state, difficulty: action.difficulty });
    case "setMonth":
      return touch({ ...state, monthAnchor: clampAnchor(action.monthAnchor) });
    case "upsertEvent": {
      const dayId = action.dayId;
      const current = state.events[dayId] ?? [];
      const index = current.findIndex((item) => item.id === action.event.id);
      const next =
        index >= 0
          ? current.map((item, i) => (i === index ? action.event : item))
          : [...current, action.event];
      return touch({ ...state, events: { ...state.events, [dayId]: next } });
    }
    case "removeEvent": {
      const current = state.events[action.dayId] ?? [];
      const next = current.filter((item) => item.id !== action.eventId);
      const events = { ...state.events };
      if (next.length === 0) {
        delete events[action.dayId];
      } else {
        events[action.dayId] = next;
      }
      return touch({ ...state, events });
    }
    case "setAddresses":
      return touch({ ...state, addresses: action.addresses });
    case "clearMonth":
      // Month-scoped store: clearing the month keeps the learner's setup
      // (preset, difficulty, anchor, addresses) and frees every day cell.
      return touch({ ...state, events: {} });
    case "clearAll":
      return makeFreshSchedule();
    default:
      return state;
  }
}

/**
 * Month schedule store: [state, dispatch, saveNow, loadOffer].
 *
 * - Restores a saved v2 snapshot once on mount (SSR-safe: storage is only
 *   touched inside useEffect / saveNow, never during render).
 * - Persists ONLY via saveNow() — there is no autosave, so addresses and
 *   events stay in memory until the learner chooses to keep them.
 */
export function useScheduleStore(initial?: Partial<ScheduleState>, preferExternalSnapshot = false) {
  const [state, dispatch] = useReducer(scheduleReducer, undefined, () =>
    makeFreshSchedule(initial),
  );
  const [offer, setOffer] = useState<{ available: boolean; savedAt: string | null }>({
    available: false,
    savedAt: null,
  });
  const [offerVisible, setOfferVisible] = useState(true);
  const [lastRestored, setLastRestored] = useState<ScheduleState | null>(null);

  // Mount-time restore: syncing React state with the browser's localStorage
  // (an external system) once on mount. This is the sanctioned useEffect
  // role — SSR-safe because storage is never touched during render.
  /* eslint-disable react-hooks/set-state-in-effect -- mount-time localStorage
     restore: syncing React state with an external system exactly once. */
  useEffect(() => {
    if (preferExternalSnapshot) return;
    const stored = readStoredSchedule();
    if (stored) {
      setLastRestored(stored);
      setOffer({ available: true, savedAt: stored.updatedAt ?? null });
      dispatch({ type: "hydrate", state: stored });
    }
  }, [preferExternalSnapshot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Explicit save: writes the full snapshot (addresses included). */
  const saveNow = useCallback(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return false;
    try {
      const snapshot: ScheduleState = { ...state, updatedAt: nowIso() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      setOffer({ available: true, savedAt: snapshot.updatedAt });
      return true;
    } catch {
      return false;
    }
  }, [state]);

  const resume = useCallback(() => {
    const target = lastRestored ?? readStoredSchedule();
    if (target) {
      dispatch({ type: "resume", state: target });
      setOffer({ available: true, savedAt: target.updatedAt ?? null });
    }
    setOfferVisible(true);
  }, [lastRestored]);

  const dismiss = useCallback(() => {
    setOfferVisible(false);
  }, []);

  const loadOffer: LoadOffer = {
    available: offerVisible && offer.available,
    savedAt: offer.savedAt,
    resume,
    dismiss,
  };

  return [state, dispatch, saveNow, loadOffer] as const;
}
