"use client";

/**
 * VocRehab Schedule Juggle — composition root (DS-SJ-20 integrator).
 *
 * Composes every landed SJ piece into one practice board:
 * - calendar lib (`lib/vocrehab-schedule-calendar`) for month nav + five-minute snaps
 * - activities (`lib/vocrehab-schedule-activities`) for the palette
 * - burdens (`lib/vocrehab-schedule-burdens`) for difficulty sets + overlap notes
 * - geo presets (`lib/vocrehab-schedule-presets`) for home-base addresses
 * - travel fallback estimator (`lib/vocrehab-travel-estimate`) for trip ranges
 * - seed bridge (`lib/vocrehab-schedule-seed`) for preset/difficulty/finish summary
 * - month grid + 24h day drawer + palette + addresses + travel + controls +
 *   persist components, the month store hook, and the a11y live-region helper
 *
 * Strengths-first throughout: guidance celebrates steady planning, conflicts
 * are amber planning notes with one-tap fixes — never red errors. The finish
 * payload carries counts + preset/difficulty/seed only; addresses stay
 * anonymized (categories only) everywhere they leave the device.
 *
 * Legacy fallback: `?legacy=1` renders the original 7-day x 3-slot grid.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { makeSeed } from "@/lib/vocrehab-seed";
import {
  vocrehabJugglePoolSets,
  vocrehabSelectJuggle,
} from "@/lib/vocrehab-seed-pools3";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import {
  addMonths,
  getInitialMonthParts,
  isInRange,
  minutesToLabel,
  snapToHalfHour,
  toDayId,
} from "@/lib/vocrehab-schedule-calendar";
import {
  ACTIVITY_KINDS,
  activityEmoji,
} from "@/lib/vocrehab-schedule-activities";
import {
  REPEAT_CHOICES,
  expandRepeat,
  repeatSummary,
} from "@/lib/vocrehab-schedule-repeat";
import type { RepeatChoice } from "@/lib/vocrehab-schedule-repeat";
import {
  BURDENS,
  burdensForDifficulty,
  checkOverlaps,
} from "@/lib/vocrehab-schedule-burdens";
import type { ScheduleEvent } from "@/lib/vocrehab-schedule-burdens";
import {
  DEFAULT_GEO_PRESET_ID,
  getGeoPreset,
} from "@/lib/vocrehab-schedule-presets";
import type { SavedAddress } from "@/lib/vocrehab-schedule-presets";
import {
  estimateLeg,
  haversineMi,
} from "@/lib/vocrehab-travel-estimate";
import type { TravelMode } from "@/lib/vocrehab-travel-estimate";
import {
  buildFinishSummary,
  difficultyForSetId,
  presetIdForSeed,
} from "@/lib/vocrehab-schedule-seed";
import type { VocrehabScheduleDifficulty } from "@/lib/vocrehab-schedule-seed";
import VocrehabScheduleMonth from "./vocrehab-schedule-month";
import VocrehabScheduleDay from "./vocrehab-schedule-day";
import type { VocrehabScheduleDayEvent } from "./vocrehab-schedule-day";
import VocrehabSchedulePalette from "./vocrehab-schedule-palette";
import VocrehabScheduleTravel from "./vocrehab-schedule-travel";
import type { VocrehabTravelResult } from "./vocrehab-schedule-travel";
import VocrehabScheduleControls from "./vocrehab-schedule-controls";
import VocrehabSchedulePersist from "./vocrehab-schedule-persist";
import VocrehabScheduleAddresses from "./vocrehab-schedule-addresses";
import type {
  VocrehabSavedAddress,
  VocrehabTravelMode,
} from "./vocrehab-schedule-addresses";
import {
  SCHEDULE_VERSION,
  STORAGE_KEY,
  isScheduleStateV2,
  readStoredSchedule,
  useScheduleStore,
} from "./vocrehab-schedule-store";
import type {
  DayEvent,
  ScheduleState,
} from "./vocrehab-schedule-store";
import {
  ScheduleLiveRegion,
  announceLive,
  dayAriaLabel,
  eventAriaLabel,
} from "./vocrehab-schedule-a11y";

const SJ_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SJ_GEO_IDS = ["wa", "nh", "ak", "custom"] as const;

const SJ_DAY_MIN = 0;
const SJ_DAY_MAX = 24 * 60;

/**
 * Longest single stretch one block may cover (12h). Whole-day single-block
 * marking is removed on purpose: every part of the day deserves its own
 * plan (sleep + work + meals + rest), so long days become two blocks.
 */
const SJ_MAX_BLOCK_MIN = 12 * 60;

type SjTab = "month" | "day" | "plan" | "travel" | "save";

const SJ_TABS: Array<{ id: SjTab; label: string }> = [
  { id: "month", label: "Calendar" },
  { id: "day", label: "Day details" },
  { id: "plan", label: "More activities" },
  { id: "travel", label: "Travel" },
  { id: "save", label: "Save" },
];

/** One learner-placed block with its 24h clock position. */
type SjDayBlock = {
  id: string;
  title: string;
  activityId: string;
  startMin: number;
  endMin: number;
  locked?: boolean;
};

type SjTravelTrip = {
  fromId: string;
  toId: string;
  uiMode: VocrehabTravelMode;
  title: string;
};

function sjMonthLabel(year: number, monthIndex: number): string {
  return `${SJ_MONTH_NAMES[monthIndex] ?? `Month ${monthIndex + 1}`} ${year}`;
}

function sjTodayDayId(): string {
  const now = new Date();
  return toDayId(now.getFullYear(), now.getMonth(), now.getDate());
}

function sjValidPresetId(value: unknown): string {
  return typeof value === "string" && (SJ_GEO_IDS as readonly string[]).includes(value)
    ? value
    : DEFAULT_GEO_PRESET_ID;
}

function sjValidDifficulty(value: unknown): VocrehabScheduleDifficulty {
  return value === "medium" || value === "hard" ? value : "easy";
}

/** Preset address → address-book entry (only home/work map 1:1, rest plan as other). */
function sjPresetAddressToSaved(address: SavedAddress): VocrehabSavedAddress {
  const category =
    address.category === "home" ? "home" : address.category === "work" ? "work" : "other";
  return {
    id: address.id,
    label: address.label,
    address: address.address,
    category,
  };
}

