// GraveGain emergent endless catalog (v2 layer).
//
// Mirrors public/games/html/gravegain-emergent.js (the runtime overlay tables)
// for server-side consumers (docs, PlayGate copy, future guides). The .js
// file is the runtime truth; this module is the catalog truth. Both share:
// side-quest ids, activity ids, wanderer ids + kid/teen/all dialogue and the
// kid/teen/all content-mode contract (kid cozy, teen clean, all grim+profane;
// drugs usable only in all).
//
// LOCATION: content/ owns per-game data (see gravegain2d-modes.ts,
// gravegain-epic-saga.ts). Parity-locked bundles are never touched.

import type { ContentMode } from "@/lib/content-modes";

export const GRAVEGAIN_EMERGENT_VERSION = "1.0.0";

export type EmergentFlavor = "2d" | "3d" | "1d";

export interface EmergentSideQuest {
  id: string;
  title: string;
  giver: string;
  location: string;
  hook: string;
}

export interface EmergentActivity {
  id: string;
  title: string;
  flavor: string;
  usableIn: readonly EmergentFlavor[];
  /** When true, usable only in `all` mode (decorative glow in kid/teen). */
  gated?: boolean;
}

export interface EmergentWanderer {
  id: string;
  name: string;
  portrait: string;
  questHook: string;
  kid: readonly string[];
  teen: readonly string[];
  all: readonly string[];
}

export const SIDE_QUESTS: readonly EmergentSideQuest[] = [
  { id: "lost-helmet", title: "Lost Helmet", giver: "Private Lisa Park", location: "LZ Crash Debris", hook: "Find James Wright's spare helmet in the crater field." },
  { id: "hungry-warchief", title: "Hungry Warchief", giver: "Warchief Groknak", location: "Southern Wastes Redoubt", hook: "Cook a field stew from 3 ration caches for Groknak's war band." },
  { id: "ghost-lanterns", title: "Ghost Lanterns", giver: "Mirathiel's Echo", location: "Elven Grove Vaults", hook: "Relight 4 lanterns along the Mother Tree roots." },
  { id: "array-static", title: "Array Static", giver: "Valley Net", location: "Relay 09 Shallows", hook: "Tune 3 relay spikes to blind Hades' jamming for one hour." },
  { id: "grave-gardener", title: "Grave Gardener", giver: "Arty Fisher", location: "Colonial Crypt Rows", hook: "Plant glow-flowers on 5 unmarked graves before the next rise." },
  { id: "sparkite-debt", title: "Sparkite Debt", giver: "Borin Ironhold", location: "Deep Mine Shafts", hook: "Haul 6 sparkite shards out of the overrun forge." },
  { id: "brewery-run", title: "Brewery Run", giver: "Borin Ironhold", location: "Dwarven Brewery", hook: "Recover the stolen brew-barrel from the skitter nest." },
  { id: "fishers-net", title: "Fisher's Net", giver: "Arty Fisher", location: "Sub-surface Ponds", hook: "Mend the pond nets and pull in the night catch." },
  { id: "good-ledger", title: "Good's Ledger", giver: "Angel Good", location: "Botany Core Sub-levels", hook: "Find President Good's lost ledger page in the vats." },
  { id: "oldman-letter", title: "Oldman's Letter", giver: "Guy Young", location: "Crypt of Honor", hook: "Deliver Clint Oldman's unsent letter to the memorial wall." },
  { id: "nix-brave", title: "Nix the Brave", giver: "Goblin Nix", location: "Goblin Warren", hook: "Escort little Nix past the skull swarm to the safe burrow." },
  { id: "dreamcap-watch", title: "Dreamcap Watch", giver: "Elder Aelindra", location: "Grove Edge", hook: "Stand watch over the dreamcap ring until moonrise." },
];

export const ACTIVITIES: readonly EmergentActivity[] = [
  { id: "dice-altar", title: "Dice Altar", flavor: "Offer a kill-streak to the bone dice; high roll blesses the next sweep.", usableIn: ["2d", "3d", "1d"] },
  { id: "soup-kitchen", title: "Soup Kitchen", flavor: "Groknak's cooks ladle stew; lingering heals resolve between waves.", usableIn: ["2d", "3d", "1d"] },
  { id: "sparring-ring", title: "Sparring Ring", flavor: "Bout with the war band; winner takes ration tokens.", usableIn: ["2d", "3d", "1d"] },
  { id: "mushroom-circle", title: "Mushroom Circle", flavor: "Dreamcap ring (usable only in all-mode; decorative glow in kid/teen).", usableIn: ["2d", "3d", "1d"], gated: true },
  { id: "memorial-wall", title: "Memorial Wall", flavor: "Chalk a name — James Wright first — and the wall remembers.", usableIn: ["2d", "3d", "1d"] },
  { id: "trader", title: "Trader Marrow", flavor: "Swap skull tokens for rations, lamp oil, and tall tales.", usableIn: ["2d", "3d", "1d"] },
];

