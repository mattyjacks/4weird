// scripts/verify-mobile.mjs — DS-MOB-08 (owner: mob-8) repo gate: keeps everything phone-usable.
// READ-ONLY verifier: static checks only (readdir/readFile/existsSync). No builds, no network, no writes.
// Fail-open: missing in-flight wave files are INFO skips, never crashes.
// Exit code: 1 ONLY on in-scope hard violations (play viewport, PWA manifest, secrets).
// Advisory (WARN, counted, never fail): safe-area utilities (pending DS-MOB-03, open/unowned),
// canvas touch-action across public/games bundles (out-of-scope files: report, don't fail), and
// fixed px widths in DS-MOB-01..07 wave components (sibling-owned while the wave is live).
// Promotion note: once DS-MOB-01..07 are all done, a follow-up may promote the WARN checks to FAIL.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pass = [];
const warn = [];
const fail = [];
const ok = (msg) => pass.push(msg);
const advisory = (msg) => warn.push(msg);
const violation = (msg) => fail.push(msg);
const read = (rel) => {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
};

// Wave component scopes (DS-MOB-01..07) + foundation files touched this wave.
const WAVE_FILES = [
  "components/site/menu-sidebar.tsx",
  "components/site/site-header.tsx",
  "components/games/game-runtime-frame.tsx",
  "components/games/play-gate.tsx",
  "components/music/maker-shell.tsx",
  "components/music/step-sequencer.tsx",
  "components/music/sfx-lab.tsx",
  "components/games/server-browser.tsx",
  "components/games/server-rent-form.tsx",
  "components/games/server-card.tsx",
  "components/games/game-catalog.tsx",
  "components/games/game-catalog.module.css",
  "components/site/install-prompt.tsx",
  "app/layout.tsx",
];

