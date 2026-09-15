// DS-MUS-06/DS-MUS-07 music bot API shared core (4W-1 contract).
// Scope: ONLY app/api/music/**. No DB, no migrations, no auth wiring.
// Stateless: process-local memory seeded from seeds-now; fail-open to
// empty lists when seed sources are absent mid-flight. ASCII-only.

export type Wave4W = "square" | "saw" | "tri" | "sine" | "noise";

export interface Note4W {
  t: number;
  n: number;
  d: number;
  v?: number;
}

export interface Track4W {
  wave: Wave4W;
  vol?: number;
  notes: Note4W[];
}

export interface Song4W {
  v: 1;
  title: string;
  bpm: number;
  tracks: Track4W[];
}

export type SfxKind4W =
  | "raygun"
  | "death"
  | "putt"
  | "coin"
  | "hit"
  | "jump"
  | "win"
  | "lose"
  | "click"
  | "alarm";

export type SfxStepType = "tone" | "noise";

export interface SfxStep4W {
  wave: Wave4W;
  freq: number;
  freqEnd: number;
  dur: number;
  vol: number;
  type: SfxStepType;
}

export interface Sfx4W {
  v: 1;
  name: string;
  kind: SfxKind4W;
  steps: SfxStep4W[];
}

export const SONG_BYTES_MAX = 8192;
export const SFX_BYTES_MAX = 1024;
export const TRACKS_MAX = 8;
export const NOTES_MAX = 512;
export const BPM_MIN = 40;
export const BPM_MAX = 240;

export const WAVES: readonly Wave4W[] = ["square", "saw", "tri", "sine", "noise"];

export const SFX_KINDS: readonly SfxKind4W[] = [
  "raygun",
  "death",
  "putt",
  "coin",
  "hit",
  "jump",
  "win",
  "lose",
  "click",
  "alarm",
];

export const SFX_STEP_TYPES: readonly SfxStepType[] = ["tone", "noise"];

