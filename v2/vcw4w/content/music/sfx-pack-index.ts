// content/music/sfx-pack-index.ts - DS-MUSF-04 one-shot SFX pack barrel.
// Meta list only: filenames, teen-clean names, kinds, provenance.
// Inner sfx objects inside sfx/*-oneshot.4ws.json are verbatim 4W-1 Sfx4W;
// each sidecar wraps them as {sfx, from, source} so loaders read .sfx ?? raw.
// ASCII-only, SSR-safe, zero imports. Does not replace content/music/index.ts.

export interface OneShotSfxMeta {
  file: string;
  name: string;
  kind: string;
  from: string;
}

export const ONESHOT_SFX: OneShotSfxMeta[] = [
  { file: "sfx/raygun-oneshot.4ws.json", name: "Raygun Zap", kind: "raygun", from: "DS-MUSF-04:synth:raygun" },
  { file: "sfx/laser-oneshot.4ws.json", name: "Laser Pop", kind: "raygun", from: "DS-MUSF-04:synth:laser" },
  { file: "sfx/explosion-oneshot.4ws.json", name: "Boom Burst", kind: "hit", from: "DS-MUSF-04:synth:explosion" },
  { file: "sfx/death-rattle-oneshot.4ws.json", name: "Death Rattle", kind: "death", from: "DS-MUSF-04:synth:death" },
  { file: "sfx/jump-oneshot.4ws.json", name: "Jump Boing", kind: "jump", from: "DS-MUSF-04:synth:jump" },
  { file: "sfx/coin-oneshot.4ws.json", name: "Coin Ding", kind: "coin", from: "DS-MUSF-04:synth:coin" },
  { file: "sfx/powerup-oneshot.4ws.json", name: "Powerup Spark", kind: "win", from: "DS-MUSF-04:synth:powerup" },
  { file: "sfx/hit-oneshot.4ws.json", name: "Hit Thump", kind: "hit", from: "DS-MUSF-04:synth:hit" },
  { file: "sfx/heal-oneshot.4ws.json", name: "Heal Glow", kind: "win", from: "DS-MUSF-04:synth:heal" },
  { file: "sfx/victory-hit-oneshot.4ws.json", name: "Victory Smash", kind: "win", from: "DS-MUSF-04:synth:victory" },
  { file: "sfx/gameover-drop-oneshot.4ws.json", name: "Gameover Drop", kind: "lose", from: "DS-MUSF-04:synth:gameover" },
  { file: "sfx/ui-click-oneshot.4ws.json", name: "UI Click", kind: "click", from: "DS-MUSF-04:synth:click" },
];

export const ONESHOT_PACK = {
  v: 1,
  name: "One-Shot SFX Pack",
  sfx: ONESHOT_SFX.map((s) => s.file),
  budgets: { sfxBytesMax: 400 },
} as const;

export const ONESHOT_COUNTS = { sfx: ONESHOT_SFX.length } as const;
