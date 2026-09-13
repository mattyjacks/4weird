/**
 * lib/music/sfx.ts — classic-arcade SFX preset library on the 4W-1 contract.
 *
 * Direct order (DS-MUS-03 lane): sole writer of v2/vcw4w/lib/music/sfx.ts.
 * NOTE: the DS-MUS-03 envelope JSON on disk scopes the maker page
 * (app/music/maker, owner mus-3). This file is the SFX preset library per the
 * direct order; scope here is ONLY this file — no envelopes, manifests,
 * QUEUE.md, STATUS.json, old-v1/, or sibling scopes are touched. Lead
 * reconciles any envelope/scope mismatch.
 *
 * 4W-1 CONTRACT (normative, quoted verbatim from DS-MUS-01's goal):
 *   Song4W = { v:1, title:string, bpm:40-240, tracks:Track4W[<=8] }
 *   Track4W = { wave:'square'|'saw'|'tri'|'sine'|'noise', vol?:0..1,
 *               notes:Note4W[<=512] }
 *   Note4W = { t:start beats, n:MIDI 0-127, d:len beats, v?:0..1 }
 *   song JSON <= 8192 bytes.
 *   Sfx4W = { v:1, name, kind:'raygun'|'death'|'putt'|'coin'|'hit'|'jump'|
 *             'win'|'lose'|'click'|'alarm',
 *             steps:[{wave,freq,freqEnd,dur,vol,type:'tone'|'noise'}] }
 *   sfx JSON <= 1024 bytes.
 * Every preset below is a valid Sfx4W per that contract (fail-closed
 * validateSfx passes) and additionally stays under MAX_PRESET_BYTES (400)
 * canonical JSON bytes — well inside the 1024-byte contract budget.
 *
 * Preset -> kind mapping (kinds outside the order's list reuse the closest
 * allow-listed kind; names stay distinct):
 *   Raygun->raygun, Laser->raygun, Explosion->hit, Death->death, Jump->jump,
 *   Coin->coin, Powerup->win, Hit->hit, Heal->coin, Victory->win,
 *   GameOver->lose.
 *
 * Wiring: types + helpers (Sfx4W, encodeSfx, sfxByteSize, validateSfx) are
 * statically imported from ./format-4w — the landed normative module named
 * verbatim in DS-MUS-01's goal. If the lead later adds a ./format re-export
 * shim, the specifier below is the one line to switch. Playback goes through
 * ./synth (DS-MUS-02, mid-flight): loaded by specifier string at play time so
 * tsc stays green until it lands, with a local WebAudio step renderer as a
 * fail-open fallback. Same pattern as components/music/sfx-lab.tsx.
 *
 * Shapes (not copies) follow the read-only references:
 *   v2/vcw4w/public/games/html/gravegain1d/game.js lines 596-629
 *   (beep/sfx: hit, kill, hurt, level, victory arpeggio, death descent,
 *   potion blip) and gravegain3d/audio/sound-engine.js (playSfx: swing/hit/
 *   explode/loot/potion/levelup envelopes + initCtx lazy-AudioContext shape).
 * Original step parameters in the spirit of those sources.
 *
 * SSR-safe: no browser APIs at module top; AudioContext is only touched
 * inside the fallback player behind a typeof-window guard. Never throws:
 * lookups return undefined, checks return error lists, playback returns
 * false when there is nothing to play.
 *
 * Usage:
 *   import { getSfxPreset, playSfxPreset, SFX_PRESETS } from "./sfx";
 *   const coin = getSfxPreset("coin"); // Sfx4W | undefined
 *   await playSfxPreset("victory");    // true when sound was scheduled
 */

import type { Sfx4W, SfxKind4W, SfxStep4W } from "./format-4w";
import { encodeSfx, sfxByteSize, validateSfx } from "./format-4w";

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/** Stricter per-preset budget for this library (contract allows 1024). */
export const MAX_PRESET_BYTES = 400;

/**
 * Specifier of the synth sibling (DS-MUS-02). Kept as a widened string (not
 * a literal) so the dynamic import below is not statically resolved — this
 * keeps tsc green while synth.ts is mid-flight. When it lands with a
 * playSfx export, playSfxPreset routes through it automatically.
 */
export const SYNTH_MODULE: string = "./synth";

// ---------------------------------------------------------------------------
// Step builder (pure, SSR-safe)
// ---------------------------------------------------------------------------

function step(
  wave: SfxStep4W["wave"],
  freq: number,
  freqEnd: number,
  dur: number,
  vol: number,
  type: SfxStep4W["type"],
): SfxStep4W {
  return { wave, freq, freqEnd, dur, vol, type };
}

// ---------------------------------------------------------------------------
// Presets (11 classic-arcade SFX, each a valid Sfx4W, each <= 400 bytes)
// ---------------------------------------------------------------------------

