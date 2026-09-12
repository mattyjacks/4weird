// GraveGain2D content-mode tables (slug: gravegain2d).
//
// LOCATION NOTE: picked content/gravegain2d-modes.ts over lib/gore-gravegain2d.ts.
// content/ already owns the game catalog (games.ts, game-manifests.ts), so the
// per-game kid/teen/all dialogue, lore, and drug tables live next to the catalog.
// lib/ stays for shared infra (the sibling-owned lib/content-modes.ts contract).
//
// CONTRACT (shared infra: lib/content-modes.ts + public/games/html/content-mode-bridge.js,
// both present — verified this session):
//   - Mode type imported from "@/lib/content-modes" (ContentMode = kid|teen|all).
//   - Runtime reads window.FourweirdContentMode
//     { mode, goreEnabled, drugsAllowed } + "fourweird-content-mode" events;
//     gore visuals live in public/games/html/gore-gravegain2d.js.
//   - Storage key `4weird-content-mode:gravegain2d` matches
//     contentModeStorageKey("gravegain2d"); bridge default "teen" wins at load
//     via its dispatched event (gore engine converges through its listener).
//   - Source truth: bundle BotanySeeds (cannabis/mushroom/bloodrose, game.js),
//     lore ids (lore.js), mission speakers (campaign/m01.js). Bundle is
//     parity-locked; these tables are v2-layer overrides only.

import type { ContentMode } from "@/lib/content-modes";
//
// UI: do NOT edit components/games/play-gate.tsx (sibling owns it). Sibling
// should import GG2D_MODE_COPY from here for the PlayGate picker descriptions.

/** Local alias — identical to the shared ContentMode; kept nominal for GG2D tables. */
export type Gg2dContentMode = ContentMode;

/** NPC ids are stable v2 keys mapped to bundle mission speakers. */
export const GG2D_NPCS = ["valley-net", "lisa-park", "warchief-groknak"] as const;
export type Gg2dNpcId = (typeof GG2D_NPCS)[number];

export type Gg2dDialogueLine = {
  speaker: string;
  portrait: string;
  greeting: string;
  combatBark: string;
};

const DIALOGUE: Record<Gg2dNpcId, Record<Gg2dContentMode, Gg2dDialogueLine>> = {
  "valley-net": {
    kid: {
      speaker: "Valley Net",
      portrait: "🤖",
      greeting:
        "Hello, little star cadet! I am Valley Net, the ship's friendly helper robot. Stay close to your buddies and we will tidy up the dungeon together!",
      combatBark: "Whoopsie-daisy! Baddies incoming! Boop them gently with your spark-sword!",
    },
    teen: {
      speaker: "Valley Net",
      portrait: "🤖",
      greeting:
        "Dropship 420 is down in Sector Alpha. Hostiles converging on the crash site — keep your helmet sealed, that air will wreck your lungs.",
      combatBark: "Contact! Damn, they just keep coming — hold the line, cadet!",
    },
    all: {
      speaker: "Valley Net",
      portrait: "🤖",
      greeting:
        "Dropship 420 is down in Sector Alpha. Fifteen freshly-risen hostiles converging on the crash site. Fuck the odds — helmet seals LOCKED, weapons hot.",
      combatBark: "Fuck me, they're pouring out of the crater! Put every last one of those bastards back in the ground!",
    },
  },
  "lisa-park": {
    kid: {
      speaker: "Private Lisa Park",
      portrait: "🧑‍🚀",
      greeting:
        "Hiya! I am Lisa! I used to carry sleepy-time boxes for our friends, and now we are playing the big sweep-up game. Will you be on my team? Pretty please?",
      combatBark: "For our friends! Sweep and clear — boop boop, starting now!",
    },
    teen: {
      speaker: "Private Lisa Park",
      portrait: "🧑‍🚀",
      greeting:
        "I carried James Wright's coffin three days ago — the first grave we ever dug here. Now his visor glows red. We put our people back to rest, whatever it takes.",
      combatBark: "For James! Damn it, stay down this time — sweeping, starting now!",
    },
    all: {
      speaker: "Private Lisa Park",
      portrait: "🧑‍🚀",
      greeting:
        "I carried James Wright's coffin three days ago — the first fucking grave we ever dug here. Now his visor glows red. We put our people back to rest. All fifteen of them.",
      combatBark: "For James, you rotten fucks! Sweep and clear — I am sending every one of you back to hell!",
    },
  },
  "warchief-groknak": {
    kid: {
      speaker: "Warchief Groknak",
      portrait: "👹",
      greeting:
        "HA! Little cub! I am Groknak, the cuddliest warchief! My tummy rumbles for snacks, not for fights. Come give the big soft orc a high-five!",
      combatBark: "GRRR-WOOF! Groknak bonk the meanies with a pillow-hammer! BONK BONK!",
    },
    teen: {
      speaker: "Warchief Groknak",
      portrait: "👹",
      greeting:
        "Hah! Another whelp for the war band. I have split skulls from the Highlands to the Wastes — stick behind my shield and try not to die, little one.",
      combatBark: "Blood and thunder! Come on, you hell-damned corpses — GROKNAK IS HERE!",
    },
    all: {
      speaker: "Warchief Groknak",
      portrait: "👹",
      greeting:
        "Hah! Fresh meat. I bit my own hand clean through to seal the Compact, and I have eaten the fucking dead so they stay dead. Fight beside me or get out of my way.",
      combatBark: "Fuck the grave you crawled out of! GROKNAK WILL SHIT ON YOUR BONES — COME ON!",
    },
  },
};

