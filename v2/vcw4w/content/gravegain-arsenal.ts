// GraveGain arsenal catalog data (v2 layer, slug-agnostic).
//
// Mirrors public/games/html/gravegain-arsenal.js (the runtime weapon pool +
// class/race starting kits) for server-side consumers (docs, PlayGate copy,
// guides). The .js file is the runtime truth; this module is the catalog
// truth. Both share: 24 weapons, 15 starting kits, and the kid/teen/all
// content-mode contract (same weapons everywhere; only `flavorAll`
// drug-adjacent sentences are all-mode-only).
//
// LOCATION: content/ owns per-game data (see gravegain2d-modes.ts,
// gravegain3d-modes.ts, gravegain-epic-saga.ts). Parity-locked bundles are
// never touched.

export const GRAVEGAIN_ARSENAL_VERSION = "1.0.0";

/** localStorage key used by the runtime overlay. */
export const GRAVEGAIN_ARSENAL_SAVE_KEY = "gravegain_arsenal_v1";

export type ArsenalClassId = "rifleman" | "sapper" | "runner";
export type ArsenalRaceId = "human" | "elf" | "dwarf" | "orc" | "goblin";

export interface ArsenalWeapon {
  id: string;
  name: string;
  emoji: string;
  /** Advisory rating (display only — the overlay never patches core damage). */
  dmg: number;
  /** Range in tiles. */
  range: number;
  /** Cooldown in seconds. */
  cooldown: number;
  /** Always-visible copy. */
  flavor: string;
  /** Drug-adjacent extra sentence — shown ONLY in all mode. */
  flavorAll?: string;
  /** Suggested classes. */
  classes: ArsenalClassId[];
}

export interface StartingKit {
  weaponId: string;
  trinket: string;
}

/** Shared pool: identical in kid/teen/all (only flavorAll is mode-gated). */
export const WEAPONS: readonly ArsenalWeapon[] = [
  { id: "rusty-shovel", name: "Rusty Shovel", emoji: "⛏️", dmg: 2, range: 1, cooldown: 1.0, flavor: "Standard colony burial detail issue. Digs graves AND fills them.", classes: ["rifleman", "sapper", "runner"] },
  { id: "spark-sword", name: "Spark-Sword", emoji: "⚔️", dmg: 4, range: 1, cooldown: 0.8, flavor: "Valley Net training blade. Buzzing edge, cadet-safe grip.", classes: ["rifleman", "runner"] },
  { id: "scattergun", name: "Scattergun", emoji: "🔫", dmg: 6, range: 4, cooldown: 1.4, flavor: "Lisa's LZ sweeper. Wide cone, rude manners.", classes: ["rifleman"] },
  { id: "hex-bow", name: "Hex Bow", emoji: "🏹", dmg: 5, range: 5, cooldown: 1.2, flavor: "Grove-runner recurve strung with ward-thread. Quiet, patient, lethal.", classes: ["runner"] },
  { id: "golem-hammer", name: "Golem Hammer", emoji: "🔨", dmg: 9, range: 1, cooldown: 1.8, flavor: "Borin's ancestor-pattern forge hammer. Breaks golems, doors, arguments.", classes: ["sapper"] },
  { id: "array-lance", name: "Array Lance", emoji: "🔱", dmg: 7, range: 2, cooldown: 1.1, flavor: "Salvaged Necromatic Array tine, re-tuned to disrupt the risen.", classes: ["rifleman", "sapper"] },
  { id: "orc-cleaver", name: "Orc Cleaver", emoji: "🪓", dmg: 8, range: 1, cooldown: 1.3, flavor: "Groknak-approved chopper. Aim for the joints.", classes: ["sapper", "rifleman"] },
  { id: "plasma-rifle", name: "Plasma Rifle", emoji: "🌠", dmg: 8, range: 6, cooldown: 1.6, flavor: "Dropship point-defense cell taped to a stock. Valley Net disapproves (fondly).", classes: ["rifleman"] },
  { id: "thorn-whip", name: "Thorn Whip", emoji: "🌿", dmg: 4, range: 3, cooldown: 0.9, flavor: "Mother-Tree cutting. Snags ankles, slaps necro-anchors.", classes: ["runner"] },
  { id: "dice-mace", name: "Dice Mace", emoji: "🎲", dmg: 6, range: 1, cooldown: 1.0, flavor: "Goblin pit-fighter favorite. Every swing is a gamble — mostly yours.", classes: ["sapper", "runner"] },
  { id: "grave-pick", name: "Grave Pick", emoji: "🪏", dmg: 5, range: 1, cooldown: 0.9, flavor: "James Wright's own burial pick, re-issued. Heavy with history.", classes: ["sapper", "rifleman"] },
  { id: "bone-saw", name: "Bone Saw", emoji: "🦴", dmg: 5, range: 1, cooldown: 0.7, flavor: "Field-medic saw. Grisly work, clean purpose.", classes: ["runner", "sapper"] },
  { id: "ember-pike", name: "Ember Pike", emoji: "🔥", dmg: 7, range: 2, cooldown: 1.2, flavor: "Sparkite-forged head that stays lit in the dark lanes.", classes: ["rifleman", "sapper"] },
  { id: "frostbrand", name: "Frostbrand", emoji: "❄️", dmg: 6, range: 1, cooldown: 1.0, flavor: "Highland-peak alloy. Cold slows risen joints.", classes: ["runner", "rifleman"] },
  { id: "swarm-flail", name: "Skull-Swarm Flail", emoji: "💀", dmg: 7, range: 2, cooldown: 1.3, flavor: "Chain of warded skulls. Swings wide, clears swarms.", classes: ["sapper"] },
  { id: "warden-maul", name: "Warden Maul", emoji: "🗿", dmg: 10, range: 1, cooldown: 2.0, flavor: "Vault-Warden knuckle casting. Slow. Final.", classes: ["sapper"] },
  { id: "relay-coil", name: "Relay Coil", emoji: "⚡", dmg: 6, range: 4, cooldown: 1.5, flavor: "Comms-relay arc caster. Re-aligns signals AND skulls.", classes: ["rifleman", "runner"] },
  { id: "compact-blade", name: "Compact Blade", emoji: "🤝", dmg: 5, range: 1, cooldown: 0.8, flavor: "Compact-of-Shared-Blood sidearm. Four races, one edge.", classes: ["rifleman", "sapper", "runner"] },
  { id: "whisper-dagger", name: "Whisper Dagger", emoji: "🗡️", dmg: 4, range: 1, cooldown: 0.6, flavor: "Elven seer fang. Fast, silent, a little sad.", classes: ["runner"] },
  { id: "dreamcap-club", name: "Dreamcap Club", emoji: "🍄", dmg: 6, range: 1, cooldown: 1.1, flavor: "Mycologist's field club, harmless-looking.", flavorAll: "All-mode note: haft sealed with dreamcap resin for grip.", classes: ["sapper", "runner"] },
  { id: "moonleaf-sling", name: "Moonleaf Sling", emoji: "🍃", dmg: 3, range: 5, cooldown: 0.9, flavor: "Botany-core sling that lofts anything throwable.", flavorAll: "All-mode note: moonleaf-wrapped grip; old growers swear it steadies the hand.", classes: ["runner", "rifleman"] },
  { id: "necro-bane", name: "Necro-Bane", emoji: "📿", dmg: 7, range: 3, cooldown: 1.2, flavor: "Warded chaplet rounds blessed by all four chaplaincies.", classes: ["rifleman", "runner"] },
  { id: "titan-slayer", name: "Titan Slayer", emoji: "💣", dmg: 12, range: 3, cooldown: 2.4, flavor: "Single-shot breaching charge on a stick. For Gates and Titans.", classes: ["sapper", "rifleman"] },
  { id: "valley-protocol", name: "Valley Protocol Pistol", emoji: "🤖", dmg: 5, range: 4, cooldown: 1.0, flavor: "Valley Net's own sidearm pattern. Polite beep, firm stop.", classes: ["rifleman", "runner"] },
];

