const path = require('path');
const fs = require('fs');

/**
 * Discovers available games within the games directory of the website.
 * Cached with a short TTL: /api/games and /api/dashboard call this on every
 * request, and each call was doing ~2x readdir + stat per entry + JSON reads.
 */
const GAME_DISCOVERY_TTL_MS = 15000;
const _gamesCache = new Map(); // key -> { expiresAt, dirMtime, value }

function _dirStamp(dirPath) {
  try {
    const st = fs.statSync(dirPath);
    return st.mtimeMs;
  } catch (e) {
    return 0;
  }
}

function discoverGames(websiteV1Dir, staticPort = 8888) {
  const cacheKey = `${websiteV1Dir}::${staticPort}`;
  const now = Date.now();
  const cached = _gamesCache.get(cacheKey);
  const gamesDir = path.join(websiteV1Dir, 'games');
  const stamp = _dirStamp(gamesDir);
  if (cached && now < cached.expiresAt && cached.dirMtime === stamp) {
    return cached.value.map((g) => ({ ...g }));
  }

  const games = [];

  if (fs.existsSync(path.join(gamesDir, 'html'))) {
    let htmlItems = [];
    try {
      htmlItems = fs.readdirSync(path.join(gamesDir, 'html'), { withFileTypes: true });
    } catch (e) {
      htmlItems = [];
    }
    for (const entry of htmlItems) {
      const item = entry.name;
      if (item.startsWith('_') || item === 'images') continue;
      if (!entry.isDirectory()) continue;
      const itemPath = path.join(gamesDir, 'html', item);
      const indexPath = path.join(itemPath, 'index.html');
      const jsonPath = path.join(itemPath, 'game.json');
      let meta = { title: item, maker: '4weird' };
      if (fs.existsSync(jsonPath)) {
        try { meta = { ...meta, ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')) }; } catch (e) {}
      }
      if (fs.existsSync(indexPath)) {
        games.push({
          id: item,
          title: meta.title || item,
          maker: meta.maker || meta.author || '4weird',
          description: meta.description || '',
          url: `http://localhost:${staticPort}/games/html/${item}/index.html`,
          path: path.relative(websiteV1Dir, itemPath),
          absPath: itemPath
        });
      }
    }
  }

  // Top-level games
  if (fs.existsSync(gamesDir)) {
    let directItems = [];
    try {
      directItems = fs.readdirSync(gamesDir, { withFileTypes: true });
    } catch (e) {
      directItems = [];
    }
    for (const entry of directItems) {
      const item = entry.name;
      if (['html', 'images'].includes(item) || item.startsWith('_')) continue;
      if (!entry.isDirectory()) continue;
      const itemPath = path.join(gamesDir, item);
      const indexPath = path.join(itemPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        games.push({
          id: item,
          title: item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          maker: '4weird',
          description: 'Standalone HTML5 Game',
          path: path.relative(websiteV1Dir, itemPath),
          absPath: itemPath,
          url: `http://localhost:${staticPort}/games/${item}/index.html`
        });
      }
    }
  }

  _gamesCache.set(cacheKey, { expiresAt: now + GAME_DISCOVERY_TTL_MS, dirMtime: stamp, value: games });
  return games.map((g) => ({ ...g }));
}

function _clearGamesCache() {
  _gamesCache.clear();
}

module.exports = {
  discoverGames,
  _clearGamesCache
};
