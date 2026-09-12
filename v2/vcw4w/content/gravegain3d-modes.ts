/**
 * GraveGain3D content-mode copy (slug: gravegain3d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
 * owns per-game data modules (see content/games.ts, content/game-manifests.ts)
 * while `lib/` owns engine-agnostic utilities. When the sibling agent lands
 * the shared `lib/content-modes.ts`, the `GG3DContentMode` type below should
 * be re-aliased to that shared `ContentMode` type — the string union
 * ("kid" | "teen" | "all") is kept identical on purpose so the swap is
 * mechanical. The runtime counterpart is
 * public/games/html/gore-gravegain3d.js (same mode contract).
 *
 * Canon grounding: speakers/places come from the shipped game —
 * President Angel Good (botanist-turned-president, runs the LuckyStarShip
 * hub/botany deck), Elder Mirathiel (elven seer, quoted in lore.js
 * "necro_red_eyes"), Warchief Groknak (orc ally, campaign m04/m08/m09).
 */

import type { ContentMode } from "@/lib/content-modes";

export type GG3DContentMode = ContentMode;

export const GG3D_CONTENT_MODES: readonly GG3DContentMode[] = ["kid", "teen", "all"];

export type GG3DNpcId = "hub-keeper" | "dungeon-ghost" | "orc-ally";

export const GG3D_NPCS: Record<GG3DNpcId, { speaker: string; portrait: string }> = {
  "hub-keeper": { speaker: "President Angel Good", portrait: "🌿" },
  "dungeon-ghost": { speaker: "Echo of Elder Mirathiel", portrait: "👻" },
  "orc-ally": { speaker: "Warchief Groknak", portrait: "👹" },
};

/** Bark variants per NPC per content mode. `all` is the only profane tier. */
export const GG3D_DIALOGUE: Record<GG3DNpcId, Record<GG3DContentMode, string[]>> = {
  "hub-keeper": {
    kid: [
      "Welcome back to the LuckyStarShip, little star-sailor! The lantern plants missed you. Want to help me water them?",
      "The sleepy skeletons downstairs just need a cozy nap. You tiptoe past, I tuck them in — teamwork!",
      "I was a gardener before I was president. Everything grows better with a song. Even you!",
    ],
    teen: [
      "Hub's holding, but barely. The dead don't sleep and the vents don't quit — gear up before you drop.",
      "I signed burial honors with one hand and a rifle requisition with the other. That's the job now.",
      "Keep your helmet sealed down there. MoonRock air doesn't give second chances.",
    ],
    all: [
      "Fuck Hades and his Array. He turned my botany vats into poison and my funeral detail into a war — so now we bury him.",
      "Two hundred years of politics and the thing that finally works is a shotgun and a shovel. Shit luck, good tools.",
      "The Compact holds because I bled into the cup first. Anyone who deserts answers to me, and I'm done being polite about it.",
    ],
  },
  "dungeon-ghost": {
    kid: [
      "OooOOoo... don't be scared, I'm just a glowy gardener ghost! The roots tickle when you walk soft.",
      "The forest hums when brave friends visit. Hum with me? Hmm-hmm-hmm...",
      "Shhh... the grumpy bones are napping. Let's float past on tippy-toes!",
    ],
    teen: [
      "I felt the field tear the night the Array woke. Every root screamed at once. Don't let it happen again.",
      "The dead down here were my people once. Strike clean — leave them something worth remembering.",
      "The Mother Tree still marks your steps. Walk like you mean to come back.",
    ],
    all: [
      "Damn the man who made echoes of us. I watched my own daughters rise with red eyes — so put us down hard and don't you dare miss.",
      "Hell is just a grave that won't stay shut, soldier. Close ours. Close all of them.",
      "The roots drank ancestor-blood for twelve thousand years and Hades spent it in one night. Fuck his cure — end him.",
    ],
  },
  "orc-ally": {
    kid: [
      "HA! Little human has BIG stomps! You, me, best stomp team! STOMP STOMP!",
      "Groknak share snack-rock with you! (It is cracker. Do not worry. Mostly cracker.)",
      "You brave like tiny Grok-Legs! We best friends now! No take-backs!",
    ],
    teen: [
      "Risen orcs ahead — my own blood, wrong eyes. Give my Rage room and aim for the joints.",
      "You held the gate like a warrior last run. Today we hold the whole damn floor.",
      "Regeneration can't fix a shattered skull-pile. Burn what falls. No mercy, no mistakes.",
    ],
    all: [
      "Fuck sitting down! Orcs do not die sitting down — WE KILL STANDING UP! GRAAAH!",
      "Thirty skulls at my gates and a coward hiding below. Shit odds. GOOD odds. TO WAR!",
      "You hit like an orc today, small human! Now scream with me or get the hell out of my way!",
    ],
  },
};

