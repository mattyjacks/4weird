const fs = require('fs');
const path = require('path');

const SCAN_CACHE_TTL_MS = 30000;
const MAX_FILE_READ_BYTES = 16384;
const MAX_SNIPPET_CHARS = 3000;
const ALLOWED_EXTS = new Set(['.js', '.html', '.css', '.json', '.ts', '.gd', '.cs', '.lua', '.py']);
const SKIPPED_DIRS = new Set(['node_modules', '.git', 'images', 'assets', 'media', 'build', 'dist']);

const _scanCache = new Map(); // key -> { expiresAt, value }

function _readSnippet(fullPath) {
  let fd = null;
  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || stat.size === 0) return '';
    fd = fs.openSync(fullPath, 'r');
    const toRead = Math.min(stat.size, MAX_FILE_READ_BYTES);
    const buf = Buffer.allocUnsafe(toRead);
    fs.readSync(fd, buf, 0, toRead, 0);
    return buf.toString('utf8');
  } catch (e) {
    return '';
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (e) {}
    }
  }
}

/**
 * Recursively scan directory files, excluding build/node_modules/media, and optimize content for token payloads.
 * Cached (TTL) and bounded: reads at most the first 16KB of each file instead
 * of the whole file, and stops after maxFiles.
 */
function scanSourceDirectory(dirPath, maxFiles = 30) {
  if (!fs.existsSync(dirPath)) {
    return { success: false, error: 'Directory does not exist' };
  }

  const cacheKey = `${dirPath}::${maxFiles}`;
  const now = Date.now();
  const cached = _scanCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return { success: true, files: cached.value.map((f) => ({ ...f })), cached: true };
  }

  const files = [];

  function scan(currentDir) {
    if (files.length >= maxFiles) return;
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      const item = entry.name;
      const fullPath = path.join(currentDir, item);

      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(item)) {
          continue;
        }
        scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (ALLOWED_EXTS.has(ext)) {
          const relPath = path.relative(dirPath, fullPath);
          const content = _readSnippet(fullPath);
          if (!content) continue;
          // Remove comments and blank lines to optimize prompt token payload
          const minifiedContent = content
            .replace(/\/\*[\s\S]*?\*\//g, '')          // Block comments
            .replace(/^\s*\/\/.*$/gm, '')              // Line-beginning comments
            .replace(/([^:'"`\s])\s*\/\/.*$/gm, '$1') // Inline comments
            .replace(/^\s*[\r\n]/gm, '')               // Empty lines
            .slice(0, MAX_SNIPPET_CHARS);

          files.push({
            path: relPath,
            content: minifiedContent
          });
        }
      }
    }
  }

  scan(dirPath);
  _scanCache.set(cacheKey, { expiresAt: now + SCAN_CACHE_TTL_MS, value: files });
  return { success: true, files: files.map((f) => ({ ...f })) };
}

function _clearScanCache() {
  _scanCache.clear();
}

module.exports = {
  scanSourceDirectory,
  _clearScanCache
};
