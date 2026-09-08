const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..", "..", "..");
const SHOT = path.join(ROOT, "test-results", "screenshots");
const PORT = 8901;
async function main() {
  const { startStaticServer } = require("./src/main_process/static_server");
  startStaticServer(PORT, path.join(ROOT, "website", "v1"));
  if (!fs.existsSync(SHOT)) fs.mkdirSync(SHOT, { recursive: true });
  const { app, BrowserWindow } = require("electron");
  await app.whenReady();
  const win = new BrowserWindow({ width: 1280, height: 800, show: true });
  const errs = [];
  win.webContents.on("console-message", (e, lv, msg) => { if (lv >= 2 && !/Security Warning/.test(msg)) { errs.push(msg); console.error("[page]", msg); } });
  await win.webContents.session.clearCache();
  await win.loadURL("http://127.0.0.1:" + PORT + "/games/html/gravegain2d/index.html?playtest=1");
  await new Promise(r => setTimeout(r, 4000));
  const hasGame = await win.webContents.executeJavaScript("!!window.GraveGainGame");
  console.log("hasGame=" + hasGame);
  const run = (c) => win.webContents.executeJavaScript(c);
  const shot = async (n) => { const img = await win.capturePage(); fs.writeFileSync(path.join(SHOT, n), img.toPNG()); console.log("[shot] " + n); };
  const driver = `window.__playtest = async (race, cls) => {
    const G = window.GraveGainGame;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    document.getElementById("mainMenuScreen").classList.add("hidden");
    document.getElementById("gameMain").classList.remove("hidden");
    G.setControlMode("turnbased");
    G.initRun(race, cls);
    await sleep(600);
    const out = { race, cls, ticks: 0, actions: {}, samples: [], errors: [] };
    const nearest = () => { let b = null, bd = 1e9; for (const e of G.enemies) { const d = Math.hypot(e.x - G.player.x, e.y - G.player.y); if (d < bd) { bd = d; b = e; } } return { e: b, d: bd }; };
    for (let i = 0; i < 25; i++) {
      let act = "wait";
      try {
        const { e, d } = nearest();
        if (!e) act = ["right","down","left","up"][i % 4];
        else if (d <= 70) act = "attack";
        else if (i % 7 === 6) act = "ability";
        else { const dx = e.x - G.player.x, dy = e.y - G.player.y; const priX = Math.abs(dx) > Math.abs(dy); act = priX ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); if (out.lastRet === "blocked") act = priX ? (dy >= 0 ? "down" : "up") : (dx >= 0 ? "right" : "left"); }
        out.lastRet = G.executeTurnAction(act);
        out.actions[act] = (out.actions[act] || 0) + 1;
        out.ticks++;
        if (i % 5 === 4 || i === 24) {
          const n2 = nearest();
          out.samples.push({ t: out.ticks, hp: Math.round(G.player.hp), st: Math.round(G.player.stamina), res: Math.round(G.player.mana || G.player.rage || G.player.shieldBubble || 0), kills: G.runKills, gold: G.gold, xp: Math.round(G.player.xp), lvl: G.player.level, foes: G.enemies.length, near: Math.round(n2.d), px: Math.round(G.player.x), py: Math.round(G.player.y), dead: G.player.isDead, ret: out.lastRet, fb: document.getElementById("hudTurnPhase").textContent });
        }
        if (G.player.isDead) break;
      } catch (err) { out.errors.push(String(err && err.message || err)); break; }
    }
    out.floor = G.floorIndex; out.turn = G.turnCount; out.lootLeft = G.loot.length;
    out.hpFrac = +(G.player.hp / G.player.maxHp).toFixed(2);
    return out;
  }; "driver-ok";`;
  await run(driver);
  const a = await run("window.__playtest('human','warrior')");
  console.log("TEST_A=" + JSON.stringify(a));
  await shot("g2d-A-human25.png");
  const b = await run("window.__playtest('elf','mage')");
  console.log("TEST_B=" + JSON.stringify(b));
  await shot("g2d-B-elf25.png");
  console.log("PAGE_ERRORS=" + errs.length);
  fs.writeFileSync(path.join(ROOT, "test-results", "gravegain2d-25tick.json"), JSON.stringify({ a, b, pageErrors: errs }, null, 1));
  app.exit(0);
}
const isE = !!(process.versions && process.versions.electron);
if (!isE) { const { spawnSync } = require("child_process"); const r = spawnSync(path.join(__dirname, "node_modules", "electron", "dist", "electron.exe"), [__filename], { stdio: "inherit" }); process.exit(r.status ?? 1); }
else main().catch(e => { console.error("fatal", e); require("electron").app.exit(1); });