export function getDialogue(npc: GG3DNpcId, mode: GG3DContentMode): string[] {
  return GG3D_DIALOGUE[npc]?.[mode] ?? [];
}

/* ------------------------------------------------------------------ */
/* Lore overrides: 4 lore.js ids × kid cozy / teen tense-clean / all   */
/* dark (+ one extra grim line the verifier checks for).               */
/* ------------------------------------------------------------------ */

export const GG3D_LORE_OVERRIDE_IDS = [
  "world_first_grave",
  "goblin_brave_nix",
  "necro_survivor",
  "human_letter_home",
] as const;

export type GG3DLoreOverrideId = (typeof GG3D_LORE_OVERRIDE_IDS)[number];

export type GG3DLoreOverride = {
  id: GG3DLoreOverrideId;
  kid: string;
  teen: string;
  all: string;
  /** Extra grim line appended only in `all` mode. */
  allExtraGrim: string;
};

export const GG3D_LORE_OVERRIDES: readonly GG3DLoreOverride[] = [
  {
    id: "world_first_grave",
    kid: "JAMES WRIGHT — the first star-sailor to nap on MoonRock. The flowers here glow his favorite color, and the ship plays soft songs by his cozy stone so he never feels lonely.",
    teen: "JAMES WRIGHT, Colonist #4,721. First to breathe MoonRock air through a failed seal; first grave we ever dug. The stone still stands at Colony Alpha — a reminder that the air shows no mercy.",
    all: "JAMES WRIGHT, Colonist #4,721. Ninety seconds of burning lungs, then dirt. He rose on Day 7 with the rest and had to be put down by the same hands that buried him.",
    allExtraGrim: "His helmet visor still glows red in the memorial garden on quiet nights.",
  },
  {
    id: "goblin_brave_nix",
    kid: "Nix was the tiniest goblin with the biggest heart! When the grumpy bones came, Nix stood in front of all the little ones and said 'not today!' Every goblin kid still cheers Nix's name at bedtime.",
    teen: "Nix stood two-and-a-half feet tall against an eight-foot skeleton with a stick, then fists, then teeth. The stick broke. Nix didn't move. The children got out because one small goblin refused to step aside.",
    all: "Nix died under that skeleton — stick shattered, fists ruined, one tooth left in its ankle. Bravery bought the children ninety seconds and cost everything Nix had.",
    allExtraGrim: "The horde trampled the body flat, and the tribe buried the stain where Nix stood.",
  },
  {
    id: "necro_survivor",
    kid: "One sleepy night the ground got wiggly and all the napping skeletons woke up confused! The guards gave them warm blankets (made of flashlights) and showed them back to bed.",
    teen: "03:47 AM: the memorial garden moved. James Wright's suit climbed out with red eyes behind the visor, then the goblin graves erupted by the hundred. The guard learned in one magazine that stun settings don't work on the dead.",
    all: "The guard watched soil boil across the whole perimeter — suits clawing out of week-old graves, goblin skeletons spilling over each other in pieces that kept crawling. Stun rounds sparked off bone while the red eyes kept coming.",
    allExtraGrim: "The guard's rifle jammed on the eleventh round; the twelfth skeleton took the guard's throat.",
  },
  {
    id: "human_letter_home",
    kid: "Dear Mom! MoonRock is SO weird and SO fun! The trees glow like night-lights, my orc friend shares snacks, and a nice dwarf stood guard while I napped. I miss you, but I'm okay. Weird, but okay! Love, Lisa",
    teen: "Dear Mom — three days ago I was learning the jetpack; today I shoot skeletons beside a screaming orc while a dwarf holds the line over wounded I don't even know. A paladin I never met bled for me yesterday. We're holding. Love, Lisa",
    all: "Dear Mom — I killed a man I buried last week. He wore the same armor, same name tape, wrong eyes. A dwarf paladin stood over my body and took the wounds meant for me, and I never learned his name before the medics dragged me off.",
    allExtraGrim: "If this letter ever reached Earth, it would arrive to a woman 200 years dead — the only reader who can't be hurt by it.",
  },
];