// Machine-readable bot contract served by GET /api/music.
export const CONTRACT = {
  version: "4W-1",
  song: {
    shape: "Song4W={v:1,title:string,bpm:40-240,tracks:Track4W[<=8]}",
    track: "Track4W={wave:square|saw|tri|sine|noise,vol?:0..1,notes:Note4W[<=512]}",
    note: "Note4W={t:start beats,n:MIDI 0-127,d:len beats,v?:0..1}",
    bytesMax: SONG_BYTES_MAX,
  },
  sfx: {
    shape: "Sfx4W={v:1,name,kind:raygun|death|putt|coin|hit|jump|win|lose|click|alarm,steps:[...]}",
    step: "Step={wave,freq,freqEnd,dur,vol,type:tone|noise}",
    bytesMax: SFX_BYTES_MAX,
  },
  share: "GET /music/all/?song=<base64url(canonical Song4W JSON)>",
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAsciiPrintable(s: string): boolean {
  return /^[\x20-\x7E]*$/.test(s);
}

function isUnit(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

// Teen-clean titles/names: family jukebox, no profanity/slurs/sexual
// content, no links/markup. Game-violence words (death, raygun, hit)
// are legitimate SFX kinds and are NOT blocked.
const TEEN_BLOCKED = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "rape",
  "porn",
  "hentai",
  "nigger",
  "nigga",
  "faggot",
  "tranny",
  "hitler",
  "nazi",
];

export function isTeenClean(s: string): boolean {
  const lowered = s.toLowerCase();
  if (lowered.includes("<") || lowered.includes(">") || lowered.includes("http")) {
    return false;
  }
  const tokens = lowered.split(/[^a-z]+/).filter(Boolean);
  for (const tok of tokens) {
    for (const bad of TEEN_BLOCKED) {
      if (tok.startsWith(bad)) return false;
    }
  }
  return true;
}

function byteLen(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

export function sizeOf(v: unknown): number {
  return byteLen(JSON.stringify(v));
}

function validateNote(raw: unknown, path: string, out: string[]): Note4W | null {
  if (!isRecord(raw)) {
    out.push(path + ": note must be an object");
    return null;
  }
  const t = raw.t;
  const n = raw.n;
  const d = raw.d;
  const v = raw.v;
  let ok = true;
  if (typeof t !== "number" || !Number.isFinite(t) || t < 0 || t > 100000) {
    out.push(path + ".t: must be a finite number >= 0 (start beats)");
    ok = false;
  }
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 127) {
    out.push(path + ".n: must be an integer 0..127 (MIDI)");
    ok = false;
  }
  if (typeof d !== "number" || !Number.isFinite(d) || d <= 0 || d > 100000) {
    out.push(path + ".d: must be a finite number > 0 (len beats)");
    ok = false;
  }
  if (v !== undefined && !isUnit(v)) {
    out.push(path + ".v: must be 0..1 when present");
    ok = false;
  }
  if (!ok) return null;
  const note: Note4W = { t: t as number, n: n as number, d: d as number };
  if (v !== undefined) note.v = v as number;
  return note;
}

function validateTrack(raw: unknown, path: string, out: string[]): Track4W | null {
  if (!isRecord(raw)) {
    out.push(path + ": track must be an object");
    return null;
  }
  if (!WAVES.includes(raw.wave as Wave4W)) {
    out.push(path + ".wave: must be one of square|saw|tri|sine|noise");
    return null;
  }
  if (raw.vol !== undefined && !isUnit(raw.vol)) {
    out.push(path + ".vol: must be 0..1 when present");
    return null;
  }
  if (!Array.isArray(raw.notes)) {
    out.push(path + ".notes: must be an array");
    return null;
  }
  if (raw.notes.length > NOTES_MAX) {
    out.push(path + ".notes: exceeds 512 note budget");
    return null;
  }
  const notes: Note4W[] = [];
  for (let i = 0; i < raw.notes.length; i++) {
    const n = validateNote(raw.notes[i], path + ".notes[" + i + "]", out);
    if (!n) return null;
    notes.push(n);
  }
  const track: Track4W = { wave: raw.wave as Wave4W, notes };
  if (raw.vol !== undefined) track.vol = raw.vol as number;
  return track;
}

export function validateSong(raw: unknown): { ok: boolean; song: Song4W | null; diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, song: null, diagnostics: ["song: must be an object"] };
  }
  if (raw.v !== 1) diagnostics.push("v: must be 1");
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length < 1 || title.length > 128) {
    diagnostics.push("title: must be 1..128 chars");
  } else if (!isAsciiPrintable(title)) {
    diagnostics.push("title: ASCII printable only");
  } else if (!isTeenClean(title)) {
    diagnostics.push("title: must be teen-clean");
  }
  const bpm = raw.bpm;
  if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) {
    diagnostics.push("bpm: must be 40..240");
  }
  if (!Array.isArray(raw.tracks)) {
    diagnostics.push("tracks: must be an array");
  } else if (raw.tracks.length < 1 || raw.tracks.length > TRACKS_MAX) {
    diagnostics.push("tracks: must hold 1..8 tracks");
  }
  if (diagnostics.length > 0) return { ok: false, song: null, diagnostics };
  const tracks: Track4W[] = [];
  const trackDiags: string[] = [];
  for (let i = 0; i < (raw.tracks as unknown[]).length; i++) {
    const tr = validateTrack((raw.tracks as unknown[])[i], "tracks[" + i + "]", trackDiags);
    if (!tr) return { ok: false, song: null, diagnostics: trackDiags };
    tracks.push(tr);
  }
  const song: Song4W = { v: 1, title, bpm: bpm as number, tracks };
  const bytes = sizeOf(song);
  if (bytes > SONG_BYTES_MAX) {
    return { ok: false, song: null, diagnostics: ["bytes: song JSON " + bytes + " exceeds 8192"] };
  }
  return { ok: true, song, diagnostics: [] };
}

function validateSfxStep(raw: unknown, path: string, out: string[]): SfxStep4W | null {
  if (!isRecord(raw)) {
    out.push(path + ": step must be an object");
    return null;
  }
  if (!WAVES.includes(raw.wave as Wave4W)) {
    out.push(path + ".wave: must be one of square|saw|tri|sine|noise");
    return null;
  }
  for (const k of ["freq", "freqEnd"] as const) {
    const f = raw[k];
    if (typeof f !== "number" || !Number.isFinite(f) || f < 20 || f > 20000) {
      out.push(path + "." + k + ": must be 20..20000 Hz");
      return null;
    }
  }
  if (typeof raw.dur !== "number" || !Number.isFinite(raw.dur) || raw.dur < 0.01 || raw.dur > 4) {
    out.push(path + ".dur: must be 0.01..4 seconds");
    return null;
  }
  if (!isUnit(raw.vol)) {
    out.push(path + ".vol: must be 0..1");
    return null;
  }
  if (!SFX_STEP_TYPES.includes(raw.type as SfxStepType)) {
    out.push(path + ".type: must be tone|noise");
    return null;
  }
  return {
    wave: raw.wave as Wave4W,
    freq: raw.freq as number,
    freqEnd: raw.freqEnd as number,
    dur: raw.dur as number,
    vol: raw.vol as number,
    type: raw.type as SfxStepType,
  };
}

