// GraveGain saga-plus catalog (v2 upgrade layer, slug-aware).
//
// Catalog truth for the 2.0.0 graphics + content upgrade across
// gravegain2d / gravegain3d / gravegain1d. The runtime truth lives in the
// eight NEW v2-native overlay files under public/games/html/*.js (see
// RUNTIME_FILES_PLUS); this module mirrors them for server-side consumers
// (PlayGate copy, docs, guides). Parity-locked bundles are never touched.
//
// Age-band contract (same graphics everywhere EXCEPT gore/drugs):
// kid = NO blood (rainbow/sparkles/POOF), teen = red blood spray + floor
// decals (NO gibs/dismemberment), all (18+) = over-the-top voxel gore +
// entity damage states + moonleaf/dreamcap usable. Mode source priority:
// URL ?content= > localStorage 4weird-content-mode:<slug> >
// window.FourweirdContentMode > fourweird-content-mode event > teen.
//
// LOCATION: content/ owns per-game data (see gravegain-epic-saga.ts,
// gravegain3d-modes.ts). Type-only imports; no runtime deps.

import type { ContentMode } from "@/lib/content-modes";

export const GRAVEGAIN_SAGA_PLUS_VERSION = "2.0.0";

export type SagaPlusGame = "gravegain2d" | "gravegain3d" | "gravegain1d";

export interface SagaPlusRuntimeFile {
  file: string;
  games: SagaPlusGame[];
  purpose: string;
}

/** The 8 NEW v2-native overlay files (served at /games/html/*). */
export const RUNTIME_FILES_PLUS: readonly SagaPlusRuntimeFile[] = [
  { file: "gravegain-models-3d.js", games: ["gravegain3d"], purpose: "THREE r128 3D model roster (instanced/LOD) for GraveGain3D enemies, NPCs, and props." },
  { file: "gravegain-2p5d.js", games: ["gravegain2d"], purpose: "2D-to-2.5D depth layer: parallax, fake-height shadows, and depth-sorted sprites for GraveGain2D." },
  { file: "gravegain1d-art.js", games: ["gravegain1d"], purpose: "Emoji art-style pass for GraveGain1D lanes, HUD, and kill flashes." },
  { file: "gravegain-voxel-gore.js", games: ["gravegain2d", "gravegain3d", "gravegain1d"], purpose: "Age-banded voxel gore overlay extending the gore-* engines (kid POOF / teen spray / all voxel-overkill)." },
  { file: "gravegain-perf.js", games: ["gravegain2d", "gravegain3d", "gravegain1d"], purpose: "Perf/threads overlay: GPU+CPU presets, worker offload, ~30Hz throttle, hidden-tab pause." },
  { file: "gravegain-emergent.js", games: ["gravegain2d", "gravegain3d", "gravegain1d"], purpose: "Emergent endless overlay: side quests, roaming NPCs, and mode-aware dialogue." },
  { file: "gravegain-arsenal.js", games: ["gravegain2d", "gravegain3d", "gravegain1d"], purpose: "Arsenal overlay: six-signature weapons plus class/race kits shared by all three games." },
  { file: "gravegain-enemies.js", games: ["gravegain2d", "gravegain3d", "gravegain1d"], purpose: "Enemy model roster overlay: six-signature foes with cross-game stats and spawn weights." },
];

export function getRuntimeFilePlus(file: string): SagaPlusRuntimeFile | null {
  return RUNTIME_FILES_PLUS.find((f) => f.file === file) ?? null;
}

export interface AgeBandGraphics {
  mode: ContentMode;
  graphics: string;
  gore: string;
  drugs: string;
}

/** Same-graphics-except-gore/drugs contract for PlayGate/docs consumers. */
export const AGE_BAND_GRAPHICS: readonly AgeBandGraphics[] = [
  {
    mode: "kid",
    graphics: "Full upgrade art everywhere: 3D models, 2.5D depth, 1D emoji style. Identical to teen/all.",
    gore: "NO blood. Kills burst into rainbow sparkles with a soft POOF; sleepy skeletons nap, nothing dismembers.",
    drugs: "Moonleaf/dreamcap visible only as inert glowcap lantern plants. No grow action, no use action.",
  },
  {
    mode: "teen",
    graphics: "Full upgrade art everywhere: 3D models, 2.5D depth, 1D emoji style. Identical to kid/all.",
    gore: "Blood-minimal: red blood spray + fading floor decals. NO gibs, NO dismemberment, NO damage states.",
    drugs: "Glowlamp cultivars only: lights the hub, flavors nothing. No grow action, no use action.",
  },
  {
    mode: "all",
    graphics: "Full upgrade art everywhere: 3D models, 2.5D depth, 1D emoji style. Identical to kid/teen.",
    gore: "Voxel-overkill: chunky voxel gibs, persistent decals, per-entity damage states (limping, sparking, crawling).",
    drugs: "Moonleaf/dreamcap growable in the Botany Station and usable (chew buff). 18+ only.",
  },
];

