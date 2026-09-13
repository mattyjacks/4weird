// Verifies the GraveGain4D combat swarm (DS-G4DC envelopes).
// DS-G4DC-07 (infra lane) owns this file; sibling builders land concurrently,
// so EVERY check is order-independent: a missing sibling file reports
// FAIL (never throws/crashes). Exit 0 only when all present.
//
// Asserts (static text asserts, no JS execution needed):
//   1. Combat core public/games/gravegain4d/combat/combat-4d.js exists,
//      passes `node --check`, exposes window.GraveGain4DCombat, and carries
//      swing/block/charge/lunge tokens + W-tangibility gating +
//      buildWeapon reference (models by reference, never vendored).
//   2. No vendored three.min.js (or three.module.js) anywhere under
//      public/games/gravegain4d/.
//   3. Progression public/games/gravegain4d/rpg/progression-4d.js exists,
//      passes `node --check`, exposes window.GraveGain4DProgression, and
//      carries 4 races + 3 classes + XP + perk/Soul Resonance + difficulties.
//   4. Loot public/games/gravegain4d/rpg/loot-4d.js exists, passes
//      `node --check`, exposes window.GraveGain4DLoot, and carries gold +
//      UUSD + sparkite + 10:1 exchange + payout.
//   5. Bosses public/games/gravegain4d/combat/bosses-4d.js exists, passes
//      `node --check`, exposes window.GraveGain4DBosses, carries the 10
//      canon bossType names read from public/games/html/
//      gravegain_shared_missions.js (read-only) + phases + cup-seal.
//   6. Barks public/games/gravegain4d/ui/combat-barks-4d.js exists, passes
//      `node --check`, exposes window.GraveGain4DBarks, and carries canon
//      speakers (Angel/Groknak/Mirathiel/Valley) + kid/teen/all tiers.
//   7. Combat docs page app/docs/games/gravegain4d/combat/page.tsx exists
//      and is non-empty.
//
// Run from v2/vcw4w: `node scripts/verify-gravegain4d-combat.mjs`.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const g4d = join(root, "public", "games", "gravegain4d");
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

function flagPresent(src, flag) {
  return src.includes(`window.${flag}`);
}

// Recursively list files under dir (missing dir -> []), never throws.
function listFilesRecursive(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = join(dir, e);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) out = out.concat(listFilesRecursive(abs));
    else out.push(abs);
  }
  return out;
}

const MISSING = "lane not landed yet";

// ---- 1. combat core (DS-G4DC-01, read-only) ----
console.log("G4D combat core (DS-G4DC-01, read-only):");
const combatAbs = join(g4d, "combat", "combat-4d.js");
const combatOk = existsSync(combatAbs);
check("combat/combat-4d.js exists", combatOk, combatOk ? "" : `DS-G4DC-01 ${MISSING}`);
const combatSrc = combatOk ? readAbs(combatAbs) : "";
if (!combatOk) {
  check("combat-4d.js node --check", false, "skipped: file missing");
  check("window.GraveGain4DCombat exposed", false, "skipped: file missing");
} else {
  check("combat-4d.js node --check", syntaxOk(combatAbs), "syntax error — run node --check on the file");
  check(
    "window.GraveGain4DCombat exposed",
    flagPresent(combatSrc, "GraveGain4DCombat"),
    "expected window.GraveGain4DCombat assignment"
  );
}
for (const tok of ["swing", "block", "charge", "lunge"]) {
  check(
    `combat carries ${tok} token`,
    combatOk && combatSrc.toLowerCase().includes(tok),
    combatOk ? `token '${tok}' not found in combat-4d.js` : "skipped: file missing"
  );
}
check(
  "combat W-tangibility gating",
  combatOk && /w[\s-_]*slice/i.test(combatSrc) && /tangib/i.test(combatSrc),
  combatOk ? "expected W-slice tangibility gating (both directions)" : "skipped: file missing"
);
check(
  "combat buildWeapon by reference",
  combatOk && combatSrc.includes("buildWeapon"),
  combatOk ? "expected buildWeapon reference (GraveGain3DModels, never copy/edit)" : "skipped: file missing"
);

// ---- 2. no vendored three under gravegain4d/ ----
console.log("G4D no-vendored-three (read-only):");
const g4dFiles = listFilesRecursive(g4d);
const vendored = g4dFiles.filter((f) => /three(\.min|\.module|\.production)?\.js$/i.test(f.split(/[/\\]/).pop()));
check(
  "no vendored three.min.js under gravegain4d/",
  existsSync(g4d) && vendored.length === 0,
  !existsSync(g4d)
    ? "public/games/gravegain4d/ missing entirely"
    : `vendored three found: ${vendored.join(", ")} — load three by reference, never vendor`
);

