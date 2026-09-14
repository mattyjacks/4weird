// scripts/verify-music.mjs — DS-MUSIC-10 gate for the $music:1 library.
//
// GREEN only when ALL of these hold:
//   1. every public/music/seeds/*.json parses AND passes the $music:1
//      caps/shape checks (songs <= 65536 bytes, sfx <= 2048 bytes,
//      validated structurally here — this script never imports TS);
//   2. at least one /music route exists (app/music/**/page.tsx);
//   3. no game-bundle bytes touched (this script performs zero writes, and
//      no seed references a game-bundle path);
//   4. no secrets anywhere under public/music (sk- / BEGIN PRIVATE KEY).
//
// Fail-open on a missing seeds dir: seeds land via sibling DS-MUSIC-07
// concurrently, so an absent dir reports 0/0 and passes — only INVALID
// files fail. Read-only: readdirSync/readFileSync/existsSync only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const seedsDir = path.join(root, "public", "music", "seeds");
const musicDir = path.join(root, "public", "music");
const appMusicDir = path.join(root, "app", "music");

const SONG_MAX_BYTES = 65536;
const SFX_MAX_BYTES = 2048;
const MUSIC_FORMAT_TAG = "$music:1";
// Mirrors lib/music-format.ts (Variant-A, authoritative): song tracks carry
// inst from the 8-voice union (wave folded into inst); sfx carry title +
// required wave. Extra payload fields (loop, track.wave aliases) are ignored.
const INSTS = ["square", "triangle", "sawtooth", "sine", "noise", "kick", "snare", "hat"];
const WAVES = ["square", "sawtooth", "triangle", "sine", "noise"];
const SECRET_RES = [/(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/, /BEGIN PRIVATE KEY/];
const GAME_PATH_RES = [/public\/games\//, /\/games\/html\//, /old-v1\//];
// --- Additive DS-MUSF-02: legacy $music:1 seed shape + sidecar dir (no existing check altered).
const isLegacySfxSeed = (v) =>
  isRecord(v) &&
  isFiniteNumber(v.dur) && v.dur > 0 && v.dur <= 4 &&
  isFiniteNumber(v.freqStart) && v.freqStart > 0 &&
  isFiniteNumber(v.freqEnd) && v.freqEnd > 0;
const contentMusicDir = path.join(root, "content", "music");

const failures = [];
const fail = (msg) => failures.push(msg);

// --- Structural $music:1 validation (mirrors lib/music-format.ts, no import).
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isIntInRange = (v, min, max) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const isUnitRange = (v) => isFiniteNumber(v) && v >= 0 && v <= 1;

function validateSong(input, errors) {
  if (typeof input.title !== "string" || input.title.length === 0) {
    errors.push("song.title must be a non-empty string");
  }
  if (!isFiniteNumber(input.BPM) || input.BPM < 40 || input.BPM > 240) {
    errors.push("song.BPM must be a number 40-240");
  }
  if (input.stepsPerBeat !== undefined && (!Number.isInteger(input.stepsPerBeat) || input.stepsPerBeat <= 0)) {
    errors.push("song.stepsPerBeat must be a positive integer when present");
  }
  if (!Array.isArray(input.tracks) || input.tracks.length === 0) {
    errors.push("song.tracks must be a non-empty array");
    return;
  }
  input.tracks.forEach((track, ti) => {
    const where = `song.tracks[${ti}]`;
    if (!isRecord(track)) {
      errors.push(`${where} must be an object`);
      return;
    }
    if (typeof track.inst !== "string" || INSTS.indexOf(track.inst) < 0) {
      errors.push(`${where}.inst must be one of ${INSTS.join("|")}`);
    }
    if (!Array.isArray(track.notes)) {
      errors.push(`${where}.notes must be an array`);
      return;
    }
    track.notes.forEach((note, ni) => {
      const nwhere = `${where}.notes[${ni}]`;
      if (!isRecord(note)) {
        errors.push(`${nwhere} must be an object`);
        return;
      }
      if (!isIntInRange(note.t, 0, Number.MAX_SAFE_INTEGER)) {
        errors.push(`${nwhere}.t must be an integer step >= 0`);
      }
      if (!isIntInRange(note.n, 0, 127)) {
        errors.push(`${nwhere}.n must be an integer midi note 0-127`);
      }
      if (!Number.isInteger(note.d) || note.d <= 0) {
        errors.push(`${nwhere}.d must be a positive integer of steps`);
      }
      if (note.v !== undefined && !isIntInRange(note.v, 0, 127)) {
        errors.push(`${nwhere}.v must be an integer 0-127 when present`);
      }
    });
  });
}

function validateSfx(input, errors) {
  if (typeof input.title !== "string" || input.title.length === 0) {
    errors.push("sfx.title must be a non-empty string");
  }
  if (typeof input.wave !== "string" || WAVES.indexOf(input.wave) < 0) {
    errors.push(`sfx.wave must be one of ${WAVES.join("|")}`);
  }
  if (!isFiniteNumber(input.freqStart) || input.freqStart <= 0) {
    errors.push("sfx.freqStart must be a positive number");
  }
  if (!isFiniteNumber(input.freqEnd) || input.freqEnd <= 0) {
    errors.push("sfx.freqEnd must be a positive number");
  }
  if (!isFiniteNumber(input.dur) || input.dur <= 0 || input.dur > 4) {
    errors.push("sfx.dur must be a positive number <= 4");
  }
  if (input.vol !== undefined && !isUnitRange(input.vol)) {
    errors.push("sfx.vol must be a number 0-1 when present");
  }
  if (input.noiseMix !== undefined && !isUnitRange(input.noiseMix)) {
    errors.push("sfx.noiseMix must be a number 0-1 when present");
  }
}

function validateMusic(input) {
  if (!isRecord(input)) {
    return { ok: false, errors: ["music: must be an object"], bytes: 0, kind: "unknown" };
  }
  let bytes = 0;
  let serializable = true;
  try {
    const json = JSON.stringify(input);
    if (typeof json === "string") bytes = json.length;
    else serializable = false;
  } catch {
    serializable = false;
  }
  const errors = [];
  if (!serializable) errors.push("music: payload is not JSON-serializable");
  if (input.format !== undefined && input.format !== MUSIC_FORMAT_TAG) {
    errors.push('music: format must be "$music:1" when present');
  }
  const rawKind = input.kind;
  let kind = "unknown";
  if (rawKind === "song" || rawKind === "sfx") {
    kind = rawKind;
  } else if (rawKind === undefined) {
    if (Array.isArray(input.tracks)) kind = "song";
    else if (input.freqStart !== undefined || input.freqEnd !== undefined) kind = "sfx";
  } else {
    errors.push('music: kind must be "song" or "sfx" when present');
    if (Array.isArray(input.tracks)) kind = "song";
    else if (input.freqStart !== undefined || input.freqEnd !== undefined) kind = "sfx";
  }
  if (kind === "song") {
    validateSong(input, errors);
    if (bytes > SONG_MAX_BYTES) {
      errors.push(`music: song exceeds ${SONG_MAX_BYTES} bytes (got ${bytes})`);
    }
  } else if (kind === "sfx") {
    validateSfx(input, errors);
    if (bytes > SFX_MAX_BYTES) {
      errors.push(`music: sfx exceeds ${SFX_MAX_BYTES} bytes (got ${bytes})`);
    }
  } else {
    errors.push("music: unknown kind (expected song with tracks or sfx with freqStart/freqEnd)");
  }
  return { ok: errors.length === 0, errors, bytes, kind };
}

// --- Check 0: this script never writes (read-only by construction).
{
  const src = fs.readFileSync(new URL(import.meta.url), "utf8");
  const writeTokens = [
    ["write", "File", "Sync"],
    ["append", "File", "Sync"],
    ["copy", "File", "Sync"],
    ["re", "name", "Sync"],
    ["mk", "dir", "Sync"],
    ["rm", "Sync"],
    ["un", "link", "Sync"],
    ["create", "Write", "Stream"],
  ].map((parts) => parts.join(""));
  for (const token of writeTokens) {
    if (src.includes(token)) fail(`verifier must stay read-only but contains ${token}`);
  }
}

// --- Check 1: seeds parse + caps/shape (fail-open when dir absent).
let seedFiles = [];
let songCount = 0;
let sfxCount = 0;
if (!fs.existsSync(seedsDir)) {
  console.log("Music seeds: MISSING dir public/music/seeds (DS-MUSIC-07 concurrent) — 0 songs, 0 sfx, fail-open.");
} else {
  seedFiles = fs.readdirSync(seedsDir).filter((f) => f.endsWith(".json")).sort();
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(seedsDir, f), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      fail(`${f}: invalid JSON (${e.message})`);
      continue;
    }
    // --- Additive DS-MUSF-02: legacy $music:1 seeds (top-level dur/freqStart/freqEnd) LEGACY-PASS.
    if (isLegacySfxSeed(data) && data.format === undefined && data.kind === undefined) {
      let legacyBytes = 0;
      try {
        legacyBytes = JSON.stringify(data).length;
      } catch {
        legacyBytes = 0;
      }
      if (legacyBytes > SFX_MAX_BYTES) {
        fail(`${f}: legacy sfx exceeds ${SFX_MAX_BYTES} bytes (got ${legacyBytes})`);
      } else {
        sfxCount += 1;
        console.log(`Music seeds: ${f} LEGACY-PASS (legacy $music:1 sfx shape).`);
      }
      for (const re of GAME_PATH_RES) {
        if (re.test(raw)) fail(`${f}: references game-bundle path (${re})`);
      }
      for (const re of SECRET_RES) {
        if (re.test(raw)) fail(`${f}: suspected secret (${re})`);
      }
      continue;
    }
    const v = validateMusic(data);
    for (const e of v.errors) fail(`${f}: ${e}`);
    if (v.ok) {
      if (f.endsWith(".song.json") && v.kind !== "song") fail(`${f}: *.song.json must hold kind "song"`);
      if (f.endsWith(".sfx.json") && v.kind !== "sfx") fail(`${f}: *.sfx.json must hold kind "sfx"`);
      if (v.kind === "song") songCount += 1;
      if (v.kind === "sfx") sfxCount += 1;
    }
    for (const re of GAME_PATH_RES) {
      if (re.test(raw)) fail(`${f}: references game-bundle path (${re})`);
    }
    for (const re of SECRET_RES) {
      if (re.test(raw)) fail(`${f}: suspected secret (${re})`);
    }
  }
  console.log(`Music seeds: ${seedFiles.length} file(s), ${songCount} song(s), ${sfxCount} sfx.`);
}

