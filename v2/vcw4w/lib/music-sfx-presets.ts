/**
 * DS-MUSIC-04 — $music:1 SFX preset recipes for the SFX lab.
 *
 * Types come straight from the authoritative contract in
 * `@/lib/music-format` (Variant-A: title + required wave). No bridge
 * fields: presets ARE MusicSfx objects, validatable by validateMusic.
 */

import type { MusicSfx, MusicWave } from "@/lib/music-format";

export type { MusicSfx };
export type SfxWave = MusicWave;

function sfx(
  title: string,
  wave: SfxWave,
  freqStart: number,
  freqEnd: number,
  dur: number,
  extra?: { vol?: number; noiseMix?: number },
): MusicSfx {
  return {
    format: "$music:1",
    kind: "sfx",
    title,
    wave,
    freqStart,
    freqEnd,
    dur,
    ...(extra ?? {}),
  };
}

/** Classic pew: descending sawtooth zap, 0.4s. */
export const RAYGUN: MusicSfx = sfx("Raygun", "sawtooth", 2000, 200, 0.4, {
  vol: 0.6,
});

/** Descending square blip with a noise layer, 0.8s. */
export const DEATH: MusicSfx = sfx("Death", "square", 400, 50, 0.8, {
  vol: 0.7,
  noiseMix: 0.4,
});

/** Rising square sweep for jumps, 0.25s. */
export const JUMP: MusicSfx = sfx("Jump", "square", 300, 900, 0.25, {
  vol: 0.5,
});

/** Bright two-tone-ish coin blip: rising sine, 0.15s. */
export const COIN: MusicSfx = sfx("Coin", "sine", 900, 1800, 0.15, {
  vol: 0.6,
});

/** Filtered noise burst sweeping down, 1s. */
export const EXPLOSION: MusicSfx = sfx("Explosion", "noise", 300, 40, 1, {
  vol: 0.8,
  noiseMix: 0.8,
});

/** Snappy descending laser pew, 0.25s. */
export const LASER: MusicSfx = sfx("Laser", "sawtooth", 1800, 300, 0.25, {
  vol: 0.55,
});

/** Rising power-up sweep, 0.5s. */
export const POWERUP: MusicSfx = sfx("Powerup", "square", 500, 2000, 0.5, {
  vol: 0.6,
});

/** Sad descending triangle glide for game over, 1.5s. */
export const GAMEOVER: MusicSfx = sfx("Game Over", "triangle", 600, 100, 1.5, {
  vol: 0.65,
});

/** All eight presets in one list, handy for lab UIs. */
export const SFX_PRESETS: MusicSfx[] = [
  RAYGUN,
  DEATH,
  JUMP,
  COIN,
  EXPLOSION,
  LASER,
  POWERUP,
  GAMEOVER,
];
