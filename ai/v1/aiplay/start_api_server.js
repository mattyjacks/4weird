/**
 * Standalone Local API Server Launcher & Game Debugger Host
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { LocalAPIServer } = require('./lib/api_server');

const WEBSITE_V1_DIR = path.join(__dirname, '..', '..', '..', 'website', 'v1');
const PORT = process.env.PORT || 9999;
const STATIC_PORT = 8888;

// Static file server for website/v1
function startStaticServer(port, docRoot) {
  const server = http.createServer((req, res) => {
    let rawPath = new URL(req.url, `http://localhost:${port}`).pathname;
    let filePath = path.join(docRoot, decodeURIComponent(rawPath));

    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch (e) {}

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  server.listen(port);
  return server;
}

// Discover all games in workspace
function discoverGames() {
  const games = [];
  const gamesDir = path.join(WEBSITE_V1_DIR, 'games');

  if (!fs.existsSync(gamesDir)) return games;

  const htmlGamesDir = path.join(gamesDir, 'html');
  if (fs.existsSync(htmlGamesDir)) {
    const items = fs.readdirSync(htmlGamesDir);
    for (const item of items) {
      if (item.startsWith('_') || item === 'images') continue;
      const itemPath = path.join(htmlGamesDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const indexPath = path.join(itemPath, 'index.html');
        const jsonPath = path.join(itemPath, 'game.json');
        let meta = { title: item, maker: '4weird contributor', description: 'HTML5 Game' };

        if (fs.existsSync(jsonPath)) {
          try {
            meta = { ...meta, ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')) };
          } catch (e) {}
        }

        if (fs.existsSync(indexPath)) {
          games.push({
            id: item,
            title: meta.title || item,
            maker: meta.maker || meta.author || '4weird',
            description: meta.description || '',
            path: path.relative(WEBSITE_V1_DIR, itemPath),
            absPath: itemPath,
            url: `http://localhost:${STATIC_PORT}/games/html/${item}/index.html`
          });
        }
      }
    }
  }

  // Also check top-level games dir items
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
          path: path.relative(WEBSITE_V1_DIR, itemPath),
          absPath: itemPath,
          url: `http://localhost:${STATIC_PORT}/games/${item}/index.html`
        });
      }
    }
  }

  return games;
}

async function main() {
  console.log('Starting 4weird AIPlay Local API Server & Static Host...');
  const staticServer = startStaticServer(STATIC_PORT, WEBSITE_V1_DIR);
  console.log(`Static game server hosting at http://localhost:${STATIC_PORT}`);

  let activeGameId = null;
  let activeGameUrl = null;
  const consoleLogs = [];

  const apiServer = new LocalAPIServer({
    port: PORT,
    runtimeMode: 'standalone_api',
    handlers: {
      getGames: async () => discoverGames(),
      launchGame: async (gameId) => {
        const games = discoverGames();
        const target = games.find(g => g.id.toLowerCase() === gameId.toLowerCase());
        if (!target) return { success: false, error: `Game '${gameId}' not found` };
        activeGameId = target.id;
        activeGameUrl = target.url;
        console.log(`[API Server] Launched game: ${activeGameId} (${activeGameUrl})`);
        return { success: true, game: target, url: target.url };
      },
      captureScreenshot: async (target) => {
        // Return dummy/placeholder screenshot or null if no headless browser connected
        return null;
      },
      getLogs: async () => consoleLogs,
      getGameState: async () => ({ activeGameId, activeGameUrl }),
      executeAction: async (action) => ({ success: true, actionExecuted: action }),
      evalJavaScript: async (script) => ({ success: true, note: 'Stand-alone mode evaluation' }),
      reloadGame: async () => ({ success: true, reloaded: true })
    }
  });

  await apiServer.start();
  console.log(`AIPlay Local REST API Server is ready at http://localhost:${PORT}`);
}

if (require.main === module) {
  main().catch(err => console.error('Failed to start standalone API server:', err));
}

module.exports = { main, discoverGames };
