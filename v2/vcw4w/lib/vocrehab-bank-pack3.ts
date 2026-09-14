/**
 * lib/vocrehab-bank-pack3.ts — VocRehab content bank pack-3 (self-contained).
 *
 * Covers the remaining games without touching sibling-owned modules:
 * focus-shift symbol pairs, barrier-run story nodes, schedule-juggle
 * constraint sets, and resume-rescue lines.
 *
 * Pure module: zero imports, zero I/O. Randomness is injected — every draw
 * function takes `rand: () => number` (returning [0, 1)) so callers can pass
 * a seeded PRNG for deterministic draws.
 */

/* ------------------------------------------------------------------ */
/* focus-shift: symbol pairs                                           */
/* ------------------------------------------------------------------ */

export interface FocusShiftSymbolPair {
  id: string;
  a: string;
  b: string;
}

export const focusShiftSymbolPairs: readonly FocusShiftSymbolPair[] = [
  { id: "fs-01", a: "★", b: "☆" },
  { id: "fs-02", a: "●", b: "○" },
  { id: "fs-03", a: "▲", b: "△" },
  { id: "fs-04", a: "■", b: "□" },
  { id: "fs-05", a: "◆", b: "◇" },
  { id: "fs-06", a: "✔", b: "✘" },
  { id: "fs-07", a: "←", b: "→" },
  { id: "fs-08", a: "↑", b: "↓" },
  { id: "fs-09", a: "♥", b: "♡" },
  { id: "fs-10", a: "☀", b: "☁" },
  { id: "fs-11", a: "☾", b: "☀" },
  { id: "fs-12", a: "❄", b: "☃" },
  { id: "fs-13", a: "⚑", b: "⚐" },
  { id: "fs-14", a: "✚", b: "✖" },
  { id: "fs-15", a: "◉", b: "◎" },
  { id: "fs-16", a: "⬛", b: "⬜" },
  { id: "fs-17", a: "🔺", b: "🔻" },
  { id: "fs-18", a: "⭐", b: "🌟" },
  { id: "fs-19", a: "❤️", b: "🧡" },
  { id: "fs-20", a: "🔴", b: "🟠" },
  { id: "fs-21", a: "🟢", b: "🔵" },
  { id: "fs-22", a: "⬆️", b: "⬇️" },
  { id: "fs-23", a: "⬅️", b: "➡️" },
  { id: "fs-24", a: "✅", b: "☑️" },
  { id: "fs-25", a: "❌", b: "⭕" },
  { id: "fs-26", a: "🔔", b: "🔕" },
  { id: "fs-27", a: "🔒", b: "🔓" },
  { id: "fs-28", a: "👁️", b: "👀" },
  { id: "fs-29", a: "☎️", b: "📞" },
  { id: "fs-30", a: "✉️", b: "📩" },
  { id: "fs-31", a: "⏰", b: "⏱️" },
  { id: "fs-32", a: "💡", b: "🔦" },
  { id: "fs-33", a: "🔨", b: "🪛" },
  { id: "fs-34", a: "📌", b: "📍" },
  { id: "fs-35", a: "✂️", b: "🔪" },
  { id: "fs-36", a: "♠", b: "♣" },
  { id: "fs-37", a: "♥", b: "♦" },
  { id: "fs-38", a: "♩", b: "♪" },
  { id: "fs-39", a: "⚙️", b: "🔩" },
  { id: "fs-40", a: "☕", b: "🍵" },
  { id: "fs-41", a: "🌞", b: "🌝" },
  { id: "fs-42", a: "🐱", b: "🐯" },
];

export function drawFocusShiftPair(rand: () => number): FocusShiftSymbolPair {
  return focusShiftSymbolPairs[Math.floor(rand() * focusShiftSymbolPairs.length)];
}

/* ------------------------------------------------------------------ */
/* barrier-run: story nodes (all choices valid, no fail states)        */
/* ------------------------------------------------------------------ */

export interface BarrierRunNode {
  id: string;
  scene: string;
  choices: [string, string, string];
}

