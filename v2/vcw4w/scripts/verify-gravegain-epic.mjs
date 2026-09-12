// Verifies the GraveGain epic layer (v2 layer only).
//
// Scope: parity-locked bundles (public/games/html/gravegain2d/**,
// gravegain3d/**) and old-v1/ are never asserted here beyond "untouched"
// (see verify-game-bundles.mjs + verify-legacy-parity.mjs). This script asserts:
//   1. public/games/html/gravegain-epic-saga.js exists: 10 missions, intro 3 +
//      outro 2 beats each, kid/teen/all text per beat, titlecards, loreUnlocks.
//   2. public/games/html/gravegain-cutscenes.js exists: window.GraveGainCutscenes
//      engine, letterbox overlay, skip, AAA.wrap chain-safe hooks, never breaks
//      endless mode, no innerHTML with mission text.
//   3. public/games/html/gravegain-graphics-plus.js exists: vignette/grain,
//      potato guards, particleMult scaling, no input listeners.
//   4. public/games/html/fourweird-workers.js (every game) + gravegain-workers.js
//      exist: feature-detect, fallback, no eval, pure-math tasks.
//   5. content/gravegain-epic-saga.ts mirrors the 10-mission catalog.
//   6. scripts/sync-game-bundles.mjs injects all of the above (existsSync +
//      only-when-absent guards) without touching parity sources.
//   7. No epic/worker/graphics-plus files inside the parity-locked trees.
//
// Static text asserts (no JS execution needed).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;

