const http = require('http');
const path = require('path');
const fs = require('fs');

/**
 * Start a simple static file server for local game assets and HTML5 games.
 */
function startStaticServer(port, docRoot) {
  try {
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
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[StaticServer] Port ${port} is already in use, assuming active host`);
      } else {
        console.error('[StaticServer] Error:', err);
      }
    });

    server.listen(port);
    return server;
  } catch (e) {
    console.warn('[StaticServer] Could not initialize static host:', e.message);
  }
}

module.exports = {
  startStaticServer
};
