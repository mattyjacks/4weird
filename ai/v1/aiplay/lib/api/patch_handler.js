const fs = require('fs');
const path = require('path');

/**
 * Handle live file patching requests and backups for games.
 */
async function handlePatchFile(body, rootDir, reloadGameHandler, logHandler) {
  const { filePath, targetContent, replacementContent, fullContent } = body;

  if (!filePath) {
    return { status: 400, data: { success: false, error: 'Missing filePath parameter' } };
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  if (!fs.existsSync(absPath)) {
    return { status: 404, data: { success: false, error: `File not found: ${absPath}` } };
  }

  // Create a backup
  const backupPath = `${absPath}.bak_${Date.now()}`;
  fs.copyFileSync(absPath, backupPath);

  let newContent = '';
  const currentContent = fs.readFileSync(absPath, 'utf8');

  if (fullContent !== undefined) {
    newContent = fullContent;
  } else if (targetContent !== undefined && replacementContent !== undefined) {
    if (!currentContent.includes(targetContent)) {
      return { status: 400, data: { success: false, error: 'Target content not found in file' } };
    }
    newContent = currentContent.replace(targetContent, replacementContent);
  } else {
    return { status: 400, data: { success: false, error: 'Provide fullContent or targetContent + replacementContent' } };
  }

  fs.writeFileSync(absPath, newContent, 'utf8');
  if (typeof logHandler === 'function') {
    logHandler('info', `Patched file: ${path.basename(absPath)} (backup created: ${path.basename(backupPath)})`, 'api_server');
  }

  // Trigger reload if active
  let reloadRes = { success: false };
  if (typeof reloadGameHandler === 'function') {
    reloadRes = await reloadGameHandler();
  }

  return {
    status: 200,
    data: {
      success: true,
      message: `Successfully patched ${path.basename(absPath)}`,
      backupPath,
      reloaded: reloadRes.success || false
    }
  };
}

module.exports = {
  handlePatchFile
};
