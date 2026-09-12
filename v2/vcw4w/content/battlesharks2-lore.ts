// Battlesharks 2 lore bible (slug: battlesharks2).
//
// LOCATION NOTE: picked content/battlesharks2-lore.ts over lib/ because
// content/ already owns the game catalog (games.ts, game-manifests.ts) and
// the per-game mode tables (gravegain2d-modes.ts, ...). This is the v2-layer
// home for LORE + WORLD copy: facility history, scientist logs, zone guide,
// bestiary, and timeline. The game bundle itself
// (public/games/html/battlesharks2/**) is parity-locked and is never the
// source of this copy — every entry below is sourced from the bundle's own
// readable surfaces (game.json, game_meta.json, index.html story block +
// HUD/Lab labels) without editing them.
//
// RATING: Teens (see lib/age-gate.ts GAME_RATINGS). Family-safe copy only;
// "Adults" on this site means intense violence/horror themes and nothing else.
// Profanity ceiling here is damn/hell — anything stronger would fail
// scripts/verify-battlesharks2.mjs.
//
// RUNTIME: the v2-native overlay public/games/html/battlesharks2-lore.js reads
// window.BS2_LORE when the host provides it, else falls back to a built-in
// copy with matching ids. The shell may adopt BS2_CATALOG_BLURB as the
// games.ts description; games.ts itself is left untouched by this module.

export type Bs2Log = {
  /** Stable v2 key, e.g. "osei-why-we-built-the-tanks". */
  id: string;
  author: string;
  role: string;
  title: string;
  /** In-world date stamp. */
  date: string;
  /** One text, kid-safe clarity + teen flavor. Profanity ceiling: damn/hell. */
  text: string;
};

export type Bs2Zone = {
  /** Stable v2 key, e.g. "launch-bay". */
  id: string;
  name: string;
  icon: string;
  description: string;
  tip: string;
};

export type Bs2BestiaryEntry = {
  /** Stable v2 key, e.g. "robo-kraken". */
  id: string;
  name: string;
  icon: string;
  kind: "prey" | "hazard" | "hunter" | "boss" | "fixture";
  behavior: string;
  counter: string;
};

export type Bs2TimelineEvent = {
  era: string;
  text: string;
};

export const BS2_LOGS: Bs2Log[] = [
  {
    id: "osei-why-we-built-the-tanks",
    author: "Dr. Amara Osei",
    role: "Founder, Lead Geneticist",
    title: "Why we built the tanks",
    date: "BS-07 Day 001",
    text: "They call this place an aquarium. It is not. It is an ark. When the poacher subs and the minefields finished the outer reef, the Meridian Marine Institute gave me one decommissioned testing complex, a freezer of reef-shark embryos, and a warehouse of military-surplus cybernetics nobody else wanted. So we grew guardians: cloned reef sharks, Pup-small at first, grafted with hardware so they could survive water that kills everything else. Eat. Grow. Clean the reef. That was the deal. If you are reading this from inside a tank, little Hunter, the deal still holds — the reef needs you more than ever, and the things we bolted onto you are the only reason you are still swimming.",
  },
  {
    id: "vega-laser-rig",
    author: 'Tomas "Rusty" Vega',
    role: "Chief Engineer, Cybernetics Wing",
    title: "About the laser rig (read before you fire it)",
    date: "BS-07 Day 214",
    text: "The laser was a mining cutter before it was a shark fin. Damn thing runs hot, drinks cyber-debris like water, and kicks like a mule — which is exactly why we bolted it to the fastest animal in the complex. Rules: never fire it dry, never chase a hunter sub head-on, and if the plasma shield is up you are already in deeper water than you planned. The jet thruster is not a toy either. It is an escape hatch with flames. Point it AWAY from the problem, count to one, and be somewhere else. The sharks that treat the dash like a weapon end up as debris. The ones that treat it like a door live to Pup another day. Well. Hunter another day. You know what I mean.",
  },
  {
    id: "park-coral-and-clownfish",
    author: "Junie Park",
    role: "Intern, Reef Restoration",
    title: "The coral + clownfish trick",
    date: "BS-07 Day 309",
    text: "Hi! I am the intern, I feed everybody, and I have the BEST job because the clownfish are basically puppies that live in glowing coral. Here is the trick the scientists figured out: if you deploy bioluminescent coral, it spawns edible clownfish, and eating them heals you AND gives biomass for growing bigger. So the loop is: snack, grow, snack, grow! The hydrothermal vents are the same idea but for grown-up stuff — park one, wait, and it burps up mutagen canisters you spend in the Lab. The mines do not heal you. The mines are not snacks. I learned that the loud way so you do not have to.",
  },
  {
    id: "harlow-kraken-warning",
    author: "D. Harlow",
    role: "Security Chief",
    title: "KRAKEN CONTAINMENT WARNING",
    date: "BS-07 Day 402",
    text: "The Robo-Kraken was our security system. Past tense. Something in the mutagen runoff got into its command core down in the Testing Bay, and now BS-BOSS treats every shark in the water as an intruder — including ours. It is all armor and tentacles and bad decisions, and it hits like hell when it connects. You do NOT fight it small. You eat, you upgrade, you come back a Hunter with missiles and a full shield, and you never stop moving. When it goes down, the whole complex stands down with it. Clear the Kraken, clear the aquarium. That is the mission now. Good hunting.",
  },
];

