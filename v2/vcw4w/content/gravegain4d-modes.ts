/**
 * GraveGain4D content-mode copy (slug: gravegain4d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
 * owns per-game data modules (see content/games.ts, content/game-manifests.ts)
 * while `lib/` owns engine-agnostic utilities. `GG4DContentMode` is a re-alias
 * of the shared `ContentMode` type — the string union ("kid" | "teen" | "all")
 * is kept identical to GG3D on purpose so the swap is mechanical.
 *
 * Canon grounding: the five canon speakers mirror GG3D —
 * President Angel Good (botanist-turned-president, runs the LuckyStarShip
 * hub/botany deck), Echo of Elder Mirathiel (elven seer), Warchief Groknak
 * (orc ally), Ember Cartographer Sable, Ossuary Twins Pell & Marrow —
 * plus one 4D guide original to this module: Fold Cartographer Vex, who reads
 * the W-slice folds and timelines. Same tier contract as GG3D: kid = cozy
 * (no swears, no gore words), teen = gritty but clean (mild swears only —
 * damn/hell at most), all = profane (hard swears, 18+). 4D flavor =
 * folding/time-travel (W-slice folds, rewinds, ghost echoes, parallel selves).
 *
 * BACK-COMPAT: the `G4D_*` exports below are legacy aliases kept for the
 * gravegain4d golf-bundle verifier (G4D_HOLES table) and earlier readers.
 * New code should use the `GG4D_*` names.
 */

import type { ContentMode } from "@/lib/content-modes";

export type GG4DContentMode = ContentMode;

export const GG4D_CONTENT_MODES: readonly GG4DContentMode[] = ["kid", "teen", "all"];

export type GG4DNpcId =
  | "hub-keeper"
  | "dungeon-ghost"
  | "orc-ally"
  | "ember-cartographer"
  | "ossuary-twins"
  | "fold-guide";

export const GG4D_NPCS: Record<GG4DNpcId, { speaker: string; portrait: string }> = {
  "hub-keeper": { speaker: "President Angel Good", portrait: "🌿" },
  "dungeon-ghost": { speaker: "Echo of Elder Mirathiel", portrait: "👻" },
  "orc-ally": { speaker: "Warchief Groknak", portrait: "👹" },
  "ember-cartographer": { speaker: "Ember Cartographer Sable", portrait: "🗺️" },
  "ossuary-twins": { speaker: "Ossuary Twins, Pell & Marrow", portrait: "💀" },
  "fold-guide": { speaker: "Fold Cartographer Vex", portrait: "🌀" },
};