export const barrierRunNodes: readonly BarrierRunNode[] = [
  {
    id: "br-01",
    scene:
      "Morning commute: your usual bus is running 10 minutes late and your shift starts soon.",
    choices: [
      "Text your supervisor a quick heads-up with your ETA",
      "Catch the backup bus route you mapped last week",
      "Ask a coworker who drives nearby for a lift",
    ],
  },
  {
    id: "br-02",
    scene:
      "You arrive just in time. The team huddle is starting and the lead asks who can cover the busy register.",
    choices: [
      "Volunteer for the register — people skills are your strength",
      "Offer to restock shelves so the register stays covered",
      "Pair up with a teammate and split register duty",
    ],
  },
  {
    id: "br-03",
    scene:
      "Shift-swap board: Friday evening is short-staffed and two coworkers need to trade shifts.",
    choices: [
      "Swap your quiet Tuesday for their Friday rush",
      "Offer a half-shift split so nobody works alone",
      "Help them find a third coworker to rotate coverage",
    ],
  },
  {
    id: "br-04",
    scene:
      "A new task needs doing — disclosure moment: you work best with written instructions rather than shouted ones.",
    choices: [
      "Ask your lead to jot the steps on a card",
      "Request the task demo once, then repeat it back",
      "Suggest a printed checklist the whole team can use",
    ],
  },
  {
    id: "br-05",
    scene:
      "Mid-morning rush: the line is long, a customer is impatient, and the card reader just froze.",
    choices: [
      "Restart the reader while greeting the next customer",
      "Call over a teammate to keep the line moving",
      "Switch to the backup register calmly and clearly",
    ],
  },
  {
    id: "br-06",
    scene:
      "Tool failure: the label printer jams halfway through a big stock intake.",
    choices: [
      "Clear the jam using the posted guide step by step",
      "Hand-write temporary labels so intake keeps flowing",
      "Ask maintenance for a quick fix while you sort stock",
    ],
  },
  {
    id: "br-07",
    scene:
      "Lunch break puzzle: only one break slot left overlaps your medication routine.",
    choices: [
      "Take the early slot and flag your routine to your lead",
      "Trade slots with a teammate who prefers late lunch",
      "Split your break so your routine stays on track",
    ],
  },
  {
    id: "br-08",
    scene:
      "Afternoon delivery arrives with three boxes mislabeled and the driver in a hurry.",
    choices: [
      "Sign, then sort the boxes with a teammate together",
      "Photo the labels so the mix-up is easy to resolve",
      "Check the manifest line by line before shelving",
    ],
  },
  {
    id: "br-09",
    scene:
      "Disclosure opportunity: the rota planner doesn't know you do your best work on steady, predictable tasks.",
    choices: [
      "Tell the planner which task patterns suit you best",
      "Ask for one steady anchor task alongside variety",
      "Share what helped you shine during last week's rota",
    ],
  },
  {
    id: "br-10",
    scene:
      "Tool failure again: the shared tablet dies right as you start inventory counts.",
    choices: [
      "Count on paper and enter the numbers later",
      "Borrow the charged spare from the office dock",
      "Team up — one counts aloud while the other records",
    ],
  },
  {
    id: "br-11",
    scene:
      "End-of-shift handover: the next crew needs to know about the printer jam and the mislabeled boxes.",
    choices: [
      "Write a short handover note with both issues",
      "Brief the next lead face to face in two minutes",
      "Leave labeled markers where the issues happened",
    ],
  },
  {
    id: "br-12",
    scene:
      "Homeward commute: the bus is delayed again, and you feel proud of how the day went.",
    choices: [
      "Note today's wins in your phone for tomorrow",
      "Thank the coworker who helped you this morning",
      "Plan a calmer backup route for next week",
    ],
  },
];

export function drawBarrierRunNode(rand: () => number): BarrierRunNode {
  return barrierRunNodes[Math.floor(rand() * barrierRunNodes.length)];
}

/* ------------------------------------------------------------------ */
/* schedule-juggle: constraint sets (Day-Slot keys, e.g. Mon-Morning)  */
/* ------------------------------------------------------------------ */

export interface JuggleConstraintSet {
  id: string;
  title: string;
  /** Blocked Day-Slot keys, e.g. "Mon-Morning". */
  blocked: string[];
  why: string;
}

