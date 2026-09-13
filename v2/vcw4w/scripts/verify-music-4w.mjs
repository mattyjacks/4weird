// Verifies the Music 4W-1 stack (lanes DS-MUS-01..09, DS-MUS-11 envelope).
// DS-MUS-11 (infra lane) owns this file; sibling builders land concurrently,
// so EVERY check is order-independent: a missing sibling file reports
// FAIL ("not landed yet", never throws/crashes). Exit 0 only when all 43
// checks are present and green. Re-landed under this -4w path because
// scripts/verify-music.mjs is occupied by the parallel DS-MUSIC crew
// ($music:1 contract) and must NOT be overwritten.
//
// Asserts (static text asserts, no TS execution needed):
//   1. lib/music/format-4w.ts: validateSong/validateSfx/sizeOf/transpose +
//      MAX_SONG_BYTES/MAX_SFX_BYTES + encode/decode pair tokens.
//   2. lib/music/synth-4w.ts: engine exports (playSong/playSfx/ensureAudio)
//      + SSR-safe guard + uses WebAudio + no top-level AudioContext.
//   3. app/music/maker/: page.tsx (renders maker client) + maker-client
//      boundary ("use client") + budget-meter token + bot/share contract.
//   4. app/music/all/: page.tsx + gallery client + gallery-list token.
//   5. components/music/wave-editor.tsx + sfx-studio.tsx: exist + client
//      boundary + waveform/sfx-model tokens.
//   6. app/api/music: recursive route.ts scan (GET + POST +
//      stateless-validate + JSON-response tokens).
//   7. public/games/shared/music4w.js: node --check + window.Music4W +
//      idempotent guard + budget tokens.
//   8. content/music-seeds.ts: >=2 seed exports + file byte-size <=256KB.
//   9. No-secret scan (sk- with (?<![A-Za-z0-9_]) left-boundary guard)
//      over the 4W-1 files.
//
// Run from v2/vcw4w: `node scripts/verify-music-4w.mjs`.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;
let passes = 0;

function check(label, cond, hint = "") {
  if (cond) {
    passes += 1;
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

function readAbs(path) {
  return readFileSync(path, "utf8");
}

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function collectRouteFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...collectRouteFiles(full));
    else if (e.name === "route.ts") out.push(full);
  }
  return out;
}

// ---- 1. format lib (DS-MUS-01, read-only): 8 checks ----
console.log("4W-1 format lib (DS-MUS-01, read-only):");
const fmtAbs = join(root, "lib", "music", "format-4w.ts");
const fmtOk = existsSync(fmtAbs);
check("lib/music/format-4w.ts exists", fmtOk, fmtOk ? "" : "DS-MUS-01 format lib not landed yet");
const fmt = fmtOk ? readAbs(fmtAbs) : "";
check(
  "format exports validateSong",
  fmtOk && fmt.includes("validateSong"),
  fmtOk ? "expected validateSong guard" : "skipped: file missing"
);
check(
  "format exports validateSfx",
  fmtOk && fmt.includes("validateSfx"),
  fmtOk ? "expected validateSfx guard" : "skipped: file missing"
);
check(
  "format exports sizeOf",
  fmtOk && /\bsizeOf\b/.test(fmt),
  fmtOk ? "expected sizeOf helper" : "skipped: file missing"
);
check(
  "format exports transpose",
  fmtOk && /\btranspose\b/.test(fmt),
  fmtOk ? "expected transpose helper" : "skipped: file missing"
);
check(
  "format carries MAX_SONG_BYTES budget (8192)",
  fmtOk && fmt.includes("MAX_SONG_BYTES") && fmt.includes("8192"),
  fmtOk ? "expected MAX_SONG_BYTES = 8192" : "skipped: file missing"
);
check(
  "format carries MAX_SFX_BYTES budget (1024)",
  fmtOk && fmt.includes("MAX_SFX_BYTES") && fmt.includes("1024"),
  fmtOk ? "expected MAX_SFX_BYTES = 1024" : "skipped: file missing"
);
check(
  "format carries encode/decode pair (encodeSong/encodeSfx + decodeSong/decodeSfx)",
  fmtOk &&
    fmt.includes("encodeSong") &&
    fmt.includes("encodeSfx") &&
    fmt.includes("decodeSong") &&
    fmt.includes("decodeSfx"),
  fmtOk ? "expected canonical encode/decode round-trip pair" : "skipped: file missing"
);

