/**
 * $music:1 seed registry for the public library (/music).
 *
 * - `SEED_SONG_URLS` / `SEED_INDEX_URL`: where DS-MUSIC-07 seed JSONs live
 *   (`/music/seeds/*.song.json`). Fetched fail-open — an empty seeds dir
 *   simply yields `[]` and the inline `FALLBACK_SONGS` carry the page.
 * - `FALLBACK_SONGS`: tiny inline songs rendered by the server pages so the
 *   routes never come back empty (SSR-safe: no browser APIs at import).
 * - User songs: localStorage-backed section, client-only, guarded so server
 *   imports stay safe.
 *
 * Owned by DS-MUSIC-05. Seed JSON payloads are owned by DS-MUSIC-07;
 * song shapes are owned by `@/lib/music-format` (DS-MUSIC-01).
 */

import { validateMusic } from "@/lib/music-format";
import type { MusicSong } from "@/lib/music-format";

/** Manifest listing seed filenames, when DS-MUSIC-07 publishes one. */
export const SEED_INDEX_URL = "/music/seeds/index.json";

/**
 * Registry of known seed song URLs under `/music/seeds/`.
 * Discovered entries are appended here once DS-MUSIC-07 lands; the loader
 * also honors `index.json`, so this list staying empty is fine (fail-open).
 */
export const SEED_SONG_URLS: readonly string[] = [];

/** Local-storage key for the visitor's own saved songs. */
export const USER_SONGS_KEY = "4weird.music.user-songs.v1";

/** Inline fallback library: three tiny signature loops, always available. */
export const FALLBACK_SONGS: readonly MusicSong[] = [
  {
    format: "$music:1",
    kind: "song",
    title: "Pixel Menu Loop",
    BPM: 132,
    tracks: [
      {
        inst: "square",
        notes: [
          { t: 0, n: 72, d: 1 },
          { t: 1, n: 76, d: 1 },
          { t: 2, n: 79, d: 1 },
          { t: 3, n: 76, d: 1 },
          { t: 4, n: 81, d: 2 },
          { t: 6, n: 79, d: 1 },
          { t: 7, n: 76, d: 1 },
        ],
      },
      {
        inst: "kick",
        notes: [
          { t: 0, n: 36, d: 1 },
          { t: 2, n: 36, d: 1 },
          { t: 4, n: 36, d: 1 },
          { t: 6, n: 36, d: 1 },
        ],
      },
    ],
  },
  {
    format: "$music:1",
    kind: "song",
    title: "Coin Cascade",
    BPM: 150,
    tracks: [
      {
        inst: "triangle",
        notes: [
          { t: 0, n: 88, d: 1, v: 114 },
          { t: 1, n: 95, d: 2, v: 114 },
          { t: 3, n: 88, d: 1, v: 89 },
          { t: 4, n: 95, d: 3, v: 89 },
        ],
      },
    ],
  },
  {
    format: "$music:1",
    kind: "song",
    title: "Boss Door Bass",
    BPM: 100,
    tracks: [
      {
        inst: "sawtooth",
        notes: [
          { t: 0, n: 40, d: 2 },
          { t: 2, n: 40, d: 1 },
          { t: 3, n: 43, d: 1 },
          { t: 4, n: 45, d: 2 },
          { t: 6, n: 43, d: 1 },
          { t: 7, n: 38, d: 1 },
        ],
      },
      {
        inst: "hat",
        notes: [
          { t: 0, n: 60, d: 1, v: 51 },
          { t: 1, n: 60, d: 1, v: 51 },
          { t: 2, n: 60, d: 1, v: 51 },
          { t: 3, n: 60, d: 1, v: 51 },
          { t: 4, n: 60, d: 1, v: 51 },
          { t: 5, n: 60, d: 1, v: 51 },
          { t: 6, n: 60, d: 1, v: 51 },
          { t: 7, n: 60, d: 1, v: 51 },
        ],
      },
    ],
  },
];

/** Fetch JSON, returning `null` on any failure (404, bad JSON, offline). */
async function fetchJsonFailOpen(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Keep only payloads that validate as `$music:1` songs. */
function asSong(value: unknown): MusicSong | null {
  const v = validateMusic(value);
  if (!v.ok || v.kind !== "song") return null;
  return value as MusicSong;
}

/**
 * Load seed songs from `/music/seeds/`: first the `index.json` manifest
 * (array of filenames), then every URL in `SEED_SONG_URLS`.
 * Fail-open: any error yields `[]` — never throws.
 */
export async function loadSeedSongs(): Promise<MusicSong[]> {
  const out: MusicSong[] = [];
  try {
    const manifest = await fetchJsonFailOpen(SEED_INDEX_URL);
    const files = Array.isArray(manifest)
      ? manifest.filter((f): f is string => typeof f === "string")
      : [];
    const urls = [
      ...files.map((f) => "/music/seeds/" + f.replace(/^\/+/, "")),
      ...SEED_SONG_URLS,
    ];
    for (const url of new Set(urls)) {
      const song = asSong(await fetchJsonFailOpen(url));
      if (song) out.push(song);
    }
  } catch {
    return [];
  }
  return out;
}

/** Parse a stored user-song list, dropping anything that is not a song. */
function sanitizeUserSongs(value: unknown): MusicSong[] {
  if (!Array.isArray(value)) return [];
  const out: MusicSong[] = [];
  for (const entry of value) {
    const song = asSong(entry);
    if (song) out.push(song);
  }
  return out;
}

/**
 * Read the visitor's saved songs from localStorage.
 * Client-only: returns `[]` on the server or when storage is unavailable.
 */
export function loadUserSongs(): MusicSong[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(USER_SONGS_KEY);
    if (!raw) return [];
    return sanitizeUserSongs(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

/**
 * Persist a user song to localStorage (deduped by title, newest first).
 * Returns `false` on the server, on invalid songs, or when storage fails.
 */
export function saveUserSong(song: MusicSong): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    if (!asSong(song)) return false;
    const rest = loadUserSongs().filter((s) => s.title !== song.title);
    window.localStorage.setItem(USER_SONGS_KEY, JSON.stringify([song, ...rest]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a user song by title. Returns `false` on the server or on failure.
 */
export function removeUserSong(title: string): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const rest = loadUserSongs().filter((s) => s.title !== title);
    window.localStorage.setItem(USER_SONGS_KEY, JSON.stringify(rest));
    return true;
  } catch {
    return false;
  }
}

/** Merge library sections, dropping duplicate titles (first wins). */
export function mergeLibrary(...sections: readonly MusicSong[][]): MusicSong[] {
  const seen = new Set<string>();
  const out: MusicSong[] = [];
  for (const section of sections) {
    for (const song of section) {
      if (seen.has(song.title)) continue;
      seen.add(song.title);
      out.push(song);
    }
  }
  return out;
}
