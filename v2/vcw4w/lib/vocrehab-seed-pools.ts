/**
 * VocRehab seeded content pools (CHEAP lane) — PURE module.
 *
 * Seed in, content out: every selector below deals its deck from the
 * passed seed alone, so counselors/admins can replay any run exactly by
 * pasting the seed back (`?seed=`). The only randomness source is the
 * seeded PRNG core in `@/lib/vocrehab-seed` (xmur3 + mulberry32); the
 * selectors themselves never touch clocks or unseeded dice.
 *
 * Banks mirror the live games structurally and keep all existing items
 * verbatim (file-sort f1..f12, inbox d1..d12). New items extend the banks
 * in the same strengths-first voice: practice, not a test — every rep
 * builds a work strength.
 *
 * Pure module: zero I/O, safe for client + server. No browser globals.
 */

import { mulberry32, shuffle, xmur3 } from "@/lib/vocrehab-seed";

/* ------------------------------------------------------------------ */
/* Local minimal shapes (structural mirrors of the game components;    */
/* no sibling vocrehab imports so this file stays dependency-light).   */
/* ------------------------------------------------------------------ */

export type VocrehabSeedPoolFolder = "Invoices" | "Schedules" | "Client Notes";

export interface VocrehabSeedPoolFileCard {
  id: string;
  name: string;
  folder: VocrehabSeedPoolFolder;
}

export type VocrehabSeedPoolVerdict = "legit" | "phish";

export type VocrehabSeedPoolInboxAction = "reply" | "schedule" | "file" | "flag";

export interface VocrehabSeedPoolInboxScenario {
  id: string;
  sender: string;
  subject: string;
  bodySnippet: string;
  verdict: VocrehabSeedPoolVerdict;
  safeAction: VocrehabSeedPoolInboxAction;
  /** Strengths-first: line 1 affirms what the learner did well, later lines teach. */
  debrief: readonly string[];
}

export interface VocrehabSeedPoolFocusPair {
  id: string;
  symbol: string;
  label: string;
}

/** One deterministic dice stream per deal step: same seed + part = same stream. */
function vocrehabChildRand(seed: string, part: string): () => number {
  return mulberry32(xmur3(`${seed}|${part}`)());
}

/* ------------------------------------------------------------------ */
/* (a) File Sort pool — 24 cards, 8 per folder. f1..f12 verbatim from  */
/* `components/vocrehab/vocrehab-game-file-sort.tsx`.                  */
/* ------------------------------------------------------------------ */

export const vocrehabFileSortPool: readonly VocrehabSeedPoolFileCard[] = [
  { id: "f1", name: "Invoice — March supplies", folder: "Invoices" },
  { id: "f2", name: "Invoice #1042 — printer paper", folder: "Invoices" },
  { id: "f3", name: "Past-due invoice reminder", folder: "Invoices" },
  { id: "f4", name: "Receipt — March (file with invoices)", folder: "Invoices" },
  { id: "f5", name: "April shift schedule", folder: "Schedules" },
  { id: "f6", name: "Holiday coverage rota", folder: "Schedules" },
  { id: "f7", name: "Training calendar invite", folder: "Schedules" },
  { id: "f8", name: "Swap request — Friday evening", folder: "Schedules" },
  { id: "f9", name: "Client note — J. prefers mornings", folder: "Client Notes" },
  { id: "f10", name: "Client feedback form", folder: "Client Notes" },
  { id: "f11", name: "Case note draft — intake call", folder: "Client Notes" },
  { id: "f12", name: "Thank-you email from client", folder: "Client Notes" },
  // New cards (same voice: plain names, folder hint where ambiguous).
  { id: "f13", name: "Invoice #1077 — cleaning supplies", folder: "Invoices" },
  { id: "f14", name: "Invoice — February mileage", folder: "Invoices" },
  { id: "f15", name: "Receipt — office snacks (file with invoices)", folder: "Invoices" },
  { id: "f16", name: "Corrected invoice — April (replaces draft)", folder: "Invoices" },
  { id: "f17", name: "May shift schedule", folder: "Schedules" },
  { id: "f18", name: "Weekend coverage rota", folder: "Schedules" },
  { id: "f19", name: "Orientation calendar invite", folder: "Schedules" },
  { id: "f20", name: "Swap request — Sunday morning", folder: "Schedules" },
  { id: "f21", name: "Client note — A. prefers afternoons", folder: "Client Notes" },
  { id: "f22", name: "Client intake form", folder: "Client Notes" },
  { id: "f23", name: "Case note draft — follow-up call", folder: "Client Notes" },
  { id: "f24", name: "Thank-you card from a client family", folder: "Client Notes" },
];