// ---- 2. synth engine (DS-MUS-02, read-only): 6 checks ----
console.log("4W-1 synth engine (DS-MUS-02, read-only):");
const synthAbs = join(root, "lib", "music", "synth-4w.ts");
const synthOk = existsSync(synthAbs);
check("lib/music/synth-4w.ts exists", synthOk, synthOk ? "" : "DS-MUS-02 synth not landed yet");
const synth = synthOk ? readAbs(synthAbs) : "";
check(
  "synth exports playSong + playSfx",
  synthOk && synth.includes("playSong") && synth.includes("playSfx"),
  synthOk ? "expected playSong/playSfx engine entry points" : "skipped: file missing"
);
check(
  "synth exports ensureAudio (lazy first-gesture ctx)",
  synthOk && synth.includes("ensureAudio"),
  synthOk ? "expected ensureAudio lazy-context entry point" : "skipped: file missing"
);
check(
  "synth is SSR-safe (typeof window guard)",
  synthOk && synth.includes('typeof window === "undefined"'),
  synthOk ? 'expected typeof window === "undefined" guard' : "skipped: file missing"
);
check(
  "synth uses WebAudio (AudioContext)",
  synthOk && synth.includes("AudioContext"),
  synthOk ? "expected AudioContext usage" : "skipped: file missing"
);
check(
  "synth has no top-level AudioContext (lazy only)",
  synthOk && !synth.includes("new AudioContext("),
  synthOk ? "found new AudioContext( — create lazily via ensureAudio instead" : "skipped: file missing"
);

// ---- 3. maker (DS-MUS-03/04, read-only): 5 checks ----
console.log("4W-1 maker (read-only):");
const makerPageAbs = join(root, "app", "music", "maker", "page.tsx");
const makerClientAbs = join(root, "app", "music", "maker", "maker-client.tsx");
const makerPageOk = existsSync(makerPageAbs);
const makerClientOk = existsSync(makerClientAbs);
const makerPage = makerPageOk ? readAbs(makerPageAbs) : "";
check(
  "maker page.tsx exists + renders maker client",
  makerPageOk && /MakerShell|MakerClient|maker-client/.test(makerPage),
  makerPageOk ? "expected page to render MakerShell/MakerClient" : "maker page not landed yet"
);
check(
  "maker maker-client.tsx exists",
  makerClientOk,
  makerClientOk ? "" : "maker client not landed yet"
);
const makerClient = makerClientOk ? readAbs(makerClientAbs) : "";
check(
  "maker-client has client boundary",
  makerClientOk && /^\s*"use client"/m.test(makerClient.split("\n").slice(0, 3).join("\n")),
  makerClientOk ? 'expected "use client" first line' : "skipped: file missing"
);
check(
  "maker-client carries budget meter (MAX_SONG_BYTES + bytes)",
  makerClientOk && makerClient.includes("MAX_SONG_BYTES") && /bytes/.test(makerClient),
  makerClientOk ? "expected byte-meter reading against MAX_SONG_BYTES" : "skipped: file missing"
);
check(
  "maker-client carries bot/share contract (?song= share link)",
  makerClientOk && /\?song=|share link|Shared song|\/api\/music/i.test(makerClient),
  makerClientOk ? "expected ?song= share-link / bot contract" : "skipped: file missing"
);