// ---- 3. progression (DS-G4DC-02, read-only) ----
console.log("G4D progression (DS-G4DC-02, read-only):");
const progAbs = join(g4d, "rpg", "progression-4d.js");
const progOk = existsSync(progAbs);
check("rpg/progression-4d.js exists", progOk, progOk ? "" : `DS-G4DC-02 ${MISSING}`);
const progSrc = progOk ? readAbs(progAbs) : "";
if (!progOk) {
  check("progression-4d.js node --check", false, "skipped: file missing");
  check("window.GraveGain4DProgression exposed", false, "skipped: file missing");
} else {
  check("progression-4d.js node --check", syntaxOk(progAbs), "syntax error — run node --check on the file");
  check(
    "window.GraveGain4DProgression exposed",
    flagPresent(progSrc, "GraveGain4DProgression"),
    "expected window.GraveGain4DProgression assignment"
  );
}
for (const race of ["Human", "Elf", "Dwarf", "Orc"]) {
  check(
    `progression race ${race}`,
    progOk && progSrc.includes(race),
    progOk ? `race '${race}' not found in progression-4d.js` : "skipped: file missing"
  );
}
for (const cls of ["Warrior", "Ranger", "Necromancer"]) {
  check(
    `progression class ${cls}`,
    progOk && progSrc.includes(cls),
    progOk ? `class '${cls}' not found in progression-4d.js` : "skipped: file missing"
  );
}
check(
  "progression XP",
  progOk && /xp/i.test(progSrc),
  progOk ? "expected XP token in progression-4d.js" : "skipped: file missing"
);
check(
  "progression perk/Soul Resonance",
  progOk && (/perk/i.test(progSrc) || /soul[\s-_]*resonance/i.test(progSrc)),
  progOk ? "expected perk / Soul Resonance cards in progression-4d.js" : "skipped: file missing"
);
for (const diff of ["easy", "normal", "nightmare"]) {
  check(
    `progression difficulty ${diff}`,
    progOk && progSrc.toLowerCase().includes(diff),
    progOk ? `difficulty '${diff}' not found in progression-4d.js` : "skipped: file missing"
  );
}

// ---- 4. loot (DS-G4DC-03, read-only) ----
console.log("G4D loot (DS-G4DC-03, read-only):");
const lootAbs = join(g4d, "rpg", "loot-4d.js");
const lootOk = existsSync(lootAbs);
check("rpg/loot-4d.js exists", lootOk, lootOk ? "" : `DS-G4DC-03 ${MISSING}`);
const lootSrc = lootOk ? readAbs(lootAbs) : "";
if (!lootOk) {
  check("loot-4d.js node --check", false, "skipped: file missing");
  check("window.GraveGain4DLoot exposed", false, "skipped: file missing");
} else {
  check("loot-4d.js node --check", syntaxOk(lootAbs), "syntax error — run node --check on the file");
  check(
    "window.GraveGain4DLoot exposed",
    flagPresent(lootSrc, "GraveGain4DLoot"),
    "expected window.GraveGain4DLoot assignment"
  );
}
check(
  "loot gold",
  lootOk && /gold/i.test(lootSrc),
  lootOk ? "expected gold drops in loot-4d.js" : "skipped: file missing"
);
check(
  "loot UUSD",
  lootOk && /uusd/i.test(lootSrc),
  lootOk ? "expected $UUSD drops in loot-4d.js" : "skipped: file missing"
);
check(
  "loot sparkite",
  lootOk && /sparkite/i.test(lootSrc),
  lootOk ? "expected Sparkite crystals in loot-4d.js" : "skipped: file missing"
);
check(
  "loot 10:1 exchange",
  lootOk && /10\s*:\s*1/.test(lootSrc) && /exchange/i.test(lootSrc),
  lootOk ? "expected 10:1 exchange shape in loot-4d.js" : "skipped: file missing"
);
check(
  "loot payout",
  lootOk && /payout/i.test(lootSrc),
  lootOk ? "expected payout hook in loot-4d.js" : "skipped: file missing"
);

