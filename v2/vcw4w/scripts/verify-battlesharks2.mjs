// Verifies the BattleSharks2 DESKTOP + PERFORMANCE + ACCESS layer (v2 only).
//
// Scope: the parity-locked bundle (public/games/html/battlesharks2/**) and
// old-v1/ are never asserted here beyond "untouched" (see
// verify-game-bundles.mjs + verify-legacy-parity.mjs). This script asserts:
//   1. public/games/html/battlesharks2-desktop.js exists: vanilla IIFE, no
//      imports, defensive try/catch throughout.
//   2. DESKTOP keyboard: remappable hold-to-fire on Space/Ctrl, E/Tab lab
//      focus-trap, Esc/P pause parity via fourweird-pause/resume.
//   3. PERFORMANCE: devicePixelRatio capped at 2, ResizeObserver, bundle
//      resizeCanvas wrapped (never edited), FPS guard degrading particles
//      on sustained rAF delta > 24ms.
//   4. ACCESS: reduced-motion via prefers-reduced-motion + fourweird-a11y /
//      host a11y postMessage, wrapping createExplosion/createBloodSplat
//      counts when present; colorblind-safe pickup legend (pattern badges,
//      never a recolor of game art).
//   5. lib/game-a11y.ts battlesharks2 row keeps slug/shape and carries the
//      keyboard + reduced-motion + colorblind tokens.
//   6. scripts/sync-game-bundles.mjs injects the layer existsSync-guarded
//      and only-when-absent.
//   7. No bundle edits: no desktop file inside the parity-locked tree and
//      the bundle sources carry none of the layer's markers.
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

const LAYER_REL = "public/games/html/battlesharks2-desktop.js";
const LAYER_ABS = join(root, "public", "games", "html", "battlesharks2-desktop.js");

// ---- 1. layer exists, vanilla IIFE, defensive ----
check(`${LAYER_REL} exists`, existsSync(LAYER_ABS));
const layer = existsSync(LAYER_ABS) ? read(LAYER_REL) : "";
check("layer is a vanilla IIFE", /\(function\s*\(\)\s*\{/.test(layer) && /\}\)\(\);?\s*$/.test(layer.trim()));
check("layer has no imports/exports (vanilla)", !/^\s*import\s/m.test(layer) && !/export\s+(default|const|function)/.test(layer));
check("layer is defensive (try/catch throughout)", (layer.match(/catch\s*\(e\)/g) || []).length >= 10);
check("layer guards missing canvas", /gameCanvas/.test(layer) && /no-canvas/.test(layer));

// ---- 2. DESKTOP keyboard ----
check("remappable hold-to-fire on Space/Ctrl", /Space/.test(layer) && /Control/.test(layer) && /fireKeys/.test(layer) && /battlesharks2-desktop:fireKeys/.test(layer));
check("fire prefers bundle fireWeapon with synthetic fallback", /fireWeapon/.test(layer) && /mousedown/.test(layer));
check("E/Tab lab focus-trap (capture, no bundle toggle leak)", /rdLabOverlay/.test(layer) && /stopPropagation/.test(layer) && /focusablesIn/.test(layer));
check("Esc closes lab without toggling pause", /Escape/.test(layer) && /toggleLab/.test(layer));
check("Esc/P pause parity via host events", /fourweird-pause/.test(layer) && /fourweird-resume/.test(layer) && /togglePause/.test(layer));