/** Descending sawtooth zap — the classic raygun pew. */
export const RAYGUN: Sfx4W = {
  v: 1,
  name: "Raygun",
  kind: "raygun",
  steps: [step("saw", 2000, 200, 0.4, 0.6, "tone")],
};

/** Snappy short laser pew (raygun family). */
export const LASER: Sfx4W = {
  v: 1,
  name: "Laser",
  kind: "raygun",
  steps: [step("saw", 1800, 300, 0.25, 0.55, "tone")],
};

/**
 * Big impact: filtered-noise wash over a low saw rumble (hit family).
 * Clamped to the >=20 Hz contract floor (the reference explode dives to 10).
 */
export const EXPLOSION: Sfx4W = {
  v: 1,
  name: "Explosion",
  kind: "hit",
  steps: [
    step("noise", 400, 50, 0.9, 0.8, "noise"),
    step("saw", 110, 30, 0.5, 0.7, "tone"),
  ],
};

/**
 * Death jingle: descending saw sweep in the spirit of the gravegain1d
 * death descent (400/300/200/120), plus a short crumble tail.
 */
export const DEATH: Sfx4W = {
  v: 1,
  name: "Death",
  kind: "death",
  steps: [
    step("saw", 400, 120, 0.6, 0.6, "tone"),
    step("noise", 300, 80, 0.3, 0.35, "noise"),
  ],
};

/** Rising square sweep for jumps. */
export const JUMP: Sfx4W = {
  v: 1,
  name: "Jump",
  kind: "jump",
  steps: [step("square", 300, 900, 0.25, 0.5, "tone")],
};

/** Two-tone coin chime: B5 blip resolving to E6 (coin family). */
export const COIN: Sfx4W = {
  v: 1,
  name: "Coin",
  kind: "coin",
  steps: [
    step("sine", 988, 988, 0.08, 0.55, "tone"),
    step("sine", 1319, 1319, 0.35, 0.55, "tone"),
  ],
};

/** Rising power-up sweep with a triangle sparkle (win family). */
export const POWERUP: Sfx4W = {
  v: 1,
  name: "Powerup",
  kind: "win",
  steps: [
    step("square", 500, 1000, 0.12, 0.5, "tone"),
    step("square", 750, 1500, 0.12, 0.5, "tone"),
    step("tri", 1000, 2000, 0.2, 0.55, "tone"),
  ],
};

/** Crunchy close impact: low saw punch plus a click transient. */
export const HIT: Sfx4W = {
  v: 1,
  name: "Hit",
  kind: "hit",
  steps: [
    step("saw", 160, 30, 0.12, 0.5, "tone"),
    step("noise", 1200, 300, 0.06, 0.3, "noise"),
  ],
};

/**
 * Soft restorative chime in the spirit of the potion gulp (coin family):
 * gentle sine rise that resolves upward instead of gulping back down.
 */
export const HEAL: Sfx4W = {
  v: 1,
  name: "Heal",
  kind: "coin",
  steps: [
    step("sine", 300, 500, 0.09, 0.4, "tone"),
    step("sine", 500, 750, 0.18, 0.35, "tone"),
  ],
};

/**
 * Victory fanfare: ascending square arpeggio in the spirit of the
 * gravegain1d victory run (523/659/784/1046).
 */
export const VICTORY: Sfx4W = {
  v: 1,
  name: "Victory",
  kind: "win",
  steps: [
    step("square", 523, 523, 0.14, 0.5, "tone"),
    step("square", 659, 659, 0.14, 0.5, "tone"),
    step("square", 784, 784, 0.14, 0.5, "tone"),
    step("square", 1046, 1046, 0.14, 0.5, "tone"),
  ],
};

/** Sad descending triangle glide for game over (lose family). */
export const GAMEOVER: Sfx4W = {
  v: 1,
  name: "GameOver",
  kind: "lose",
  steps: [step("tri", 500, 90, 1.2, 0.6, "tone")],
};

/** All eleven presets in one list, handy for lab/studio UIs. */
export const SFX_PRESETS: Sfx4W[] = [
  RAYGUN,
  LASER,
  EXPLOSION,
  DEATH,
  JUMP,
  COIN,
  POWERUP,
  HIT,
  HEAL,
  VICTORY,
  GAMEOVER,
];

/** Preset display names. */
export type SfxPresetName =
  | "Raygun"
  | "Laser"
  | "Explosion"
  | "Death"
  | "Jump"
  | "Coin"
  | "Powerup"
  | "Hit"
  | "Heal"
  | "Victory"
  | "GameOver";

// ---------------------------------------------------------------------------
// Registry lookups (pure, never throw)
// ---------------------------------------------------------------------------

