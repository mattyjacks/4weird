/**
 * Last Words Zombies — content-mode copy module (V2 layer only).
 *
 * Slug: lastwordszombies. The parity-locked bundle
 * (public/games/html/lastwordszombies/**) is never touched; this module feeds
 * the V2 play shell / runtime bridge, which applies the per-mode variants at
 * runtime (word-list patch hook, store relabel, terminal intros).
 *
 * CONTRACT (shared infra, now present — verified this session, mirrors
 * content/gravegain2d-modes.ts):
 *   - Mode type imported from "@/lib/content-modes" (ContentMode = kid|teen|all);
 *     tonic gating delegates to its isDrugContentAllowed (tonic = drug content,
 *     "all" only); unknown modes fall back to "teen" per defaultContentMode().
 *   - Runtime reads window.FourweirdContentMode
 *     { mode, slug, goreEnabled, drugsAllowed, sanitize, filterNpcLine } +
 *     "fourweird-content-mode" events (detail { slug, mode, ... }); gore
 *     visuals live in public/games/html/gore-lastwordszombies.js.
 *   - Storage key `4weird-content-mode:lastwordszombies` matches
 *     contentModeStorageKey("lastwordszombies"); query param `?content=`.
 *   - Source truth: bundle dictionary.js (~633 WORD_DEFINITIONS words /
 *     ~1266 definitions, plus the SHORT/MID/LONG_WORDS spawn lists),
 *     store.js (camp store: cosmetics-only blood/fonts/music tabs — no
 *     tonic item exists in the bundle; the tonic/lantern-oil copy here is
 *     the V2 shell's store-slot gating source), zombie.js/particles.js
 *     (blood hooks), typing.js (kill path).
 *     Bundle is parity-locked; this module is a v2-layer override only.
 *     Runtime application: the kid dictionary swap is applied same-realm by
 *     public/games/html/gore-lastwordszombies.js (in-place
 *     SHORT/MID/LONG_WORDS patch + additive WORD_DEFINITIONS, mirroring
 *     filterWords/kidWordList below); teen/all play the bundle lists
 *     untouched.
 */

import { isDrugContentAllowed, parseContentMode } from "@/lib/content-modes";
import type { ContentMode } from "@/lib/content-modes";

/** Local alias — identical to the shared ContentMode; kept nominal for LWZ tables. */
export type LwzContentMode = ContentMode;

export type LwzUnitKind = "walker" | "runner" | "brute" | "ghost" | "boss";

/** Map the platform age band (lib/family.ts AgeBand) onto an LWZ mode. */
export function fromAgeBand(band: string | null | undefined): LwzContentMode {
  if (band === "kid") return "kid";
  if (band === "teen") return "teen";
  // "adult", "unknown", null -> full ("all") experience.
  return "all";
}

export function normalizeLwzMode(value: unknown): LwzContentMode {
  const parsed = parseContentMode(value);
  if (parsed) return parsed;
  if (typeof value === "string") {
    // Legacy aliases the shared parser does not know.
    const v = value.toLowerCase().trim();
    if (v === "child" || v === "kids") return "kid";
    if (v === "adult" || v === "mature" || v === "uncensored") return "all";
    if (v === "teenager" || v === "teenage") return "teen";
  }
  // Shared safe default (defaultContentMode()): teen — gore on, swears/drugs gated.
  return "teen";
}

/* ------------------------------------------------------------------ */
/* Unit / zombie taunts                                                */
/*                                                                     */
/* - "all"  : rotting-horde horror, includes "fuck" and                */
/*            per-unit swears (boss zombie lord drops f-bombs).         */
/* - "teen" : mild rebellion — "damn horde!", no f-bombs, no slurs.    */
/* - "kid"  : cuddly spooky slapstick — "oh beans, my bones!".         */
/* ------------------------------------------------------------------ */

type TauntTable = Record<LwzContentMode, Record<LwzUnitKind, string[]>>;