// ---- 5. bosses (DS-G4DC-04, read-only; canon names from shared missions) ----
console.log("G4D bosses (DS-G4DC-04, read-only):");
const bossAbs = join(g4d, "combat", "bosses-4d.js");
const bossOk = existsSync(bossAbs);
check("combat/bosses-4d.js exists", bossOk, bossOk ? "" : `DS-G4DC-04 ${MISSING}`);
const bossSrc = bossOk ? readAbs(bossAbs) : "";
if (!bossOk) {
  check("bosses-4d.js node --check", false, "skipped: file missing");
  check("window.GraveGain4DBosses exposed", false, "skipped: file missing");
} else {
  check("bosses-4d.js node --check", syntaxOk(bossAbs), "syntax error — run node --check on the file");
  check(
    "window.GraveGain4DBosses exposed",
    flagPresent(bossSrc, "GraveGain4DBosses"),
    "expected window.GraveGain4DBosses assignment"
  );
}
const sharedAbs = join(root, "public", "games", "html", "gravegain_shared_missions.js");
const sharedOk = existsSync(sharedAbs);
check(
  "gravegain_shared_missions.js readable (canon source)",
  sharedOk,
  sharedOk ? "" : "shared-missions canon file missing — cannot derive bossType names"
);
let canonBosses = [];
if (sharedOk) {
  const sharedSrc = readAbs(sharedAbs);
  const re = /bossType\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(sharedSrc)) !== null) canonBosses.push(m[1]);
}
check(
  "shared missions carry 10 canon bossTypes",
  canonBosses.length === 10,
  sharedOk ? `found ${canonBosses.length}, expected 10` : "skipped: canon file missing"
);
if (!bossOk && !canonBosses.length) {
  check("bosses carry canon bossType names", false, "skipped: bosses + canon both missing");
} else {
  for (const name of canonBosses) {
    check(
      `bosses carry canon '${name}'`,
      bossOk && bossSrc.includes(name),
      bossOk ? `bossType '${name}' not found in bosses-4d.js` : "skipped: file missing"
    );
  }
  if (!canonBosses.length) {
    check("bosses carry canon bossType names", false, "skipped: canon file missing");
  }
}
check(
  "bosses phases",
  bossOk && /phase/i.test(bossSrc),
  bossOk ? "expected phase shifts in bosses-4d.js" : "skipped: file missing"
);
check(
  "bosses cup-seal",
  bossOk && /cup/i.test(bossSrc) && /seal/i.test(bossSrc),
  bossOk ? "expected cup-sealed-until-beaten-or-birdied in bosses-4d.js" : "skipped: file missing"
);

// ---- 6. barks (DS-G4DC-05, read-only) ----
console.log("G4D barks (DS-G4DC-05, read-only):");
const barksAbs = join(g4d, "ui", "combat-barks-4d.js");
const barksOk = existsSync(barksAbs);
check("ui/combat-barks-4d.js exists", barksOk, barksOk ? "" : `DS-G4DC-05 ${MISSING}`);
const barksSrc = barksOk ? readAbs(barksAbs) : "";
if (!barksOk) {
  check("combat-barks-4d.js node --check", false, "skipped: file missing");
  check("window.GraveGain4DBarks exposed", false, "skipped: file missing");
} else {
  check("combat-barks-4d.js node --check", syntaxOk(barksAbs), "syntax error — run node --check on the file");
  check(
    "window.GraveGain4DBarks exposed",
    flagPresent(barksSrc, "GraveGain4DBarks"),
    "expected window.GraveGain4DBarks assignment"
  );
}
for (const speaker of ["Angel", "Groknak", "Mirathiel", "Valley"]) {
  check(
    `barks speaker ${speaker}`,
    barksOk && barksSrc.includes(speaker),
    barksOk ? `speaker '${speaker}' not found in combat-barks-4d.js` : "skipped: file missing"
  );
}
for (const tier of ["kid", "teen", "all"]) {
  check(
    `barks tier ${tier}`,
    barksOk && barksSrc.toLowerCase().includes(tier),
    barksOk ? `tier '${tier}' not found in combat-barks-4d.js` : "skipped: file missing"
  );
}

// ---- 7. combat docs page (DS-G4DC-06, read-only) ----
console.log("G4D combat docs (DS-G4DC-06, read-only):");
const docsAbs = join(root, "app", "docs", "games", "gravegain4d", "combat", "page.tsx");
const docsOk = existsSync(docsAbs);
check(
  "app/docs/games/gravegain4d/combat/page.tsx exists",
  docsOk,
  docsOk ? "" : `DS-G4DC-06 ${MISSING}`
);
let docsNonEmpty = false;
if (docsOk) {
  try {
    docsNonEmpty = readAbs(docsAbs).trim().length > 0;
  } catch {
    docsNonEmpty = false;
  }
}
check(
  "combat docs page non-empty",
  docsNonEmpty,
  docsOk ? "page.tsx is empty" : "skipped: file missing"
);

if (failures) {
  console.error(`verify-gravegain4d-combat FAILED: ${failures} check(s), ${passes} passed.`);
  process.exit(1);
}
console.log(`verify-gravegain4d-combat OK: ${passes} checks passed (combat + progression + loot + bosses + barks + docs green).`);
