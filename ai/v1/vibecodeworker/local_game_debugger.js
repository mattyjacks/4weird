/**
 * Automated Local API Game Debugger & Fixer
 * Uses the Local REST API (http://localhost:42069) to audit games, detect bugs, apply fixes, and report results.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://127.0.0.1:42069';

async function fetchJSON(urlPath, options = {}) {
  const url = `${API_BASE}${urlPath}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} for ${urlPath}: ${text}`);
  }
  return await res.json();
}

async function postJSON(urlPath, body) {
  return await fetchJSON(urlPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function debugGames() {
  console.log('=== STARTING AUTOMATED LOCAL API GAME DEBUGGER ===');
  
  // 1. Check API Server Status
  try {
    const status = await fetchJSON('/api/status');
    console.log('[API Status]', status.system, '| Mode:', status.runtimeMode, '| Active Game:', status.activeGame);
  } catch (err) {
    console.error('[API Error] Local API Server is not responding on http://127.0.0.1:42069:', err.message);
    process.exit(1);
  }

  // 2. Fetch all games
  const gamesRes = await fetchJSON('/api/games');
  console.log(`[API Games] Discovered ${gamesRes.count} games for auditing.`);

  const auditReport = [];

  for (const game of gamesRes.games) {
    console.log(`\n--------------------------------------------------`);
    console.log(`[DEBUGGING GAME] ${game.title} (ID: ${game.id})`);
    console.log(`Path: ${game.path}`);

    const result = {
      gameId: game.id,
      title: game.title,
      url: game.url,
      path: game.path,
      bugsFound: [],
      fixed: false
    };

    // Inspect source code files directly for quick static analysis & bug detection
    const fullGameDir = game.absPath;
    if (fs.existsSync(fullGameDir)) {
      const jsFiles = [];
      const scanFiles = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            if (!['node_modules', '.git'].includes(item)) scanFiles(itemPath);
          } else if (item.endsWith('.js') || item.endsWith('.html')) {
            jsFiles.push(itemPath);
          }
        }
      };
      scanFiles(fullGameDir);

      // Check for common bug patterns in source code files
      for (const file of jsFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relFile = path.relative(fullGameDir, file);

        // Check 1: Missing event listener cleanup / infinite loop hazards
        if (content.includes('requestAnimationFrame') && !content.includes('cancelAnimationFrame') && content.includes('location.reload()')) {
          result.bugsFound.push({
            type: 'MEMORY_LEAK_HAZARD',
            file: relFile,
            description: `Uncancelled requestAnimationFrame loop before page reload in ${relFile}`
          });
        }

        // Check 2: Audio Context autostart error on modern browsers without user gesture
        if (content.includes('new AudioContext()') && !content.includes('resume()') && !content.includes('AudioContext.state')) {
          result.bugsFound.push({
            type: 'AUDIO_AUTOPLAY_BLOCK',
            file: relFile,
            description: `AudioContext created without user interaction handling in ${relFile}`
          });
        }

        // Check 3: Missing window global exposure for AI agent inspection
        if (file.endsWith('game.js') && !content.includes('window.game') && !content.includes('window.gameState')) {
          result.bugsFound.push({
            type: 'MISSING_STATE_EXPOSURE',
            file: relFile,
            description: `Game state is not exposed on window for AI agent inspection in ${relFile}`
          });
        }

        // Check 4: Hardcoded local file path references or missing asset check
        if (content.match(/file:\/\/\/[A-Za-z]:\//i)) {
          result.bugsFound.push({
            type: 'HARDCODED_FILE_URI',
            file: relFile,
            description: `Contains hardcoded absolute file:// URI in ${relFile}`
          });
        }

        // Check 5: Canvas width/height reset error on resize
        if (content.includes('window.addEventListener(\'resize\'') && content.includes('canvas.width =') && !content.includes('ctx')) {
          result.bugsFound.push({
            type: 'CANVAS_RESIZE_RESET',
            file: relFile,
            description: `Canvas width/height resize without re-initializing context properties`
          });
        }
      }
    }

    console.log(`  Bugs Detected: ${result.bugsFound.length}`);
    result.bugsFound.forEach(b => console.log(`    - [${b.type}] ${b.description}`));

    // Register bugs in API server bug log
    for (const b of result.bugsFound) {
      await postJSON('/api/bugs', {
        gameId: game.id,
        title: `[${game.title}] ${b.type}`,
        description: b.description,
        severity: b.type.includes('CRASH') ? 'high' : 'medium'
      });
    }

    // Option to run direct AI coding fixes using AI tokens (OPENAI_API_KEY / OPENROUTER_API_KEY)
    if (process.env.AUTO_FIX_BUGS === 'true' && result.bugsFound.length > 0) {
      console.log(`  [AI AutoFix] Attempting direct AI token bug fix on ${game.title}...`);
      try {
        const { AutoCodeSystem } = require('./lib/core');
        const autoCode = new AutoCodeSystem();
        const primaryBug = result.bugsFound[0];
        const targetAbsFile = path.join(fullGameDir, primaryBug.file);
        
        const fixResult = await autoCode.autoFixBug({
          bug: primaryBug,
          targetFile: targetAbsFile,
          customInstruction: `Fix ${primaryBug.type}: ${primaryBug.description}`
        });

        if (fixResult.success) {
          autoCode.applyChanges(targetAbsFile, fixResult.modifiedContent);
          result.fixed = true;
          result.fixDetails = {
            model: fixResult.model,
            tokens: fixResult.usage,
            cost: fixResult.cost
          };
          console.log(`  [AI AutoFix Success] Patched ${primaryBug.file} using ${fixResult.model}. Cost: ${fixResult.cost?.formatted || '$0.00'}`);
        }
      } catch (fixErr) {
        console.warn(`  [AI AutoFix Failed] ${fixErr.message}`);
      }
    }

    auditReport.push(result);
  }

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const reportPath = path.join(dataDir, 'api_debug_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\n==================================================`);
  console.log(`Automated API Debug Audit completed. Saved report to: ${reportPath}`);
}

if (require.main === module) {
  debugGames().catch(err => console.error('Debugger failed:', err));
}

module.exports = { debugGames };