/** Every class×race combo (3×5=15) maps to a DISTINCT starting weapon + trinket. */
export const STARTING_KITS: Record<`${ArsenalClassId}:${ArsenalRaceId}`, StartingKit> = {
  "rifleman:human": { weaponId: "scattergun", trinket: "Sealed Helm Visor" },
  "rifleman:elf": { weaponId: "hex-bow", trinket: "Aelindra's Leaf-Charm" },
  "rifleman:dwarf": { weaponId: "ember-pike", trinket: "Sparkite Whetstone" },
  "rifleman:orc": { weaponId: "orc-cleaver", trinket: "Groknak's War-Braid" },
  "rifleman:goblin": { weaponId: "valley-protocol", trinket: "Lucky Dropship Bolt" },
  "sapper:human": { weaponId: "golem-hammer", trinket: "Borin's Forge-Oath Ring" },
  "sapper:elf": { weaponId: "thorn-whip", trinket: "Mother-Tree Cutting" },
  "sapper:dwarf": { weaponId: "grave-pick", trinket: "Deep-Mine Lantern Wick" },
  "sapper:orc": { weaponId: "warden-maul", trinket: "Warden Knuckle-Shard" },
  "sapper:goblin": { weaponId: "dice-mace", trinket: "Loaded Lucky Die" },
  "runner:human": { weaponId: "spark-sword", trinket: "Lisa's Sweep Ribbon" },
  "runner:elf": { weaponId: "whisper-dagger", trinket: "Seer Fang Sheath" },
  "runner:dwarf": { weaponId: "relay-coil", trinket: "Relay 09 Tuning Fork" },
  "runner:orc": { weaponId: "swarm-flail", trinket: "Swarm-Tooth Necklace" },
  "runner:goblin": { weaponId: "moonleaf-sling", trinket: "Botany Sling Pouch" },
};

export function weaponById(id: string): ArsenalWeapon | null {
  return WEAPONS.find((w) => w.id === id) ?? null;
}

/** Starting weapon for a class×race combo (falls back to rifleman:human). */
export function weaponFor(classId: string, raceId: string): ArsenalWeapon {
  const c = (String(classId ?? "").trim().toLowerCase() || "rifleman") as ArsenalClassId;
  const r = (String(raceId ?? "").trim().toLowerCase() || "human") as ArsenalRaceId;
  const key = `${c}:${r}` as keyof typeof STARTING_KITS;
  const kit = STARTING_KITS[key] ?? STARTING_KITS["rifleman:human"];
  return weaponById(kit.weaponId) ?? WEAPONS[0];
}

/** V2 runtime overlay files backing the arsenal (served at /games/html/*). */
export const GRAVEGAIN_ARSENAL_RUNTIME_FILES = ["gravegain-arsenal.js"] as const;
