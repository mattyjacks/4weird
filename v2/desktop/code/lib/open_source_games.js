'use strict';

// Explicit allow-list: a cloud run can only download known public source trees.
// No caller-controlled URL ever reaches git.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const OPEN_SOURCE_GAMES = Object.freeze([
  { id: 'snake-canvas', name: 'Snake Canvas', repository: 'https://github.com/adrianov/snake.git', license: 'MIT', kind: 'browser', entry: 'index.html' },
  { id: 'underrun', name: 'Underrun', repository: 'https://github.com/phoboslab/underrun.git', license: 'MIT', kind: 'browser', entry: 'index-debug.html' },
  { id: 'games-hub', name: 'Games Hub', repository: 'https://github.com/sausi-7/games.git', license: 'MIT', kind: 'browser', entry: 'index.html' },
  // Xonotic's native client is GPLv3+ and the browser client is a public
  // WebAssembly/WebGL port. Keep the URL fixed and allow-listed: callers may
  // choose the surface, but can never turn this into an arbitrary URL proxy.
  { id: 'xonotic', name: 'Xonotic', repository: 'https://github.com/xonotic/xonotic.git', license: 'GPL-3.0-or-later', kind: 'desktop+browser', entry: 'xonotic-linux64-sdl', webUrl: 'https://dpgame.xonotic.workers.dev/' }
]);

function getOpenSourceGame(id) {
  return OPEN_SOURCE_GAMES.find((game) => game.id === String(id || '').toLowerCase()) || null;
}

function downloadOpenSourceGame(id, rootDir) {
  const game = getOpenSourceGame(id);
  if (!game) return Promise.reject(new Error('Unsupported open-source game id'));
  const root = path.resolve(rootDir || process.env.VIBE_OPEN_SOURCE_GAMES_DIR || path.join(process.cwd(), 'data', 'open-source-games'));
  const target = path.resolve(root, game.id);
  if (!target.startsWith(root + path.sep)) return Promise.reject(new Error('Unsafe download destination'));
  if (fs.existsSync(path.join(target, '.git'))) return Promise.resolve({ success: true, game, path: target, alreadyPresent: true });
  fs.mkdirSync(root, { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['clone', '--depth', '1', game.repository, target], { stdio: 'ignore', windowsHide: true });
    child.once('error', (error) => reject(new Error(`Game download could not start: ${error.message}`)));
    child.once('exit', (code) => code === 0
      ? resolve({ success: true, game, path: target, alreadyPresent: false })
      : reject(new Error(`Game download failed for ${game.name}`)));
  });
}

module.exports = { OPEN_SOURCE_GAMES, getOpenSourceGame, downloadOpenSourceGame };