// ---- 4. gallery (DS-MUS-05, read-only): 4 checks ----
console.log("4W-1 gallery (read-only):");
const allPageAbs = join(root, "app", "music", "all", "page.tsx");
const galleryAbs = join(root, "app", "music", "all", "gallery-client.tsx");
const allPageOk = existsSync(allPageAbs);
const galleryOk = existsSync(galleryAbs);
check("all page.tsx exists", allPageOk, allPageOk ? "" : "gallery page not landed yet");
check(
  "all gallery-client.tsx exists",
  galleryOk,
  galleryOk ? "" : "gallery client not landed yet"
);
const gallery = galleryOk ? readAbs(galleryAbs) : "";
check(
  "gallery-client has client boundary",
  galleryOk && /^\s*"use client"/m.test(gallery.split("\n").slice(0, 3).join("\n")),
  galleryOk ? 'expected "use client" first line' : "skipped: file missing"
);
check(
  "gallery-client carries gallery-list token (GET /api/music/list)",
  galleryOk && gallery.includes("/api/music/list"),
  galleryOk ? "expected GET /api/music/list seed fetch" : "skipped: file missing"
);

// ---- 5. components (read-only): 6 checks ----
console.log("4W-1 components (read-only):");
const waveAbs = join(root, "components", "music", "wave-editor.tsx");
const sfxAbs = join(root, "components", "music", "sfx-studio.tsx");
const waveOk = existsSync(waveAbs);
const sfxStudioOk = existsSync(sfxAbs);
check(
  "components/music/wave-editor.tsx exists",
  waveOk,
  waveOk ? "" : "wave editor not landed yet"
);
check(
  "components/music/sfx-studio.tsx exists",
  sfxStudioOk,
  sfxStudioOk ? "" : "sfx studio not landed yet"
);
const wave = waveOk ? readAbs(waveAbs) : "";
const sfxStudio = sfxStudioOk ? readAbs(sfxAbs) : "";
check(
  "wave-editor has client boundary",
  waveOk && /^\s*"use client"/m.test(wave.split("\n").slice(0, 3).join("\n")),
  waveOk ? 'expected "use client" first line' : "skipped: file missing"
);
check(
  "sfx-studio has client boundary",
  sfxStudioOk && /^\s*"use client"/m.test(sfxStudio.split("\n").slice(0, 3).join("\n")),
  sfxStudioOk ? 'expected "use client" first line' : "skipped: file missing"
);
check(
  "wave-editor carries waveform token",
  waveOk && /waveform/i.test(wave),
  waveOk ? "expected waveform render/select path" : "skipped: file missing"
);
check(
  "sfx-studio carries sfx-model token (Sfx4W + budget)",
  sfxStudioOk &&
    sfxStudio.includes("Sfx4W") &&
    (sfxStudio.includes("validateSfx") || sfxStudio.includes("MAX_SFX_BYTES") || sfxStudio.includes("1024")),
  sfxStudioOk ? "expected Sfx4W model + 1024B budget mirror" : "skipped: file missing"
);

// ---- 6. api routes (read-only, recursive): 5 checks ----
console.log("4W-1 api routes (read-only):");
const apiDir = join(root, "app", "api", "music");
const routeFiles = collectRouteFiles(apiDir);
check(
  "app/api/music carries >=1 route.ts",
  routeFiles.length >= 1,
  routeFiles.length >= 1 ? "" : "api/music routes not landed yet"
);
const apiSrc = routeFiles.map((f) => { try { return readAbs(f); } catch { return ""; } }).join("\n");
const apiLanded = routeFiles.length >= 1;
check(
  "api/music serves GET contract",
  apiLanded && /export\s+(async\s+)?function\s+GET/.test(apiSrc),
  apiLanded ? "expected export function GET in a route.ts" : "skipped: no route.ts yet"
);
check(
  "api/music serves POST contract",
  apiLanded && /export\s+(async\s+)?function\s+POST/.test(apiSrc),
  apiLanded ? "expected export function POST in a route.ts" : "skipped: no route.ts yet"
);
check(
  "api/music POST is stateless-validate",
  apiLanded && /stateless/i.test(apiSrc) && /validat/i.test(apiSrc),
  apiLanded ? "expected stateless validate path (no writes)" : "skipped: no route.ts yet"
);
check(
  "api/music returns JSON responses",
  apiLanded && apiSrc.includes("NextResponse.json"),
  apiLanded ? "expected NextResponse.json" : "skipped: no route.ts yet"
);

