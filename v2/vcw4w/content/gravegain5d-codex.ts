/**
 * GraveGain5D franchise codex (slug: gravegain5d ONLY).
 *
 * LOCATION NOTE: this lives in `content/` (not `lib/`) because `content/`
 * owns per-game data modules (see content/games.ts, content/game-manifests.ts)
 * while `lib/` owns engine-agnostic utilities. Reviewers read codex entries
 * keyed by id via `codexById`; UI filters by kind via `codexByKind`.
 *
 * SOURCE TRUTH (read-only; extended, never duplicated):
 * content/gravegain5d-lore.ts owns the canon prose blocks (Sixfold Lattice,
 * Paradox Is Rent, Hades Collects Spares, Cartographer Null, the Compact,
 * the folded Array, six-times MoonRock, Lisa Park, Borin, Aelindra) and
 * content/gravegain5d-modes.ts owns the NPC roster + dialogue (hub-keeper,
 * dungeon-ghost, orc-ally, ember-cartographer, ossuary-twins, fold-guide,
 * transcendence-guide) plus the GG5D_UNIVERSES tuple. Entries below
 * cross-reference those modules by id and name instead of restating them:
 * lore stays in lore, voices stay in modes, and this codex adds what neither
 * holds — the four factions, the seven key figures, the six universe entries,
 * the paradox/hop glossary, and the golf-as-trial doctrine.
 *
 * Sibling mirror: content/gravegain4d-codex.ts is the 4D equivalent
 * (read-only reference). Kind vocabulary differs on purpose: 4D walks
 * timeline-worlds, 5D hops universes, so this module uses `universe`.
 *
 * TONE CONTRACT: kid-safe throughout. This module DESCRIBES the setting
 * rather than performing teen/all flavor. No profanity, no gore detail,
 * no secrets.
 */

export type GG5DCodexKind =
  | "faction"
  | "figure"
  | "universe"
  | "term"
  | "doctrine";

export type GG5DCodexEntry = {
  /** Stable codex id, namespaced by kind (e.g. "faction-compact"). */
  id: string;
  kind: GG5DCodexKind;
  title: string;
  body: string;
  /** Ids of related entries in this codex. */
  relatedIds: readonly string[];
};

