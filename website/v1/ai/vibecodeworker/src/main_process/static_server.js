const http = require('http');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const CACHEABLE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.wav', '.mp3', '.css', '.js', '.woff', '.woff2']);

/**
 * Start a simple static file server for local game assets and HTML5 games.
 * Optimized: single statSync per request (was 4 syscalls), shared MIME map,
 * stream error handling, and Cache-Control for immutable assets.
 */
function startStaticServer(port, docRoot) {
  try {
    const resolvedRoot = path.resolve(docRoot);
    const rootWithSeparator = `${resolvedRoot}${path.sep}`;
    const server = http.createServer((req, res) => {
      let filePath;
      try {
        const rawPath = new URL(req.url, `http://localhost:${port}`).pathname;
        filePath = path.resolve(resolvedRoot, `.${decodeURIComponent(rawPath)}`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('400 Bad Request');
        return;
      }

      // Do not let a local QA server expose files outside its intended web root.
      if (filePath !== resolvedRoot && !filePath.startsWith(rootWithSeparator)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      let stat = null;
      try {
        stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
          stat = fs.statSync(filePath);
        }
        if (!stat.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
      } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
      if (CACHEABLE_EXTS.has(ext)) {
        headers['Cache-Control'] = 'public, max-age=3600';
      } else {
        headers['Cache-Control'] = 'no-cache';
      }
      // Weak ETag avoids re-downloading unchanged game assets.
      try {
        headers.ETag = `W/"${stat.size.toString(16)}-${Number(stat.mtimeMs).toString(16)}"`;
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === headers.ETag) {
          res.writeHead(304);
          res.end();
          return;
        }
      } catch (e) {}
      res.writeHead(200, headers);
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        try { res.destroy(); } catch (e) {}
      });
      stream.pipe(res);
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