export const BS2_ZONES: Bs2Zone[] = [
  {
    id: "launch-bay",
    name: "Launch Bay",
    icon: "🚀",
    description:
      "Where every run begins: the clone crèche under the BS-07 R&D COMMAND sign. Your shark launches here as a LVL 1 Pup — small, quick, unarmed, and hungry. The bay water is safe; nothing here can hurt you. It is the last safe water you will see for a while.",
    tip: "Swim out and eat the nearest small fish first — early meals heal you and bank the first biomass toward Hunter size.",
  },
  {
    id: "testing-bay",
    name: "Testing Bay",
    icon: "🧪",
    description:
      "The main proving tank: open water laced with naval mines, patrolling hunter subs, drifting depth charges, and crackling security grids. Coral glows where interns seeded it, vents puff mutagen in the deep corners, and cyber-debris glints wherever old hardware sank. Everything here is either food, salvage, or trying to kill you.",
    tip: "Circle the edges, not the middle: sweep coral for clownfish, grab debris between patrols, and open the Lab Hub (E) between fights — never mid-swarm.",
  },
  {
    id: "kraken-arena",
    name: "Robo-Kraken Arena",
    icon: "🐙",
    description:
      "The flooded security core at the bottom of the Testing Bay. When the warning flashes — CRITICAL THREAT DETECTED — the ROBO-KRAKEN BS-BOSS rises here with its own health bar. Destroying it clears the aquarium complex and pays a bounty of mutagens. Nothing else in BS-07 hits this hard.",
    tip: "Come back a Hunter with missiles and plasma shielding, keep moving so the tentacles cannot bracket you, and dash OUT of trouble, never through it.",
  },
];

export const BS2_BESTIARY: Bs2BestiaryEntry[] = [
  {
    id: "clownfish-fry",
    name: "Clownfish Fry",
    icon: "🐠",
    kind: "prey",
    behavior:
      "Small, bright, harmless. Schools drift near bioluminescent coral, which spawns them steadily. They never fight back — they are the bottom of the food chain and they know it.",
    counter:
      "Eat them. Every fry heals you and drops biomass for growth, so graze coral lines early and often — a full belly is your first upgrade.",
  },
  {
    id: "hunter-sub",
    name: "Military Hunter Sub",
    icon: "🚤",
    kind: "hunter",
    behavior:
      "Crewed poacher-test subs running live patrol patterns through the Testing Bay. They chase, they shoot, and they herd you toward mines and grids. Faster than a Pup, slower than a jet dash.",
    counter:
      "Never fight them small or head-on. Outgrow them on clownfish, then engage with lasers or missiles — or jet-dash past and let them eat your wake.",
  },
  {
    id: "naval-mine",
    name: "Naval Mine",
    icon: "💣",
    kind: "hazard",
    behavior:
      "Anchored surplus ordnance: perfectly still, perfectly patient, 35 damage when touched. Clusters guard debris fields and vent corners because the complex knows you get greedy.",
    counter:
      "Eat AROUND mines, never through them. Lure chasers into the field and let greed punish them instead — mines cannot tell a hunter from a shark.",
  },
  {
    id: "depth-charge",
    name: "Depth Charge",
    icon: "🧨",
    kind: "hazard",
    behavior:
      "Dropped from above by patrol craft, these sink through the water column and detonate in your neighborhood. Less predictable than mines: the danger zone moves.",
    counter:
      "Watch the surface shimmer and keep lateral speed up. A drifting shark is a target; a strafing shark is a rumor.",
  },
  {
    id: "security-grid",
    name: "Security Grid",
    icon: "⚡",
    kind: "hazard",
    behavior:
      "Electrified barrier segments left over from the old containment scheme. They do not move, but they hum, they sting, and they always sit exactly where the shortest path goes.",
    counter:
      "Take the long way with a plasma shield up, or jet-dash the gap in one commit. Half-measures get zapped; full commits get through.",
  },
  {
    id: "mutagen-vent",
    name: "Hydrothermal Vent",
    icon: "🌋",
    kind: "fixture",
    behavior:
      "Volcanic fissures — natural ones in the deep corners, deployable ones from the Lab. On a slow timer they puff out raw mutagen canisters, the rarest currency in BS-07.",
    counter:
      "Deploy a vent early (30 biomass + 15 debris) and defend its corner: every canister is a future laser, shield, or thruster. Patience pays in mutagens.",
  },
  {
    id: "robo-kraken",
    name: "Robo-Kraken BS-BOSS",
    icon: "🐙",
    kind: "boss",
    behavior:
      "The complex's rogue security core: armor-plated, tentacled, and convinced every shark is an intruder. Enters the Testing Bay under a critical-threat alert with its own boss bar, and ends runs that arrive undergrown or standing still.",
    counter:
      "Arrive a Hunter with missiles, a full plasma shield, and full health. Circle-strafe the tentacles, fire on the move, dash away from grabs — and finish it to clear the complex for a mutagen bounty.",
  },
];