/** Bark variants per NPC per content mode. `all` is the only profane tier. */
export const GG4D_DIALOGUE: Record<GG4DNpcId, Record<GG4DContentMode, string[]>> = {
  "hub-keeper": {
    kid: [
      "Welcome back to the LuckyStarShip, little star-sailor! The lantern plants missed you. Want to help me water them before your next fold?",
      "The sleepy skeletons downstairs just need a cozy nap. You tiptoe past, I tuck them in — teamwork, in every timeline!",
      "I was a gardener before I was president. Everything grows better with a song — even a wibbly fourth-direction one!",
    ],
    teen: [
      "Hub's holding, but barely. The folds keep doubling the corridors — gear up and watch your ghost echo before you drop.",
      "I signed burial honors with one hand and a fold-chart with the other. One bad rewind and we bury the same crew twice.",
      "Keep your helmet sealed when the W-slice turns. MoonRock air doesn't give second chances, and neither do folded timelines.",
    ],
    all: [
      "Fuck Hades and his Array. He turned my botany vats into poison and my funeral detail into a war across four timelines — so now we bury him in every one.",
      "Two hundred years of politics and the thing that finally works is a shotgun and a shovel. Shit luck, good tools, endless folds.",
      "The Compact holds because I bled into the cup first. Anyone who deserts answers to me, and I'm done being polite about it.",
    ],
  },
  "dungeon-ghost": {
    kid: [
      "OooOOoo... don't be scared, I'm just a glowy gardener ghost! The folded roots tickle when you walk soft — follow my hum!",
      "The forest hums when brave friends visit, in this timeline and the next. Hum with me? Hmm-hmm-hmm...",
      "Shhh... the grumpy bones are napping past the fold. Let's float past on tippy-toes!",
    ],
    teen: [
      "I felt the fourth direction tear the night the Array woke. Every root screamed at once, in every timeline. Don't let it happen again.",
      "The dead down here were my people once. Strike clean — leave them something worth remembering in this fold.",
      "The Mother Tree still marks your steps, past and future both. Walk like you mean to come back.",
    ],
    all: [
      "Damn the man who made echoes of us. I watched my own daughters rise with red eyes in three timelines at once — so put us down hard and don't you dare miss.",
      "Hell is just a grave that won't stay shut, soldier, folded or not. Close ours. Close all of them.",
      "The roots drank ancestor-blood for twelve thousand years and Hades spent it in one night. Fuck his cure — end him.",
    ],
  },
  "orc-ally": {
    kid: [
      "HA! Little human has BIG stomps! You, me, best stomp team — we stomp the fold flat! STOMP STOMP!",
      "Groknak share snack-rock with you between timelines! (It is cracker. Do not worry. Mostly cracker.)",
      "You brave like tiny Grok-Legs! We best friends now, in every future! No take-backs!",
    ],
    teen: [
      "Risen orcs ahead — my own blood, wrong eyes, wrong timeline. Give my Rage room and aim for the joints.",
      "You held the gate like a warrior last run, and your echo held it in the next fold. Today we hold every version.",
      "Regeneration can't fix a shattered skull-pile, folded or whole. Burn what falls. No mercy, no mistakes.",
    ],
    all: [
      "Fuck sitting down! Orcs do not die sitting down — WE KILL STANDING UP, IN EVERY TIMELINE! GRAAAH!",
      "Thirty skulls at my gates and a coward hiding below the fold. Shit odds. GOOD odds. TO WAR!",
      "You hit like an orc today, small human! Now scream with me or get the hell out of my way!",
    ],
  },
  "ember-cartographer": {
    kid: [
      "Hello, little pathfinder! I draw every twisty tunnel in berry-ink so no explorer ever feels lost, even when the fold moves the walls. Want to stamp your star on my map?",
      "My lantern burns on sparkleaf tea-light leaves — sniff that minty Mint Herb smell! Cozy glows mark the safe way home, whichever timeline we're in.",
    ],
    teen: [
      "The endless floors shift when you blink, and the fold doubles every dead end. Mark your exits in chalk — this dungeon redraws itself around the careless.",
      "I have mapped forty descents and two folded timelines, and lost two crews to collapses. Stay on my ink line and keep your lamp lit.",
    ],
    all: [
      "I charted the endless dark in the blood of my own crew — fuck me, but every dead end down here cost a life to learn, and the fold charged double.",
      "Hell keeps refolding the map to bury us deeper. Drink up, mark the bones, and carve our way out through the dead.",
    ],
  },
  "ossuary-twins": {
    kid: [
      "We are Pell and Marrow! We stack the sleepy bones into cozy castles so the tunnels stay tidy, in this fold and the next. Come build with us — gentle hands!",
      "Shhh, the bone-piles are napping. We sip warm sparkleaf cocoa (minty Mint Herb!) and hum them lullabies till morning, past-Pell and future-Marrow too.",
    ],
    teen: [
      "Everyone the dungeon takes ends up in our walls, folded or not. Learn the pile-marks or join them — your choice, delver.",
      "We were buried together and woke together, in every timeline that matters. Stick close, count your steps, and never follow the whispering cracks.",
    ],
    all: [
      "Pell counts the skulls, Marrow names them — shit work, but the endless dark keeps feeding our beautiful wall.",
      "We died stacked like cordwood and rose holding hands. Damn the Array that made us; we keep the new dead company now.",
    ],
  },
  "fold-guide": {
    kid: [
      "Hiya! I'm Vex, the Fold Cartographer! See how the hallway bends funny? That's the fourth direction saying hello. Hold my ribbon and we'll hop across together — wheee!",
      "Oops, that was your echo waving back! Echoes are just you from a breath ago. Wave nicely and share your sparkleaf cookie with them.",
    ],
    teen: [
      "The W-slice is drifting — your ghost echo shows where this fold goes if you commit. Read it before you move; the dungeon punishes the careless.",
      "One rewind per descent, that's the budget. Spend it late, when the fold turns against you, not on the first stumble.",
    ],
    all: [
      "I've mapped folds in the blood of crews who spent their rewind early — fuck me, every shortcut down here cost a life to learn.",
      "The Array doesn't just raise the dead, it refolds them. Burn the echo, break the loop, and carve us a timeline where we walk out.",
    ],
  },
};