export function getAgeBandGraphics(mode: ContentMode): AgeBandGraphics | null {
  return AGE_BAND_GRAPHICS.find((a) => a.mode === mode) ?? null;
}

export interface SagaPlusSpotlight {
  id: string;
  title: string;
  blurb: string;
}

/** Six signature weapons for PlayGate/docs consumers. */
export const WEAPON_SPOTLIGHT: readonly SagaPlusSpotlight[] = [
  { id: "shotgun-shovel", title: "Shotgun-Shovel", blurb: "President Good's burial-detail classic: digs graves, fills them. Point-blank crowd eraser." },
  { id: "golem-hammer", title: "Golem Hammer", blurb: "Recovered from the Dwarven sparkite forges. Slow swing, shatters bone piles in one quake." },
  { id: "mother-tree-bow", title: "Mother-Tree Bow", blurb: "Elven GROVE-laminate longbow blessed by Aelindra. Silent, glowing shots that pin risers to walls." },
  { id: "rage-axe", title: "Groknak's Rage Axe", blurb: "Orc-sized chopper that drinks Rage stacks: the lower your health, the harder it hits." },
  { id: "relay-pulser", title: "Relay-09 Pulser", blurb: "Salvaged comms-array coilgun. Chains lightning through skull swarms around Relay 09." },
  { id: "dreamcap-fumigator", title: "Dreamcap Fumigator", blurb: "Botany-deck chem sprayer (all-mode buff synergy): melts Chem-Golem armor, tickles everyone else." },
];

/** Six emergent-endless hooks for PlayGate/docs consumers. */
export const EMERGENT_SPOTLIGHT: readonly SagaPlusSpotlight[] = [
  { id: "lantern-quests", title: "Lantern Quests", blurb: "Nightly hub bounties from President Good: water the glowcaps, tuck in the sleepy skeletons." },
  { id: "groknak-patrols", title: "Groknak Patrols", blurb: "Roaming orc war-parties hail you mid-run with timed hold-the-gate side fights." },
  { id: "mirathiel-echoes", title: "Mirathiel Echoes", blurb: "Dungeon ghosts whisper mode-aware warnings: cozy hums for kids, grim intel for adults." },
  { id: "nix-cubs", title: "Nix Cubs Rescue", blurb: "Escort goblin kids to the burrow while Nix's legend buffs their tiny bravery aura." },
  { id: "sparkite-rush", title: "Sparkite Rush", blurb: "Endless mine-cart timer run: haul sparkite before the Deep Forge floods with risers." },
  { id: "array-whispers", title: "Array Whispers", blurb: "Corrupted relay chatter leaks Hades' plans — decode three fragments to reveal his sanctum vector." },
];

/** Six signature foes for PlayGate/docs consumers. */
export const ENEMY_SPOTLIGHT: readonly SagaPlusSpotlight[] = [
  { id: "goblin-zed-leader", title: "Goblin Zed Leader", blurb: "LZ crash-site alpha: fast, shrieking, rallies skull piles into crawling waves." },
  { id: "elven-necromancer", title: "Elven Necromancer", blurb: "Fallen seer of the bleeding Mother Tree. Raises roots and archers mid-fight." },
  { id: "dwarven-zed-thane", title: "Dwarven Zed High Thane", blurb: "Sparkite-plated vault lord. Hammer slam shakes the forge floor and drops debris." },
  { id: "orc-zed-berserker", title: "Huge Orc Zed Berserker", blurb: "Groknak's risen blood. Regenerates until you shatter the skull-pile — burn what falls." },
  { id: "toxic-chem-golem", title: "Toxic Chem-Golem", blurb: "President Good's poisoned vats given fists. Melts lanes, weak to the fumigator." },
  { id: "necro-array-titan", title: "Necro-Array Titan", blurb: "Citadel gatekeeper for Hades. Drone swarm + beam sweep; the endless-run apex wall." },
];

export function getWeaponSpotlight(id: string): SagaPlusSpotlight | null {
  return WEAPON_SPOTLIGHT.find((w) => w.id === id) ?? null;
}

export function getEmergentSpotlight(id: string): SagaPlusSpotlight | null {
  return EMERGENT_SPOTLIGHT.find((e) => e.id === id) ?? null;
}

export function getEnemySpotlight(id: string): SagaPlusSpotlight | null {
  return ENEMY_SPOTLIGHT.find((e) => e.id === id) ?? null;
}