// 1. viewport-fit=cover on play layouts (Next viewport export OR raw meta).
for (const rel of ["app/games/[slug]/play/page.tsx", "app/games/fridgesimulator/page.tsx"]) {
  const src = read(rel);
  if (src === null) {
    violation(`${rel}: MISSING play layout.`);
    continue;
  }
  if (/viewportFit\s*:\s*["']cover["']/.test(src) || /viewport-fit\s*=\s*cover/.test(src)) {
    ok(`${rel}: viewport-fit cover present.`);
  } else {
    violation(`${rel}: viewport-fit cover ABSENT (play shell must opt into the notch area).`);
  }
}

// 2. PWA manifest icons + standalone display, every icon src resolvable.
const resolveIcon = (src) => {
  if (/^data:/.test(src)) return true; // inline data-URI icon
  if (/^https?:\/\//.test(src)) return true; // remote icon (informational)
  const rel = src.replace(/^\//, "");
  if (fs.existsSync(path.join(root, "public", rel))) return true;
  // Next App Router convention: app/icon.* serves /icon (+ extension).
  if (/^icon(\.[a-z0-9]+)?$/i.test(rel)) {
    const dir = fs.readdirSync(path.join(root, "app"));
    if (dir.some((f) => /^icon\./i.test(f))) return true;
  }
  return false;
};
{
  const ts = read("app/manifest.ts");
  if (ts === null) {
    violation("app/manifest.ts: MISSING primary PWA manifest.");
  } else {
    const srcs = [...ts.matchAll(/src:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const unresolvable = srcs.filter((s) => !resolveIcon(s));
    if (!/display:\s*["']standalone["']/.test(ts)) {
      violation("app/manifest.ts: display is not standalone.");
    } else if (srcs.length === 0 || unresolvable.length > 0) {
      violation(
        `app/manifest.ts: icons unresolvable (${srcs.length === 0 ? "none declared" : unresolvable.join(", ")}).`,
      );
    } else {
      ok(`app/manifest.ts: standalone + ${srcs.length} resolvable icon(s).`);
    }
  }
  const json = read("public/manifest.json");
  if (json !== null) {
    try {
      const m = JSON.parse(json);
      const icons = Array.isArray(m.icons) ? m.icons : [];
      const bad = icons.map((i) => i.src).filter((s) => typeof s !== "string" || !resolveIcon(s));
      if (m.display !== "standalone" || icons.length === 0 || bad.length > 0) {
        advisory(
          `public/manifest.json: fallback manifest weak (display=${m.display}, icons=${icons.length}, bad=${bad.length}) — informational, primary is app/manifest.ts.`,
        );
      } else {
        ok(`public/manifest.json: standalone + ${icons.length} resolvable icon(s).`);
      }
    } catch {
      advisory("public/manifest.json: unparseable — informational, primary is app/manifest.ts.");
    }
  }
}

// 3. Safe-area utilities in globals.css (pending DS-MOB-03 — advisory until it lands).
{
  const css = read("app/globals.css");
  if (css === null) {
    violation("app/globals.css: MISSING.");
  } else {
    const missing = [];
    if (!/safe-area-inset/.test(css)) missing.push("env(safe-area-inset-*)");
    if (!/100dvh|100svh/.test(css)) missing.push("dvh/svh fallback");
    if (!/min-height:\s*44px|min-width:\s*44px|min-height:\s*2\.75rem|tap-target/i.test(css)) {
      missing.push("44px tap-target utility");
    }
    if (missing.length === 0) ok("app/globals.css: safe-area utilities present.");
    else advisory(`app/globals.css: safe-area gap [${missing.join(", ")}] (pending DS-MOB-03).`);
  }
}

// 4. touch-action on game canvases: scan every public/games/**/game.css, report counts.
{
  const gamesDir = path.join(root, "public", "games");
  const cssFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "game.css") cssFiles.push(p);
    }
  };
  if (fs.existsSync(gamesDir)) walk(gamesDir);
  const lacking = cssFiles.filter((f) => !/touch-action/.test(fs.readFileSync(f, "utf8")));
  const rel = (f) => path.relative(root, f).replace(/\\/g, "/");
  if (lacking.length === 0) ok(`game.css: touch-action in all ${cssFiles.length} bundle stylesheets.`);
  else {
    advisory(
      `game.css: touch-action missing in ${lacking.length}/${cssFiles.length} ` +
        `(${lacking.slice(0, 8).map(rel).join(", ")}${lacking.length > 8 ? ", …" : ""}) — out-of-scope bundles, report only.`,
    );
  }
}

// 5. No fixed px widths >400px in wave components (report, don't fail: sibling-owned while live).
{
  const pxRe = /(?:(?<![a-zA-Z-])width\s*:\s*(\d+)px|min-width\s*:\s*(\d+)px|(?:min-)?w-\[(\d+)px\])/g;
  let checked = 0;
  let skipped = 0;
  const hits = [];
  for (const rel of WAVE_FILES) {
    const src = read(rel);
    if (src === null) {
      skipped += 1;
      continue; // in-flight NEW file (e.g. install-prompt.tsx): fail-open skip
    }
    checked += 1;
    src.split("\n").forEach((line, i) => {
      if (/matchMedia|@media/.test(line)) return; // responsive breakpoints are not fixed widths
      for (const m of line.matchAll(pxRe)) {
        const v = Number(m[1] ?? m[2] ?? m[3]);
        if (v > 400) hits.push(`${rel}:${i + 1} (${v}px)`);
      }
    });
  }
  if (hits.length === 0) ok(`px widths: 0 fixed widths >400px across ${checked} wave file(s), ${skipped} missing (in-flight skip).`);
  else advisory(`px widths: ${hits.length} fixed width(s) >400px [${hits.join(", ")}] — sibling-owned, report only.`);
}

// 6. No secrets in the scanned scope (boundary-guarded sk- pattern per swarm memory lesson).
{
  const secretRes = [
    /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    /AKIA[0-9A-Z]{16}/,
    /ghp_[A-Za-z0-9]{20,}/,
    /xox[bpas]-[A-Za-z0-9-]{10,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
  ];
  const scanFiles = [...WAVE_FILES, "app/globals.css", "app/manifest.ts", "app/games/[slug]/play/page.tsx", "app/games/fridgesimulator/page.tsx"];
  const hits = [];
  for (const rel of scanFiles) {
    const src = read(rel);
    if (src === null) continue;
    src.split("\n").forEach((line, i) => {
      if (secretRes.some((re) => re.test(line))) hits.push(`${rel}:${i + 1}`);
    });
  }
  if (hits.length > 0) violation(`secrets: ${hits.length} suspect line(s) [${hits.join(", ")}].`);
  else ok(`secrets: clean across ${scanFiles.filter((f) => read(f) !== null).length} scanned file(s).`);
}

// 7. Standardized header/nav (new reality): All Games lives inside the Play
// group (no standalone AllGamesLink), desktop dropdowns use .nav-std-panel
// (no nav-swirl), the FeedbackBar Menu 2 button is the single menu2 entry
// point (no floating reveal pill), and the drawer hides via "<- Hide".
{
  const header = read("components/site/site-header.tsx");
  const sidebar = read("components/site/menu-sidebar.tsx");
  const css = read("app/globals.css");
  const feedback = read("components/feedback/feedback-bar.tsx");
  if (header === null) {
    violation("components/site/site-header.tsx: MISSING (nav taxonomy unreadable).");
  } else {
    // All Games inside Play: a /games "All Games" entry must exist in the
    // NAV_GROUPS table (matched without emoji so encoding never matters).
    if (!/href:\s*"\/games",\s*label:\s*"[^"]*All Games"/.test(header)) {
      violation("site-header: Play group must contain the /games All Games link.");
    } else {
      ok("site-header: All Games lives inside the Play group.");
    }
    // ... and no standalone AllGamesLink usage may remain.
    if (/<AllGamesLink/.test(header)) {
      violation("site-header: standalone <AllGamesLink/> must be gone (All Games is inside Play).");
    } else {
      ok("site-header: no standalone AllGamesLink.");
    }
    // Standard dropdown classes, not nav-swirl.
    if (/nav-swirl/.test(header)) {
      violation("site-header: nav-swirl classes must be gone (standard .nav-std-panel only).");
    } else if (!header.includes("nav-std-panel")) {
      violation("site-header: standard .nav-std-panel dropdown missing.");
    } else {
      ok("site-header: standard .nav-std-panel dropdown (no nav-swirl).");
    }
  }
  if (css === null) {
    violation("app/globals.css: MISSING (nav classes unreadable).");
  } else if (/\.nav-swirl/.test(css)) {
    violation("app/globals.css: .nav-swirl rules must be gone (standard .nav-std-panel only).");
  } else if (!css.includes(".nav-std-panel")) {
    violation("app/globals.css: .nav-std-panel rules missing.");
  } else {
    ok("app/globals.css: .nav-std-panel only (no .nav-swirl).");
  }
  if (sidebar === null) {
    violation("components/site/menu-sidebar.tsx: MISSING (menu2 unreadable).");
  } else {
    // Single menu2 entry point: the floating reveal pill is gone.
    if (/Open menu 2 sidebar/.test(sidebar)) {
      violation("menu-sidebar: floating reveal pill must be gone (FeedbackBar owns the single menu2 entry point).");
    } else {
      ok("menu-sidebar: no floating reveal pill (single menu2 entry point).");
    }
    // "<- Hide" label on the drawer close affordances; legacy glyph gone.
    if (!/<- Hide/.test(sidebar)) {
      violation('menu-sidebar: "<- Hide" label missing from drawer close affordances.');
    } else {
      ok('menu-sidebar: "<- Hide" close label present.');
    }
    if (/\u27E8\u27E9/.test(sidebar)) {
      violation("menu-sidebar: legacy Hide glyph must be gone.");
    } else {
      ok("menu-sidebar: no legacy Hide glyph.");
    }
  }
  if (feedback === null) {
    advisory("components/feedback/feedback-bar.tsx: ABSENT — single menu2 entry check SKIP.");
  } else if (!feedback.includes("fw:open-menu2")) {
    violation("feedback-bar: must dispatch fw:open-menu2 (the single menu2 entry point).");
  } else {
    ok("feedback-bar: dispatches fw:open-menu2 (single menu2 entry point).");
  }
}

for (const m of pass) console.log(`PASS: ${m}`);
for (const m of warn) console.log(`WARN: ${m}`);
for (const m of fail) console.log(`FAIL: ${m}`);
console.log(`Mobile verifier: ${pass.length} pass, ${warn.length} warn, ${fail.length} fail.`);
if (fail.length > 0) process.exit(1);
