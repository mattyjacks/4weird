// Verifies the Last Words Zombies content-mode layer (slug lastwordszombies).
//
// Scope: V2 layer only. The parity-locked bundle
// (public/games/html/lastwordszombies/**) and old-v1/ are never asserted
// here beyond "untouched" (see verify-legacy-parity.mjs). This script asserts:
//   1. public/games/html/gore-lastwordszombies.js exists and branches gore by
//      mode (teen|all blood ON, kid reboot path with NO blood).
//   2. content/lastwordszombies-modes.ts exports the mode contract and gates
//      taunts / dictionary / stims (stims ONLY in "all").
//   3. scripts/sync-game-bundles.mjs injects the gore script for
//      lastwordszombies, guarded by existsSync, only when absent.
//   4. package.json wires verify:content-modes.
//
// Static text asserts (no TS compilation needed): the file is read as text
// and checked for the required exports, branches, and gating expressions.
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

// ---- 1. gore script ----
const goreRel = "public/games/html/gore-lastwordszombies.js";
check(`${goreRel} exists`, existsSync(join(root, "public", "games", "html", "gore-lastwordszombies.js")));
const gore = existsSync(join(root, "public", "games", "html", "gore-lastwordszombies.js")) ? read(goreRel) : "";

check("gore exposes window.LastWordsGore", gore.includes("window.LastWordsGore"));
check("gore reads sibling contract window.FourweirdContentMode", gore.includes("FourweirdContentMode"));
check("gore listens for fourweird-content-mode event", gore.includes("fourweird-content-mode"));
check("gore integrates window.FourweirdGore.spawn guarded", gore.includes('typeof window.FourweirdGore.spawn === "function"'));
check("gore wraps kill path (spawnExplosion)", gore.includes("spawnExplosion"));
check("gore teen|all blood branch (isBloody / zombie-blood burst)", /isBloody\(\)|cyber-blood/i.test(gore));
check("gore kid reboot branch (+1 FRIEND SAVED, bubble pop)", gore.includes("+1 FRIEND SAVED") && /bubble/i.test(gore));
check("gore kid path skips original blood burst", /isKid\(\)[\s\S]{0,400}?return;/.test(gore));
check("gore breach leaves scorch decals (teen|all)", /scorch/i.test(gore));
check("gore kid breach is a nap (no gore)", /nap/i.test(gore));
check("gore screen-shake flicker hook", gore.includes("triggerCameraShake"));
check("gore never touches locked bundle paths", !gore.includes("lastwordszombies/game.js") && !gore.includes("zombie.js"));

// ---- 2. content module ----
const modRel = "content/lastwordszombies-modes.ts";
check(`${modRel} exists`, existsSync(join(root, "content", "lastwordszombies-modes.ts")));
const mod = existsSync(join(root, "content", "lastwordszombies-modes.ts")) ? read(modRel) : "";

for (const name of ["getTaunt", "unitLine", "filterWords", "stimStatus", "LWZ_MODE_COPY", "kidWordList"]) {
  check(`content module exports ${name}`, new RegExp(`export\\s+(function|const)\\s+${name}\\b`).test(mod));
}
check("all-mode taunts include fuck + unit swears", /fuck/i.test(mod));
check("teen taunts stay mild (damn horde, no f-bombs in teen table)", mod.includes("damn horde"));
check("teen table contains no fuck", (() => {
  const teenBlock = mod.match(/teen:\s*\{[\s\S]*?\n  \},\n  all:/);
  return teenBlock ? !/fuck/i.test(teenBlock[0]) : false;
})());
check("kid taunts are cuddly (oh beans, my bones!)", mod.includes("oh beans, my bones"));
check("kidWordList is animal/color words (cat, purple)", mod.includes('"cat"') && mod.includes('"purple"'));
check("filterWords gates on kid (teen/all passthrough)", /normalizeLwzMode\(mode\) !== "kid"[\s\S]{0,80}?return words/.test(mod));
check("stims gated to all only (shared isDrugContentAllowed gate)", /isDrugContentAllowed\(m\)/.test(mod));
check("stim + battery share one price (LWZ_STIM_PRICE)", mod.includes("LWZ_STIM_PRICE") && mod.includes("extra-batteries") && mod.includes("adrenal-stims"));
check("battery blurb carries no stim lore", (() => {
  const bat = mod.match(/LWZ_BATTERY_ITEM[\s\S]*?blurb:\s*"([^"]*)"/);
  // (The shared-price const is deliberately named LWZ_STIM_PRICE — only the
  // player-facing blurb must be stim-free.)
  return !!bat && !/stim|drug|adrenal/i.test(bat[1]);
})());
check("LWZ_MODE_COPY covers kid + teen + all", mod.includes("kid:") && mod.includes("teen:") && mod.includes("all:"));
check("kid lore is naps, all lore is grim", /nap/i.test(mod) && /BREACH/i.test(mod));
check("content module imports shared contract @/lib/content-modes", /^import .*@\/lib\/content-modes/m.test(mod));
check("content module aliases shared ContentMode (LwzContentMode)", /export type LwzContentMode = ContentMode/.test(mod));
check("content module scoped to slug lastwordszombies", mod.includes("lastwordszombies"));