export const juggleConstraintSets: readonly JuggleConstraintSet[] = [
  {
    id: "jg-01",
    title: "Morning bus window",
    blocked: ["Mon-Morning", "Wed-Morning", "Fri-Morning"],
    why: "Only the late bus runs on those days, so morning shifts are unreachable.",
  },
  {
    id: "jg-02",
    title: "College course afternoons",
    blocked: ["Tue-Afternoon", "Thu-Afternoon"],
    why: "Classes run until 4pm, blocking afternoon shifts twice a week.",
  },
  {
    id: "jg-03",
    title: "Childcare pickup",
    blocked: ["Mon-Afternoon", "Tue-Afternoon", "Wed-Afternoon", "Thu-Afternoon", "Fri-Afternoon"],
    why: "School pickup at 3:30pm every weekday rules out late shifts.",
  },
  {
    id: "jg-04",
    title: "Physio appointments",
    blocked: ["Wed-Midday", "Wed-Afternoon"],
    why: "Weekly physio every Wednesday midday overruns into the afternoon.",
  },
  {
    id: "jg-05",
    title: "Shared-car evenings",
    blocked: ["Thu-Evening", "Fri-Evening"],
    why: "The shared car goes to a family member those evenings.",
  },
  {
    id: "jg-06",
    title: "Weekend market stall",
    blocked: ["Sat-Morning", "Sat-Midday", "Sat-Afternoon"],
    why: "Running the family stall takes the whole of Saturday daytime.",
  },
  {
    id: "jg-07",
    title: "Night-course Mondays",
    blocked: ["Mon-Evening"],
    why: "An evening qualification course blocks Monday nights.",
  },
  {
    id: "jg-08",
    title: "Volunteer mornings",
    blocked: ["Tue-Morning", "Thu-Morning"],
    why: "Food-bank volunteering covers those mornings until 11am.",
  },
  {
    id: "jg-09",
    title: "Quiet-shift preference",
    blocked: ["Fri-Evening", "Sat-Evening"],
    why: "Peak weekend-evening noise overwhelms; calmer slots work better.",
  },
];

export function drawJuggleConstraintSet(rand: () => number): JuggleConstraintSet {
  return juggleConstraintSets[Math.floor(rand() * juggleConstraintSets.length)];
}

/* ------------------------------------------------------------------ */
/* resume-rescue: lines with error + fix                               */
/* ------------------------------------------------------------------ */

export type ResumeErrorKind = "capitalization" | "dates" | "typo" | "action-verb";

export interface ResumeLine {
  id: string;
  line: string;
  errorKind: ResumeErrorKind;
  fix: string;
}