// ---- 3. PERFORMANCE ----
check("DPI cap (devicePixelRatio capped at 2)", /devicePixelRatio/.test(layer) && /DPR_CAP/.test(layer) && layer.includes("Math.min") && /2/.test(layer));
check("ResizeObserver + window resize", /ResizeObserver/.test(layer) && /addEventListener\("resize"/.test(layer) || /addEventListener\('resize'/.test(layer));
check("bundle resizeCanvas wrapped, never edited", /window\.resizeCanvas/.test(layer) && /__bs2Wrapped/.test(layer));
check("FPS guard (sustained delta > 24ms degrades particles)", />\s*24/.test(layer) && /fpsScale/.test(layer) && /particleScale/.test(layer));

// ---- 4. ACCESS ----
check("reduced-motion hook (media query + host a11y events)", /prefers-reduced-motion/.test(layer) && /fourweird-a11y/.test(layer) && /type:\s*"a11y"|type:"a11y"/.test(layer));
check("shake damped via CSS kill + class strip", /shake-screen/.test(layer) && /animation:none/.test(layer));
check("particle counts wrapped when present", /createExplosion/.test(layer) && /createBloodSplat/.test(layer) && /effectiveCount/.test(layer));
check("colorblind-safe pickup legend (pattern badges, no recolor)", /bs2PickupLegend/.test(layer) && /dashed/.test(layer) && /dotted/.test(layer) && /GEAR/.test(layer) && /FLASK/.test(layer));
check("legend never recolours game art", !/ctx\.fillStyle\s*=/.test(layer) && !/feColorMatrix/.test(layer));

// ---- 5. a11y row ----
const meta = read("lib/game-a11y.ts");
const rowMatch = meta.match(/battlesharks2:\s*\{[\s\S]*?\},/);
check("battlesharks2 row exists", !!rowMatch);
const row = rowMatch ? rowMatch[0] : "";
check("row keeps slug/shape", row.includes('slug: "battlesharks2"') && row.includes("keyboardOnly: false") && row.includes("colorDependent: true") && row.includes("photosensitive: true"));
for (const token of ["Space", "Ctrl", "reduced-motion", "colorblind", "focus-trap"]) {
  check(`row carries ${token} token`, row.includes(token));
}

// ---- 6. sync injection ----
const sync = read("scripts/sync-game-bundles.mjs");
check("sync injects battlesharks2-desktop.js", sync.includes("battlesharks2-desktop.js"));
check("sync injection is existsSync-guarded", /existsSync\(bs2DesktopSrc\)/.test(sync));
check("sync injection is only-when-absent", /!html\.includes\("battlesharks2-desktop\.js"\)/.test(sync));
check("sync source is the html sibling (not the locked tree)", sync.includes('"public", "games", "html", "battlesharks2-desktop.js"'));

// ---- 7. no bundle edits ----
const lockedDir = join(root, "public", "games", "html", "battlesharks2");
let lockedNames = [];
try { lockedNames = readdirSync(lockedDir); } catch { lockedNames = []; }
check("no desktop file inside the parity-locked tree", !lockedNames.some((n) => /desktop/i.test(n)));
for (const f of ["game.js", "index.html", "game.css"]) {
  const src = read(`public/games/html/battlesharks2/${f}`);
  check(`${f} carries no layer markers`, !/bs2Desktop|battlesharks2-desktop|__bs2/.test(src), "bundle must stay byte-identical");
}

// ---- 8. package wiring ----
const pkg = read("package.json");
check("package.json wires verify:battlesharks2", pkg.includes("verify:battlesharks2"));

// ---- 9. V2 SHELL INTEGRATION (shell lane; additive, honest) ----
// Refreshed playbook copy, BS2_GUIDE export, generic manifest/catalog
// resolution, unchanged Teens rating. Sibling overlays (mobile joystick,
// desktop/perf/a11y, lore codex) live outside the locked tree and are
// asserted by their own sections above — this section covers shell copy
// only and never their overlays.
const shellPlaybook = read("lib/game-playbooks.ts");
const shellBs2 = shellPlaybook.slice(shellPlaybook.indexOf("battlesharks2: {"));
check("shell: playbook has battlesharks2 entry", shellBs2.length > 500);
for (const token of [
  "on-screen joystick steers",
  "E / Tab R&D Lab hub",
  "needs Jet Engine",
  "Esc / P pause",
  "ROBO-KRAKEN",
  "LAUNCH SHARK",
  "between fights, never mid-swarm",
  "biomass per minute",
  "Laser Cannon (20 debris)",
  "Jet Engine (30 debris + 10 biomass)",
]) {
  check(`shell: playbook copy "${token}"`, shellBs2.includes(token));
}
const shellGuide = read("content/battlesharks2-guide.ts");
check("shell: BS2_GUIDE exported", shellGuide.includes("BS2_GUIDE"));
for (const id of ['id: "controls"', 'id: "economy"', 'id: "boss"', 'id: "mobile"']) {
  check(`shell: BS2_GUIDE section ${id}`, shellGuide.includes(id));
}
check("shell: guide documents the served-runtime joystick", /joystick/i.test(shellGuide));
const shellManifests = read("content/game-manifests.ts");
check("shell: generic manifest resolver intact", shellManifests.includes("getGameManifest") && shellManifests.includes("Object.fromEntries(games"));
check("shell: no phantom per-game override for battlesharks2", !shellManifests.includes("battlesharks2"));
const shellCatalog = read("content/games.ts");
check("shell: catalog row + blurb intact", shellCatalog.includes("battlesharks2") && shellCatalog.includes("Mutate your shark with cybernetic weapons"));
const shellAge = read("lib/age-gate.ts");
check("shell: rating stays teens (no rating change)", shellAge.includes('battlesharks2: "teens"'));
const shellAi = read("lib/game-ai.ts");
check("shell: mutation-announcer blurb intact", shellAi.includes('gameSlug: "battlesharks2"') && shellAi.includes("Mutation announcer"));

// ---- 10. GAMEPLAY SYSTEMS: tuning overlay + balance tables (tune lane) ----
// Overlay: public/games/html/battlesharks2-tune.js (vanilla IIFE, injected
// into the generated bundle only). Balance: content/battlesharks2-balance.ts
// (pure data + helpers). The parity-locked battlesharks2/ tree stays clean.
const TUNE_REL = "public/games/html/battlesharks2-tune.js";
const TUNE_ABS = join(root, "public", "games", "html", "battlesharks2-tune.js");
check(`${TUNE_REL} exists`, existsSync(TUNE_ABS));
const tune = existsSync(TUNE_ABS) ? read(TUNE_REL) : "";
check("tune overlay is a vanilla IIFE", /\(function\s*\(\)\s*\{/.test(tune) && /(\}\(\)\)|\}\)\(\))\s*;?\s*$/.test(tune.trim()));
check("tune overlay has no imports/exports (vanilla)", !/^\s*import\s/m.test(tune) && !/export\s+(default|const|function)/.test(tune));
check("tune overlay is idempotent (window.BS2Tune guard)", tune.includes("window.BS2Tune"));
check("tune overlay is defensive (try/catch throughout)", (tune.match(/catch\s*\(e\d*\)/g) || []).length >= 10);
check("tune overlay wraps buyUpgrade defensively", /typeof window\.buyUpgrade/.test(tune) && /window\.buyUpgrade\s*=\s*wrapped/.test(tune) && /__bs2Wrapped/.test(tune));
check("tune overlay wraps spawn paths defensively", /typeof window\.spawnEnemy/.test(tune) && /typeof window\.spawnFloatingCollectibles/.test(tune) && tune.includes("window.spawnAquariumItem"));
check("tune overlay never throttles prey economy", !tune.includes("spawnPrey"));
check("tune overlay never changes prices (no bundle state writes)", !/state\.(debris|biomass|mutagens)\s*-=/.test(tune) && !/state\.(debris|biomass|mutagens)\s*\+=/.test(tune) && !/state\.(debris|biomass|mutagens)\s*=/.test(tune));
check("tune overlay steals no input (no key/pointer listeners, no preventDefault)", !/addEventListener\(["'](keydown|keyup|mousedown|mouseup|touchstart|touchmove|touchend)["']/.test(tune) && !/preventDefault/.test(tune));
check("tune boss director (pre-boss toast + defeat celebration)", /window\.triggerBossAlert/.test(tune) && /ROBO-KRAKEN DESTROYED/.test(tune) && /typeof window\.createExplosion/.test(tune));
check("tune juice (combo + hit-stop + heartbeat vignette)", /COMBO/.test(tune) && /hitstop|hit-stop/i.test(tune) && /vignette/i.test(tune) && /pointer-events:none/.test(tune));
check("tune overlay disables itself when globals absent", /active === false|stay disabled|stays disabled/.test(tune) && /attempts/.test(tune));

const BAL_REL = "content/battlesharks2-balance.ts";
const BAL_ABS = join(root, "content", "battlesharks2-balance.ts");
check(`${BAL_REL} exists`, existsSync(BAL_ABS));
const bal = existsSync(BAL_ABS) ? read(BAL_REL) : "";
for (const token of ["BS2_PREY", "BS2_ENEMIES", "BS2_UPGRADES", "BS2_AQUARIUM", "BS2_DIFFICULTY_CURVE", "upgradeValue", "buildOrder"]) {
  check(`balance exports ${token}`, bal.includes(token));
}
for (const name of ["starter", "speedrunner", "tank"]) {
  check(`balance build order "${name}"`, bal.includes(`"${name}"`));
}
// Balance costs must match bundle truth (game.js buyUpgrade/spawnAquariumItem).
const bundle = read("public/games/html/battlesharks2/game.js");
const COST_PAIRS = [
  ["lasers", "debris: 20", /type === 'lasers' && state\.debris >= 20/],
  ["thruster", "debris: 30", /type === 'thruster' && state\.debris >= 30 && state\.biomass >= 10/],
  ["shield", "debris: 40", /type === 'shield' && state\.debris >= 40 && state\.mutagens >= 1/],
  ["missiles", "debris: 50", /type === 'missiles' && state\.debris >= 50 && state\.mutagens >= 2/],
  ["electric", "biomass: 35", /type === 'electric' && state\.biomass >= 35 && state\.mutagens >= 1/],
  ["acid", "biomass: 25", /type === 'acid' && state\.biomass >= 25 && state\.mutagens >= 2/],
  ["scales", "biomass: 50", /type === 'scales' && state\.biomass >= 50/],
  ["coral", "biomass: 15", /itemType === 'coral' && state\.biomass >= 15/],
  ["wreckage", "debris: 20", /itemType === 'wreckage' && state\.debris >= 20/],
  ["vent", "biomass: 30", /itemType === 'vent' && state\.biomass >= 30 && state\.debris >= 15/],
];
for (const [id, balToken, bundleRe] of COST_PAIRS) {
  check(`balance cost matches bundle: ${id} (${balToken})`, bal.includes(balToken) && bundleRe.test(bundle));
}
// Tune overlay hint costs mirror the same bundle truth (read-only).
for (const token of ["debris: 20", "debris: 30", "debris: 40", "debris: 50", "biomass: 35", "biomass: 25", "biomass: 50"]) {
  check(`tune hint costs mirror bundle (${token})`, tune.includes(token));
}
// Sync injection + generated bundle + parity tree.
check("sync injects battlesharks2-tune.js", sync.includes("battlesharks2-tune.js"));
check("sync tune injection is existsSync-guarded", /existsSync\(tuneSrc\)/.test(sync));
check("sync tune injection is only-when-absent", /!html\.includes\("battlesharks2-tune\.js"\)/.test(sync));
check("sync tune injection is slug-scoped", /slug === "battlesharks2" && !html\.includes\("battlesharks2-tune\.js"\)/.test(sync));
const genBundle = read("public/games/battlesharks2/index.html");
check("generated bundle carries the tune tag", genBundle.includes("battlesharks2-tune.js"));
check("no tune file inside the parity-locked tree", !lockedNames.some((n) => /tune/i.test(n)));
check("parity tree file set unchanged", lockedNames.length === 5 && ["game.js", "game.css", "game.json", "game_meta.json", "index.html"].every((f) => lockedNames.includes(f)), lockedNames.join(","));

if (failures) {
  console.error(`verify-battlesharks2: ${failures} failure(s).`);
  process.exit(1);
}
console.log("BattleSharks2 desktop/perf/a11y checks OK.");
console.log("BattleSharks2 shell integration checks OK (playbook + guide + manifest/catalog + teens rating).");
console.log("BattleSharks2 gameplay-systems checks OK (tune overlay + balance tables + bundle cost parity).");