function sjCoerceAddresses(value: unknown): VocrehabSavedAddress[] {
  if (!Array.isArray(value)) return [];
  const out: VocrehabSavedAddress[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.id !== "string" ||
      typeof entry.label !== "string" ||
      typeof entry.address !== "string"
    ) {
      continue;
    }
    const category =
      entry.category === "home" ||
      entry.category === "work" ||
      entry.category === "training" ||
      entry.category === "other"
        ? entry.category
        : "other";
    out.push({ id: entry.id, label: entry.label, address: entry.address, category });
  }
  return out;
}

/** Encode a positioned block into the store's free-form DayEvent shape. */
function sjBlockToStored(block: SjDayBlock): DayEvent {
  return {
    id: block.id,
    title: block.title,
    slot: `${block.startMin}-${block.endMin}`,
    notes: JSON.stringify({ a: block.activityId, l: block.locked === true ? 1 : 0 }),
  };
}

/** Decode a stored DayEvent back into a positioned block (null when unreadable). */
function sjBlockFromStored(event: DayEvent): SjDayBlock | null {
  const slot = typeof event.slot === "string" ? event.slot : "";
  const match = /^(\d+)-(\d+)$/.exec(slot);
  if (!match) return null;
  const startMin = Math.min(SJ_DAY_MAX, Math.max(SJ_DAY_MIN, Number(match[1])));
  const endMin = Math.min(SJ_DAY_MAX, Math.max(SJ_DAY_MIN, Number(match[2])));
  if (!(endMin > startMin)) return null;
  let activityId = "personal";
  let locked = false;
  try {
    const meta = JSON.parse(typeof event.notes === "string" ? event.notes : "") as {
      a?: unknown;
      l?: unknown;
    };
    if (typeof meta.a === "string") activityId = meta.a;
    locked = meta.l === 1;
  } catch {
    // Keep kind defaults — a stored block still plans fine without its meta.
  }
  return {
    id: event.id,
    title: event.title,
    activityId,
    startMin,
    endMin,
    locked: locked ? true : undefined,
  };
}

function sjBlocksToScheduleEvents(blocks: SjDayBlock[]): ScheduleEvent[] {
  return blocks.map((block) => ({
    id: block.id,
    startMin: block.startMin,
    endMin: block.endMin,
    title: block.title,
  }));
}

function sjCountConflicts(blocksByDay: Record<string, SjDayBlock[]>): number {
  return Object.values(blocksByDay).reduce(
    (total, blocks) => total + checkOverlaps(sjBlocksToScheduleEvents(blocks)).length,
    0,
  );
}

function sjLockedMinutes(blocks: SjDayBlock[]): number {
  return blocks
    .filter((block) => block.locked === true)
    .reduce((total, block) => total + Math.max(0, block.endMin - block.startMin), 0);
}

function sjUiModeToTravelMode(mode: VocrehabTravelMode): TravelMode {
  return mode === "drive" ? "car" : mode;
}

/** 30-min start options for the quick time picker (48 entries, tiny DOM). */
const SJ_START_OPTIONS: number[] = Array.from({ length: 48 }, (_, i) => i * 30);

/** Duration presets offered at creation (minutes). */
const SJ_DURATION_OPTIONS: number[] = [15, 30, 45, 60, 90, 120, 180, 240, 480];

function sjValidRepeat(value: unknown): RepeatChoice {
  return (REPEAT_CHOICES as readonly { id: RepeatChoice }[]).some((c) => c.id === value)
    ? (value as RepeatChoice)
    : "none";
}

function sjEmojiFor(activityId: string): string {
  try {
    return activityEmoji(activityId);
  } catch {
    return "";
  }
}