const LWZ_TAUNTS: TauntTable = {
  kid: {
    walker: ["oh beans, my bones are wobbly!", "silly brains, I'm sleepy!", "oopsie, I dropped my tooth!"],
    runner: ["zoom zoom, sleepy time!", "catch me, I'm naptastic!", "wheee, my sheets are swishy!"],
    brute: ["I'm big and need a nap!", "grr… means hug in zombie!", "my tummy is full of candy corn!"],
    ghost: ["boo! …that was my nap alarm!", "I'm a floaty sleepy ghost!", "peekaboo, bedtime soon!"],
    boss: ["I AM the naptime boss! snooze, puny reader!", "bow before my jammies!", "my crown is a pillow, behold!"],
  },
  teen: {
    walker: ["damn horde, I'm moaning!", "brains… must have brains!", "rot and ruin, let's go!"],
    runner: ["damn, I'm fast and you're slow!", "eat my graveyard dust, typist!", "starved and sprinting, damn!"],
    brute: ["damn brute! try typing through THIS!", "graveyard thunder incoming!", "you call that holy words? cute."],
    ghost: ["damn fog! you can't hit fog!", "boo from the haunted crypt!", "lost souls never rest!"],
    boss: ["damn horde! I OWN this graveyard!", "five waves and you still type like that?", "bow to the zombie lord, kiddo!"],
  },
  all: {
    walker: ["fuck you, living!", "brains, motherfucker — BRAINS!", "I died moaning and I'll kill moaning!"],
    runner: ["fuck your barricade, I'm already inside!", "too slow, shit-for-brains typist!", "eat shit and rot!"],
    brute: ["fucking rotten APEX, bitch!", "I'll shove your holy words down your throat!", "damn the living — full fuck-mode!"],
    ghost: ["fuck the living, haunt the graveyard!", "you can't banish what's already damned!", "hell's horde never rests, asshole!"],
    boss: ["FUCK THE LIVING! I AM THE ZOMBIE LORD!", "five waves deep, you shit-stain survivor!", "your blood is just graveyard wine to me, fucker!"],
  },
};

