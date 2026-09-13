// content/music/index.ts — DS-MUS-09 meta barrel (4W-1 contract).
// Meta list only: filenames, titles, bpm/kind, provenance. No audio bytes here.
// Inner song/sfx objects inside songs/*.4ws.json and sfx/*.4ws.json are
// verbatim 4W-1 (Song4W/Sfx4W); each sidecar wraps them as {song,sfx,from,source}
// so loaders can read .song ?? raw / .sfx ?? raw. ASCII-only, SSR-safe.

export interface SongMeta {
  file: string;
  title: string;
  bpm: number;
  from: string;
}

export interface SfxMeta {
  file: string;
  name: string;
  kind: string;
  from: string;
}

export const SONGS: SongMeta[] = [
  { file: "songs/gg1d-victory-march.4ws.json", title: "GG1D Victory March", bpm: 132, from: "v2/vcw4w/public/games/gravegain1d/game.js:624" },
  { file: "songs/gg1d-death-descant.4ws.json", title: "GG1D Death Descant", bpm: 90, from: "v2/vcw4w/public/games/gravegain1d/game.js:625" },
  { file: "songs/gg3d-loot-fanfare.4ws.json", title: "GG3D Loot Fanfare", bpm: 120, from: "v2/vcw4w/public/games/html/gravegain3d/audio/sound-engine.js:130" },
  { file: "songs/gg3d-ambient-bed.4ws.json", title: "GG3D Ambient Bed", bpm: 60, from: "v2/vcw4w/public/games/html/gravegain3d/audio/sound-engine.js:197" },
  { file: "songs/gg4d-putt-groove.4ws.json", title: "GG4D Putt Groove", bpm: 100, from: "v2/vcw4w/public/games/gravegain4d/audio/sound4d.js:108" },
  { file: "songs/gg4d-rewind-sweep.4ws.json", title: "GG4D Rewind Sweep", bpm: 140, from: "v2/vcw4w/public/games/gravegain4d/audio/sound4d.js:119" },
  { file: "songs/orbital-drift.4ws.json", title: "Orbital Drift", bpm: 140, from: "v2/vcw4w/public/games/html/orbitaldrift/game.js:27" },
  { file: "songs/battlesharks-bassline.4ws.json", title: "Battlesharks Bassline", bpm: 96, from: "v2/vcw4w/public/games/html/battlesharks2/game.js:164" },
  { file: "songs/assassin-stealth.4ws.json", title: "Assassin Stealth", bpm: 107, from: "v2/vcw4w/public/games/html/assassinanimals/game.js:86" },
  { file: "songs/assassin-combat.4ws.json", title: "Assassin Combat", bpm: 132, from: "v2/vcw4w/public/games/html/assassinanimals/game.js:88" },
];

export const SFX: SfxMeta[] = [
  { file: "sfx/putt-thock.4ws.json", name: "Putt Thock", kind: "putt", from: "v2/vcw4w/public/games/gravegain4d/audio/sound4d.js:108" },
  { file: "sfx/wshift-shimmer.4ws.json", name: "Wshift Shimmer", kind: "jump", from: "v2/vcw4w/public/games/gravegain4d/audio/sound4d.js:112" },
  { file: "sfx/rewind-sweep.4ws.json", name: "Rewind Sweep", kind: "raygun", from: "v2/vcw4w/public/games/gravegain4d/audio/sound4d.js:119" },
  { file: "sfx/swing-swoosh.4ws.json", name: "Swing Swoosh", kind: "hit", from: "v2/vcw4w/public/games/html/gravegain3d/audio/sound-engine.js:49" },
  { file: "sfx/loot-coin.4ws.json", name: "Loot Coin", kind: "coin", from: "v2/vcw4w/public/games/html/gravegain3d/audio/sound-engine.js:130" },
  { file: "sfx/levelup-win.4ws.json", name: "Levelup Win", kind: "win", from: "v2/vcw4w/public/games/html/gravegain3d/audio/sound-engine.js:158" },
  { file: "sfx/death-drop.4ws.json", name: "Death Drop", kind: "death", from: "v2/vcw4w/public/games/gravegain1d/game.js:625" },
  { file: "sfx/laser-raygun.4ws.json", name: "Laser Raygun", kind: "raygun", from: "v2/vcw4w/public/games/html/battlesharks2/game.js:46" },
  { file: "sfx/ui-click.4ws.json", name: "UI Click", kind: "click", from: "v2/vcw4w/public/games/html/assassinanimals/fx/50-audio-director.js:56" },
  { file: "sfx/alert-alarm.4ws.json", name: "Alert Alarm", kind: "alarm", from: "v2/vcw4w/public/games/html/assassinanimals/game.js:280" },
  { file: "sfx/gameover-lose.4ws.json", name: "Gameover Lose", kind: "lose", from: "v2/vcw4w/public/games/html/battlesharks2/game.js:156" },
];

export const PLAYLIST = {
  v: 1,
  name: "Game Soundtrack Seeds",
  songs: SONGS.map((s) => s.file),
  sfx: SFX.map((s) => s.file),
  budgets: { songBytesMax: 8192, sfxBytesMax: 1024 },
} as const;

export const COUNTS = { songs: SONGS.length, sfx: SFX.length } as const;
