import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-a11y: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Settings core covers every feature.
const core = read("lib/a11y.ts");
for (const token of [
  "dyslexia",
  "colorblind",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
  "dwell",
  "dwellMs",
  "headPointer",
  "webcam",
  "headGain",
  "headSmooth",
  "switchScan",
  "scanMs",
  "smileKey",
  "A11Y_STORAGE_KEY",
  "A11Y_EVENT",
  "loadA11y",
  "saveA11y",
  "applyA11y",
]) {
  must(core.includes(token), `lib/a11y.ts must include ${token}`);
}

// 2. Per-game optimization metadata for the featured set.
const meta = read("lib/game-a11y.ts");
for (const slug of ["overtake", "lastwordszombies", "gravegain2d", "gravegain3d", "battlesharks2", "serversavershield", "assassinanimals"]) {
  must(meta.includes(slug), `lib/game-a11y.ts must cover featured game ${slug}`);
}
for (const token of ["keyboardOnly", "colorDependent", "photosensitive", "readingHeavy", "getGameA11y"]) {
  must(meta.includes(token), `lib/game-a11y.ts must include ${token}`);
}

// 3. Runtime bridge applies assists + input inside the frame.
const bridge = read("public/games/html/runtime-bridge.js");
for (const token of ['"a11y"', '"input"', "fourweird-cb-", "feColorMatrix", "elementFromPoint", "contextmenu", "keydown"]) {
  must(bridge.includes(token), `runtime-bridge.js must include ${token}`);
}

// 4. Shell forwards settings + assistive input, mounts the controller.
const frame = read("components/games/game-runtime-frame.tsx");
for (const token of ["FaceController", "pushA11y", 'type: "a11y"', 'type: "input"', "handleGameInput", "A11Y_EVENT"]) {
  must(frame.includes(token), `game-runtime-frame.tsx must include ${token}`);
}
const face = read("components/a11y/face-controller.tsx");
for (const token of ["NOSE_TIP", "webcam", "Calibrate", "left-wink", "right-wink", "smile", "a11y-head-cursor", "onGameInput"]) {
  must(face.includes(token), `face-controller.tsx must include ${token}`);
}
for (const token of ["WEBCAM_POSITIONS", "webcamOffset", "phone", "neutralRef", "cursorRef"]) {
  must(face.includes(token), `face-controller.tsx head tracker must include ${token}`);
}

// 5. Dwell + switch-scan mounted globally.
for (const [path, token] of [
  ["components/a11y/eye-dwell.tsx", "dwell"],
  ["components/a11y/switch-scan.tsx", "switchScan"],
  ["app/layout.tsx", "EyeDwell"],
  ["app/layout.tsx", "SwitchScan"],
  ["app/layout.tsx", "ColorblindFilters"],
  ["app/layout.tsx", "A11yProvider"],
]) {
  must(read(path).includes(token), `${path} must include ${token}`);
}

// 6. Styles for every assist.
const css = read("app/globals.css");
for (const token of ["a11y-dyslexia", "a11y-cb-protanopia", "a11y-cb-achromatopsia", "a11y-dwelling", "a11y-head-cursor", "a11y-scan-hit", "a11y-large-targets", "cb-dot"]) {
  must(css.includes(token), `globals.css must include ${token}`);
}

// 7. Play pages + catalog expose the assists.
must(read("app/games/[slug]/play/page.tsx").includes("GameA11yPanel"), "play page must render GameA11yPanel");
must(read("components/games/game-catalog.tsx").includes("getGameA11y"), "game-catalog must show per-game a11y badges");
must(read("components/site/accessibility-controls.tsx").includes("Webcam"), "accessibility-controls must offer webcam position");

console.log("A11y checks OK: dyslexia + colorblind + dwell + head-pointer + face + switch + in-frame assists.");
