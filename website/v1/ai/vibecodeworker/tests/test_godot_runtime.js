'use strict';
const assert = require('assert');
const { selectStableAsset, getLatestStableGodot, normalizeGodotAction } = require('../lib/godot_runtime');
const release = { tag_name: '4.7.2-stable', prerelease: false, draft: false, assets: [
  { name: 'Godot_v4.7.2-stable_win64.exe.zip', browser_download_url: 'https://github.com/godotengine/godot-builds/releases/download/4.7.2-stable/Godot_v4.7.2-stable_win64.exe.zip' },
  { name: 'Godot_v4.7.2-stable_linux.x86_64.zip', browser_download_url: 'https://github.com/godotengine/godot-builds/releases/download/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64.zip' }
] };
assert.equal(selectStableAsset(release, 'win32').name, 'Godot_v4.7.2-stable_win64.exe.zip');
assert.equal(selectStableAsset(release, 'linux').name, 'Godot_v4.7.2-stable_linux.x86_64.zip');
assert.deepEqual(normalizeGodotAction({ type: 'tap', key: 'Space' }), { type: 'tap', key: 'space' });
assert.throws(() => normalizeGodotAction({ type: 'click', key: 'space' }));
assert.throws(() => normalizeGodotAction({ type: 'tap', key: 'rm -rf' }));
getLatestStableGodot('linux', async () => ({ ok: true, json: async () => [
  { tag_name: '3.6.3-stable', prerelease: false, draft: false, assets: [] }, release
] })).then((latest) => {
  assert.equal(latest.version, '4.7.2-stable');
  console.log('Godot runtime tests passed');
}).catch((error) => { console.error(error); process.exitCode = 1; });
