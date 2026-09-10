# Overtake for 4weird

A dependency-light Out Run/Horizon Chase style canvas racer built for the 4weird HTML5 game platform.

## Run

Run a static server from `website/v1`, then open the game route:

```bash
cd ../../..
python3 -m http.server 4173
```

Open `http://localhost:4173/games/html/overtake/index.html`.

## Files

- `src/main.ts` contains the game source.
- `game.js` is the browser-ready build checked in for immediate play.
- `game.css` contains the frame-scoped game UI styles.
- `game.json` contains 4weird metadata, credits, controls, and asset notes.
- Runtime image and audio assets are hosted at `https://overtake-assets.vercel.app/`.

## Controls

- Arrow keys or WASD steer, accelerate, and brake.
- Space, Shift, or N uses nitro while the bar has charge.
- P or Escape pauses/resumes the race.
- R restarts the current route.
- Drive through canvas-drawn powerups for nitro refills.

## Progression

- The first screen has Start, Cars, and Options.
- Start opens level selection.
- Cars opens the garage, where coins buy and equip faster cars.
- Only Desert Run is unlocked at first. Completing Desert Run unlocks Urban Sprint, and completing Urban Sprint unlocks Neon Night.
- Opponent race pace comes from their assigned car tier only.

## Build

Only needed when editing `src/main.ts`.

```bash
npm install
npm run build
npm run check:js
```

The build script compiles TypeScript into `dist/main.js` and copies that output to `game.js`, which is what `index.html` loads. Commit `src/main.ts` and `game.js`; do not commit `node_modules/` or `dist/`.