export const GG5D_CODEX: readonly GG5DCodexEntry[] = [
  {
    id: "faction-compact",
    kind: "faction",
    title: "The Compact (Sixfold Oath)",
    body:
      "The Compact is the alliance that holds all six Arroyos together after the " +
      "first fold: President Angel Good's colonists, Queen Aelindra's elves, the " +
      "dwarven vault-holds, and Warchief Groknak's orc nomads, sworn to shared " +
      "blood so no people stands alone. Null copied that oath onto the Sixfold " +
      "Lattice, so every universe a rookie saves still answers to the same " +
      "promise. Cross-reference: compact + lattice prose in gravegain5d-lore.ts; " +
      "hub-keeper voice in gravegain5d-modes.ts.",
    relatedIds: [
      "figure-angel-good",
      "figure-groknak",
      "figure-mirathiel",
      "figure-null",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "faction-array",
    kind: "faction",
    title: "The Undead Array, Folded",
    body:
      "The Array is Hades's ley-line machine and the people it has taken, split " +
      "six ways by the first lattice fold: each universe hums with a weaker but " +
      "hungrier echo of the dead. Where the 4D Array folded one direction, the 5D " +
      "Array spends six — and charges paradox rent on every hop between them. " +
      "Cross-reference: array prose in gravegain5d-lore.ts.",
    relatedIds: [
      "faction-hades-spares",
      "term-hop",
      "term-paradox",
      "universe-void",
      "universe-static",
    ],
  },
  {
    id: "faction-mother-tree-roots",
    kind: "faction",
    title: "The Mother Tree Roots",
    body:
      "The Mother Tree roots are the elven world-root's defenders across all six " +
      "universes: wardens, singers, and ancestor-memory keepers who hold the " +
      "glowing Groves against the Array's bleeding anchors. Dream-universe " +
      "gardeners still putt in Queen Aelindra's name to keep Bloom green, and " +
      "Mirathiel's echo walks the roots where no map survives. They fight inside " +
      "the Compact, but their oath is older than it — to the Tree first. " +
      "Cross-reference: aelindra prose in gravegain5d-lore.ts; dungeon-ghost " +
      "voice in gravegain5d-modes.ts.",
    relatedIds: [
      "figure-mirathiel",
      "faction-compact",
      "universe-dream",
      "universe-bloom",
    ],
  },
  {
    id: "faction-hades-spares",
    kind: "faction",
    title: "The Hades Spares",
    body:
      "The Hades spares are the collapsed universes Hades files instead of " +
      "mourning: every overcharged Void and Static becomes one more vault in his " +
      "spare Array. They are not gone, only shelved — and Angel Good negotiates " +
      "their release one par at a time. Win the tour clean and a whole universe " +
      "comes home. Cross-reference: hades prose in gravegain5d-lore.ts.",
    relatedIds: [
      "faction-array",
      "term-collapse",
      "universe-void",
      "universe-static",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "figure-angel-good",
    kind: "figure",
    title: "President Angel Good",
    body:
      "Angel Good was the LuckyStarShip's botanist before she was its president, " +
      "and she still runs the hub like a greenhouse under siege: burial honors " +
      "with one hand, lattice charts with the other. She negotiates the spares " +
      "home one par at a time, so every clean round is a rescue mission. " +
      "Cross-reference: hub-keeper voice in gravegain5d-modes.ts.",
    relatedIds: [
      "faction-compact",
      "faction-hades-spares",
      "figure-null",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "figure-mirathiel",
    kind: "figure",
    title: "Mirathiel (Echo)",
    body:
      "Mirathiel was the Mother Tree's elven seer when the Array woke, and what " +
      "walks the roots now is her echo — memory in sap and song, guiding wardens " +
      "past folds no compass survives. Her warning is the Drifter's first lesson: " +
      "vent worries out after every passage or the collapse learns your face. " +
      "Cross-reference: dungeon-ghost voice in gravegain5d-modes.ts.",
    relatedIds: [
      "faction-mother-tree-roots",
      "universe-dream",
      "term-vent",
      "term-collapse",
    ],
  },
  {
    id: "figure-groknak",
    kind: "figure",
    title: "Warchief Groknak",
    body:
      "Groknak leads the orc nomads inside the Compact and holds its loudest " +
      "oath across every universe: no one dies sitting down, in any sky. He has " +
      "fallen in three Arroyos so rookies do not have to, and still holds the " +
      "door in all six at once. Wardens study his stand the way they study " +
      "Borin's forge door. Cross-reference: orc-ally voice in " +
      "gravegain5d-modes.ts; borin + compact prose in gravegain5d-lore.ts.",
    relatedIds: [
      "faction-compact",
      "universe-prime",
      "term-vent",
      "doctrine-golf-as-trial",
    ],
  },
  {
    id: "figure-sable",
    kind: "figure",
    title: "Ember Cartographer Sable",
    body:
      "Sable draws the six skies so rookies can hop them: compass, chalk, and a " +
      "Dwarven Warden's patience. Static eats compasses, so Sable teaches " +
      "memorized lattices and anchored ley lines — vent on the mark and let the " +
      "collapse starve. Cross-reference: ember-cartographer voice in " +
      "gravegain5d-modes.ts; moonrock prose in gravegain5d-lore.ts.",
    relatedIds: [
      "term-lattice",
      "term-vent",
      "universe-static",
      "universe-prime",
    ],
  },
  {
    id: "figure-pell-marrow",
    kind: "figure",
    title: "Pell & Marrow (Ossuary Twins)",
    body:
      "Pell counts the universes and Marrow counts the snacks, and both get to " +
      "six. The Ossuary Twins keep the spare-count honest: six graves, six " +
      "names, six chances, and paradox takes the spares. Pell putts soft while " +
      "Marrow vents the fizz away — the Compact's smallest crew with the " +
      "longest ledger. Cross-reference: ossuary-twins voice in " +
      "gravegain5d-modes.ts; hades prose in gravegain5d-lore.ts.",
    relatedIds: [
      "faction-hades-spares",
      "term-paradox",
      "term-vent",
      "universe-echo",
    ],
  },
  {
    id: "figure-vex",
    kind: "figure",
    title: "Fold Cartographer Vex",
    body:
      "Vex reads the folds no one else can hold still and teaches the hotel " +
      "behind the hallway: 4D walked one corridor, 5D opens every door. The " +
      "lesson is rhythm — hop twice for the combo, vent on the third beat, or " +
      "Static collapses the hall around you. Cross-reference: fold-guide voice " +
      "in gravegain5d-modes.ts.",
    relatedIds: [
      "term-hop",
      "term-chain-hop",
      "term-vent",
      "universe-static",
    ],
  },
  {
    id: "figure-null",
    kind: "figure",
    title: "Transcendence Cartographer Null",
    body:
      "Null was a 4D fold-guide who read one hop too many and saw the whole " +
      "lattice at once. Now they speak in six voices and never sleep — someone " +
      "has to hold the map while rookies bounce between bedtimes. Bloom " +
      "forgives, Static does not, and Void never forgets; Null teaches rookies " +
      "to choose like it matters. Cross-reference: null + lattice prose in " +
      "gravegain5d-lore.ts; transcendence-guide voice in gravegain5d-modes.ts.",
    relatedIds: [
      "term-lattice",
      "term-hop",
      "universe-bloom",
      "universe-void",
      "figure-angel-good",
    ],
  },
  {
    id: "universe-prime",
    kind: "universe",
    title: "Prime Arroyo",
    body:
      "Prime kept the charter: the MoonRock every rookie recognizes, 0.71g under " +
      "Giantess, muster yards lit and ledger open. It is the honest universe — " +
      "what your swing does here, it means everywhere. Anchor here before " +
      "chaining outward. Cross-reference: moonrock prose in gravegain5d-lore.ts; " +
      "prime slot of GG5D_UNIVERSES in gravegain5d-modes.ts.",
    relatedIds: [
      "term-lattice",
      "term-hop",
      "figure-angel-good",
      "figure-groknak",
    ],
  },
  {
    id: "universe-echo",
    kind: "universe",
    title: "Echo Arroyo",
    body:
      "Echo kept the ghosts: every hop you regret still walks here, wearing your " +
      "face and waiting to be outplayed. Listen before you jump — your echoes " +
      "remember the line you missed, and the lattice lets you answer it. " +
      "Cross-reference: echo slot of GG5D_UNIVERSES in gravegain5d-modes.ts; " +
      "dungeon-ghost voice for echo counsel.",
    relatedIds: [
      "term-hop",
      "term-chain-hop",
      "figure-mirathiel",
      "figure-pell-marrow",
    ],
  },
  {
    id: "universe-dream",
    kind: "universe",
    title: "Dream Arroyo",
    body:
      "Dream kept the gardens: Aelindra's groves at their greenest, putts played " +
      "in her name, roots humming two songs at once. It is the kindest teacher " +
      "— mistakes cost strokes here, not universes — so rookies learn combos on " +
      "soft grass before braving hot skies. Cross-reference: aelindra prose in " +
      "gravegain5d-lore.ts; dream slot of GG5D_UNIVERSES in gravegain5d-modes.ts.",
    relatedIds: [
      "faction-mother-tree-roots",
      "figure-mirathiel",
      "term-chain-hop",
      "universe-bloom",
    ],
  },
  {
    id: "universe-void",
    kind: "universe",
    title: "Void Arroyo",
    body:
      "Void kept the hunger: the hottest universe, always one unpaid hop from " +
      "collapse, always watching with borrowed eyes. Chain here only with a " +
      "vent planned — the meter climbs fastest where the dark is deepest, and " +
      "Hades files what falls. Cross-reference: paradox prose in " +
      "gravegain5d-lore.ts; void slot of GG5D_UNIVERSES in gravegain5d-modes.ts.",
    relatedIds: [
      "term-paradox",
      "term-collapse",
      "term-vent",
      "faction-hades-spares",
    ],
  },
  {
    id: "universe-bloom",
    kind: "universe",
    title: "Bloom Arroyo",
    body:
      "Bloom kept the laughter: the forgiving universe, where gardeners putt for " +
      "joy and the lattice bends a little kinder. It forgives a missed vent the " +
      "way good soil forgives a late rain — once, not forever. Learn the rhythm " +
      "here, then carry it into hotter skies. Cross-reference: bloom slot of " +
      "GG5D_UNIVERSES in gravegain5d-modes.ts; null counsel on choosing well.",
    relatedIds: [
      "faction-mother-tree-roots",
      "figure-null",
      "universe-dream",
      "term-vent",
    ],
  },
  {
    id: "universe-static",
    kind: "universe",
    title: "Static Arroyo",
    body:
      "Static kept the noise: compasses spin, radios hiss, and fairways redraw " +
      "while you aim. It does not forgive — it collects. Memorize the lattice, " +
      "hop with a plan, and vent before the noise learns your name. " +
      "Cross-reference: static slot of GG5D_UNIVERSES in gravegain5d-modes.ts; " +
      "ember-cartographer warnings.",
    relatedIds: [
      "term-collapse",
      "term-lattice",
      "figure-sable",
      "figure-vex",
    ],
  },
  {
    id: "term-paradox",
    kind: "term",
    title: "Paradox (Rent)",
    body:
      "Paradox is rent: every hop borrows mass from the universe you leave, and " +
      "borrowing twice in a row charges interest. The meter climbs, hot " +
      "universes start their collapse clocks, and unpaid bills feed the spares. " +
      "Wardens anchor, Drifters hop free, Putters outrun the bill with combos — " +
      "but everyone pays or vents. Cross-reference: paradox prose in " +
      "gravegain5d-lore.ts.",
    relatedIds: ["term-hop", "term-vent", "term-collapse", "universe-void"],
  },
  {
    id: "term-hop",
    kind: "term",
    title: "Hop",
    body:
      "A hop is one jump between universes along the lattice: pick your launch " +
      "sky, commit, and land on a MoonRock that remembers the NecroGenesis a " +
      "little differently. One hop is travel; two hops in a row is a promise the " +
      "lattice intends to collect on. Cross-reference: paradox prose in " +
      "gravegain5d-lore.ts; hop counsel across gravegain5d-modes.ts voices.",
    relatedIds: ["term-lattice", "term-chain-hop", "term-paradox", "universe-prime"],
  },
  {
    id: "term-chain-hop",
    kind: "term",
    title: "Chain-Hop (Combo)",
    body:
      "A chain-hop is two or more hops without venting between: the lattice pays " +
      "you back for the second and collects on the fifth. Putters finish clean " +
      "by chaining combos, then venting hard before Void. Dream grass is for " +
      "practice; Void skies are for counting. Cross-reference: paradox prose in " +
      "gravegain5d-lore.ts; fold-guide + transcendence-guide voices in " +
      "gravegain5d-modes.ts.",
    relatedIds: ["term-hop", "term-paradox", "term-vent", "universe-dream"],
  },
  {
    id: "term-vent",
    kind: "term",
    title: "Vent",
    body:
      "Venting pays the paradox meter down: anchor the ley line, breathe the " +
      "buzz out, and let the collapse starve. Wardens anchor the line, Drifters " +
      "vent loud, Putters vent by finishing — one team, one Compact, venting as " +
      "one or falling one by one. Cross-reference: paradox prose in " +
      "gravegain5d-lore.ts; ember-cartographer + transcendence-guide voices in " +
      "gravegain5d-modes.ts.",
    relatedIds: ["term-paradox", "term-collapse", "term-lattice", "universe-bloom"],
  },
  {
    id: "term-collapse",
    kind: "term",
    title: "Collapse",
    body:
      "Collapse is what happens when the meter outruns the venting: a hot " +
      "universe folds shut and joins the spares on Hades's shelf. Collapsed " +
      "worlds do not vanish — they wait for a clean tour to negotiate them " +
      "home. Hold the line in Void and Static first; they fall fastest. " +
      "Cross-reference: hades + paradox prose in gravegain5d-lore.ts.",
    relatedIds: [
      "term-paradox",
      "term-vent",
      "faction-hades-spares",
      "universe-static",
    ],
  },
  {
    id: "term-lattice",
    kind: "term",
    title: "The Lattice",
    body:
      "The lattice is Null's map of all six Arroyos at once: which sky borders " +
      "which, which hops cost double, which vents pay best. Sable charts it in " +
      "chalk, Vex reads it in ribbons, Null holds it awake — rookies just learn " +
      "to trust the lines before they trust their eyes. Cross-reference: " +
      "lattice + null prose in gravegain5d-lore.ts; transcendence-guide voice " +
      "in gravegain5d-modes.ts.",
    relatedIds: [
      "term-hop",
      "figure-null",
      "figure-sable",
      "figure-vex",
      "universe-prime",
    ],
  },
  {
    id: "doctrine-golf-as-trial",
    kind: "doctrine",
    title: "The Golf-as-Trial Doctrine (Six Arroyos, One Cup)",
    body:
      "The Compact settles wars with six Arroyos and one cup because the fold " +
      "made every other kind of war unwinnable: armies fight once, but the " +
      "Array refolds the dead and fights again across six skies. So each people " +
      "names a striker — Warden, Drifter, Putter — each striker putts every " +
      "universe in turn, and the cup counts what blades cannot: precision under " +
      "pressure, witnessed in all six at once. Win the round and Angel Good " +
      "carries a spare universe home; dispute the count and you dispute your " +
      "own echo, standing beside you on the green. That is why the cup " +
      "outranks the sword: it is the one battlefield Hades cannot shelve, " +
      "because every Arroyo watches it.",
    relatedIds: [
      "faction-compact",
      "faction-hades-spares",
      "figure-angel-good",
      "figure-null",
      "term-chain-hop",
    ],
  },
];

export function codexById(id: string): GG5DCodexEntry | null {
  return GG5D_CODEX.find((entry) => entry.id === id) ?? null;
}

export function codexByKind(kind: GG5DCodexKind): readonly GG5DCodexEntry[] {
  return GG5D_CODEX.filter((entry) => entry.kind === kind);
}