export const WANDERERS: readonly EmergentWanderer[] = [
  {
    id: "moss-peddler-pip",
    name: "Pip the Moss Peddler",
    portrait: "🧺",
    questHook: "lost-helmet",
    kid: [
      "Hiya hero! I am Pip! I sell the softest moss socks on all of MoonRock! Want a pair? They tickle!",
      "I saw a shiny helmet roll behind the big glowy rock! If you find it, Lisa will do a happy dance!",
      "My moss socks keep toes warm AND they smell like rainbows. That is just science, probably!",
    ],
    teen: [
      "Boots need moss lining, cadet? Keeps the blisters off on long sweeps. Cheap, too.",
      "Saw a MERCENARY helmet bounce into the crater field during the crash. Lisa's been looking for it.",
      "You watch the treeline, I watch the merchandise. Damn drones steal anything shiny.",
    ],
    all: [
      "Moss socks, lamp oil, and things the quartermaster doesn't ask about. What do you need, killer?",
      "A dead man's helmet is sitting in the crater, visor still glowing red. Fucking Array won't let him rest.",
      "I brew dreamcap tea on the side. Adults only, no questions. Keeps the screaming in your sleep down.",
    ],
  },
  {
    id: "sister-tallow",
    name: "Sister Tallow",
    portrait: "🕯️",
    questHook: "ghost-lanterns",
    kid: [
      "Shhh, little one... I keep the lanterns lit so no ghost feels lost in the dark. Will you help me carry one?",
      "Every lantern is a night-light for a sleepy spirit. We tuck them in with warm light!",
      "The Mother Tree hums lullabies when the lanterns glow. Listen... can you hear it?",
    ],
    teen: [
      "These lanterns mark the safe path through the Grove vaults. When one goes out, something moved in the dark.",
      "The Mother Tree bled when the Array woke. We keep the lights burning so the fallen find their way back.",
      "Take a wick and oil. If your lantern gutters near the roots — run, and damn well don't look back.",
    ],
    all: [
      "I light lanterns for the dead because Hades sure as hell won't. Four went out tonight. That's never luck.",
      "The Array hums at 03:47 every night and the roots bleed black. Relight them or the Grove takes another soul.",
      "Dreamcap smoke shows you which lantern hides a hollow one. One puff, adults only — then you'll see them.",
    ],
  },
  {
    id: "cook-rumblepot",
    name: "Cook Rumblepot",
    portrait: "🍲",
    questHook: "hungry-warchief",
    kid: [
      "Sniff sniff... is that YOUR tummy rumbling? Mine too! Let us make the biggest yummiest soup together!",
      "Groknak says my soup is better than hugs! It has noodles shaped like tiny stars!",
      "Stir the pot three times and make a wish! My wishes always taste like carrots!",
    ],
    teen: [
      "Field kitchen's open, cadet. Stew, bread, and hot broth — fuel for the next sweep.",
      "Groknak eats for four and fights for forty. Haul me three ration caches and I'll feed the whole redoubt.",
      "Eat fast. The Array doesn't pause for dinner and neither do the skull swarms, damn them.",
    ],
    all: [
      "Stew's got real meat tonight — don't ask what kind, just eat. Protein's protein after Day 7.",
      "Groknak wants his war-stew and the ration caches are crawling. You want to eat, you fucking earn it.",
      "I spike the officers' bowls with moonleaf broth. Calms the shakes. Adults only — kids get the plain ladle.",
    ],
  },
  {
    id: "rusty-valve",
    name: "Rusty Valve",
    portrait: "🔧",
    questHook: "array-static",
    kid: [
      "Beep boop! I am Rusty, Valley Net's littlest helper! I fix buzzy wires with my squeaky wrench!",
      "The relay tower is singing static-y sneezes! Can you help me say bless-you to the antennas?",
      "I polished a bolt so shiny you can see your smile in it! Want to see? Look! SMILE!",
    ],
    teen: [
      "Relay 09 is spitting static — Hades' jamming. Help me tune the spikes and we blind him for an hour.",
      "Valley Net runs the wires through me — hold the ladder steady, cadet.",
      "Static means movement. If the needle pegs red, hostiles are already in the shallows. Move, damn it.",
    ],
    all: [
      "Hades' jamming is frying my boards. Tune three spikes or we're deaf when the next wave crawls out.",
      "I pulled a skull-drone apart last night. Still twitching. Fucking Array keeps the meat alive in the wires.",
      "Moonleaf oil steadies my hands for fine solder. One drop, adults only. Don't touch my stash otherwise.",
    ],
  },
  {
    id: "grave-tender-sable",
    name: "Grave-Tender Sable",
    portrait: "🌙",
    questHook: "grave-gardener",
    kid: [
      "Hello, little gardener! I plant glowy flowers on sleepy graves so everyone dreams sweet dreams!",
      "This flower is for James Wright — the very first nap garden! Will you water it with me?",
      "Flowers are the coziest blankets. Even skeletons smile when they smell them. Probably!",
    ],
    teen: [
      "Five graves unmarked since the last rise. Names matter — plant a flower and say them out loud.",
      "James Wright was first. We guard our fallen now, day and night, so the Array doesn't take them.",
      "The soil here is wrong. Too warm. If a mound shifts under your boots, call it in and step back.",
    ],
    all: [
      "Five fresh mounds, no names, soil still warm. The Array is digesting them. Plant the flowers anyway.",
      "I found Wright's coffin scratched open from the inside. Helmet sealed. Visor glowing. Fucking hell.",
      "Dreamcap grows best on grave soil — the dead dream through it. Harvest is adults-only. The kids plant flowers.",
    ],
  },
  {
    id: "one-eyed-marrow",
    name: "One-Eyed Marrow",
    portrait: "🎲",
    questHook: "dice-altar",
    kid: [
      "Roll-a-roll! My bone dice are just silly knuckle toys! Snake-eyes means you get a sticker!",
      "I traded a button for these dice and the button was HAUNTED. Best trade ever!",
      "Roll high and I will do my lucky chicken dance! Bawk bawk! It always works! Mostly!",
    ],
    teen: [
      "Bone dice, altar rules: offer your streak, roll high, walk blessed. Roll low, walk anyway.",
      "Lost this eye betting against a Bone Goliath. Won the dice, though. Fair trade, I say.",
      "The altar likes confidence. Shake the bones, call your shot, and don't damn-well flinch.",
    ],
    all: [
      "Altar takes blood or streak — your call. Dice decide whether the Array notices you tonight.",
      "I watched a man roll snake-eyes and rise again mid-bet. Put him down with his own fucking winnings.",
      "Moonleaf smoke steadies a gambler's hand. One pull before you roll — adults only, house rules.",
    ],
  },
  {
    id: "nix-brave-goblin",
    name: "Nix the Brave",
    portrait: "👺",
    questHook: "nix-brave",
    kid: [
      "H-hi! I am Nix! I am small but I am SUPER brave! I saved a beetle today! A WHOLE beetle!",
      "The dark burrow is scary... will you hold my hand past the buzzy skulls? Please please please?",
      "When I grow big I will be the bravest goblin EVER and share all my snacks with you!",
    ],
    teen: [
      "I'm Nix. I run messages through the Warren. The skull swarm owns the middle tunnel now.",
      "Everybody says I'm too small for the sweep. Watch me. I know every crack in this warren.",
      "You clear the swarm, I'll guide. And... try not to die. Damn, I mean — stay sharp.",
    ],
    all: [
      "Name's Nix. I've buried more runners than you've killed, and I count every fucking one.",
      "Middle tunnel is teeth and static. Escort me through or my messages die with me. Your call.",
      "Scared? Good. Smoke moonleaf and you stop being scared — then you die stupid. Stay raw, stay alive.",
    ],
  },
];

/** Returns the 3+ emergent dialogue lines for a wanderer in the given mode. */
export function getWandererDialogue(
  id: string,
  mode: ContentMode,
): readonly string[] {
  for (const w of WANDERERS) {
    if (w.id === id) return w[mode];
  }
  throw new Error(`Unknown GraveGain wanderer: ${id}`);
}

/** V2 runtime overlay file backing endless emergent events. */
export const GRAVEGAIN_EMERGENT_RUNTIME_FILES = [
  "gravegain-emergent.js",
] as const;