export interface VocrehabFileSortDeal {
  seed: string;
  cards: VocrehabSeedPoolFileCard[];
}

/**
 * Deal 12 file-sort cards from a seed: 4 per folder, order shuffled.
 * Same seed always deals the same set in the same order.
 */
export function vocrehabSelectFileSort(seed: string): VocrehabFileSortDeal {
  const folders: readonly VocrehabSeedPoolFolder[] = ["Invoices", "Schedules", "Client Notes"];
  const picked: VocrehabSeedPoolFileCard[] = [];
  for (const folder of folders) {
    const bank = vocrehabFileSortPool.filter((c) => c.folder === folder);
    const dealt = shuffle(vocrehabChildRand(seed, `file-sort:${folder}`), bank).slice(0, 4);
    for (const card of dealt) picked.push(card);
  }
  const cards = shuffle(vocrehabChildRand(seed, "file-sort:order"), picked);
  return { seed, cards };
}

/* ------------------------------------------------------------------ */
/* (b) Inbox pool — 20 scenarios (d1..d12 verbatim from               */
/* `lib/vocrehab-inbox-drill.ts`), 10 phish / 10 legit.                */
/* ------------------------------------------------------------------ */

export const vocrehabInboxPool: readonly VocrehabSeedPoolInboxScenario[] = [
  {
    id: "d1",
    sender: "IT-Support!",
    subject: "URGENT verify your password now",
    bodySnippet: "Your account will be locked! Click now to verify your password immediately.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You spotted the pressure tactic — urgency plus a link plus a password ask is the classic combo.",
      "Safe move: flag it and never click. Real IT will never ask for your password by email.",
    ],
  },
  {
    id: "d2",
    sender: "Supervisor",
    subject: "Shift starts 30 min early today",
    bodySnippet: "Heads up — today's shift starts at 8:30, not 9. Reply so I know you saw this.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Good call treating a plain request from a known sender as real — no threats, no links, no asks for secrets.",
      "Safe move: reply so they know you saw it. Short confirmations keep the day smooth.",
    ],
  },
  {
    id: "d3",
    sender: "Payroll Dept",
    subject: "Update your direct deposit details",
    bodySnippet: "Our payment system changed. Confirm your bank login here so your pay is not delayed.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You noticed pay + a login link in one message — that pairing is almost always a trap, and spotting it is a real skill.",
      "Safe move: flag it, then check pay questions through the official payroll channel you already use.",
    ],
  },
  {
    id: "d4",
    sender: "Coworker",
    subject: "Swap Friday?",
    bodySnippet: "Can you take my Friday evening? I can take your Sunday morning. Let me know what works.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "Friendly tone, a concrete trade, no rush or links — reading that as a real coworker ask shows good judgment.",
      "Safe move: schedule a time to answer or propose. Putting it on the calendar beats keeping it in your head.",
    ],
  },
  {
    id: "d5",
    sender: "CEO",
    subject: "Quick favor — gift cards needed",
    bodySnippet: "I am in a meeting and need gift cards for client gifts. Buy 5 and send me the codes ASAP. Keep this between us.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You caught the secrecy + gift-card combo — no real boss asks for gift-card codes over email, and secrecy is the giveaway.",
      "Safe move: flag it. If you are ever unsure, ask that person face to face instead of replying.",
    ],
  },
  {
    id: "d6",
    sender: "Office",
    subject: "Fridge cleanout Friday",
    bodySnippet: "Label anything you want to keep by Friday. Unlabeled items will be tossed after lunch.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "Low-stakes notice, no action demanded right now, nothing secret asked — filing it away is exactly right.",
      "Safe move: file FYI notes so your inbox stays clear for the messages that need answers.",
    ],
  },
  {
    id: "d7",
    sender: "ParcelTrack",
    subject: "Missed parcel — pay $2.49 redelivery fee",
    bodySnippet: "We tried to deliver twice. Pay the redelivery fee within 24 hours or your parcel returns to sender.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "Small fee + countdown is designed to make you click first and think later — pausing to question it is the win.",
      "Safe move: flag it. Track parcels only through the shop or carrier site you already trust.",
    ],
  },
  {
    id: "d8",
    sender: "New teammate",
    subject: "A request about how I work best",
    bodySnippet: "Hi — written instructions help me start tasks confidently. Could my training steps come in writing too? Please reply.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "A personal, specific request with no links or urgency — recognizing a real teammate moment like this matters.",
      "Safe move: reply kindly in a sentence or two. Clear and kind beats perfect wording every time.",
    ],
  },
  {
    id: "d9",
    sender: "HR Benefits",
    subject: "Benefits enrollment ends TODAY — confirm SSN",
    bodySnippet: "Final notice: confirm your full Social Security number now or lose coverage for the year.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated a Social Security ask over email as a red flag — that instinct protects you in real life too.",
      "Safe move: flag it. HR never collects SSNs by email link; use the official benefits portal instead.",
    ],
  },
  {
    id: "d10",
    sender: "Payroll",
    subject: "Timesheet due Thursday",
    bodySnippet: "Submit hours by Thursday noon so pay is on time. Use the usual timesheet link on the intranet.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "A routine deadline from a known sender pointing at the usual system — no secrets, no panic — is safe to act on.",
      "Safe move: schedule it (block Thursday morning) so pay stays on time without a last-minute rush.",
    ],
  },
  {
    id: "d11",
    sender: "coworker-docs-share",
    subject: "Shared file: Q3 rota (final)(1)",
    bodySnippet: "Someone shared a document with you. Sign in with your email password to view it.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "A look-alike sender name plus a password gate on a shared file — catching that mismatch is sharp work.",
      "Safe move: flag it. Open shared files only from the drive or app you normally use, never through the email link.",
    ],
  },
  {
    id: "d12",
    sender: "Client",
    subject: "Running late, need to reschedule",
    bodySnippet: "Something came up — can we move our 2pm to tomorrow? This needs an answer today.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Time-sensitive but still a normal human ask — no links, no threats, no secrets. You read the tone correctly.",
      "Safe move: reply today with a new time. Fast, short answers build trust with clients.",
    ],
  },
  // New scenarios (same voice: affirm the catch first, then the safe move).
  {
    id: "d13",
    sender: "IT Desk",
    subject: "Mailbox 98% full — re-validate storage",
    bodySnippet: "Your mailbox is almost full. Verify your login now to keep receiving mail.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You noticed a storage scare plus a login ask — that combo is built to rush you, and slowing down is the strength.",
      "Safe move: flag it. Check storage through the app you already use, never through the email link.",
    ],
  },
  {
    id: "d14",
    sender: "Supervisor",
    subject: "Nice work today — see you Thursday",
    bodySnippet: "You handled the rush well this morning. Same start time Thursday — reply if you have questions.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Warm, specific, no links and no secrets asked — reading praise plus a plain plan as real is good judgment.",
      "Safe move: reply with a quick thanks. Short replies keep a good rhythm going.",
    ],
  },
  {
    id: "d15",
    sender: "Bank Alert",
    subject: "Unusual sign-in — confirm your identity",
    bodySnippet: "We saw a sign-in from a new device. Confirm your full card number here to secure your account.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated a card-number ask over email as a red flag — that habit protects your money in real life too.",
      "Safe move: flag it, then check your account through the bank app or branch you already trust.",
    ],
  },
  {
    id: "d16",
    sender: "Training",
    subject: "New safety video ready to watch",
    bodySnippet: "The 10-minute refresher is posted on the usual training site. Please finish it by next week.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "A routine learning task from a known sender pointing at the usual site — calm, clear, no secrets — is safe to plan.",
      "Safe move: schedule a 15-minute block next week so it gets done without a rush.",
    ],
  },
  {
    id: "d17",
    sender: "HR Portal",
    subject: "New badges — confirm address + SSN",
    bodySnippet: "To print your new badge, reply with your home address and full Social Security number today.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You spotted personal details being asked over plain email — keeping those private is exactly the right instinct.",
      "Safe move: flag it. HR handles IDs through the official portal or in person, never by email reply.",
    ],
  },
  {
    id: "d18",
    sender: "Coworker",
    subject: "Coffee run — want anything?",
    bodySnippet: "Heading to the corner shop in ten minutes. Happy to grab you a tea if you want one.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Small, friendly, no links and nothing secret — a quick yes-or-no ask like this is safe to answer.",
      "Safe move: reply with a short answer. Tiny kindnesses make shifts better.",
    ],
  },
  {
    id: "d19",
    sender: "Prize Team",
    subject: "You won a $500 gift card — claim now",
    bodySnippet: "Congratulations! Pay a $5 release fee with your card to claim your $500 gift card today.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You saw through the prize + pay-a-fee trick — real prizes never ask you to pay to receive them.",
      "Safe move: flag it and delete. If you did not enter it, you did not win it.",
    ],
  },
  {
    id: "d20",
    sender: "Front Desk",
    subject: "Lost jacket in the break room — yours?",
    bodySnippet: "A blue jacket was left in the break room today. Let us know if it is yours by Friday.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "A low-stakes lost-and-found note with no links and no rush — filing it until you check is just right.",
      "Safe move: file it and check the break room next time you pass. Small systems keep days smooth.",
    ],
  },
];

