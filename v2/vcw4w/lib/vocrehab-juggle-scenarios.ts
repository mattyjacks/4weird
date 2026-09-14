/**
 * VocRehab Schedule Juggle — "Night-Shift Edition" scenario pack 2 (A7 gift for C4).
 *
 * Purpose: a merge-ready Night-Shift scenario pack for
 *   components/vocrehab/vocrehab-game-schedule-juggle.tsx (4 blocks + 5 constraints baseline).
 * Owner-offer: free to merge, delete-this-file-after — C4 owns the component + its pages
 *   (claimed + locked); this file is a gift, not a fork. Merge it in, then delete this file.
 * Zero-coupling note: nothing imports this file yet by design — pure data, zero imports,
 *   zero I/O, safe for client + server. No browser globals. No other changes needed.
 *
 * Merge (see vocrehabJugglePack2MergeNote): append blocks, append constraints, nothing else.
 * Strengths-first tone preserved throughout (blocked cells are planning info, never grades).
 */

/** Day-Slot cell key: `${day}-${slot}` (days Mon..Sun, slots Morning/Afternoon/Evening). */
export interface VocrehabJugglePack2Block {
  id: string;
  label: string;
}

export interface VocrehabJugglePack2Constraint {
  id: string;
  title: string;
  blocked: readonly string[];
  why: string;
}

export const vocrehabJuggleScenarioPack2 = {
  id: "night-shift",
  title: "Schedule Juggle: Night-Shift Edition",
  briefing:
    "You have already shown you can juggle a day schedule — that planning strength carries over here. This night-shift week adds overnight hours, protected sleep, and daytime appointments. Place all 4 blocks where they fit best; blocked cells are just information, never mistakes.",
} as const;

export const vocrehabJugglePack2Blocks: readonly VocrehabJugglePack2Block[] = [
  { id: "pack2-night-a", label: "Night Shift A" },
  { id: "pack2-night-b", label: "Night Shift B" },
  { id: "pack2-day-training", label: "Day Training" },
  { id: "pack2-oncall", label: "On-call shadow" },
];

export const vocrehabJugglePack2Constraints: readonly VocrehabJugglePack2Constraint[] = [
  {
    id: "pack2-bus-gap",
    title: "Overnight bus gap",
    blocked: ["Fri-Evening", "Sun-Evening", "Mon-Evening"],
    why: "the overnight bus does not run weekend evenings, so plan a backup ride",
  },
  {
    id: "pack2-sleep-window",
    title: "Sleep-protection window",
    blocked: ["Tue-Morning", "Fri-Morning", "Sat-Morning"],
    why: "protected sleep window after a night shift",
  },
  {
    id: "pack2-childcare",
    title: "Daylight childcare",
    blocked: ["Mon-Afternoon", "Wed-Afternoon", "Fri-Afternoon"],
    why: "daylight childcare pickup",
  },
  {
    id: "pack2-overtime-cap",
    title: "Weekend overtime cap",
    blocked: ["Sat-Afternoon", "Sat-Evening", "Sun-Afternoon"],
    why: "the site caps extra weekend hours",
  },
  {
    id: "pack2-clinic",
    title: "Clinic morning",
    blocked: ["Thu-Morning"],
    why: "a Thursday morning clinic check-in",
  },
];

export const vocrehabJugglePack2MergeNote: string =
  "C4 merge: in components/vocrehab/vocrehab-game-schedule-juggle.tsx, append vocrehabJugglePack2Blocks to VOCREHAB_BLOCKS and vocrehabJugglePack2Constraints to VOCREHAB_CONSTRAINTS (swap in per scenario id); no other changes — cell keys, shapes, and the strengths-first tone stay as-is. After merging, delete lib/vocrehab-juggle-scenarios.ts.";
