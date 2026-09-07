const fs = require('fs');
const path = require('path');

/**
 * Recursively scan directory files, excluding build/node_modules/media, and optimize content for token payloads.
 */
function scanSourceDirectory(dirPath, maxFiles = 30) {
  if (!fs.existsSync(dirPath)) {
    return { success: false, error: 'Directory does not exist' };
  }

  const files = [];

  function scan(currentDir) {
    const list = fs.readdirSync(currentDir);
    for (const item of list) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      // Exclude node_modules, .git, images, media, etc.
      if (stat.isDirectory()) {
        if (['node_modules', '.git', 'images', 'assets', 'media', 'build', 'dist'].includes(item)) {
          continue;
        }
        scan(fullPath);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (['.js', '.html', '.css', '.json', '.ts', '.gd', '.cs', '.lua', '.py'].includes(ext)) {
          const relPath = path.relative(dirPath, fullPath);
          const content = fs.readFileSync(fullPath, 'utf8');
          // Remove comments and blank lines to optimize prompt token payload
          const minifiedContent = content
            .replace(/\/\*[\s\S]*?\*\//g, '')          // Block comments
            .replace(/^\s*\/\/.*$/gm, '')              // Line-beginning comments
            .replace(/([^:'"`\s])\s*\/\/.*$/gm, '$1') // Inline comments
            .replace(/^\s*[\r\n]/gm, '')               // Empty lines
            .slice(0, 3000);

          files.push({
            path: relPath,
            content: minifiedContent
          });
        }
      }
    }
  }

  scan(dirPath);
  return { success: true, files };
}

module.exports = {
  scanSourceDirectory
};