export function getGG4DDialogue(npc: GG4DNpcId, mode: GG4DContentMode): string[] {
  return GG4D_DIALOGUE[npc]?.[mode] ?? [];
}

/* ------------------------------------------------------------------ */
/* Back-compat G4D_* aliases (golf-bundle readers + verifier).          */
/* ------------------------------------------------------------------ */

export type G4DContentMode = ContentMode;

export const G4D_CONTENT_MODES: readonly G4DContentMode[] = ["kid", "teen", "all"];

export type G4DNpcId = Exclude<GG4DNpcId, "fold-guide">;

export const G4D_NPCS: Record<G4DNpcId, { speaker: string; portrait: string }> = {
  "hub-keeper": GG4D_NPCS["hub-keeper"],
  "dungeon-ghost": GG4D_NPCS["dungeon-ghost"],
  "orc-ally": GG4D_NPCS["orc-ally"],
  "ember-cartographer": GG4D_NPCS["ember-cartographer"],
  "ossuary-twins": GG4D_NPCS["ossuary-twins"],
};

export const G4D_DIALOGUE: Record<G4DNpcId, Record<G4DContentMode, string[]>> = {
  "hub-keeper": GG4D_DIALOGUE["hub-keeper"],
  "dungeon-ghost": GG4D_DIALOGUE["dungeon-ghost"],
  "orc-ally": GG4D_DIALOGUE["orc-ally"],
  "ember-cartographer": GG4D_DIALOGUE["ember-cartographer"],
  "ossuary-twins": GG4D_DIALOGUE["ossuary-twins"],
};

export function getDialogue(npc: G4DNpcId, mode: G4DContentMode): string[] {
  return G4D_DIALOGUE[npc]?.[mode] ?? [];
}

/* ------------------------------------------------------------------ */
/* G4D_HOLES: 10 holes x shared-mission mapping. missionId/title/      */
/* dungeonTheme mirror gravegain_shared_missions.js 1:1; par is the   */
/* 4D-golf stroke budget per hole (front nine gentle, back nine grim). */
/* ------------------------------------------------------------------ */

export type G4DHole = {
  hole: number;
  missionId: number;
  title: string;
  dungeonTheme: string;
  par: number;
};

export const G4D_HOLES: readonly G4DHole[] = [
  { hole: 1, missionId: 1, title: "Mission 1: LZ Crash Site Defense", dungeonTheme: "metallic_ship", par: 3 },
  { hole: 2, missionId: 2, title: "Mission 2: Cleansing the Elven Groves", dungeonTheme: "elven_grove", par: 4 },
  { hole: 3, missionId: 3, title: "Mission 3: Deep In The Dwarven Vaults", dungeonTheme: "dwarven_vault", par: 4 },
  { hole: 4, missionId: 4, title: "Mission 4: Orc Nomad Outpost Siege", dungeonTheme: "orc_wastes", par: 5 },
  { hole: 5, missionId: 5, title: "Mission 5: Signal in the Shallows", dungeonTheme: "metallic_ship", par: 4 },
  { hole: 6, missionId: 6, title: "Mission 6: The Alchemical Catacombs", dungeonTheme: "toxic_catacombs", par: 3 },
  { hole: 7, missionId: 7, title: "Mission 7: The Tomb of Clint Oldman", dungeonTheme: "stone_crypt", par: 4 },
  { hole: 8, missionId: 8, title: "Mission 8: Orbital Strike Calibration", dungeonTheme: "dwarven_vault", par: 5 },
  { hole: 9, missionId: 9, title: "Mission 9: Gate of the NecroGenesis", dungeonTheme: "citadel_darkness", par: 5 },
  { hole: 10, missionId: 10, title: "Mission 10: Lucifer's Shadow", dungeonTheme: "citadel_darkness", par: 5 },
];

export function getHole(hole: number): G4DHole | null {
  return G4D_HOLES.find((h) => h.hole === hole) ?? null;
}

export function getHoleByMission(missionId: number): G4DHole | null {
  return G4D_HOLES.find((h) => h.missionId === missionId) ?? null;
}
