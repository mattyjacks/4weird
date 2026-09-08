const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

if (!(process.versions && process.versions.electron)) {
  const electron = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  process.exit(spawnSync(electron, ['--disable-gpu', __filename], { stdio: 'inherit' }).status || 0);
}

const combos = [
  ['Human', 'Warrior'],
  ['Elf', 'Mage'],
  ['Dwarf', 'Tank'],
  ['Orc', 'Support']
];
const root = path.join(__dirname, '..', '..', '..');
const out = path.join(root, 'test-results', 'gravegain2d-space-builds');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const { startStaticServer } = require(path.join(__dirname, '..', 'src', 'main_process', 'static_server'));
  const server = startStaticServer(8901, path.join(root, 'website', 'v1'));
  const { app, BrowserWindow } = require('electron');
  await app.whenReady();
  const results = [];
  for (let i = 0; i < combos.length; i++) {
    const [race, cls] = combos[i];
    const win = new BrowserWindow({ width: 1280, height: 820, show: true, webPreferences: { contextIsolation: true } });
    await win.loadURL('http://127.0.0.1:8901/games/html/gravegain2d/index.html?spacebuild=' + i);
    await new Promise(r => setTimeout(r, 500));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const clickText = (root, text) => [...document.querySelectorAll(root + ' button, ' + root + ' .char-card')].find(n => n.textContent.includes(text));
      document.getElementById('btnPlay')?.click();
      await new Promise(r => setTimeout(r, 80));
      const raceNode = clickText('#raceGrid', ${JSON.stringify(race)}); raceNode?.click();
      const classNode = clickText('#classGrid', ${JSON.stringify(cls)}); classNode?.click();
      document.getElementById('btnCharSelectStart')?.click();
      await new Promise(r => setTimeout(r, 120));
      window.scrollTo(0, 0);
      const before = window.scrollY;
      const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
      const dispatchResult = window.dispatchEvent(event);
      const after = window.scrollY;
      return { race: ${JSON.stringify(race)}, cls: ${JSON.stringify(cls)}, before, after, prevented: event.defaultPrevented, dispatchResult, page: document.body.className };
    })()`);
    const image = await win.capturePage();
    fs.writeFileSync(path.join(out, `${i + 1}-${race.toLowerCase()}-${cls.toLowerCase()}.png`), image.toPNG());
    results.push(result);
    await win.close();
  }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ ok: results.every(r => r.after === r.before && r.prevented), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
  try { server.close(); } catch (_) {}
  app.exit(results.every(r => r.after === r.before && r.prevented) ? 0 : 1);
})().catch(err => { console.error(err); app.exit(1); });