/** Random taunt for a mode (+ optional unit kind). Pure — safe for SSR. */
export function getTaunt(mode: LwzContentMode, unit: LwzUnitKind = "walker"): string {
  const m = normalizeLwzMode(mode);
  const table = LWZ_TAUNTS[m] ?? LWZ_TAUNTS.all;
  const lines = table[unit] ?? table.walker;
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Per-unit line alias (same table, unit-first signature for call sites that
 *  think in units rather than modes). */
export function unitLine(unit: LwzUnitKind, mode: LwzContentMode): string {
  return getTaunt(mode, unit);
}

/* ------------------------------------------------------------------ */
/* Dictionary filtering                                                */
/*                                                                     */
/* dictionary.js ships ~1266 cursed-word list words (no profanity in the */
/* source — the "hard" words for kid mode are the long/abstract/        */
/* violent ones like "annihilation", "gun", "die", "malware"). Kid mode */
/* swaps the whole list for short animal/color words at runtime via the */
/* patch hook below; teen/all play the bundle list untouched.           */
/* ------------------------------------------------------------------ */

/** Kid-safe replacement vocabulary: animals + colors + spooky-cute zombie words, all <= 6 chars. */
export const kidWordList: string[] = [
  "cat", "dog", "fox", "owl", "bear", "frog", "duck", "fish",
  "lion", "tiger", "zebra", "panda", "koala", "mouse", "bunny", "puppy",
  "kitty", "sheep", "horse", "whale", "shark", "eagle", "snake", "lizard",
  "red", "blue", "green", "pink", "purple", "yellow", "orange", "teal",
  "apple", "berry", "grape", "lemon", "melon", "peach", "mango", "plum",
  "star", "moon", "cloud", "rain", "sunny", "snowy", "breeze", "comet",
  "ghost", "crypt", "bubble", "candy", "cuddle", "giggle", "jammie", "nap",
];

/** Cursed words kid mode refuses even if they slip into a custom list. Logic unchanged — same blocked set. */
const KID_BLOCKED = new Set([
  "die", "gun", "kill", "blood", "murder", "weapon", "hell", "damn",
  "annihilation", "apocalyptic", "biohazard", "malware", "catastrophic",
]);

/**
 * Pure gating function for the bundle dictionary (same-realm runtime
 * application lives in gore-lastwordszombies.js, mirroring this logic).
 * - kid  -> kidWordList (plus any incoming word that is short, lowercase,
 *           alphabetic and not blocked — so custom/expansion words survive).
 * - teen/all -> words unchanged (same reference, zero cost).
 */
export function filterWords(words: string[], mode: LwzContentMode): string[] {
  if (normalizeLwzMode(mode) !== "kid") return words;
  const kept = (Array.isArray(words) ? words : []).filter(
    (w) =>
      typeof w === "string" &&
      w.length > 0 &&
      w.length <= 5 &&
      /^[a-z]+$/.test(w) &&
      !KID_BLOCKED.has(w.toLowerCase()),
  );
  const merged = new Set<string>([...kidWordList, ...kept.map((w) => w.toLowerCase())]);
  return [...merged];
}

/* ------------------------------------------------------------------ */
/* Camp store: tonic vs lantern oil                                     */
/*                                                                     */
/* "Zombie Bane Tonic" is a drug-like consumable: all-mode only.       */
/* Teen/kid get "Extra Lantern Oil" — same price, same mechanical      */
/* slot, no tonic lore anywhere in the name/description.               */
/* ------------------------------------------------------------------ */

export const LWZ_STIM_PRICE = 150;

export interface LwzStoreItem {
  id: string;
  name: string;
  price: number;
  blurb: string;
  consumable: boolean;
}

export const LWZ_STIM_ITEM: LwzStoreItem = {
  id: "adrenal-stims",
  name: "Zombie Bane Tonic",
  price: LWZ_STIM_PRICE,
  blurb: "Blessed zombie-bane tonic. Steady your holy words for one wave — the horde hates the taste.",
  consumable: true,
};

export const LWZ_BATTERY_ITEM: LwzStoreItem = {
  id: "extra-batteries",
  name: "Extra Lantern Oil",
  price: LWZ_STIM_PRICE,
  blurb: "Extra lantern oil. Keep your camp lantern burning for one more wave. Sleepy zombies rest easier in warm light!",
  consumable: true,
};

export interface StimStatus {
  mode: LwzContentMode;
  /** True ONLY in "all" — tonic never appears for teen/kid. */
  stimsAllowed: boolean;
  /** The item the store should list for this mode. */
  item: LwzStoreItem;
}

/** Store gating: tonic only in "all" (delegates to the shared drug gate); everyone else gets lantern oil. */
export function stimStatus(mode: LwzContentMode): StimStatus {
  const m = normalizeLwzMode(mode);
  const stimsAllowed = isDrugContentAllowed(m);
  return {
    mode: m,
    stimsAllowed,
    item: stimsAllowed ? LWZ_STIM_ITEM : LWZ_BATTERY_ITEM,
  };
}

/* ------------------------------------------------------------------ */
/* Terminal story intros / lore per mode                               */
/* ------------------------------------------------------------------ */

export interface LwzModeCopy {
  menuTitle: string;
  intro: string;
  breach: string;
  gameOver: string;
  reboot: string;
}

export const LWZ_MODE_COPY: Record<LwzContentMode, LwzModeCopy> = {
  kid: {
    menuTitle: "Friendly Zombie Roundup",
    intro:
      "Oh no — the little zombies stayed up WAY past bedtime and got all wobbly! " +
      "Type their sleepy words to tuck each one into a cozy crypt nap. Every banished buddy dreams in candy!",
    breach:
      "Oopsie! A sleepy zombie toddled past the barricade… it's just taking a nap by the graveyard gate. No worries!",
    gameOver:
      "Naptime overflow! The zombies are ALL asleep now — even the graveyard is snoring. Sweet dreams, typist!",
    reboot: "WAKE UP, SLEEPYHEADS!",
  },
  teen: {
    menuTitle: "Graveyard Lockdown",
    intro:
      "The rotting horde is loose in the graveyard, and the camp is counting on YOU. " +
      "Banish walkers, runners, brutes, ghosts and the zombie lord before they breach the barricade — chain combos, spend powerups, chase WPM glory. " +
      "Damn horde, this is gonna be loud!",
    breach:
      "Breach! A zombie slipped the barricade and slammed the gate. Camp integrity dropping — type faster!",
    gameOver:
      "Camp breached. The lanterns go dark and the horde shambles into the fog. Relight and take it back!",
    reboot: "REBOOT SYSTEM",
  },
  all: {
    menuTitle: "Last Words Zombies",
    intro:
      "The camp is bleeding out. Something dead crawled out of the graveyard and it is FUCKING hungry — " +
      "runners that outrun thought, brutes built from rotting corpses, ghosts wearing your friends' voices, " +
      "and every fifth wave a zombie lord that remembers being human. Speak the holy words or die in the breach. Fuck mercy — type.",
    breach:
      "BREACH! A zombie tears through the barricade and gorges on the gate. Blood on the gravestones. Hold the fucking line!",
    gameOver:
      "CAMP BREACHED. The lanterns flatline, the graveyard goes black, and the dead inherit the rot. " +
      "Your last words are already typos. Fuck.",
    reboot: "REBOOT SYSTEM",
  },
};

export const LWZ_SLUG = "lastwordszombies" as const;