// ---- 7. game loader (read-only): 5 checks ----
console.log("4W-1 game loader (read-only):");
const loaderAbs = join(root, "public", "games", "shared", "music4w.js");
const loaderOk = existsSync(loaderAbs);
check("public/games/shared/music4w.js exists", loaderOk, loaderOk ? "" : "game loader not landed yet");
check(
  "music4w.js node --check",
  loaderOk && syntaxOk(loaderAbs),
  loaderOk ? "syntax error — run node --check on the file" : "skipped: file missing"
);
const loader = loaderOk ? readAbs(loaderAbs) : "";
check(
  "music4w.js exposes window.Music4W",
  loaderOk && /window\.Music4W\b/.test(loader),
  loaderOk ? "expected window.Music4W assignment" : "skipped: file missing"
);
check(
  "music4w.js has idempotent guard",
  loaderOk && /if\s*\(\s*window\.Music4W\s*\)/.test(loader),
  loaderOk ? "expected if (window.Music4W) return;" : "skipped: file missing"
);
check(
  "music4w.js carries budget tokens (8192 + 1024)",
  loaderOk && loader.includes("8192") && loader.includes("1024"),
  loaderOk ? "expected 8192B song + 1024B sfx budgets" : "skipped: file missing"
);

// ---- 8. seeds (read-only): 3 checks ----
console.log("4W-1 seeds (read-only):");
const seedsAbs = join(root, "content", "music-seeds.ts");
const seedsOk = existsSync(seedsAbs);
check("content/music-seeds.ts exists", seedsOk, seedsOk ? "" : "music seeds not landed yet");
const seeds = seedsOk ? readAbs(seedsAbs) : "";
const seedExports = seedsOk ? (seeds.match(/^export const \w+/gm) || []).length : 0;
check(
  "music-seeds.ts carries >=2 seed exports",
  seedsOk && seedExports >= 2,
  seedsOk ? `expected >=2 seed exports, found ${seedExports}` : "skipped: file missing"
);
let seedsBytes = -1;
if (seedsOk) {
  try {
    seedsBytes = statSync(seedsAbs).size;
  } catch {
    seedsBytes = -1;
  }
}
check(
  "music-seeds.ts file byte-size <=256KB",
  seedsOk && seedsBytes >= 0 && seedsBytes <= 256 * 1024,
  seedsOk ? `expected <=262144 bytes, got ${seedsBytes}` : "skipped: file missing"
);

// ---- 9. no-secret scan (read-only): 1 check ----
console.log("4W-1 no-secret scan (read-only):");
const SECRET_RE = /(?<![A-Za-z0-9_])sk-[A-Za-z0-9\-_]{20,}/;
const secretFiles = [
  fmtAbs,
  synthAbs,
  makerPageAbs,
  makerClientAbs,
  allPageAbs,
  galleryAbs,
  waveAbs,
  sfxAbs,
  loaderAbs,
  seedsAbs,
  ...routeFiles,
].filter((f) => existsSync(f));
const secretHits = [];
for (const f of secretFiles) {
  let src = "";
  try {
    src = readAbs(f);
  } catch {
    continue;
  }
  if (SECRET_RE.test(src)) {
    secretHits.push(f.split("\\").join("/").split("/v2/vcw4w/").pop());
  }
}
check(
  `no secrets in ${secretFiles.length} 4W-1 file(s)`,
  secretHits.length === 0,
  secretHits.length === 0 ? "" : `suspected secret in: ${secretHits.join(", ")}`
);

if (failures) {
  console.error(`verify-music-4w FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-music-4w OK: ${passes} checks passed (4W-1 format + synth + maker + gallery + components + api + loader + seeds + no-secret green).`);