function ScheduleJuggleRoot({
  vocrehabEmit,
  vocrehabFinish,
  vocrehabSeed,
  vocrehabRunKey,
  savedStateId,
  targetKidId,
}: VocrehabGameRunProps & { savedStateId?: string | null; targetKidId?: string | null }) {
  // Re-resolve when the frame issues a fresh run key.
  const seed = useMemo(
    () => vocrehabSeed ?? makeSeed(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocrehabSeed, vocrehabRunKey],
  );
  const seedPreset = presetIdForSeed(seed);
  const seedDifficulty = useMemo(() => {
    try {
      return difficultyForSetId(vocrehabSelectJuggle(seed).setId);
    } catch {
      return "easy" as VocrehabScheduleDifficulty;
    }
  }, [seed]);

  const seedAnchor = useMemo(() => getInitialMonthParts(), []);
  const seedAddresses = useMemo(
    () => getGeoPreset(seedPreset).addresses.map(sjPresetAddressToSaved),
    [seedPreset],
  );

  // Month store (explicit-save localStorage, version-guarded). The store is
  // the source of truth for persisted month fields; UI-only state lives below.
  const [scheduleState, scheduleDispatch] = useScheduleStore({
    presetId: seedPreset,
    difficulty: seedDifficulty,
    monthAnchor: seedAnchor,
    addresses: seedAddresses,
  }, Boolean(savedStateId));

  const presetId = sjValidPresetId(scheduleState.presetId);
  const difficulty = sjValidDifficulty(scheduleState.difficulty);
  const anchor = scheduleState.monthAnchor;
  const geoPreset = getGeoPreset(presetId);

  const storedAddresses = useMemo(
    () => sjCoerceAddresses(scheduleState.addresses),
    [scheduleState.addresses],
  );
  const addresses = storedAddresses.length > 0 ? storedAddresses : seedAddresses;

  const blocksByDay = useMemo(() => {
    const parsed: Record<string, SjDayBlock[]> = {};
    for (const [dayId, events] of Object.entries(scheduleState.events)) {
      const blocks = events
        .map(sjBlockFromStored)
        .filter((block): block is SjDayBlock => block !== null)
        .sort((a, b) => a.startMin - b.startMin);
      if (blocks.length > 0) parsed[dayId] = blocks;
    }
    return parsed;
  }, [scheduleState.events]);

  // Coordinate lookup across every geo preset so estimates survive preset hops.
  const coordById = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const id of ["wa", "nh", "ak"] as const) {
      for (const entry of getGeoPreset(id).addresses) {
        map.set(entry.id, { lat: entry.lat, lng: entry.lng });
      }
    }
    return map;
  }, []);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [tab, setTab] = useState<SjTab>("month");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>("personal");
  const [customStartMin, setCustomStartMin] = useState<number>(9 * 60);
  const [customDurationMin, setCustomDurationMin] = useState<number>(60);
  const [repeatChoice, setRepeatChoice] = useState<RepeatChoice>("none");
  const [travelResult, setTravelResult] = useState<VocrehabTravelResult | null>(null);
  const [travelTrip, setTravelTrip] = useState<SjTravelTrip | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [liveMessage, setLiveMessage] = useState(
    "Schedule Juggle month view. Open any day to build its 24-hour plan.",
  );
  const [note, setNote] = useState<string | null>(null);
  const [templateLoad, setTemplateLoad] = useState<"idle" | "loading" | "loaded" | "error">(savedStateId ? "loading" : "idle");
  const [finishNote, setFinishNote] = useState<string | null>(null);
  const [conflictsResolved, setConflictsResolved] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState<boolean>(() => !savedStateId && readStoredSchedule() !== null);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !savedStateId && readStoredSchedule() !== null);
  const doneRef = useRef(false);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!savedStateId) return;
    const requestedStateId = savedStateId;
    let cancelled = false;
    async function loadTemplateState() {
      try {
        const query = new URLSearchParams({ id: requestedStateId });
        if (targetKidId) query.set("kid_id", targetKidId);
        const response = await fetch(`/api/vocrehab/saved-states?${query.toString()}`, { credentials: "include", cache: "no-store" });
        const data = await response.json() as { saved_state?: { game_id?: string; state?: unknown }; error?: string };
        if (!response.ok || data.saved_state?.game_id !== "schedule-juggle" || !isScheduleStateV2(data.saved_state.state)) throw new Error(data.error || "This starting calendar is unavailable or invalid.");
        if (cancelled) return;
        const loaded = data.saved_state.state;
        scheduleDispatch({ type: "hydrate", state: loaded });
        setSelectedDayId(Object.keys(loaded.events).sort()[0] ?? null);
        setTemplateLoad("loaded");
        setTab("month");
        setNote("Starting calendar loaded. You can adjust any item before saving your month.");
      } catch {
        if (!cancelled) {
          setTemplateLoad("error");
          setNote("This starting calendar could not be loaded. Your private device calendar was left untouched.");
        }
      }
    }
    void loadTemplateState();
    return () => { cancelled = true; };
  }, [savedStateId, targetKidId, scheduleDispatch]);

  const todayId = sjTodayDayId();
  const monthLabel = sjMonthLabel(anchor.year, anchor.monthIndex);

  const say = (message: string) => {
    setLiveMessage(message);
    announceLive(message);
  };

  const nextBlockId = (prefix: string) => {
    idCounter.current += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter.current}`;
  };

  const totalBlocks = useMemo(
    () => Object.values(blocksByDay).reduce((total, blocks) => total + blocks.length, 0),
    [blocksByDay],
  );
  const totalConflicts = useMemo(() => sjCountConflicts(blocksByDay), [blocksByDay]);
  const travelMinTotal = useMemo(
    () => Object.values(blocksByDay).reduce((total, blocks) => total + sjLockedMinutes(blocks), 0),
    [blocksByDay],
  );

  const eventCounts = useMemo(() => {
    const counts: Record<string, { events: number; conflicts: number; travelMin: number }> = {};
    for (const [dayId, blocks] of Object.entries(blocksByDay)) {
      counts[dayId] = {
        events: blocks.length,
        conflicts: checkOverlaps(sjBlocksToScheduleEvents(blocks)).length,
        travelMin: sjLockedMinutes(blocks),
      };
    }
    return counts;
  }, [blocksByDay]);

  const selectedBlocks = useMemo(
    () => (selectedDayId ? (blocksByDay[selectedDayId] ?? []) : []),
    [selectedDayId, blocksByDay],
  );
  const selectedDayEvents: VocrehabScheduleDayEvent[] = selectedBlocks.map((block) => ({
    id: block.id,
    title: `${sjEmojiFor(block.activityId)} ${block.title}`.trim(),
    startMin: block.startMin,
    endMin: block.endMin,
    locked: block.locked,
    activityId: block.activityId,
  }));
  const selectedActivity = ACTIVITY_KINDS.find((kind) => kind.id === selectedActivityId) ?? null;
  const selectedConflicts = useMemo(
    () => checkOverlaps(sjBlocksToScheduleEvents(selectedBlocks)),
    [selectedBlocks],
  );

  const paletteBurdens = useMemo(
    () =>
      burdensForDifficulty(difficulty)
        .map((id) => BURDENS.find((def) => def.id === id))
        .filter((def): def is (typeof BURDENS)[number] => def !== undefined)
        .map((def) => ({ id: def.id, title: def.title, why: def.why })),
    [difficulty],
  );

  const transitNotice =
    travelTrip?.uiMode === "transit" ? (geoPreset.transitGaps[0]?.detail ?? null) : null;

  const mutateDay = (dayId: string, fn: (current: SjDayBlock[]) => SjDayBlock[]) => {
    const current = blocksByDay[dayId] ?? [];
    const next = [...fn(current)].sort((a, b) => a.startMin - b.startMin);
    const before = sjCountConflicts(blocksByDay);
    const afterMap = { ...blocksByDay, [dayId]: next };
    if (next.length === 0) delete afterMap[dayId];
    const after = sjCountConflicts(afterMap);
    if (after < before) setConflictsResolved((count) => count + (before - after));
    for (const block of next) {
      scheduleDispatch({ type: "upsertEvent", dayId, event: sjBlockToStored(block) });
    }
    const removed = current.filter((block) => !next.some((kept) => kept.id === block.id));
    for (const block of removed) {
      scheduleDispatch({ type: "removeEvent", dayId, eventId: block.id });
    }
  };

  const openDay = (dayId: string) => {
    setSelectedDayId(dayId);
    const count = blocksByDay[dayId]?.length ?? 0;
    say(dayAriaLabel(dayId, count, selectedActivity?.label ?? null));
  };

  const goMonth = (delta: number) => {
    const next = addMonths(anchor.year, anchor.monthIndex, delta);
    if (!isInRange(next.year, next.monthIndex, seedAnchor.year, seedAnchor.monthIndex)) {
      const edge = "That is the edge of the planning window — one month back, three months ahead.";
      setNote(edge);
      say(edge);
      return;
    }
    scheduleDispatch({ type: "setMonth", monthAnchor: next });
    setNote(null);
  };

  const goToday = () => {
    if (!isInRange(seedAnchor.year, seedAnchor.monthIndex, seedAnchor.year, seedAnchor.monthIndex)) return;
    scheduleDispatch({ type: "setMonth", monthAnchor: seedAnchor });
    setSelectedDayId(todayId);
    setTab("month");
    say("Back to the current month — today is selected on the calendar.");
  };

  const jumpToDay1 = () => {
    const dayId = toDayId(anchor.year, anchor.monthIndex, 1);
    openDay(dayId);
  };

  const choosePreset = (id: string) => {
    const nextId = sjValidPresetId(id);
    scheduleDispatch({ type: "setPreset", presetId: id });
    if (id !== "custom") {
      const customs = addresses.filter((entry) => entry.id.startsWith("addr-"));
      const fresh = [...getGeoPreset(nextId).addresses.map(sjPresetAddressToSaved), ...customs];
      scheduleDispatch({ type: "setAddresses", addresses: fresh });
      say(`${getGeoPreset(nextId).title} starts loaded — your added places stay on the list.`);
    } else {
      say("Custom mix — your current places stay exactly as they are.");
    }
    vocrehabEmit("action", { preset: id });
    setNote(null);
  };

  const chooseDifficulty = (value: string) => {
    scheduleDispatch({ type: "setDifficulty", difficulty: value });
    say(`${sjValidDifficulty(value)} pace — a steady speed that fits real life.`);
    vocrehabEmit("action", { difficulty: value });
  };

  const placeOneBlock = (
    targetDayId: string,
    activity: (typeof ACTIVITY_KINDS)[number],
    startMin: number,
    durationMin: number,
  ): boolean => {
    const safeDuration = Math.min(SJ_MAX_BLOCK_MIN, Math.max(5, Math.round(durationMin / 5) * 5));
    const start = Math.round(Math.max(SJ_DAY_MIN, Math.min(SJ_DAY_MAX - safeDuration, startMin)) / 5) * 5;
    const end = Math.min(SJ_DAY_MAX, start + safeDuration);
    if (!(end > start)) return false;
    const block: SjDayBlock = {
      id: nextBlockId("block"),
      title: activity.label,
      activityId: activity.id,
      startMin: start,
      endMin: end,
    };
    mutateDay(targetDayId, (current) => [...current, block]);
    return true;
  };

  const createBlock = (
    startMin: number,
    requestedActivityId?: string,
    requestedDayId?: string,
    requestedDurationMin?: number,
  ) => {
    const targetDayId = requestedDayId ?? selectedDayId;
    if (!targetDayId) return;
    const activity = ACTIVITY_KINDS.find((kind) => kind.id === (requestedActivityId ?? selectedActivityId));
    if (!activity) {
      const hint = "Choose an activity above, then tap Add on a calendar day.";
      setNote(hint);
      say(hint);
      return;
    }
    const duration = Math.min(
      SJ_MAX_BLOCK_MIN,
      Math.max(5, requestedDurationMin ?? customDurationMin),
    );
    const ok = placeOneBlock(targetDayId, activity, startMin, duration);
    if (!ok) {
      const hint = "That time overlaps something already planned — open day details to nudge times in 5-minute steps.";
      setNote(hint);
      say(hint);
      return;
    }
    const start = Math.round(Math.max(SJ_DAY_MIN, Math.min(SJ_DAY_MAX - duration, startMin)) / 5) * 5;
    const message = `${activity.emoji} ${activity.label} added ${minutesToLabel(start)} to ${minutesToLabel(start + duration)} — nice steady planning. Times stay editable in day details.`;
    setNote(null);
    say(message);
    vocrehabEmit("action", { day: targetDayId, activity: activity.id, startMin: start, durationMin: duration });
  };

  const createBlockForDay = (dayId: string, activityId: string) => {
    const activity = ACTIVITY_KINDS.find((kind) => kind.id === activityId);
    if (!activity) return;
    // Expand repeats inside the 3-months-out window; cap keeps saves tiny.
    const dates = expandRepeat(dayId, repeatChoice, seedAnchor.year, seedAnchor.monthIndex);
    let placed = 0;
    let skipped = 0;
    for (const target of dates) {
      // Repeats only plan forward inside the visible window.
      if (!isInRange(Number(target.slice(0, 4)), Number(target.slice(5, 7)) - 1, seedAnchor.year, seedAnchor.monthIndex)) {
        skipped += 1;
        continue;
      }
      const existing = blocksByDay[target] ?? [];
      const start = Math.round(Math.max(SJ_DAY_MIN, Math.min(SJ_DAY_MAX - customDurationMin, customStartMin)) / 5) * 5;
      const end = Math.min(SJ_DAY_MAX, start + Math.max(5, customDurationMin));
      const overlaps = existing.some((block) => start < block.endMin && end > block.startMin);
      if (overlaps) {
        skipped += 1;
        continue;
      }
      const ok = placeOneBlock(target, activity, customStartMin, customDurationMin);
      if (ok) placed += 1;
      else skipped += 1;
    }
    if (placed === 0) {
      setNote("There is no open space left there at that time. Try another start time or open day details to adjust.");
      return;
    }
    setSelectedDayId(dayId);
    const summary = repeatSummary(repeatChoice, dates.length);
    const message =
      repeatChoice === "none"
        ? `${activity.emoji} ${activity.label} added ${minutesToLabel(customStartMin)} (${customDurationMin} min) — times stay editable in day details.`
        : `${activity.emoji} ${activity.label} · ${summary} — placed ${placed}${skipped > 0 ? `, skipped ${skipped} full day${skipped === 1 ? "" : "s"}` : ""}. Times stay editable per day.`;
    setNote(null);
    say(message);
    vocrehabEmit("action", { day: dayId, activity: activity.id, repeat: repeatChoice, placed });
  };

  const moveBlock = (id: string, startMin: number) => {
    if (!selectedDayId) return;
    mutateDay(selectedDayId, (current) =>
      current.map((block) => {
        if (block.id !== id || block.locked === true) return block;
        const duration = Math.max(5, block.endMin - block.startMin);
        const start = Math.min(SJ_DAY_MAX - duration, Math.max(SJ_DAY_MIN, Math.round(startMin / 5) * 5));
        return { ...block, startMin: start, endMin: start + duration };
      }),
    );
    say("Block moved — the rest of the day flexes right along with it.");
  };

  const resizeBlock = (id: string, endMin: number) => {
    if (!selectedDayId) return;
    mutateDay(selectedDayId, (current) =>
      current.map((block) => {
        if (block.id !== id || block.locked === true) return block;
        const end = Math.min(
          SJ_DAY_MAX,
          block.startMin + SJ_MAX_BLOCK_MIN,
          Math.max(block.startMin + 5, Math.round(endMin / 5) * 5),
        );
        if (end === block.startMin + SJ_MAX_BLOCK_MIN) {
          const hint = "That stretch is at its fullest — split the rest into a second block so each part keeps its own plan.";
          setNote(hint);
          say(hint);
        }
        return { ...block, endMin: end };
      }),
    );
    say("Block length updated in five-minute steps.");
  };

  const removeBlock = (id: string) => {
    if (!selectedDayId) return;
    const target = selectedBlocks.find((block) => block.id === id);
    mutateDay(selectedDayId, (current) => current.filter((block) => block.id !== id));
    say(
      target
        ? eventAriaLabel(target.title, target.startMin, target.endMin, false) + " Freed up — open time, not a setback."
        : "Block freed up — open time, not a setback.",
    );
  };

  const repeatSleep = () => {
    if (!selectedDayId) {
      const hint = "Open a day first, then repeat last sleep carries the win into tonight.";
      setNote(hint);
      say(hint);
      return;
    }
    const sleeps = Object.values(blocksByDay)
      .flat()
      .filter((block) => block.activityId === "sleep")
      .sort((a, b) => a.startMin - b.startMin);
    if (sleeps.length === 0) {
      const hint = "No sleep block yet — pick Sleep from the palette to protect tonight first.";
      setNote(hint);
      say(hint);
      return;
    }
    const last = sleeps[sleeps.length - 1];
    const duration = Math.min(SJ_MAX_BLOCK_MIN, Math.max(30, last.endMin - last.startMin));
    const start = Math.min(SJ_DAY_MAX - duration, Math.max(SJ_DAY_MIN, snapToHalfHour(last.startMin)));
    const copy: SjDayBlock = {
      id: nextBlockId("sleep"),
      title: "Sleep",
      activityId: "sleep",
      startMin: start,
      endMin: start + duration,
    };
    mutateDay(selectedDayId, (current) => [...current, copy]);
    const message = `Last sleep repeated ${minutesToLabel(start)} to ${minutesToLabel(start + duration)} — rest stays protected.`;
    setNote(null);
    say(message);
    vocrehabEmit("action", { repeatedSleep: true, day: selectedDayId });
  };

  const runEstimate = (fromId: string, toId: string, uiMode: VocrehabTravelMode) => {
    const from = addresses.find((entry) => entry.id === fromId);
    const to = addresses.find((entry) => entry.id === toId);
    if (!from || !to) {
      const hint = "Pick a From place and a To place, then run the estimate.";
      setNote(hint);
      say(hint);
      return;
    }
    const fromCoord = coordById.get(fromId);
    const toCoord = coordById.get(toId);
    // Plausible pins estimate live; custom places plan on a 2-mile neighborhood hop.
    const miles =
      fromCoord && toCoord
        ? haversineMi(
            { lat: fromCoord.lat, lng: fromCoord.lng },
            { lat: toCoord.lat, lng: toCoord.lng },
          )
        : 2;
    const mode = sjUiModeToTravelMode(uiMode);
    const estimate = estimateLeg(mode, miles);
    const title = `${from.label} → ${to.label}`;
    setTravelResult({
      minMin: estimate.minMin,
      maxMin: estimate.maxMin,
      miles: estimate.miles,
      source: "planning",
      label: title,
    });
    setTravelTrip({ fromId, toId, uiMode, title: `Travel: ${title}` });
    const message = `${title}: ${estimate.label}. A steady planning figure to build around.`;
    setNote(null);
    say(message);
    vocrehabEmit("action", { travelEstimate: true, mode: uiMode, miles: estimate.miles });
  };

  const recalcTravel = () => {
    if (!travelTrip) {
      say("Run an estimate first — then the trip can be checked again anytime.");
      return;
    }
    setTravelLoading(true);
    runEstimate(travelTrip.fromId, travelTrip.toId, travelTrip.uiMode);
    setTravelLoading(false);
  };

  const applyTravel = () => {
    if (!travelResult || !travelTrip) {
      say("Run an estimate first — then the trip can join the day.");
      return;
    }
    const dayId = selectedDayId ?? todayId;
    const current = blocksByDay[dayId] ?? [];
    const duration = Math.max(15, travelResult.maxMin);
    const lastEnd = current.reduce((max, block) => Math.max(max, block.endMin), 8 * 60);
    const start = Math.min(SJ_DAY_MAX - duration, Math.max(SJ_DAY_MIN, snapToHalfHour(lastEnd)));
    const block: SjDayBlock = {
      id: nextBlockId("travel"),
      title: travelTrip.title,
      activityId: "travel",
      startMin: start,
      endMin: start + duration,
      locked: true,
    };
    mutateDay(dayId, (prev) => [...prev, block]);
    setSelectedDayId(dayId);
    setTab("day");
    say(
      `${eventAriaLabel(block.title, block.startMin, block.endMin, true)} Set as steady travel time so the rest of the day can flex around it.`,
    );
    vocrehabEmit("action", { travelApplied: true, day: dayId, minutes: duration });
  };

  const saveMonth = (includeAddresses: boolean) => {
    const snapshot: ScheduleState = {
      version: SCHEDULE_VERSION,
      presetId,
      difficulty,
      monthAnchor: anchor,
      addresses: includeAddresses
        ? addresses
        : addresses.map((entry) => ({ id: entry.id, category: entry.category })),
      events: scheduleState.events,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      const hint = "This browser could not keep the save — your plan is still right here, nothing lost.";
      setNote(hint);
      say(hint);
      return;
    }
    scheduleDispatch({ type: "hydrate", state: snapshot });
    setSavedAt(snapshot.updatedAt);
    setHasSave(true);
    const message = includeAddresses
      ? "Month saved — places included, the way you chose."
      : "Month saved — counts and day cells kept, places left private.";
    say(message);
    vocrehabEmit("action", { saved: true, includeAddresses });
  };

  const loadMonth = () => {
    const stored = readStoredSchedule();
    if (!stored) {
      const hint = "No saved month on this device yet — keep building, then Save my month.";
      setNote(hint);
      say(hint);
      return;
    }
    scheduleDispatch({ type: "resume", state: stored });
    setSavedAt(stored.updatedAt ?? null);
    setHasSave(true);
    setNote(null);
    say("Saved month back on the board — pick up right where the wins left off.");
    vocrehabEmit("action", { loaded: true });
  };

  const clearMonth = () => {
    scheduleDispatch({ type: "clearMonth" });
    say("This month is a clean slate — every open day is ready when you are.");
  };

  const clearAll = () => {
    scheduleDispatch({ type: "clearAll" });
    setSelectedDayId(null);
    setTravelResult(null);
    setTravelTrip(null);
    say("Brand-new month — same steady tools, fresh open days.");
  };

  const exportMonth = (includeAddresses: boolean) => {
    const payload = {
      game: "schedule-juggle",
      version: SCHEDULE_VERSION,
      exportedAt: new Date().toISOString(),
      presetId,
      difficulty,
      seed,
      placements: totalBlocks,
      travelMinTotal,
      conflictsResolved,
      days: Object.fromEntries(
        Object.entries(blocksByDay).map(([dayId, blocks]) => [
          dayId,
          { blocks: blocks.length, travelMin: sjLockedMinutes(blocks) },
        ]),
      ),
      // Anonymized by default: categories only unless the learner opts in.
      addresses: includeAddresses
        ? addresses
        : addresses.map((entry) => ({ category: entry.category })),
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schedule-juggle-${seed}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      say("Month exported — your planning progress, ready to keep anywhere.");
      vocrehabEmit("action", { exported: true, includeAddresses });
    } catch {
      const hint = "Export did not start in this browser — Save my month keeps the same progress here.";
      setNote(hint);
      say(hint);
    }
  };

  const finishMonth = () => {
    if (doneRef.current || totalBlocks === 0) return;
    doneRef.current = true;
    const summary = buildFinishSummary({
      presetId,
      difficulty,
      placements: totalBlocks,
      travelMinTotal,
      conflictsResolved,
      seed,
    });
    setFinishNote(summary);
    say(summary);
    vocrehabEmit("complete", { placements: totalBlocks, travelMinTotal });
    vocrehabFinish({
      placements: totalBlocks,
      travelMinTotal,
      conflictsResolved,
      presetId,
      difficulty,
      seed,
    });
  };

  const dayTabLabel = selectedDayId ? selectedDayId.slice(5) : "Day";

  return (
    <div className="vocrehab-game-schedule-juggle space-y-2">
      <ScheduleLiveRegion message={liveMessage} />
      <p className="text-xs text-muted-foreground" role="status">
        {totalBlocks} {totalBlocks === 1 ? "block" : "blocks"} · {travelMinTotal} min travel ·{" "}
        {monthLabel} ·{" "}
        {totalConflicts === 0 ? "✓ no open overlaps" : `▲ ${totalConflicts} open`}
      </p>

      {showWelcome && hasSave ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-sm">
          <p className="font-medium">Welcome back — your saved month is on the board.</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="min-h-11 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 font-medium"
            >
              Keep building
            </button>
            <button
              type="button"
              onClick={() => {
                clearAll();
                setShowWelcome(false);
              }}
              className="min-h-11 rounded-lg border bg-white px-3 py-1.5"
            >
              Start fresh instead
            </button>
          </div>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Schedule sections"
        className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 backdrop-blur"
      >
        <div className="flex gap-1 overflow-x-auto">
          {SJ_TABS.map((entry) => {
            const active = tab === entry.id;
            const badge =
              entry.id === "month" && totalConflicts > 0
                ? ` ▲${totalConflicts}`
                : entry.id === "day" && selectedDayId
                  ? ` · ${selectedBlocks.length}`
                  : "";
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={
                  entry.id === "day" ? `Day tab${selectedDayId ? `, ${selectedDayId}` : ""}` : `${entry.label} tab`
                }
                onClick={() => setTab(entry.id)}
                className={
                  "min-h-11 flex-1 whitespace-nowrap rounded-xl border px-3 py-2 text-sm " +
                  (active ? "bg-primary/10 font-semibold ring-2 ring-primary ring-offset-1 " : "")
                }
              >
                {entry.id === "day" ? dayTabLabel : entry.label}
                {badge}
              </button>
            );
          })}
        </div>
      </div>

      {note ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm" role="status">
          {note}
        </p>
      ) : null}
      {templateLoad === "loading" ? <p className="rounded-lg border p-2 text-sm" role="status">Loading the assigned starting calendar…</p> : null}
      {templateLoad === "loaded" ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-950" role="status">Assigned starting calendar loaded.</p> : null}

      {tab === "month" ? (
        <div role="tabpanel" aria-label="Month calendar" className="space-y-3">
          <VocrehabScheduleControls
            presetId={presetId}
            onPreset={choosePreset}
            difficulty={difficulty}
            onDifficulty={chooseDifficulty}
            monthLabel={monthLabel}
            onPrev={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            onToday={goToday}
            onJumpToDay1={jumpToDay1}
            savedAt={savedAt}
          />
          <section aria-label="Choose an activity" className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Choose what to schedule</h3>
                <p className="text-xs text-stone-600">Pick an activity, set its time + repeat, then use + Add on any date. Times stay editable later in 5-minute steps.</p>
              </div>
              <button type="button" onClick={() => setTab("save")} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-800">Save calendar</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTIVITY_KINDS.map((activity) => (
                <button key={activity.id} type="button" aria-pressed={selectedActivityId === activity.id} aria-label={`Select activity ${activity.label}`} onClick={() => { setSelectedActivityId(activity.id); setCustomDurationMin(Math.min(SJ_MAX_BLOCK_MIN, activity.defaultDurMin)); say(`${activity.emoji} ${activity.label} selected. Tap Add on a calendar day.`); }} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${selectedActivityId === activity.id ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"}`}>
                  {activity.emoji} {activity.label}{selectedActivityId === activity.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-stone-50 p-2 sm:grid-cols-3">
              <label className="text-xs font-semibold text-stone-700">
                ⏰ Start time{" "}
                <select
                  value={customStartMin}
                  onChange={(e) => setCustomStartMin(Number(e.target.value))}
                  aria-label="Start time for new blocks"
                  className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm"
                >
                  {SJ_START_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {minutesToLabel(opt)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-stone-700">
                ⌛ Length{" "}
                <select
                  value={customDurationMin}
                  onChange={(e) => setCustomDurationMin(Number(e.target.value))}
                  aria-label="Length for new blocks"
                  className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm"
                >
                  {SJ_DURATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt >= 60 ? `${Math.floor(opt / 60)}h${opt % 60 ? ` ${opt % 60}m` : ""}` : `${opt} min`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-stone-700">
                🔁 Repeat{" "}
                <select
                  value={repeatChoice}
                  onChange={(e) => setRepeatChoice(sjValidRepeat(e.target.value))}
                  aria-label="Repeat for new blocks"
                  className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm"
                >
                  {REPEAT_CHOICES.map((choice) => (
                    <option key={choice.id} value={choice.id} title={choice.blurb}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-1 text-xs text-stone-600" role="status">
              {selectedActivity ? `${selectedActivity.emoji} ${selectedActivity.label}` : "Pick an activity"} · {minutesToLabel(customStartMin)} · {customDurationMin} min · {repeatSummary(repeatChoice, expandRepeat(selectedDayId ?? todayId, repeatChoice, seedAnchor.year, seedAnchor.monthIndex).length)} · repeats stay inside 3 months out.
            </p>
          </section>
          <VocrehabScheduleMonth
            year={anchor.year}
            monthIndex={anchor.monthIndex}
            selectedDayId={selectedDayId}
            eventCounts={eventCounts}
            onSelect={openDay}
            quickAddActivity={selectedActivity ? { id: selectedActivity.id, label: `${selectedActivity.emoji} ${selectedActivity.label}` } : null}
            dayEvents={Object.fromEntries(Object.entries(blocksByDay).map(([dayId, blocks]) => [dayId, blocks.map((block) => ({ id: block.id, title: `${sjEmojiFor(block.activityId)} ${block.title}`.trim(), startMin: block.startMin, endMin: block.endMin, activityId: block.activityId }))]))}
            onQuickAdd={(dayId, activityId) => { setSelectedDayId(dayId); createBlockForDay(dayId, activityId); }}
            onQuickRemove={(dayId, eventId) => { mutateDay(dayId, (current) => current.filter((block) => block.id !== eventId)); say("Scheduled item removed. That time is open again."); }}
            todayDayId={todayId}
          />
          {selectedDayId ? (
            <section aria-label={`Edit schedule for ${selectedDayId}`} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">{selectedDayId} <span className="font-normal text-stone-600">· tap an open hour to add</span></h3>
                <button type="button" onClick={() => setSelectedDayId(null)} className="min-h-10 rounded-lg border px-3 text-sm">Close day</button>
              </div>
              {!selectedActivity ? <p className="text-sm text-amber-800">Choose an activity above first.</p> : null}
              <VocrehabScheduleDay
                dayId={selectedDayId}
                events={selectedDayEvents}
                selectedActivity={selectedActivity ? { id: selectedActivity.id, label: `${selectedActivity.emoji} ${selectedActivity.label}`, defaultDurMin: customDurationMin } : null}
                onCreate={(startMin) => createBlock(startMin, undefined, undefined, customDurationMin)}
                onMove={moveBlock}
                onResize={resizeBlock}
                onRemove={removeBlock}
              />
            </section>
          ) : <p className="rounded-xl border border-dashed p-4 text-sm text-stone-600">Tap any calendar date to see its hours and scheduled items here.</p>}
          <p className="text-xs text-muted-foreground">{geoPreset.briefing}</p>
        </div>
      ) : null}

      {tab === "day" ? (
        <div role="tabpanel" aria-label="Day plan" className="max-h-[62vh] space-y-2 overflow-y-auto sm:max-h-[66vh]">
          {selectedDayId ? (
            <section aria-label={`Day drawer for ${selectedDayId}`} className="space-y-2 rounded-xl border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{selectedDayId} — 24-hour plan</h3>
                <button
                  type="button"
                  onClick={() => setSelectedDayId(null)}
                  aria-label={`Close day ${selectedDayId}`}
                  className="min-h-11 rounded-lg border px-3 py-1 text-sm"
                >
                  Close day
                </button>
              </div>
              <p className="text-sm text-muted-foreground" role="status">
                {dayAriaLabel(selectedDayId, selectedBlocks.length, selectedActivity?.label ?? null)}
              </p>
              {selectedConflicts.length > 0 ? (
                <ul className="space-y-2">
                  {selectedConflicts.map((conflict, index) => (
                    <li
                      key={`${conflict.burdenId}-${index}`}
                      className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm"
                    >
                      <p>{conflict.message}</p>
                      <p className="mt-1 text-xs font-medium">Fix idea: {conflict.fixLabel}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedBlocks.length === 0
                    ? "A fresh day with room for wins — choose an activity, then tap an open hour."
                    : "✓ This day is holding together nicely — every block has its own room."}
                </p>
              )}
              <VocrehabScheduleDay
                dayId={selectedDayId}
                events={selectedDayEvents}
                selectedActivity={
                  selectedActivity
                    ? {
                        id: selectedActivity.id,
                        label: `${selectedActivity.emoji} ${selectedActivity.label}`,
                        defaultDurMin: customDurationMin,
                      }
                    : null
                }
                onCreate={createBlock}
                onMove={moveBlock}
                onResize={resizeBlock}
                onRemove={removeBlock}
              />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground" role="status">
              Pick any day on the Month tab to open its 24-hour plan — open days are ready when you are.
            </p>
          )}
        </div>
      ) : null}

      {tab === "plan" ? (
        <div role="tabpanel" aria-label="Activities" className="max-h-[62vh] space-y-2 overflow-y-auto sm:max-h-[66vh]">
          <VocrehabSchedulePalette
            activities={ACTIVITY_KINDS.map((kind) => ({
              id: kind.id,
              label: `${kind.emoji} ${kind.label}`,
              blurb: kind.blurb,
            }))}
            selectedId={selectedActivityId}
            onSelect={(id) => {
              setSelectedActivityId(id);
              const kind = ACTIVITY_KINDS.find((entry) => entry.id === id);
              if (kind) setCustomDurationMin(Math.min(SJ_MAX_BLOCK_MIN, kind.defaultDurMin));
              say(
                kind
                  ? `${kind.emoji} ${kind.label} picked — ${kind.blurb}`
                  : "Activity picked — return to the calendar and choose a date.",
              );
            }}
            burdens={paletteBurdens}
            onRepeatSleep={repeatSleep}
          />
          <button
            type="button"
            onClick={() => setTab(selectedDayId ? "day" : "month")}
            className="min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-medium"
          >
            {selectedDayId ? `Place it on ${selectedDayId} →` : "Back to Month →"}
          </button>
        </div>
      ) : null}

      {tab === "travel" ? (
        <div role="tabpanel" aria-label="Places and travel" className="max-h-[62vh] space-y-2 overflow-y-auto sm:max-h-[66vh]">
          <VocrehabScheduleAddresses
            addresses={addresses}
            onChange={(next) => {
              scheduleDispatch({ type: "setAddresses", addresses: next });
              vocrehabEmit("action", { addresses: next.length });
            }}
            onEstimate={runEstimate}
          />
          <VocrehabScheduleTravel
            result={travelResult}
            loading={travelLoading}
            onApply={applyTravel}
            onRecalc={recalcTravel}
            notice={transitNotice}
          />
        </div>
      ) : null}

      {tab === "save" ? (
        <div role="tabpanel" aria-label="Save and finish" className="max-h-[62vh] space-y-2 overflow-y-auto sm:max-h-[66vh]">
          <VocrehabSchedulePersist
            onSave={({ includeAddresses }) => saveMonth(includeAddresses)}
            onLoad={loadMonth}
            onClearMonth={clearMonth}
            onClearAll={clearAll}
            onExport={({ includeAddresses }) => exportMonth(includeAddresses)}
            savedAt={savedAt}
            hasSave={hasSave}
          />
          {finishNote ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-sm" role="status">
              {finishNote}
            </p>
          ) : null}
          <button
            type="button"
            onClick={finishMonth}
            disabled={totalBlocks === 0}
            className="min-h-11 w-full rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            Finish my month
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Legacy 7-day x 3-slot grid (pre-monthly-calander fallback).
 * Renders only when the URL carries `?legacy=1`. Seeded pool, blocks, and
 * constraints come from `lib/vocrehab-seed-pools3` exactly as before.
 */
function VocrehabGameScheduleJuggleLegacy({
  vocrehabEmit,
  vocrehabFinish,
  vocrehabSeed,
  vocrehabRunKey,
}: VocrehabGameRunProps) {
  const VOCREHAB_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const VOCREHAB_SLOTS = ["Morning", "Afternoon", "Evening"] as const;

  const vocrehabPool = useMemo(() => {
    const seed = vocrehabSeed ?? makeSeed();
    const selection = vocrehabSelectJuggle(seed);
    const set =
      vocrehabJugglePoolSets.find((s) => s.setId === selection.setId) ?? vocrehabJugglePoolSets[0];
    return {
      seed,
      setId: selection.setId,
      title: set.title,
      briefing: set.briefing,
      blocks: selection.blocks,
      constraints: selection.constraints,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocrehabSeed, vocrehabRunKey]);

  const VOCREHAB_BLOCKS = vocrehabPool.blocks;
  const VOCREHAB_CONSTRAINTS = vocrehabPool.constraints;

  const vocrehabConflictFor = (cell: string) =>
    VOCREHAB_CONSTRAINTS.find((c) => c.blocked.includes(cell)) ?? null;

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
    vocrehabFinish({ placements: Object.keys(vocrehabPlaced).length, conflictsResolved: vocrehabResolved, seed: vocrehabPool.seed });
  };

  return (
    <div className="vocrehab-game-schedule-juggle space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Placed {placedCount} of {VOCREHAB_BLOCKS.length} blocks ({vocrehabPool.title}) · Conflicts:{" "}
        {conflicts.length === 0 ? "✓ none" : `✗ ${conflicts.length} to fix`}
      </p>
      <p className="text-sm text-muted-foreground">{vocrehabPool.briefing}</p>
      <div className="rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Constraint cards ({VOCREHAB_CONSTRAINTS.length})</h3>
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

function ScheduleJuggleSwitch(props: VocrehabGameRunProps) {
  const params = useSearchParams();
  if (params.get("legacy") === "1") {
    return <VocrehabGameScheduleJuggleLegacy {...props} />;
  }
  return <ScheduleJuggleRoot {...props} savedStateId={params.get("savedStateId")} targetKidId={params.get("kid_id")} />;
}

export default function VocrehabGameScheduleJuggle(props: VocrehabGameRunProps) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Opening your month — steady planning starts here.
        </p>
      }
    >
      <ScheduleJuggleSwitch {...props} />
    </Suspense>
  );
}