export const BS2_TIMELINE: Bs2TimelineEvent[] = [
  { era: "Year 0 — The Dead Reef", text: "Poacher subs and drift minefields finish the outer reef. The Meridian Marine Institute inherits the decommissioned BS-07 test tanks." },
  { era: "Day 001 — The Ark Opens", text: "Dr. Osei thaws the first reef-shark embryos and signs the guardian deal: eat, grow, clean the reef." },
  { era: "Day 214 — The Rig Works", text: "Chief Vega's first laser graft holds. The jet thruster stops exploding sharks and starts saving them." },
  { era: "Day 309 — Snack Science", text: "Intern Park proves seeded coral + clownfish is a self-sustaining food loop. Pup survival rates triple." },
  { era: "Day 402 — The Breach", text: "Mutagen runoff reaches the security core. The Robo-Kraken reclassifies every shark as an intruder." },
  { era: "Today — Your Run", text: "You launch as the latest clone: a LVL 1 Pup with the whole complex ahead of you. Clear the Kraken, clear the aquarium." },
];

export const BS2_FACILITY = {
  name: "BS-07 Aquarium Complex",
  operator: "BS-07 R&D Command",
  foundedBy: "Dr. Amara Osei for the Meridian Marine Institute",
  history:
    "The BS-07 Aquarium Complex began as a decommissioned military testing tank, gifted to the Meridian Marine Institute after poacher subs and minefields destroyed the outer reef. Founder Dr. Amara Osei turned it into an ark: cloned reef sharks, raised from Pups, grafted with surplus military cybernetics so they could survive the proving water. The sharks eat clownfish to heal and grow, harvest cyber-debris and raw mutagens, and spend both in the R&D Lab Hub on lasers, plasma shields, jet thrusters, and toxic spikes. The program worked — until mutagen runoff corrupted the security core and the Robo-Kraken decided every shark was an intruder. Now each cloned run must grow from Pup to Hunter and destroy the Kraken to clear the complex.",
} as const;

/** Proposed catalog copy for the v2 shell. games.ts description stays as-is;
 *  adopt this text there only if the shell owner agrees. */
export const BS2_CATALOG_BLURB =
  "Grow from Pup to Hunter in the BS-07 Aquarium Complex: graze clownfish, harvest cyber-debris, splice mutagens into lasers and jet thrusters, and destroy the Robo-Kraken. 🦈";

export const BS2_LORE = {
  slug: "battlesharks2",
  facility: BS2_FACILITY,
  logs: BS2_LOGS,
  zones: BS2_ZONES,
  bestiary: BS2_BESTIARY,
  timeline: BS2_TIMELINE,
} as const;

export type Bs2Lore = typeof BS2_LORE;

/** Find a bestiary entry by id. Returns undefined for unknown ids. */
export function getBestiary(id: string): Bs2BestiaryEntry | undefined {
  return BS2_BESTIARY.find((entry) => entry.id === id);
}

/** Find a scientist log by id. Returns undefined for unknown ids. */
export function getLog(id: string): Bs2Log | undefined {
  return BS2_LOGS.find((log) => log.id === id);
}