export interface VocrehabInboxDeal {
  seed: string;
  scenarios: VocrehabSeedPoolInboxScenario[];
}

/**
 * Deal 8 inbox scenarios from a seed: always 4 phish + 4 legit, order
 * shuffled. Same seed always deals the same set in the same order.
 */
export function vocrehabSelectInbox(seed: string): VocrehabInboxDeal {
  const phish = vocrehabInboxPool.filter((s) => s.verdict === "phish");
  const legit = vocrehabInboxPool.filter((s) => s.verdict === "legit");
  const dealtPhish = shuffle(vocrehabChildRand(seed, "inbox:phish"), phish).slice(0, 4);
  const dealtLegit = shuffle(vocrehabChildRand(seed, "inbox:legit"), legit).slice(0, 4);
  const scenarios = shuffle(vocrehabChildRand(seed, "inbox:order"), [...dealtPhish, ...dealtLegit]);
  return { seed, scenarios };
}

/* ------------------------------------------------------------------ */
/* (c) Focus-shift pairs — 16 teen-clean emoji/text pairs. Each entry  */
/* is one matchable pair type; games render two cards per type.        */
/* ------------------------------------------------------------------ */

export const vocrehabFocusPool: readonly VocrehabSeedPoolFocusPair[] = [
  { id: "p01", symbol: "🌟", label: "Star — you brighten the team" },
  { id: "p02", symbol: "🎨", label: "Palette — you bring fresh ideas" },
  { id: "p03", symbol: "🌊", label: "Wave — you keep a steady flow" },
  { id: "p04", symbol: "🍎", label: "Apple — you fuel the day" },
  { id: "p05", symbol: "⚽", label: "Soccer ball — you play fair" },
  { id: "p06", symbol: "🎵", label: "Music note — you set a good rhythm" },
  { id: "p07", symbol: "🌙", label: "Moon — you stay calm on late shifts" },
  { id: "p08", symbol: "☀️", label: "Sun — you bring morning energy" },
  { id: "p09", symbol: "🐢", label: "Turtle — steady wins the day" },
  { id: "p10", symbol: "🦋", label: "Butterfly — you adapt with grace" },
  { id: "p11", symbol: "📚", label: "Books — you keep learning" },
  { id: "p12", symbol: "✏️", label: "Pencil — you draft, then refine" },
  { id: "p13", symbol: "🔑", label: "Key — you unlock solutions" },
  { id: "p14", symbol: "⏰", label: "Alarm clock — you honor the time" },
  { id: "p15", symbol: "🧩", label: "Puzzle piece — you fit things together" },
  { id: "p16", symbol: "🌱", label: "Sprout — you grow every shift" },
];

export interface VocrehabFocusDeal {
  seed: string;
  pairs: VocrehabSeedPoolFocusPair[];
}

/**
 * Deal 10 focus-shift pairs from a seed. Same seed always deals the
 * same 10 pair types in the same order — pause, notice, refocus.
 */
export function vocrehabSelectFocus(seed: string): VocrehabFocusDeal {
  const pairs = shuffle(vocrehabChildRand(seed, "focus"), vocrehabFocusPool).slice(0, 10);
  return { seed, pairs };
}