// ---- 3. sync injection ----
const sync = read("scripts/sync-game-bundles.mjs");
check("sync injects gore-lastwordszombies.js", sync.includes("gore-lastwordszombies.js"));
check("sync injection scoped to lastwordszombies slug", /slug === "lastwordszombies"/.test(sync));
check("sync injection guarded by existsSync", /existsSync\(goreSrc\)/.test(sync));
check("sync injects only when absent", sync.includes('!html.includes("gore-lastwordszombies.js")') || sync.includes("!html.includes('gore-lastwordszombies.js')"));

// ---- 4. package.json wiring ----
const pkg = JSON.parse(read("package.json"));
check("package.json wires verify:content-modes", pkg.scripts && pkg.scripts["verify:content-modes"] === "node scripts/verify-content-modes.mjs");

// ---- 5. GraveGain3D gore script (slug gravegain3d; v2 layer only) ----
const gg3dGoreRel = "public/games/html/gore-gravegain3d.js";
check(`${gg3dGoreRel} exists`, existsSync(join(root, "public", "games", "html", "gore-gravegain3d.js")));
const gg3dGore = existsSync(join(root, "public", "games", "html", "gore-gravegain3d.js")) ? read(gg3dGoreRel) : "";

check("gg3d gore exposes window.GraveGain3DGore", gg3dGore.includes("window.GraveGain3DGore"));
check("gg3d gore reads window.FourweirdContentMode", gg3dGore.includes("FourweirdContentMode"));
check("gg3d gore listens for fourweird-content-mode event", gg3dGore.includes("fourweird-content-mode"));
check("gg3d gore reads ?content= query param", /URLSearchParams/.test(gg3dGore));
check("gg3d gore branches on kid/teen/all", /['"]kid['"]/.test(gg3dGore) && /['"]teen['"]/.test(gg3dGore) && /['"]all['"]/.test(gg3dGore));
check("gg3d gore teen|all path has blood + floor splats", /blood/i.test(gg3dGore) && /splat/i.test(gg3dGore));
check("gg3d gore kid path has golden sparkles + praise text", /spark/i.test(gg3dGore) && gg3dGore.includes("NICE!"));
check("gg3d gore all-mode path has gib chunks", /gib/i.test(gg3dGore));
check("gg3d gore syncs to GraveGainGame kills counter", gg3dGore.includes("GraveGainGame") && gg3dGore.includes("kills"));
check("gg3d gore reuses BotInput-style enemy projection", /projectEnemy|BotInput/.test(gg3dGore));
check("gg3d gore forwards to window.FourweirdGore.spawn when present", gg3dGore.includes("FourweirdGore"));
check("gg3d gore never requests pointer lock", !/requestPointerLock/.test(gg3dGore));
check("gg3d gore overlay canvas is pointer-events:none", /pointer-events\s*:\s*none/.test(gg3dGore));
check("gg3d gore adds no click/key input listeners", !/addEventListener\s*\(\s*['"](click|mousedown|keydown|keyup)['"]/.test(gg3dGore));

// ---- 6. GraveGain3D content module ----
const gg3dModRel = "content/gravegain3d-modes.ts";
check(`${gg3dModRel} exists`, existsSync(join(root, "content", "gravegain3d-modes.ts")));
const gg3dMod = existsSync(join(root, "content", "gravegain3d-modes.ts")) ? read(gg3dModRel) : "";

for (const name of ["getDialogue", "getLoreOverride", "drugStatus", "GG3D_MODE_COPY"]) {
  check(`gg3d content module exports ${name}`, new RegExp(`export\\s+(function|const)\\s+${name}\\b`).test(gg3dMod));
}
for (const npc of ["hub-keeper", "dungeon-ghost", "orc-ally"]) {
  check(`gg3d dialogue covers NPC ${npc}`, gg3dMod.includes(`"${npc}"`));
}
const gg3dModeBlocks = (gg3dMod.match(/^\s+(kid|teen|all): \[$/gm) || []).length;
check(`gg3d dialogue has kid/teen/all variants per NPC (${gg3dModeBlocks} mode blocks, want >=9)`, gg3dModeBlocks >= 9);
for (const lore of ["world_first_grave", "goblin_brave_nix", "necro_survivor", "human_letter_home"]) {
  check(`gg3d lore override covers ${lore}`, gg3dMod.includes(`"${lore}"`));
}
check("gg3d lore overrides carry an all-mode extra grim line", /allExtraGrim/.test(gg3dMod));
check("gg3d drug spec includes dreamcap mushrooms", /dreamcap-mushrooms/.test(gg3dMod));
check("gg3d drug spec includes glowcap lantern plant for kid/teen", /glowcap-lantern-plant/.test(gg3dMod));
check("gg3d drug gating: usable in all mode, not usable in kid/teen", /usable:\s*true/.test(gg3dMod) && /usable:\s*false/.test(gg3dMod));
check("gg3d all-mode copy includes profanity tier marker", /fuck/i.test(gg3dMod));
check("gg3d no profanity in kid/teen dialogue blocks", (() => {
  const blocks = gg3dMod.match(/^\s+(kid|teen): \[(.*?)\],$/gms) || [];
  return blocks.length >= 6 && !blocks.some((b) => /\b(fuck|shit|cunt)\b/i.test(b));
})());

// ---- 7. GraveGain3D sync injection + parity lock ----
check("sync injects gore-gravegain3d.js", sync.includes("gore-gravegain3d.js"));
check("sync injection scoped to gravegain3d slug", /slug === "gravegain3d"/.test(sync));
check("sync gg3d injection guarded by existsSync", /existsSync\(goreSrc\)[\s\S]{0,120}?gore-gravegain3d|gore-gravegain3d[\s\S]{0,120}?existsSync/.test(sync) || (sync.includes("gore-gravegain3d.js") && /existsSync\(goreSrc\)/.test(sync)));
check("sync gg3d injects only when absent", sync.includes('!html.includes("gore-gravegain3d.js")') || sync.includes("!html.includes('gore-gravegain3d.js')") || /!html\.includes\(`gore-/.test(sync));
check("no gore/content-mode files inside parity-locked gravegain3d/ tree", (() => {
  try {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (walk(p)) return true; }
        else if (/gore|content-mode/i.test(e.name)) return true;
      }
      return false;
    };
    return !walk(join(root, "public", "games", "html", "gravegain3d"));
  } catch { return false; }
})());

// ---- 8. GraveGain2D gore script + content module (slug gravegain2d; v2 layer only) ----
const gg2dGoreRel = "public/games/html/gore-gravegain2d.js";
check(`${gg2dGoreRel} exists`, existsSync(join(root, "public", "games", "html", "gore-gravegain2d.js")));
const gg2dGore = existsSync(join(root, "public", "games", "html", "gore-gravegain2d.js")) ? read(gg2dGoreRel) : "";

check("gg2d gore exposes window.GraveGain2DGore", gg2dGore.includes("window.GraveGain2DGore"));
check("gg2d gore reads window.FourweirdContentMode", gg2dGore.includes("FourweirdContentMode"));
check("gg2d gore listens for fourweird-content-mode event", gg2dGore.includes("fourweird-content-mode"));
check("gg2d gore reads ?content= query param", /URLSearchParams/.test(gg2dGore));
check("gg2d gore uses per-game store key 4weird-content-mode:gravegain2d", gg2dGore.includes("4weird-content-mode:gravegain2d"));
check("gg2d gore hooks spawnBlood/spawnGore", gg2dGore.includes("spawnBlood") && gg2dGore.includes("spawnGore"));
check("gg2d gore routes via window.FourweirdGore.spawn", gg2dGore.includes("FourweirdGore"));
check("gg2d gore teen|all path has blood + decals", /blood/i.test(gg2dGore) && /decal/i.test(gg2dGore));
check("gg2d gore kid path has poof + petals (POOF!)", gg2dGore.includes("POOF") && /petal/i.test(gg2dGore));
check("gg2d gore decals capped (~150) with ~30s fade", /150/.test(gg2dGore) && /30000|30s/.test(gg2dGore));
check("gg2d gore has player-hurt edge splatter", /edge/i.test(gg2dGore));

const gg2dModRel = "content/gravegain2d-modes.ts";
check(`${gg2dModRel} exists`, existsSync(join(root, "content", "gravegain2d-modes.ts")));
const gg2dMod = existsSync(join(root, "content", "gravegain2d-modes.ts")) ? read(gg2dModRel) : "";

for (const name of ["getDialogue", "getLoreOverride", "drugStatus", "GG2D_MODE_COPY"]) {
  check(`gg2d content module exports ${name}`, new RegExp(`export\\s+(function|const|type)\\s+${name}\\b`).test(gg2dMod));
}
for (const npc of ["valley-net", "lisa-park", "warchief-groknak"]) {
  check(`gg2d dialogue covers NPC ${npc}`, gg2dMod.includes(`"${npc}"`));
}
check("gg2d dialogue has kid/teen/all variants", gg2dMod.includes("kid:") && gg2dMod.includes("teen:") && gg2dMod.includes("all:"));
for (const lore of ["world_first_grave", "necro_report", "lucifer_manifesto", "orc_regeneration"]) {
  check(`gg2d lore override covers ${lore}`, gg2dMod.includes(`"${lore}"`));
}
check("gg2d drug spec gates moonleaf to all only", /usable:\s*true/.test(gg2dMod) && /usable:\s*false/.test(gg2dMod));
check("gg2d drug spec aliases moonleaf as Mint Herb outside all", gg2dMod.includes("Mint Herb"));
check("gg2d all-mode copy includes strong language", /fuck/i.test(gg2dMod));
check("gg2d sync injects gore-gravegain2d.js", sync.includes("gore-gravegain2d.js"));
check("gg2d sync injection scoped to gravegain2d slug", /slug === "gravegain2d"/.test(sync));
check("gg2d sync injection guarded by existsSync", sync.includes("gore-gravegain2d.js") && /existsSync\(goreSrc\)/.test(sync));
check("no gore/content-mode files inside parity-locked gravegain2d/ tree", (() => {
  try {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (walk(p)) return true; }
        else if (/gore|content-mode/i.test(e.name)) return true;
      }
      return false;
    };
    return !walk(join(root, "public", "games", "html", "gravegain2d"));
  } catch { return false; }
})());

// ---- 9. LastWordsZombies shared-contract alignment + parity lock ----
check("lwz gore reads ?content= query param", gore.includes('"content"') || gore.includes("'content'"));
check("lwz gore uses per-game store key 4weird-content-mode:lastwordszombies", gore.includes("4weird-content-mode:lastwordszombies"));
check("lwz gore defaults to teen (shared safe default)", /return "teen"/.test(gore));
check("lwz gore routes via window.FourweirdGore.spawn positionally", /FourweirdGore\.spawn\(undefined, undefined, opts\)/.test(gore));
check("no gore/content-mode files inside parity-locked lastwordszombies/ tree", (() => {
  try {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (walk(p)) return true; }
        else if (/gore|content-mode/i.test(e.name)) return true;
      }
      return false;
    };
    return !walk(join(root, "public", "games", "html", "lastwordszombies"));
  } catch { return false; }
})());

if (failures) {
  console.error(`verify-content-modes FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-content-modes OK: LastWordsZombies + GraveGain3D + GraveGain2D gore + mode copy gated per spec.");
