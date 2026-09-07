const path = require('path');
const fs = require('fs');

/**
 * Discovers available games within the games directory of the website.
 */
function discoverGames(websiteV1Dir, staticPort = 8888) {
  const gamesDir = path.join(websiteV1Dir, 'games');
  const games = [];

  if (fs.existsSync(path.join(gamesDir, 'html'))) {
    const htmlItems = fs.readdirSync(path.join(gamesDir, 'html'));
    for (const item of htmlItems) {
      if (item.startsWith('_') || item === 'images') continue;
      const itemPath = path.join(gamesDir, 'html', item);
      if (fs.statSync(itemPath).isDirectory()) {
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
  }

  // Top-level games
  if (fs.existsSync(gamesDir)) {
    const directItems = fs.readdirSync(gamesDir);
    for (const item of directItems) {
      if (['html', 'images'].includes(item) || item.startsWith('_')) continue;
      const itemPath = path.join(gamesDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
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
  }

  return games;
}

module.exports = {
  discoverGames
};