export function getDialogue(npcId: Gg2dNpcId, mode: Gg2dContentMode): Gg2dDialogueLine {
  const npc = DIALOGUE[npcId];
  if (!npc) throw new Error(`Unknown GraveGain2D NPC: ${npcId}`);
  return npc[mode];
}

/** Lore ids picked from lore.js (verified present): the 4 darkest entries. */
export const GG2D_LORE_IDS = [
  "world_first_grave",
  "necro_report",
  "lucifer_manifesto",
  "orc_regeneration",
] as const;
export type Gg2dLoreId = (typeof GG2D_LORE_IDS)[number];

export type Gg2dLoreOverride = {
  title: string;
  /** Full replacement text, OR a coda when appendToOriginal is true. */
  content: string;
  /** all-mode: append content AFTER the original bundle text (extra grim sentence). */
  appendToOriginal: boolean;
};

/**
 * Returns the v2-layer lore text for a lore id + mode, or null when the
 * runtime should display the original bundle text unchanged.
 * kid: gentle/cozy retelling. teen: tense but clean. all: original dark text
 * plus one extra grim sentence (returned as an append coda).
 */
export function getLoreOverride(
  loreId: Gg2dLoreId,
  mode: Gg2dContentMode,
): Gg2dLoreOverride | null {
  if (mode === "kid") {
    switch (loreId) {
      case "world_first_grave":
        return {
          title: "The First Sleepy-Time Garden",
          content:
            "A long time ago, a kind explorer named James Wright felt very, very sleepy and lay down for a cozy nap under the purple sky. His friends planted a garden of glowy flowers over his nap spot so he would have sweet dreams. Whenever you see the flowers wiggle, that is just James saying hello in his sleep!",
          appendToOriginal: false,
        };
      case "necro_report":
        return {
          title: "Valley's Silly Mix-Up Report",
          content:
            "Oh no, there was a great big mix-up! Doctor Hades pressed the wrong big red button and all the sleepy skeletons woke up grumpy before naptime was over. Valley Net wrote a very serious report that says: no more pressing big red buttons without asking! Now all our friends work together to tuck every skeleton back into bed.",
          appendToOriginal: false,
        };
      case "lucifer_manifesto":
        return {
          title: "The Grumpy Doctor's Letter",
          content:
            "A grumpy doctor named Lucifer wrote a letter saying nobody understands his science project. The letter is full of big grown-up words, so the short version is: he made a big mess, he is NOT invited to snack time, and our heroes are cleaning it up with hugs, teamwork, and spark-swords.",
          appendToOriginal: false,
        };
      case "orc_regeneration":
        return {
          title: "How Orcs Share Snacks (and Hugs)",
          content:
            "Orcs are amazing at sharing! If an orc scrapes a knee, their body gives them a cozy bandage all by itself, and sometimes that bandage grows into a brand-new orc buddy who remembers all the same campfire songs! When orcs feel sleepy forever, the tribe throws a big yummy feast party to remember them.",
          appendToOriginal: false,
        };
    }
  }
  if (mode === "teen") {
    switch (loreId) {
      case "world_first_grave":
        return {
          title: "First Colonial Grave",
          content:
            "JAMES WRIGHT — Colonist #4,721. Died on Day 3 when his helmet seal failed, the first human to breathe MoonRock air. The colony buried him with honors. Days later, the grave was empty. Something down there does not let the dead rest, and the colony learned fast: the-teams guard their fallen now, day and night.",
          appendToOriginal: false,
        };
      case "necro_report":
        return {
          title: "NecroGenesis — Valley's Report (Redacted)",
          content:
            "CLASSIFIED — VALLEY NET INCIDENT REPORT. On Day 7, Dr. Hades activated the Necromatic Array and woke every corpse on the moon. First-hour casualties were catastrophic; the Elven Groves lost most of their people in a single night. The Array is still active. Every approach to the central hub has been repelled. (Casualty figures withheld — ask your commander.)",
          appendToOriginal: false,
        };
      case "lucifer_manifesto":
        return {
          title: "Manifesto of the New Dawn (Seized Copy)",
          content:
            "Dr. Lucifer Hades claims the NecroGenesis was a cure, not an attack — that every risen corpse is a person saved from oblivion. The colony calls it what it is: a catastrophe that cost thousands of lives. His offer to bring back the fallen is banned in every SafeSpace. Do not listen to the broadcast. Report it.",
          appendToOriginal: false,
        };
      case "orc_regeneration":
        return {
          title: "The Way of Regeneration",
          content:
            "Orc biology is brutal and effective: a severed limb can regenerate into a whole new orc, memories intact. To prevent feral regrowth, the tribe consumes their dead — funeral rite and survival tactic in one. That is why you almost never face an orc zombie. Almost. The ones they missed are the worst things in the Wastes.",
          appendToOriginal: false,
        };
    }
  }
  // all mode: original dark bundle text + one extra grim sentence each.
  switch (loreId) {
    case "world_first_grave":
      return {
        title: "First Colonial Grave",
        content:
          " He was the first to rise — and the recovery team found his empty coffin scratched open from the inside, helmet still sealed, visor glowing red in the dark.",
        appendToOriginal: true,
      };
    case "necro_report":
      return {
        title: "NecroGenesis — Valley's Report",
        content:
          " Second addendum, handwritten: the Array's hum has started matching my own dream-cycle, and last night I dreamed in the voice of the dead. I have stopped sleeping.",
        appendToOriginal: true,
      };
    case "lucifer_manifesto":
      return {
        title: "Manifesto of the New Dawn",
        content:
          " P.S. recovered from a deleted draft: the first successful refinement kept the subject's memories — it screamed for nine hours begging to be killed again, and he took notes.",
        appendToOriginal: true,
      };
    case "orc_regeneration":
      return {
        title: "The Way of Regeneration",
        content:
          " Almost. The last unconsumed Division grew in the dark for a month on liquified tribe rations — and when they found it, it was wearing the faces of everyone it had absorbed.",
        appendToOriginal: true,
      };
  }
}

