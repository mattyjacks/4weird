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
    // Clear previous options except placeholder
    const placeholder = demoGameSelect.options[0];
    demoGameSelect.innerHTML = '';
    if (placeholder) {
      demoGameSelect.appendChild(placeholder);
    } else {
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Choose Page or Game --';
      demoGameSelect.appendChild(defaultOpt);
    }

    const websiteV1Dir = path.join(__dirname, '..', '..', '..', '..', '..', 'website', 'v1');
    if (!fs.existsSync(websiteV1Dir)) return;

    // 1. Scan for Pages
    const pagesGroup = document.createElement('optgroup');
    pagesGroup.label = 'Websites & Info Pages';

    // Top-level HTML files
    const topFiles = fs.readdirSync(websiteV1Dir);
    const pagesList = [];

    for (const item of topFiles) {
      const fullPath = path.join(websiteV1Dir, item);
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory() && item.endsWith('.html')) {
        let name = item.replace('.html', '');
        if (name === 'index') name = 'Home';
        else name = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        pagesList.push({
          name: name,
          path: 'file:///' + fullPath.replace(/\\/g, '/')
        });
      } else if (stat.isDirectory() && ['academy', 'aiplay'].includes(item)) {
        const indexFile = path.join(fullPath, 'index.html');
        if (fs.existsSync(indexFile)) {
          const name = item.charAt(0).toUpperCase() + item.slice(1);
          pagesList.push({
            name: `${name} Hub`,
            path: 'file:///' + indexFile.replace(/\\/g, '/')
          });
        }
      }
    }

    // Sort pages alphabetically by name
    pagesList.sort((a, b) => a.name.localeCompare(b.name));
    pagesList.forEach(page => {
      const option = document.createElement('option');
      option.value = page.path;
      option.textContent = page.name;
      option.dataset.type = 'page';
      pagesGroup.appendChild(option);
    });

    demoGameSelect.appendChild(pagesGroup);

    // 2. Scan for Games
    const gamesGroup = document.createElement('optgroup');
    gamesGroup.label = 'Games';

    const gamesList = [];
    const gamesDir = path.join(websiteV1Dir, 'games');

    if (fs.existsSync(gamesDir)) {
      // Direct subdirectories under website/v1/games/ (e.g. lastwordszombies)
      const directItems = fs.readdirSync(gamesDir);
      for (const item of directItems) {
        const fullPath = path.join(gamesDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && item !== 'html' && item !== 'images') {
          const indexFile = path.join(fullPath, 'index.html');
          if (fs.existsSync(indexFile)) {
            gamesList.push({
              name: item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              path: 'file:///' + indexFile.replace(/\\/g, '/')
            });
          }
        }
      }

      // Games under website/v1/games/html/
      const htmlGamesDir = path.join(gamesDir, 'html');
      if (fs.existsSync(htmlGamesDir)) {
        const htmlItems = fs.readdirSync(htmlGamesDir);
        for (const item of htmlItems) {
          const fullPath = path.join(htmlGamesDir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && item !== '_TEMPLATE' && item !== 'images') {
            const indexFile = path.join(fullPath, 'index.html');
            if (fs.existsSync(indexFile)) {
              gamesList.push({
                name: item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                path: 'file:///' + indexFile.replace(/\\/g, '/')
              });
            }
          }
        }
      }
    }

    // Sort games alphabetically by name
    gamesList.sort((a, b) => a.name.localeCompare(b.name));
    gamesList.forEach(game => {
      const option = document.createElement('option');
      option.value = game.path;
      option.textContent = game.name;
      option.dataset.type = 'game';
      gamesGroup.appendChild(option);
    });

    demoGameSelect.appendChild(gamesGroup);

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
    const localGamesDir = path.join(__dirname, '..', '..', '..', '..', '..', 'website', 'v1', 'games', 'html', gameName);
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
