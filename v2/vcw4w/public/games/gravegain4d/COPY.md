# GraveGain4D — Store Copy

## Catalog entry (recommended)

- **Title:** GraveGain4D
- **Description:** A 4D dark-fantasy golf rogue-like: putt lost souls across ana/kata hyperdungeons projected from the W-axis, rewind botched shots with chrono-sand, and breach the Light/Gloom branes in a 10-rift MoonRock campaign with a starship hub.
- **Genre:** RPG
- **Tags:** `HTML5`, `Action`, `RPG`, `Rogue-like`, `Three.js`, `4D`, `Golf`
- **Emoji:** ⛳

> Description/genre/tags mirror the shipped `game.json` (`public/games/html/gravegain4d/game.json`)
> so the catalog, the bundle metadata, and this copy can never drift apart.

## Age-rating recommendation

- **Recommended rating:** `adults` (18+)
- **Reason:** Intense undead violence / horror themes across all 10 missions (mass grave combat,
  reanimated bosses, citadel horror) plus an `all`-tier dialogue track with hard profanity —
  the same bar as its saga siblings `gravegain2d`, `gravegain3d`, `demolichdom`, and
  `lastwordszombies` (all `adults` in `lib/age-gate.ts`). The `kid`/`teen` content modes stay
  cozy/clean, but the default catalog band should gate at 18+.

## Maker / credits block

- **Maker:** Antigravity Dev — Specializing in high-fidelity HTML5 game experiences with immersive
  systems and rich game-feel. (`https://4weird.com`, label `4weird`)
- **Credits:**
  - Antigravity — Lead Architect 🧙 (primary, `https://4weird.com`)
- **Canon cast (in-game speakers, not catalog credits):** President Angel Good 🌿, Echo of Elder
  Mirathiel 👻, Warchief Groknak 👹, Ember Cartographer Sable 🗺️, Ossuary Twins Pell & Marrow 💀,
  Fold Cartographer Vex 🌀, Private Lisa Park, Valley Net, Dr. Lucifer Hades.

## Wiring snippets for the integrator (DO NOT apply — return only)

The two files below are outside this change's ownership (`content/`, `scripts/`). Apply by hand:

### 1. `content/games.ts` — catalog entry tuple

Append to the `entries` array (one line, same shape as siblings):

```ts
['gravegain4d','GraveGain4D','A 4D dark-fantasy golf rogue-like: putt lost souls across ana/kata hyperdungeons projected from the W-axis, rewind botched shots with chrono-sand, and breach the Light/Gloom branes in a 10-rift MoonRock campaign with a starship hub.','RPG',['HTML5','Action','RPG','Rogue-like','Three.js','4D','Golf'],'⛳',true],
```

### 2. `lib/age-gate.ts` — rating row (required for the `adults` recommendation to take effect)

Inside `GAME_RATINGS`:

```ts
gravegain4d: "adults",
```

### 3. `scripts/sync-game-bundles.mjs` — bundle route

Add to the `bundles` array (after the `gravegain1d` line; source dir already exists with
`game.json` + `index.html`):

```js
["gravegain4d", "gravegain4d"],
```

### 4. `content/game-manifests.ts` — guide registration

Add `"gravegain4d"` to `GAMES_WITH_GUIDES` (verified against
`public/games/<slug>/guide.html` on disk; the sync copies this file to the runtime path):

```ts
const GAMES_WITH_GUIDES: ReadonlySet<string> = new Set([
  "demolichdom",
  "discoveramerica",
  "fridgesimulator",
  "serversavershield",
  "gravegain4d",
]);
```

### Integrator checklist

1. Add the `games.ts` tuple → catalog + `runtimePath: /games/gravegain4d/index.html`.
2. Add the `GAME_RATINGS` row → 18+ gate (`verify-age-gate.mjs` may need the slug in its lists).
3. Add the `sync-game-bundles.mjs` line → run `npm run sync:games` so the runtime bundle
   (including this `guide.html`) lands at `public/games/gravegain4d/guide.html`.
4. Add the `GAMES_WITH_GUIDES` entry → detail page + play shell pick up `/games/gravegain4d/guide.html`.