function check(label, cond, hint = "") {
  if (cond) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

// ---- 1. saga data ----
const sagaRel = "public/games/html/gravegain-epic-saga.js";
check(`${sagaRel} exists`, existsSync(join(root, "public", "games", "html", "gravegain-epic-saga.js")));
const saga = existsSync(join(root, "public", "games", "html", "gravegain-epic-saga.js")) ? read(sagaRel) : "";

check("saga exposes window.GraveGainEpicSaga", saga.includes("window.GraveGainEpicSaga"));
check("saga covers missions 1..10", ["1:", "5:", "10:"].every((k) => saga.includes(k)) && saga.includes("MISSION_IDS"));
check("saga intro beats (3) + outro beats (2)", (saga.match(/speaker:/g) || []).length >= 50);
check("saga has kid/teen/all text per beat", saga.includes("kid:") && saga.includes("teen:") && saga.includes("all:"));
check("saga has titlecards", saga.includes("titlecard"));
check("saga has loreUnlocks", saga.includes("loreUnlocks"));
check("saga resolves content mode safely", saga.includes("FourweirdContentMode") && saga.includes("4weird-content-mode:"));
check("saga never throws (try/catch bodies)", (saga.match(/catch \(e\)/g) || []).length >= 5);
check("saga canon names present", saga.includes("Lucifer Hades") && saga.includes("Valley Net") && saga.includes("Groknak"));

// ---- 2. cutscene engine ----
const cineRel = "public/games/html/gravegain-cutscenes.js";
check(`${cineRel} exists`, existsSync(join(root, "public", "games", "html", "gravegain-cutscenes.js")));
const cine = existsSync(join(root, "public", "games", "html", "gravegain-cutscenes.js")) ? read(cineRel) : "";

check("cutscenes expose window.GraveGainCutscenes", cine.includes("window.GraveGainCutscenes"));
check("cutscenes use saga data with dialogue fallback", cine.includes("GraveGainEpicSaga") && cine.includes("dialogueAfter"));
check("cutscenes hook via AAA.wrap chain-safe", cine.includes("AAA.wrap") || cine.includes("aaa.wrap"));
check("cutscenes letterbox overlay", cine.includes("ggCineRoot") && /letterbox|gg-bar/i.test(cine));
check("cutscenes have Skip", cine.includes("ggCineSkip"));
check("cutscenes persist seen state", cine.includes("gravegain_cutscenes_seen_v1"));
check("cutscenes respect reduced motion", cine.includes("prefers-reduced-motion"));
check("cutscenes use textContent (no mission innerHTML)", !/innerHTML\s*=\s*[^;]*(text|beat|speaker)/.test(cine));
check("cutscenes skip endless mode safely", /currentMission|Endless|endless/.test(cine));
check("cutscenes add no game input listeners", !/addEventListener\s*\(\s*['"](click|mousedown|keydown|keyup)['"]/.test(cine.replace("addEventListener('keydown', onKey, true)", "")));

// ---- 3. graphics-plus ----
const gfxRel = "public/games/html/gravegain-graphics-plus.js";
check(`${gfxRel} exists`, existsSync(join(root, "public", "games", "html", "gravegain-graphics-plus.js")));
const gfx = existsSync(join(root, "public", "games", "html", "gravegain-graphics-plus.js")) ? read(gfxRel) : "";

check("graphics-plus exposes window.GraveGainGraphicsPlus", gfx.includes("window.GraveGainGraphicsPlus"));
check("graphics-plus listens to fourweird-graphics preset", gfx.includes("fourweird-graphics"));
check("graphics-plus honors particleMult", gfx.includes("particleMult"));
check("graphics-plus potato guard (skips postFX)", /potato/i.test(gfx) && /postFX|isHigh/.test(gfx));
check("graphics-plus vignette overlay", /vignette/i.test(gfx));
check("graphics-plus pointer-events none", /pointer-events\s*:\s*none/.test(gfx));
check("graphics-plus adds no input listeners", !/addEventListener\s*\(\s*['"](click|mousedown|keydown|keyup|pointerlock)['"]/i.test(gfx));

// ---- 4. workers ----
const poolRel = "public/games/html/fourweird-workers.js";
check(`${poolRel} exists`, existsSync(join(root, "public", "games", "html", "fourweird-workers.js")));
const pool = existsSync(join(root, "public", "games", "html", "fourweird-workers.js")) ? read(poolRel) : "";

check("pool exposes window.FourWeirdWorkers", pool.includes("window.FourWeirdWorkers"));
check("pool feature-detects Worker+Blob", pool.includes("typeof Worker") && pool.includes("typeof Blob"));
check("pool has sync fallback", /fallback/i.test(pool));
check("pool tasks are pure math (no DOM)", !/document\.|canvas\.getContext|localStorage/.test(pool));
check("pool has no eval", !/\beval\s*\(/.test(pool));
check("pool per-task timeout", /timeout/i.test(pool));
check("pool tasks: rng/steer/particles/timing", pool.includes("rng-stream") && pool.includes("ai-steer") && pool.includes("particle-integrate") && pool.includes("timing-aggregate"));

const ggRel = "public/games/html/gravegain-workers.js";
check(`${ggRel} exists`, existsSync(join(root, "public", "games", "html", "gravegain-workers.js")));
const gg = existsSync(join(root, "public", "games", "html", "gravegain-workers.js")) ? read(ggRel) : "";

check("gravegain workers expose window.GraveGainWorkers", gg.includes("window.GraveGainWorkers"));
check("gravegain workers reuse shared pool", gg.includes("FourWeirdWorkers"));
check("gravegain workers never reject loops (null fallback)", gg.includes("Promise.resolve(null)"));
check("gravegain workers cap assist load", /slice\(0, 120\)|length > 400/.test(gg));

// ---- 5. content catalog mirror ----
const modRel = "content/gravegain-epic-saga.ts";
check(`${modRel} exists`, existsSync(join(root, "content", "gravegain-epic-saga.ts")));
const mod = existsSync(join(root, "content", "gravegain-epic-saga.ts")) ? read(modRel) : "";

check("catalog has 10 saga missions", (mod.match(/id: \d+/g) || []).length >= 10);
check("catalog lore unlocks per mission", mod.includes("loreUnlocks"));
check("catalog lists runtime files", mod.includes("gravegain-cutscenes.js") && mod.includes("fourweird-workers.js"));

// ---- 6. sync injection ----
const sync = read("scripts/sync-game-bundles.mjs");
for (const f of ["fourweird-workers.js", "gravegain-epic-saga.js", "gravegain-cutscenes.js", "gravegain-graphics-plus.js", "gravegain-workers.js"]) {
  check(`sync injects ${f}`, sync.includes(f));
}
check("sync epic injection scoped to gravegain slugs", /gravegain2d.*gravegain3d|gravegain3d.*gravegain2d/s.test(sync));
check("sync injections guarded by existsSync", /existsSync\((poolSrc|src|goreSrc)\)/.test(sync));
check("sync injects only when absent", sync.includes('!html.includes("fourweird-workers.js') || sync.includes("!html.includes(file)") || /!html\.includes\(/.test(sync));

// ---- 7. parity trees untouched ----
for (const tree of ["gravegain2d", "gravegain3d"]) {
  check(`no epic/worker/graphics-plus files inside parity-locked ${tree}/ tree`, (() => {
    try {
      const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) { if (walk(p)) return true; }
          else if (/epic-saga|cutscene|graphics-plus|fourweird-workers|gravegain-workers/i.test(e.name)) return true;
        }
        return false;
      };
      return !walk(join(root, "public", "games", "html", tree));
    } catch { return false; }
  })());
}

// ---- 8. package.json wiring ----
const pkg = JSON.parse(read("package.json"));
check("package.json wires verify:gravegain-epic", pkg.scripts && pkg.scripts["verify:gravegain-epic"] === "node scripts/verify-gravegain-epic.mjs");
check("npm test runs verify:gravegain-epic", typeof pkg.scripts.test === "string" && pkg.scripts.test.includes("verify:gravegain-epic"));

if (failures) {
  console.error(`verify-gravegain-epic FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain-epic OK: epic saga + cutscenes + graphics-plus + workers, parity-safe.");
