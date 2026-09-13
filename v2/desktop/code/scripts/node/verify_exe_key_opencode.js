'use strict';
/**
 * verify_exe_key_opencode.js — docs-lane verifier, no side effects, no network.
 *
 * Asserts the Windows .exe key + OpenCode wiring referenced by
 * v2/desktop/code/frontend/DESKTOP_BUILD_GUIDE.md ("Windows .exe" section):
 *   1. bot_token.js has masked display + VERIFY fetch to /api/bot/me
 *   2. opencode_ui_controller has a Tauri invoke fallback
 *   3. tauri.conf.json has an nsis target + frontendDist
 *   4. package.json has a tauri:build:win script
 *
 * Exit 0 = all PASS. Exit 1 = any FAIL (prints which file/pattern missed).
 * Run: node scripts/node/verify_exe_key_opencode.js  (from v2/desktop/code)
 */

const fs = require('fs');
const path = require('path');

const codeRoot = path.resolve(__dirname, '..', '..');
const desktopFrontend = path.join(codeRoot, 'frontend');

const CANDIDATES = {
  botToken: [
    path.join(desktopFrontend, 'modules', 'bot_token.js'),
    path.join(codeRoot, 'src', 'modules', 'bot_token.js'),
  ],
  opencodeController: [
    path.join(codeRoot, 'src', 'components', 'opencode_ui_controller.js'),
  ],
  tauriConf: [path.join(codeRoot, 'src-tauri', 'tauri.conf.json')],
  packageJson: [path.join(codeRoot, 'package.json')],
};

let failures = 0;

function pickExisting(list) {
  for (const p of list) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (e) { /* try next */ }
  }
  return null;
}

function check(name, file, patterns) {
  const rel = file ? path.relative(path.resolve(codeRoot, '..', '..', '..'), file) : '(missing)';
  let content = null;
  if (file) {
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.log(`FAIL  ${name}\n      file: ${rel}\n      reason: cannot read (${e.message})`);
      failures++;
      return;
    }
  } else {
    console.log(`FAIL  ${name}\n      file: (none of ${patterns._candidates.join(', ')})`);
    failures++;
    return;
  }
  const missing = patterns.tests.filter((t) => !t.re.test(content));
  if (missing.length === 0) {
    console.log(`PASS  ${name}\n      file: ${rel}`);
  } else {
    console.log(`FAIL  ${name}\n      file: ${rel}`);
    for (const m of missing) console.log(`      missing: ${m.label}`);
    failures++;
  }
}

function checkJson(name, file, validate) {
  const rel = path.relative(path.resolve(codeRoot, '..', '..', '..'), file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`FAIL  ${name}\n      file: ${rel}\n      reason: invalid JSON (${e.message})`);
    failures++;
    return;
  }
  const problems = validate(data);
  if (problems.length === 0) {
    console.log(`PASS  ${name}\n      file: ${rel}`);
  } else {
    console.log(`FAIL  ${name}\n      file: ${rel}`);
    for (const p of problems) console.log(`      missing: ${p}`);
    failures++;
  }
}

// 1. bot_token.js — masked display + VERIFY fetch to /api/bot/me
const botFile = pickExisting(CANDIDATES.botToken);
check('bot_token.js has masked display + VERIFY fetch to /api/bot/me', botFile, {
  _candidates: CANDIDATES.botToken,
  tests: [
    { label: 'masked display (maskToken|masked|••••|slice(0, …))', re: /maskToken|masked|••|slice\(0,/ },
    { label: 'VERIFY fetch target /api/bot/me', re: /\/api\/bot\/me/ },
    { label: 'fetch() call carrying the key (x-bot-key header or verifyBotToken)', re: /fetch\s*\(|x-bot-key|verifyBotToken/i },
  ],
});

// 2. opencode_ui_controller — Tauri invoke fallback
const ocFile = pickExisting(CANDIDATES.opencodeController);
check('opencode_ui_controller has Tauri invoke fallback', ocFile, {
  _candidates: CANDIDATES.opencodeController,
  tests: [
    { label: 'tauri reference (__TAURI__|isTauriRuntime|tauri)', re: /__TAURI__|isTauriRuntime|tauri/i },
    { label: 'invoke fallback (invokeTauriCommand|.invoke\\(|invoke\\()', re: /invokeTauriCommand|\.invoke\s*\(|invoke\s*\(/ },
  ],
});

// 3. tauri.conf.json — nsis target + frontendDist
const tauriFile = pickExisting(CANDIDATES.tauriConf);
if (!tauriFile) {
  console.log('FAIL  tauri.conf has nsis target + frontendDist\n      file: (src-tauri/tauri.conf.json not found)');
  failures++;
} else {
  checkJson('tauri.conf has nsis target + frontendDist', tauriFile, (data) => {
    const problems = [];
    const targets = (data && data.bundle && data.bundle.targets) || [];
    const hasNsis = Array.isArray(targets) && targets.some((t) => String(t).toLowerCase() === 'nsis');
    if (!hasNsis) problems.push('bundle.targets[] contains "nsis"');
    const fd = data && data.build && data.build.frontendDist;
    if (typeof fd !== 'string' || fd.trim() === '') problems.push('build.frontendDist non-empty string');
    return problems;
  });
}

// 4. package.json — tauri:build:win script
const pkgFile = pickExisting(CANDIDATES.packageJson);
if (!pkgFile) {
  console.log('FAIL  package.json has tauri:build:win\n      file: (package.json not found)');
  failures++;
} else {
  checkJson('package.json has tauri:build:win', pkgFile, (data) => {
    const problems = [];
    const scripts = (data && data.scripts) || {};
    if (typeof scripts['tauri:build:win'] !== 'string' || scripts['tauri:build:win'].trim() === '') {
      problems.push('scripts["tauri:build:win"] non-empty string');
    }
    return problems;
  });
}

console.log(failures === 0 ? '\nVERIFY_OK: 4/4 checks passed.' : `\nVERIFY_FAIL: ${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