export const resumeLines: readonly ResumeLine[] = [
  // capitalization (10)
  { id: "rr-01", line: "worked as a cashier at Tesco", errorKind: "capitalization", fix: "Worked as a Cashier at Tesco" },
  { id: "rr-02", line: "fluent in english and spanish", errorKind: "capitalization", fix: "Fluent in English and Spanish" },
  { id: "rr-03", line: "based in manchester, uk", errorKind: "capitalization", fix: "Based in Manchester, UK" },
  { id: "rr-04", line: "trained in first aid and fire marshal duties", errorKind: "capitalization", fix: "Trained in First Aid and Fire Marshal duties" },
  { id: "rr-05", line: "used microsoft excel daily", errorKind: "capitalization", fix: "Used Microsoft Excel daily" },
  { id: "rr-06", line: "volunteer at oxfam charity shop", errorKind: "capitalization", fix: "Volunteer at Oxfam charity shop" },
  { id: "rr-07", line: "studied btec business at college", errorKind: "capitalization", fix: "Studied BTEC Business at college" },
  { id: "rr-08", line: "weekend supervisor at costa coffee", errorKind: "capitalization", fix: "Weekend Supervisor at Costa Coffee" },
  { id: "rr-09", line: "speaks french and german", errorKind: "capitalization", fix: "Speaks French and German" },
  { id: "rr-10", line: "january starter, available immediately", errorKind: "capitalization", fix: "January starter, available immediately" },
  // dates (10)
  { id: "rr-11", line: "Worked 2021-2023 as a picker", errorKind: "dates", fix: "Worked Jun 2021 – Mar 2023 as a Picker" },
  { id: "rr-12", line: "Employed sometime last year", errorKind: "dates", fix: "Employed Mar 2024 – Nov 2024" },
  { id: "rr-13", line: "Experience: a while back", errorKind: "dates", fix: "Experience: Jan 2022 – Dec 2022" },
  { id: "rr-14", line: "Role ran 03/04/05 to whenever", errorKind: "dates", fix: "Role ran Mar 2004 – May 2005" },
  { id: "rr-15", line: "Started recent, still there", errorKind: "dates", fix: "Started Sep 2024 – present" },
  { id: "rr-16", line: "Two years experience (unspecified)", errorKind: "dates", fix: "Two years' experience (2022 – 2024)" },
  { id: "rr-17", line: "Worked summers, you know, holidays", errorKind: "dates", fix: "Worked Jul – Aug 2023 (summer season)" },
  { id: "rr-18", line: "From Jan to Dec-ish", errorKind: "dates", fix: "From Jan 2023 to Dec 2023" },
  { id: "rr-19", line: "Long time ago until now", errorKind: "dates", fix: "From 2019 – present" },
  { id: "rr-20", line: "Did a stint 99-01", errorKind: "dates", fix: "Did a stint 1999 – 2001" },
  // typos (10)
  { id: "rr-21", line: "Excelent customer service skills", errorKind: "typo", fix: "Excellent customer service skills" },
  { id: "rr-22", line: "Recieved Employee of the Month", errorKind: "typo", fix: "Received Employee of the Month" },
  { id: "rr-23", line: "Managment of weekend till team", errorKind: "typo", fix: "Management of weekend till team" },
  { id: "rr-24", line: "Responsable for stock counts", errorKind: "typo", fix: "Responsible for stock counts" },
  { id: "rr-25", line: "Attention to detial under pressure", errorKind: "typo", fix: "Attention to detail under pressure" },
  { id: "rr-26", line: "Proficient in Microsft Office", errorKind: "typo", fix: "Proficient in Microsoft Office" },
  { id: "rr-27", line: "Seperated deliveries by aisle", errorKind: "typo", fix: "Separated deliveries by aisle" },
  { id: "rr-28", line: "Liason between kitchen and floor", errorKind: "typo", fix: "Liaison between kitchen and floor" },
  { id: "rr-29", line: "Maintanance of display areas", errorKind: "typo", fix: "Maintenance of display areas" },
  { id: "rr-30", line: "Succesfully upsold loyalty cards", errorKind: "typo", fix: "Successfully upsold loyalty cards" },
  // action-verbs (10)
  { id: "rr-31", line: "Was responsible for cleaning duties", errorKind: "action-verb", fix: "Led daily cleaning rota for a team of four" },
  { id: "rr-32", line: "Did stuff with deliveries", errorKind: "action-verb", fix: "Processed 40+ deliveries per shift" },
  { id: "rr-33", line: "Helped with customers", errorKind: "action-verb", fix: "Advised 50+ customers daily on product choices" },
  { id: "rr-34", line: "Was in charge of tills", errorKind: "action-verb", fix: "Operated tills handling £2k cash daily" },
  { id: "rr-35", line: "Got involved in training", errorKind: "action-verb", fix: "Trained six new starters on safety procedures" },
  { id: "rr-36", line: "Worked on the rota", errorKind: "action-verb", fix: "Coordinated the weekend rota for ten staff" },
  { id: "rr-37", line: "Did some admin", errorKind: "action-verb", fix: "Maintained stock records in the inventory system" },
  { id: "rr-38", line: "Was part of a team", errorKind: "action-verb", fix: "Collaborated in a five-person restocking team" },
  { id: "rr-39", line: "Handled things when busy", errorKind: "action-verb", fix: "Prioritised queues during peak-hour rushes" },
  { id: "rr-40", line: "Made things better", errorKind: "action-verb", fix: "Improved shelf-layout speed by reorganising top sellers" },
];

export function drawResumeLine(rand: () => number): ResumeLine {
  return resumeLines[Math.floor(rand() * resumeLines.length)];
}