export function validateSfx(raw: unknown): { ok: boolean; sfx: Sfx4W | null; diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, sfx: null, diagnostics: ["sfx: must be an object"] };
  }
  if (raw.v !== 1) diagnostics.push("v: must be 1");
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < 1 || name.length > 64) {
    diagnostics.push("name: must be 1..64 chars");
  } else if (!isAsciiPrintable(name)) {
    diagnostics.push("name: ASCII printable only");
  } else if (!isTeenClean(name)) {
    diagnostics.push("name: must be teen-clean");
  }
  if (!SFX_KINDS.includes(raw.kind as SfxKind4W)) {
    diagnostics.push("kind: must be one of raygun|death|putt|coin|hit|jump|win|lose|click|alarm");
  }
  if (!Array.isArray(raw.steps)) {
    diagnostics.push("steps: must be an array");
  } else if (raw.steps.length < 1 || raw.steps.length > 32) {
    diagnostics.push("steps: must hold 1..32 steps");
  }
  if (diagnostics.length > 0) return { ok: false, sfx: null, diagnostics };
  const steps: SfxStep4W[] = [];
  for (let i = 0; i < (raw.steps as unknown[]).length; i++) {
    const st = validateSfxStep((raw.steps as unknown[])[i], "steps[" + i + "]", diagnostics);
    if (!st) return { ok: false, sfx: null, diagnostics };
    steps.push(st);
  }
  const sfx: Sfx4W = { v: 1, name, kind: raw.kind as SfxKind4W, steps };
  const bytes = sizeOf(sfx);
  if (bytes > SFX_BYTES_MAX) {
    return { ok: false, sfx: null, diagnostics: ["bytes: sfx JSON " + bytes + " exceeds 1024"] };
  }
  return { ok: true, sfx, diagnostics: [] };
}

// Canonical form: fixed key order, trimmed strings, no extras.
export function canonicalizeSong(song: Song4W): Song4W {
  return {
    v: 1,
    title: song.title.trim(),
    bpm: song.bpm,
    tracks: song.tracks.map((tr) => ({
      wave: tr.wave,
      ...(tr.vol !== undefined ? { vol: tr.vol } : {}),
      notes: tr.notes.map((n) => ({
        t: n.t,
        n: n.n,
        d: n.d,
        ...(n.v !== undefined ? { v: n.v } : {}),
      })),
    })),
  };
}

export function canonicalizeSfx(sfx: Sfx4W): Sfx4W {
  return {
    v: 1,
    name: sfx.name.trim(),
    kind: sfx.kind,
    steps: sfx.steps.map((s) => ({
      wave: s.wave,
      freq: s.freq,
      freqEnd: s.freqEnd,
      dur: s.dur,
      vol: s.vol,
      type: s.type,
    })),
  };
}

function toBase64Url(json: string): string {
  return Buffer.from(json, "utf8").toString("base64url");
}

export function songShareUrl(canonical: Song4W): string {
  return "/music/all/?song=" + toBase64Url(JSON.stringify(canonical));
}

export function sfxShareUrl(canonical: Sfx4W): string {
  return "/music/all/?sfx=" + toBase64Url(JSON.stringify(canonical));
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim() ?? "";
  const direct = req.headers.get("x-real-ip")?.trim() ?? "";
  const ip = first || direct || "anon";
  return ip.slice(0, 64).toLowerCase();
}

// ---- Store abstraction (seeds-now, no DB) ----

export interface MusicStore {
  listSongs(): Song4W[];
  listSfx(): Sfx4W[];
  addSong(song: Song4W): void;
}

const submittedSongs: Song4W[] = [];
const SUBMITTED_MAX = 200;

type SeedPair = { songs: Song4W[]; sfx: Sfx4W[] };

let seedCache: SeedPair | null = null;

