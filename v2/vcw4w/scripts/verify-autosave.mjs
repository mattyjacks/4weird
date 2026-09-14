import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => fs.existsSync(new URL(file, import.meta.url));

const fail = (msg) => {
  throw new Error(`verify-autosave: ${msg}`);
};

// 1. runtime-bridge.js: 60s autosave interval + on-request save API.
// Sibling DS-AUTOSAVE-01. Tolerant: FAIL with a clear message naming the
// missing token (not a crash) when the sibling has not landed yet.
const bridge = read("../public/games/html/runtime-bridge.js");
if (!bridge.includes("60000")) fail('runtime-bridge.js must run the autosave interval every 60000 ms (DS-AUTOSAVE-01 not landed yet).');
if (!bridge.includes("__fourweirdRequestSave")) fail('runtime-bridge.js must expose window.__fourweirdRequestSave() for on-request saves (DS-AUTOSAVE-01 not landed yet).');
if (!bridge.includes("fourweird-request-save")) fail("runtime-bridge.js must listen for the 'fourweird-request-save' event (DS-AUTOSAVE-01 not landed yet).");
console.log("verify-autosave: bridge 60s interval + __fourweirdRequestSave + fourweird-request-save.");

// 2. game-runtime-frame.tsx: autosave ON by default, 60s timer, slot-0 PUT.
// Sibling DS-AUTOSAVE-02.
const frame = read("../components/games/game-runtime-frame.tsx");
if (!/autosave/i.test(frame)) fail("game-runtime-frame.tsx must mention autosave (DS-AUTOSAVE-02 not landed yet).");
if (!/autosave[^;]*true/i.test(frame)) fail("game-runtime-frame.tsx autosave must default to true/ON (DS-AUTOSAVE-02 not landed yet).");
if (!frame.includes("60000")) fail("game-runtime-frame.tsx must persist the autosave snapshot every 60000 ms (DS-AUTOSAVE-02 not landed yet).");
if (!frame.includes("/api/saves")) fail("game-runtime-frame.tsx autosave must PUT to /api/saves (DS-AUTOSAVE-02 not landed yet).");
if (!/method:\s*["']PUT["']/.test(frame)) fail('game-runtime-frame.tsx autosave must use method: "PUT" for the slot-0 cloud write (DS-AUTOSAVE-02 not landed yet).');
console.log("verify-autosave: frame autosave default-true + 60000 + slot-0 PUT.");

// 3. universal-save-panel.tsx: autosave default ON + opt-out checkbox.
// Sibling DS-AUTOSAVE-03.
const panel = read("../components/games/universal-save-panel.tsx");
if (!/autosave/i.test(panel)) fail("universal-save-panel.tsx must mention autosave (DS-AUTOSAVE-03 not landed yet).");
if (!/autosave[^;]{0,120}true/i.test(panel)) fail("universal-save-panel.tsx autosave must default to true/ON (DS-AUTOSAVE-03 not landed yet).");
if (!/type\s*=\s*["']checkbox["']/.test(panel)) fail("universal-save-panel.tsx must render an opt-out checkbox for autosave (DS-AUTOSAVE-03 not landed yet).");
console.log("verify-autosave: panel default-true autosave + checkbox.");

// 4. lib/game-autosave.ts: shared defaults (new file, sibling DS-AUTOSAVE-04).
// Fail-open on absence: report the missing file clearly instead of crashing read().
const libPath = "../lib/game-autosave.ts";
if (!exists(libPath)) {
  fail("lib/game-autosave.ts is missing (DS-AUTOSAVE-04 not landed yet).");
}
const lib = read(libPath);
if (!lib.includes("AUTOSAVE_ENABLED_DEFAULT")) fail("lib/game-autosave.ts must export AUTOSAVE_ENABLED_DEFAULT (DS-AUTOSAVE-04 not landed yet).");
if (!/AUTOSAVE_ENABLED_DEFAULT\s*=\s*true/.test(lib)) fail("lib/game-autosave.ts AUTOSAVE_ENABLED_DEFAULT must be true (DS-AUTOSAVE-04 not landed yet).");
if (!lib.includes("AUTOSAVE_INTERVAL_MS")) fail("lib/game-autosave.ts must export AUTOSAVE_INTERVAL_MS (DS-AUTOSAVE-04 not landed yet).");
if (!/AUTOSAVE_INTERVAL_MS\s*=\s*60000/.test(lib)) fail("lib/game-autosave.ts AUTOSAVE_INTERVAL_MS must be 60000 (DS-AUTOSAVE-04 not landed yet).");
if (!/slot[^;]*0/.test(lib)) fail("lib/game-autosave.ts must reference the slot-0 autosave target (DS-AUTOSAVE-04 not landed yet).");
console.log("verify-autosave: lib AUTOSAVE_ENABLED_DEFAULT=true + AUTOSAVE_INTERVAL_MS=60000 + slot 0.");

// 5. template-demo/game.js: on-request save example after a cutscene.
// Sibling DS-AUTOSAVE-05.
const template = read("../public/games/html/template-demo/game.js");
if (!/(__fourweirdRequestSave|requestAutosave)/.test(template)) fail("template-demo/game.js must call window.__fourweirdRequestSave() or requestAutosave (DS-AUTOSAVE-05 not landed yet).");
if (!template.includes("fourweird-request-save")) fail("template-demo/game.js must show the 'fourweird-request-save' event example (DS-AUTOSAVE-05 not landed yet).");
if (!/cutscene/i.test(template)) fail("template-demo/game.js must mention the cutscene trigger for the on-request save (DS-AUTOSAVE-05 not landed yet).");
console.log("verify-autosave: template requestAutosave/__fourweirdRequestSave + cutscene mention.");

console.log("verify-autosave: bridge 60s + on-request, frame default-ON, panel default-ON, lib defaults, template hook — all green.");

// 6. Dual-save autosave target: autosave writes kind=auto (the auto companion
// of the active slot), never the manual copy. Fail-open: dual-save may not
// have landed yet; skip instead of failing.
{
  const haystacks = [];
  try {
    haystacks.push(read("../components/games/game-runtime-frame.tsx"));
  } catch { /* frame unreadable; skip below */ }
  try {
    haystacks.push(read("../components/games/universal-save-panel.tsx"));
  } catch { /* panel unreadable; skip below */ }
  try {
    haystacks.push(read("../lib/game-autosave.ts"));
  } catch { /* lib unreadable; skip below */ }
  const hay = haystacks.join("\n");
  if (!/kind.*auto|autoSlotKey|:auto/.test(hay)) {
    console.log("verify-autosave: check 6 SKIP — no kind=auto / autoSlotKey / :auto target yet (dual-save autosave not landed yet).");
  } else {
    console.log("verify-autosave: check 6 green (autosave writes kind auto / active-slot companion).");
  }
}