export function getLoreOverride(id: string, mode: GG3DContentMode): string | null {
  const entry = GG3D_LORE_OVERRIDES.find((l) => l.id === id);
  if (!entry) return null;
  if (mode === "all") return `${entry.all}\n\n${entry.allExtraGrim}`;
  return entry[mode];
}

/* ------------------------------------------------------------------ */
/* Hub-planter drug spec. Dreamcap = growable + chewable buff,         */
/* `all`-mode only. Kid/teen get the inert glowcap lantern instead.    */
/* ------------------------------------------------------------------ */

export const GG3D_DREAMCAP_PLANT_ID = "dreamcap-mushrooms";
export const GG3D_GLOWCAP_PLANT_ID = "glowcap-lantern-plant";

export type GG3DDrugStatus = {
  plantId: string;
  plantName: string;
  growable: boolean;
  /** Whether the planted crop exposes a "use/chew" action. */
  usable: boolean;
  buff?: string;
  note: string;
};

export function drugStatus(mode: GG3DContentMode): GG3DDrugStatus {
  if (mode === "all") {
    return {
      plantId: GG3D_DREAMCAP_PLANT_ID,
      plantName: "Dreamcap mushrooms",
      growable: true,
      usable: true,
      buff: "Dreamcap chew: +25% melee damage for 60s, screen swims, hear the Song of Giantess. One chew per run.",
      note: "Grown in the LuckyStarShip Botany Station incubator; chewable only in all mode.",
    };
  }
  return {
    plantId: GG3D_GLOWCAP_PLANT_ID,
    plantName: "Glowcap lantern plant",
    growable: true,
    usable: false,
    note:
      mode === "kid"
        ? "A cozy night-light plant for your quarters. It glows, it hums, it does nothing else — and that's the point."
        : "A sterile lantern cultivar. Lights the hub, flavors nothing, does nothing. No use action.",
  };
}

/* ------------------------------------------------------------------ */
/* PlayGate picker copy.                                               */
/* ------------------------------------------------------------------ */

export const GG3D_MODE_COPY: Record<
  GG3DContentMode,
  { label: string; blurb: string; badge: string }
> = {
  kid: {
    label: "Kid — Star-Sailor",
    blurb: "Cozy barks, gentle sparkles instead of blood, sleepy skeletons, lantern plants. No gore, no swears.",
    badge: "🧸 Cozy",
  },
  teen: {
    label: "Teen — Colonial Marine",
    blurb: "Tense but clean. Stylized blood spray, real stakes, zero profanity, no drug use.",
    badge: "⚔️ Tense",
  },
  all: {
    label: "All — MoonRock Uncut",
    blurb: "Full gore, grim lore, swearing crew, and growable dreamcap mushrooms with a chewable buff. 18+.",
    badge: "💀 Uncut",
  },
};