function pickSongs(mod: Record<string, unknown>): unknown[] {
  for (const k of ["SONGS", "songs", "SEEDS", "seeds", "PLAYLIST", "playlist"]) {
    const v = mod[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function pickSfx(mod: Record<string, unknown>): unknown[] {
  for (const k of ["SFX", "sfx", "EFFECTS", "effects"]) {
    const v = mod[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

// Hidden from static analysis on purpose: Turbopack/webpack treat even a
// variable `await import(spec)` as a resolvable dependency and fail the
// build when an optional source is absent. `new Function` keeps the
// specifier opaque while the surrounding try/catch preserves fail-soft.
type DynamicImporter = (spec: string) => Promise<unknown>;
const dynImport: DynamicImporter = new Function(
  "s",
  "return import(s)",
) as DynamicImporter;

async function tryImportSeeds(): Promise<SeedPair> {
  const out: SeedPair = { songs: [], sfx: [] };
  // DS-MUS-09 content/music-seeds.ts (SONGS + SFX) plus the
  // content/music/*.4ws.json sidecars ({song,sfx,from,source} wrapping
  // verbatim 4W-1). Variable specifier keeps tsc green while a source is
  // absent mid-flight; any failure => fail-open empty.
  // Bundler-opaque on purpose: Turbopack treats even a variable
  // `await import(spec)` as a resolvable dependency and fails the build;
  // `new Function` keeps the specifier opaque while try/catch stays fail-soft.
  const candidates = [
    "@/content/music-seeds",
    "../../../content/music-seeds",
    "../../content/music-seeds",
  ];
  for (const spec of candidates) {
    try {
      const mod = (await dynImport(spec)) as Record<string, unknown>;
      for (const raw of pickSongs(mod)) {
        const r = validateSong(raw);
        if (r.ok && r.song) out.songs.push(r.song);
      }
      for (const raw of pickSfx(mod)) {
        const r = validateSfx(raw);
        if (r.ok && r.sfx) out.sfx.push(r.sfx);
      }
      if (out.songs.length > 0 || out.sfx.length > 0) return out;
    } catch {
      // absent mid-flight: fall through to JSON sidecars, then empty
    }
  }
  // JSON sidecars under content/music/*.json plus the nested
  // songs/*.4ws.json and sfx/*.4ws.json per-seed files (each wraps the
  // verbatim 4W-1 payload as {song,sfx,from,source}; loaders read
  // .song ?? raw / .sfx ?? raw). One bad sidecar never fails the list.
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const roots = [process.cwd(), path.join(process.cwd(), "v2", "vcw4w")];
    const dirs = [
      "content/music",
      "content/music/songs",
      "content/music/sfx",
      "content/music-seeds",
    ];
    for (const root of roots) {
      for (const dir of dirs) {
        let files: string[] = [];
        try {
          files = await fs.readdir(path.join(root, dir));
        } catch {
          continue;
        }
        for (const f of files) {
          if (!f.endsWith(".json")) continue;
          try {
            const text = await fs.readFile(path.join(root, dir, f), "utf8");
            const parsed: unknown = JSON.parse(text);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const raw of items) {
              const s = validateSong((raw as Record<string, unknown>).song ?? raw);
              if (s.ok && s.song) {
                out.songs.push(s.song);
                continue;
              }
              const e = validateSfx((raw as Record<string, unknown>).sfx ?? raw);
              if (e.ok && e.sfx) out.sfx.push(e.sfx);
            }
          } catch {
            // one bad sidecar never fails the list
          }
        }
      }
    }
  } catch {
    // fs unavailable: fail-open to empty
  }
  return out;
}

export async function loadSeeds(): Promise<SeedPair> {
  if (seedCache) return seedCache;
  try {
    seedCache = await tryImportSeeds();
  } catch {
    seedCache = { songs: [], sfx: [] };
  }
  return seedCache;
}

export function createStore(seeds: SeedPair): MusicStore {
  return {
    listSongs() {
      return [...seeds.songs, ...submittedSongs];
    },
    listSfx() {
      return [...seeds.sfx];
    },
    addSong(song: Song4W) {
      submittedSongs.push(song);
      while (submittedSongs.length > SUBMITTED_MAX) submittedSongs.shift();
    },
  };
}

export async function getCatalog(): Promise<{ songs: Song4W[]; sfx: Sfx4W[]; source: string }> {
  const seeds = await loadSeeds();
  const store = createStore(seeds);
  const songs = store.listSongs();
  const sfx = store.listSfx();
  const source = songs.length === 0 && sfx.length === 0 ? "empty" : "seeds";
  return { songs, sfx, source };
}