/** Case-insensitive lookup by display name. Returns undefined when absent. */
export function getSfxPreset(name: string): Sfx4W | undefined {
  try {
    const want = name.trim().toLowerCase();
    for (const preset of SFX_PRESETS) {
      if (preset.name.toLowerCase() === want) return preset;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Display names of all presets, in SFX_PRESETS order. */
export function listSfxPresetNames(): string[] {
  return SFX_PRESETS.map((preset) => preset.name);
}

/** Canonical compact JSON for a preset (same bytes sfxByteSize counts). */
export function presetJson(name: string): string | undefined {
  const preset = getSfxPreset(name);
  if (!preset) return undefined;
  try {
    return encodeSfx(preset);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Budget / validity checks (for UIs and the DS-MUS-10 verifier)
// ---------------------------------------------------------------------------

export interface SfxPresetCheck {
  name: string;
  kind: SfxKind4W;
  bytes: number;
  ok: boolean;
  errors: string[];
}

/**
 * Validate every preset against the 4W-1 contract guards plus the stricter
 * MAX_PRESET_BYTES library budget. Never throws.
 */
export function checkSfxPresets(): SfxPresetCheck[] {
  try {
    return SFX_PRESETS.map((preset) => {
      const result = validateSfx(preset);
      const bytes = sfxByteSize(preset);
      const errors = [...result.errors];
      if (bytes < 0) {
        errors.push(preset.name + ": unserializable");
      } else if (bytes > MAX_PRESET_BYTES) {
        errors.push(
          preset.name + ": JSON " + bytes + " bytes exceeds " + MAX_PRESET_BYTES,
        );
      }
      return {
        name: preset.name,
        kind: preset.kind,
        bytes,
        ok: result.ok && bytes >= 0 && bytes <= MAX_PRESET_BYTES,
        errors,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Playback: ./synth when landed, local WebAudio fallback otherwise
// ---------------------------------------------------------------------------

function scheduleStep(ctx: AudioContext, sfxStep: SfxStep4W, at: number): void {
  const dur = Math.min(Math.max(sfxStep.dur, 0.05), 4);
  const vol = Math.min(Math.max(sfxStep.vol, 0), 1);
  const start = Math.max(sfxStep.freq, 20);
  const end = Math.max(sfxStep.freqEnd, 20);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), at + 0.015);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  out.connect(ctx.destination);
  if (sfxStep.type === "noise" || sfxStep.wave === "noise") {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(start, at);
    filter.frequency.exponentialRampToValueAtTime(end, at + dur);
    src.connect(filter);
    filter.connect(out);
    src.start(at);
    src.stop(at + dur);
  } else {
    const osc = ctx.createOscillator();
    osc.type =
      sfxStep.wave === "tri"
        ? "triangle"
        : sfxStep.wave === "saw"
          ? "sawtooth"
          : sfxStep.wave;
    osc.frequency.setValueAtTime(start, at);
    osc.frequency.exponentialRampToValueAtTime(end, at + dur);
    osc.connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

/**
 * Local fallback renderer: schedules each step sequentially on a throwaway
 * AudioContext. Fail-open — never throws. Steps play back-to-back, matching
 * the staggered-arpeggio shape of the reference sfx() helpers.
 */
function fallbackPlaySfx(preset: Sfx4W): void {
  try {
    if (typeof window === "undefined") return;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = win.AudioContext ?? win.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    let at = ctx.currentTime + 0.01;
    let total = 0;
    for (const sfxStep of preset.steps) {
      scheduleStep(ctx, sfxStep, at);
      const dur = Math.min(Math.max(sfxStep.dur, 0.05), 4);
      at += dur;
      total += dur;
    }
    window.setTimeout(
      () => {
        try {
          void ctx.close().catch(() => {});
        } catch {
          /* ignore */
        }
      },
      (total + 0.3) * 1000,
    );
  } catch {
    /* fail-open: SFX must never throw */
  }
}

/**
 * Play a preset by display name (case-insensitive). Routes through the
 * ./synth playSfx export when that sibling has landed; otherwise uses the
 * local fallback renderer. SSR-safe (no-op server-side) and fail-open.
 * Returns true when a sound was scheduled, false for unknown names.
 */
export async function playSfxPreset(name: string): Promise<boolean> {
  try {
    const preset = getSfxPreset(name);
    if (!preset) return false;
    try {
      const mod: unknown = await import(SYNTH_MODULE);
      if (mod !== null && typeof mod === "object" && "playSfx" in mod) {
        const fn = (mod as { playSfx?: unknown }).playSfx;
        if (typeof fn === "function") {
          await (fn as (sfx: Sfx4W) => Promise<void> | void)(preset);
          return true;
        }
      }
    } catch {
      /* synth.ts mid-flight — fall through to the local renderer */
    }
    fallbackPlaySfx(preset);
    return true;
  } catch {
    return false;
  }
}
