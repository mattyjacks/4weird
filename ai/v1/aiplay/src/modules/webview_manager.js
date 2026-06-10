const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

function fileUrlToPath(fileUrl) {
  if (!fileUrl.startsWith('file:///')) return '';
  let p = decodeURIComponent(fileUrl.slice('file:///'.length));
  if (process.platform !== 'win32') {
    p = '/' + p;
  } else {
    p = p.replace(/\//g, '\\');
  }
  return p;
}

function loadGameUrl(gameUrlInput, webviewElement, webviewPlaceholder, saveSettingsCallback, crawlCallback, logCallback) {
  const url = gameUrlInput.value.trim();
  if (!url) return;
  
  if (logCallback) logCallback(`Loading game URL: ${url}`);
  
  webviewPlaceholder.classList.add('hidden');
  webviewElement.src = url;
  
  const nativeProcessSelect = document.getElementById('native-process');
  const btnToggleAgent = document.getElementById('btn-toggle-agent');
  if (btnToggleAgent && (!nativeProcessSelect || !nativeProcessSelect.value)) {
    btnToggleAgent.classList.remove('disabled');
    btnToggleAgent.removeAttribute('disabled');
  }
  
  if (saveSettingsCallback) saveSettingsCallback();
  if (crawlCallback) crawlCallback();
}

function populateDemoGames(demoGameSelect) {
  try {
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', 'website', 'v1', 'games', 'html');
    if (fs.existsSync(localGamesDir)) {
      const items = fs.readdirSync(localGamesDir);
      for (const item of items) {
        const fullPath = path.join(localGamesDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && item !== '_TEMPLATE' && item !== 'images') {
          const indexFile = path.join(fullPath, 'index.html');
          if (fs.existsSync(indexFile)) {
            const option = document.createElement('option');
            option.value = 'file:///' + indexFile.replace(/\\/g, '/');
            option.textContent = item;
            demoGameSelect.appendChild(option);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not load local demo games.", err);
  }
}

function loadGameMeta(fileUrl, gameRulesInput, saveSettingsCallback, logCallback) {
  try {
    if (!fileUrl.startsWith('file:///')) return;
    const indexPath = fileUrlToPath(fileUrl);
    const gameDir = path.dirname(indexPath);
    const metaPath = path.join(gameDir, 'game_meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const rulesText = [
        meta.objective ? `Objective: ${meta.objective}` : '',
        meta.controls ? `Controls: ${meta.controls}` : '',
        meta.win_condition ? `Win condition: ${meta.win_condition}` : '',
        meta.avoid ? `Avoid: ${meta.avoid}` : '',
        meta.tips ? `Tips: ${meta.tips}` : ''
      ].filter(Boolean).join('\n');
      gameRulesInput.value = rulesText;
      if (saveSettingsCallback) saveSettingsCallback();
      if (logCallback) logCallback(`Game meta loaded for "${meta.name || 'unknown'}". Rules auto-populated.`);
    }
  } catch (e) {
    console.warn('Could not load game_meta.json:', e);
  }
}

async function crawlCodeFiles(gameUrlInput, onCompleteCallback) {
  const currentUrl = gameUrlInput.value;
  let localGamePath = '';
  
  if (currentUrl.startsWith('file:///')) {
    localGamePath = path.dirname(fileUrlToPath(currentUrl));
  } else {
    const urlParts = currentUrl.split('/');
    const gameName = urlParts[urlParts.length - 2];
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', 'website', 'v1', 'games', 'html', gameName);
    if (fs.existsSync(localGamesDir)) {
      localGamePath = localGamesDir;
    }
  }

  if (localGamePath) {
    const scanResult = await ipcRenderer.invoke('scan-directory', localGamePath);
    if (scanResult.success && onCompleteCallback) {
      onCompleteCallback(scanResult.files);
    }
  }
}

module.exports = {
  fileUrlToPath,
  loadGameUrl,
  populateDemoGames,
  loadGameMeta,
  crawlCodeFiles
};
