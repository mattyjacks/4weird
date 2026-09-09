'use strict';

// Godot is acquired only from the official godot-builds release feed.  This
// keeps desktop and cloud installs on the same stable channel without baking a
// version number into VCW.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// GitHub's /latest points to the newest release across every maintained major
// line (which can be Godot 3). Read the official list and select highest 4.x.
const RELEASE_API = 'https://api.github.com/repos/godotengine/godot-builds/releases?per_page=100';
const OFFICIAL_PREFIX = 'https://github.com/godotengine/godot-builds/releases/download/';
const ALLOWED_KEYS = new Set(['up', 'down', 'left', 'right', 'space', 'enter', 'escape', 'w', 'a', 's', 'd', 'r']);

function platformAssetPattern(platform) {
  if (platform === 'win32') return /^Godot_v[\d.]+-stable_win64\.exe\.zip$/;
  if (platform === 'linux') return /^Godot_v[\d.]+-stable_linux\.x86_64\.zip$/;
  throw new Error(`Godot stable installs are currently supported on Windows and Linux, not ${platform}`);
}

function versionParts(tag) { return (String(tag).match(/v?(\d+)\.(\d+)\.(\d+)-stable/) || []).slice(1).map(Number); }
function compareVersions(a, b) { const av = versionParts(a.tag_name), bv = versionParts(b.tag_name); for (let i = 0; i < 3; i += 1) if (av[i] !== bv[i]) return bv[i] - av[i]; return 0; }
function selectStableAsset(release, platform = process.platform) {
  if (!release || release.prerelease || release.draft || !/^v?4\./.test(String(release.tag_name || ''))) {
    throw new Error('Official Godot stable release metadata is invalid');
  }
  const asset = (release.assets || []).find((item) => platformAssetPattern(platform).test(String(item.name || '')));
  if (!asset || typeof asset.browser_download_url !== 'string' || !asset.browser_download_url.startsWith(OFFICIAL_PREFIX)) {
    throw new Error(`Official stable Godot asset is unavailable for ${platform}`);
  }
  return { version: String(release.tag_name).replace(/^v/, ''), name: asset.name, url: asset.browser_download_url };
}

async function getLatestStableGodot(platform = process.platform, fetchImpl = global.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('This Node runtime does not provide fetch');
  const response = await fetchImpl(RELEASE_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'VibeCodeWorker' } });
  if (!response.ok) throw new Error(`Godot release lookup failed (${response.status})`);
  const releases = await response.json();
  const stable = (Array.isArray(releases) ? releases : []).filter((item) => !item.prerelease && !item.draft && /^v?4\.\d+\.\d+-stable$/.test(String(item.tag_name || ''))).sort(compareVersions);
  if (!stable.length) throw new Error('Official Godot 4 stable release metadata is unavailable');
  return selectStableAsset(stable[0], platform);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function installLatestStableGodot({ installRoot, platform = process.platform, fetchImpl = global.fetch, onProgress } = {}) {
  const root = path.resolve(installRoot || path.join(os.homedir(), '.vcw', 'godot'));
  const release = await getLatestStableGodot(platform, fetchImpl);
  const releaseDir = path.join(root, release.version);
  const marker = path.join(releaseDir, '.vcw-godot.json');
  try { const prior = JSON.parse(await fsp.readFile(marker, 'utf8')); if (prior.executable && fs.existsSync(prior.executable)) return { ...prior, alreadyInstalled: true }; } catch (_) {}
  await fsp.mkdir(releaseDir, { recursive: true });
  const archive = path.join(releaseDir, release.name);
  const response = await fetchImpl(release.url, { headers: { 'User-Agent': 'VibeCodeWorker' } });
  if (!response.ok || !response.body) throw new Error(`Godot download failed (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;
  const file = fs.createWriteStream(archive, { flags: 'w' });
  let received = 0;
  for await (const chunk of response.body) { received += chunk.length; file.write(chunk); if (onProgress) onProgress({ received, total }); }
  await new Promise((resolve, reject) => file.end(resolve).on('error', reject));
  await run(platform === 'win32' ? 'tar' : 'unzip', platform === 'win32' ? ['-xf', archive, '-C', releaseDir] : ['-o', archive, '-d', releaseDir]);
  const entries = await fsp.readdir(releaseDir);
  const executableName = entries.find((name) => platform === 'win32' ? /^Godot_.*\.exe$/i.test(name) : /^Godot_.*_linux\.x86_64$/.test(name));
  if (!executableName) throw new Error('Godot archive did not contain the expected executable');
  const executable = path.join(releaseDir, executableName);
  if (platform !== 'win32') await fsp.chmod(executable, 0o755);
  const installed = { version: release.version, executable, asset: release.name, installedAt: new Date().toISOString() };
  await fsp.writeFile(marker, JSON.stringify(installed, null, 2));
  return { ...installed, alreadyInstalled: false };
}

function normalizeGodotAction(action = {}) {
  const key = String(action.key || '').toLowerCase();
  const type = String(action.type || 'tap').toLowerCase();
  if (!ALLOWED_KEYS.has(key) || !['tap', 'keydown', 'keyup'].includes(type)) throw new Error('Godot action must use an allow-listed key and tap, keydown, or keyup');
  return { key, type };
}

async function controlGodotOnLinux(action, display = ':1') {
  const input = normalizeGodotAction(action);
  const args = ['--display', display, input.type === 'tap' ? 'key' : input.type === 'keydown' ? 'keydown' : 'keyup', input.key];
  await run('xdotool', args);
  return { success: true, action: input, display };
}

async function captureGodotOnLinux(display = ':1') {
  const out = path.join(os.tmpdir(), `vcw-godot-${Date.now()}.png`);
  try {
    await run('scrot', ['--overwrite', '--file', out], { env: { ...process.env, DISPLAY: display } });
    return { success: true, mimeType: 'image/png', base64: await fsp.readFile(out, 'base64') };
  } finally {
    try { await fsp.unlink(out); } catch (_) {}
  }
}

module.exports = { RELEASE_API, selectStableAsset, getLatestStableGodot, installLatestStableGodot, normalizeGodotAction, controlGodotOnLinux, captureGodotOnLinux };