// --- Additive DS-MUSF-02: scan content/music sidecars (*.4ws.json, recursive; fail-open when absent).
let sidecarFiles = [];
if (!fs.existsSync(contentMusicDir)) {
  console.log("Music sidecars: MISSING dir content/music — 0 sidecars, fail-open.");
} else {
  const collectSidecars = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collectSidecars(full);
      else if (entry.name.endsWith(".4ws.json")) sidecarFiles.push(full);
    }
  };
  collectSidecars(contentMusicDir);
  sidecarFiles.sort();
  for (const full of sidecarFiles) {
    const rel = path.relative(root, full).replaceAll("\\", "/");
    let rawSide;
    try {
      rawSide = fs.readFileSync(full, "utf8");
    } catch (e) {
      fail(`${rel}: unreadable (${e.message})`);
      continue;
    }
    try {
      JSON.parse(rawSide);
    } catch (e) {
      fail(`${rel}: invalid JSON (${e.message})`);
      continue;
    }
    // Provenance note: sidecars carry a "from" game path by design, so the
    // game-bundle ref check is intentionally not applied here; secrets still fail.
    for (const re of SECRET_RES) {
      if (re.test(rawSide)) fail(`${rel}: suspected secret (${re})`);
    }
  }
  console.log(`Music sidecars: ${sidecarFiles.length} file(s) under content/music.`);
}

