// GraveGain2dB definition-of-done aggregator (slug gravegain2dB).
//
// Aggregates the whole 2dB lane, it does NOT re-assert what sibling
// lane verifiers own — it checks the cross-cutting DoD surface:
//   1. MISSION_IDS 1..10: campaign/m01.js .. campaign/m10.js all exist and
//      each carries entry/objective/exit tokens.
//   2. Endless rooms: at least one endless room file exists with
//      entry/objective/exit + socket/spawn surface.
//   3. Saves: 2dB-namespaced keys present (gg2db_ preferred, gravegain2dB.*
//      accepted) and ZERO live gravegain2dA key usage (see
//      verify-gravegain2dB-bundle.mjs for the live-use definition).
//   4. Modes parity STUB (fail-open: kid/teen/all sim-hash parity is owned by
//      the content-mode lane; recorded here as an explicit stub).
//   5. Manual checklist: docs/gravegain2dB-acceptance.md exists and carries
//      every required checkbox.
//   6. Bundle + harness presence: verify-gravegain2dB-bundle.mjs and
//      gravegain2dB-harness.mjs exist (this lane's own files).
//
// 1d check() style throughout; missing sibling-lane files are FAILs with a
// clear lane name (never crashes — every read is existsSync-guarded).
import { readFileSync, existsSync } from "node:fs";
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

function info(label) {
  console.log(`  info: ${label}`);
}

function read(rel) {
  try {
    return readFileSync(join(root, ...rel.split("/")), "utf8");
  } catch {
    return "";
  }
}

function present(rel) {
  return existsSync(join(root, ...rel.split("/")));
}

const dir = "public/games/gravegain2dB";

// ---- 1. MISSION_IDS 1..10 ----
const MISSION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pad = (n) => `m${String(n).padStart(2, "0")}.js`;
let missionsFound = 0;
for (const id of MISSION_IDS) {
  const rel = `${dir}/campaign/${pad(id)}`;
  const src = present(rel) ? read(rel) : "";
  const missing = !src;
  check(`mission ${id} exists (${rel})`, !missing, "campaign lane has not landed it yet");
  if (!missing) {
    missionsFound += 1;
    for (const token of ["entry", "objective", "exit"]) {
      check(`mission ${id} has ${token}`, src.includes(token));
    }
  }
}
info(`missions landed: ${missionsFound}/${MISSION_IDS.length}`);

// ---- 2. endless rooms ----
const endlessCands = [
  `${dir}/missions/endless.js`,
  `${dir}/missions/endless-room.js`,
  `${dir}/endless/room.js`,
  `${dir}/endless/rooms.js`,
];
const endlessHit = endlessCands.find((c) => present(c));
check(
  "endless room file exists",
  !!endlessHit,
  `none of ${endlessCands.join(", ")} landed yet (endless lane)`,
);
if (endlessHit) {
  const src = read(endlessHit);
  for (const token of ["entry", "objective", "exit"]) {
    check(`endless room has ${token}`, src.includes(token));
  }
  check("endless room has socket/spawn surface", /socket|spawn|portal/i.test(src));
}

// ---- 3. saves: 2dB-namespaced, never 2dA ----
const scanRoots = [`${dir}/game.js`, `${dir}/game.json`, "public/games/gravegain2dB/src/sim.js"];
const scanned = scanRoots.filter(present).map(read).join("\n");
const campaignSrc = MISSION_IDS.map((id) => {
  const rel = `${dir}/campaign/${pad(id)}`;
  return present(rel) ? read(rel) : "";
}).join("\n");
const allSrc = `${scanned}\n${campaignSrc}\n${endlessHit ? read(endlessHit) : ""}`;
check("save keys namespaced to 2dB (gg2db_ preferred)", /gg2db_/i.test(allSrc), "TODO(save-lane): canonical gg2db_ prefix not found yet");
check(
  "save keys namespaced to 2dB (gravegain2dB.* accepted)",
  /gravegain2dB[._]|gg2db_/i.test(allSrc),
  "no 2dB-namespaced save key found yet",
);
check(
  "zero live gravegain2dA key usage",
  !/(getItem|setItem|removeItem)\s*\([^)]*gravegain2dA/i.test(allSrc) &&
    !/SAVE_(NS|KEY|PREFIX|NAMESPACE)[^;\n]*gravegain2dA/i.test(allSrc),
  "a live storage path touches the 2dA namespace",
);

// ---- 4. modes parity STUB (fail-open) ----
info(
  "STUB: kid/teen/all modes parity (identical sim hash across content modes) " +
    "is owned by the content-mode lane — asserted there via the simHash helper, " +
    "not here, so parallel lanes never conflict.",
);

// ---- 5. manual checklist doc ----
const accRel = "docs/gravegain2dB-acceptance.md";
const acc = present(accRel) ? read(accRel) : "";
check("acceptance doc exists (docs/gravegain2dB-acceptance.md)", !!acc);
if (acc) {
  for (const item of [
    "onboarding",
    "destruction",
    "cautious",
    "revive",
    "rescue",
    "extract",
    "reconnect",
    "readable",
    "legible",
    "solo",
  ]) {
    check(`acceptance doc covers ${item}`, acc.toLowerCase().includes(item));
  }
}

// ---- 6. this lane's own files ----
check("bundle verifier present", present("scripts/verify-gravegain2dB-bundle.mjs"));
check("harness present (NOT in test chain)", present("scripts/gravegain2dB-harness.mjs"));

if (failures) {
  console.error(`verify-gravegain2dB-dod FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain2dB-dod OK: missions, endless, saves, checklist, and lane files all green.");