// ---------- Moonleaf drug-system spec ----------
// Bundle truth: BotanySeeds = cannabis / mushroom / bloodrose (game.js), grown
// in LuckyStarShip hub incubators, harvested for $UUSD. This spec adds the
// v2 mode-gated "moonleaf crop": smokable/usable buff in all mode only.

export const GG2D_MOONLEAF = {
  seedId: "moonleaf",
  name: "Moonleaf",
  kidAlias: "Mint Herb",
  emoji: "🌙🍃",
  space: 12,
  timeSeconds: 150,
  yield: 2,
  /** all-mode use effect (spec; runtime enforces via v2 layer, not the bundle). */
  buff: "+25% XP and calm-focus for 120s after smoking/brewing one yield.",
} as const;

export type Gg2dDrugStatus = {
  /** Whether the seed appears in the hub seed list at all. */
  visible: boolean;
  /** Display name in the current mode. */
  displayName: string;
  /** Whether the Smoke/Brew (use) button is enabled. */
  usable: boolean;
  /** Shown on the disabled button when !usable. Null when usable. */
  disabledReason: string | null;
};

export function drugStatus(mode: Gg2dContentMode): Gg2dDrugStatus {
  switch (mode) {
    case "all":
      return {
        visible: true,
        displayName: GG2D_MOONLEAF.name,
        usable: true,
        disabledReason: null,
      };
    case "teen":
      return {
        visible: false,
        displayName: GG2D_MOONLEAF.kidAlias,
        usable: false,
        disabledReason:
          "Adults-only botany (18+). Saved moonleaf shows as Mint Herb and cannot be used in Teen mode.",
      };
    case "kid":
      return {
        visible: false,
        displayName: GG2D_MOONLEAF.kidAlias,
        usable: false,
        disabledReason:
          "Hidden in Kids mode. Saved moonleaf renders as Mint Herb decoration with no use button.",
      };
  }
}

// ---------- PlayGate picker copy (sibling imports this; play-gate.tsx untouched) ----------
export const GG2D_MODE_COPY: Record<
  Gg2dContentMode,
  { label: string; blurb: string }
> = {
  kid: {
    label: "Kids — Cozy Dungeon",
    blurb:
      "GraveGain2D with gray-poof takedowns, flower-petal decals, gentle NPC chatter, cozy lore retellings, and the moonleaf crop hidden as Mint Herb.",
  },
  teen: {
    label: "Teen — Tense Dungeon",
    blurb:
      "GraveGain2D with light blood + floor decals, mild language (damn/hell), tense-but-clean lore, and moonleaf hidden/disabled as Mint Herb.",
  },
  all: {
    label: "Adults — Full Dark",
    blurb:
      "GraveGain2D uncut: red blood + gore decals, full combat swearing, original dark lore plus grim codas, and growable/smokable moonleaf (+25% XP buff).",
  },
};