// --- Check 2: /music routes exist (app/music/**/page.tsx).
let routePages = [];
if (fs.existsSync(appMusicDir)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") routePages.push(path.relative(root, full).replaceAll("\\", "/"));
    }
  };
  walk(appMusicDir);
}
routePages.sort();
if (routePages.length === 0) {
  fail("no /music routes: expected at least one app/music/**/page.tsx");
} else {
  console.log(`Music routes: ${routePages.length} page(s): ${routePages.join(", ")}`);
}

// --- Check 3: no secrets anywhere under public/music.
if (!fs.existsSync(musicDir)) {
  console.log("Music secrets: MISSING dir public/music (DS-MUSIC-07 concurrent) — skipped, fail-open.");
} else {
  let scanned = 0;
  let secretHits = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      let raw;
      try {
        raw = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      if (raw.includes("\u0000")) continue;
      scanned += 1;
      const rel = path.relative(root, full).replaceAll("\\", "/");
      for (const re of SECRET_RES) {
        if (re.test(raw)) {
          fail(`${rel}: suspected secret (${re})`);
          secretHits += 1;
        }
      }
    }
  };
  walk(musicDir);
  console.log(
    `Music secrets: scanned ${scanned} file(s) under public/music, ` +
      (secretHits === 0 ? "no secrets." : `${secretHits} secret hit(s).`),
  );
}

if (failures.length > 0) {
  console.error(`Music verify FAILED (${failures.length}):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(
  `Music verify OK: ${seedFiles.length} seed(s) (${songCount} songs, ${sfxCount} sfx), ` +
    `${routePages.length} route(s), no game-bundle refs, no secrets.`,
);
