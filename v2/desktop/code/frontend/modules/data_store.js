/* ==========================================================================
   4WEIRD VIBECODEWORKER // MOCK DATA, SOURCE CODE FILES & BUG POOL
   ========================================================================== */

export const sourceCodeFiles = {
  'orbitaldrift.js': `// 🛸 4WEIRD ORBITAL DRIFT - MAIN GAME ENGINE (v2.5)
import { Player } from './player.js';
import { PhysicsEngine } from './physics.js';
import { Analytics } from './analytics.js';

export class OrbitalDriftGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.player = new Player(100, 200);
    this.physics = new PhysicsEngine();
    this.analytics = new Analytics();
    this.isRunning = false;
    this.score = 0;
  }

  init() {
    console.log('[OrbitalDrift] Initializing canvas sub-systems...');
    this.physics.initGrid();
    this.setupInputs();
    this.isRunning = true;
    this.loop();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.player.handleKeyDown(e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.player.handleKeyUp(e.key);
    });
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.player && typeof this.player.update === 'function') {
      this.player.update(0.016);
    } else {
      console.warn('[Antigravity Patch] Safeguarded undefined player instance.');
    }
    this.physics.resolveCollisions();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.player.draw(this.ctx);
  }
}`,
  'player.js': `// 🎮 PLAYER ENTITY CONTROLLER & INPUT DELEGATE
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = 100;
    this.isAlive = true;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Line 22: Unsafeguarded runtime update tick
    if (player.update) player.update();
  }

  draw(ctx) {
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(this.x, this.y, 32, 32);
  }

  handleKeyDown(key) {
    if (key === 'ArrowRight') this.vx = 150;
    if (key === 'ArrowLeft') this.vx = -150;
  }

  handleKeyUp(key) {
    if (key === 'ArrowRight' || key === 'ArrowLeft') this.vx = 0;
  }
}`,
  'physics.js': `// 🏎️ SPATIAL COLLISION RESOLUTION ENGINE
export class PhysicsEngine {
  constructor() {
    this.entities = [];
  }

  initGrid() {
    this.grid = new Map();
  }

  resolveCollisions() {
    // Line 10: O(N^2) brute-force collision pair resolution loop
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = 0; j < this.entities.length; j++) {
        this.checkCollision(this.entities[i], this.entities[j]);
      }
    }
  }

  checkCollision(a, b) {
    if (!a || !b) return;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) < 20;
  }
}`,
  'analytics.js': `// 🌐 ANALYTICS TELEMETRY DISPATCHER
export class Analytics {
  constructor() {
    this.endpoint = 'http://api.internal/metrics';
  }

  post(payload) {
    // Line 8: CORS preflight rejection
    fetch('http://api.internal/metrics', { mode: 'cors' });
  }
}`
};

export const mockBugPool = [
  {
    type: "EXCEPTION",
    desc: "Uncaught TypeError: Cannot read property 'update' of undefined",
    stack: "TypeError: Cannot read property 'update' of undefined\n  at Player.update (player.js:22:18)\n  at Game.tick (game.js:120:10)\n  at requestAnimationFrame (loop.js:12:4)",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23080204'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ff3355' font-size='15'>CRASH: TypeError in player.js</text></svg>",
    file: "player.js",
    line: 22,
    rootCause: "Player object instance is destroyed or uninitialized prior to frame tick, causing null reference exception when invoking `.update()`.",
    fixDescription: "Insert optional chaining and type guard check on `player` reference in `player.js:22` before invoking `.update()`. Log warning if uninitialized.",
    rawDiff: `--- a/website/v1/games/src/player.js\n+++ b/website/v1/games/src/player.js\n@@ -21,3 +21,7 @@\n-   if (player.update) player.update();\n+   if (player && typeof player.update === 'function') {\n+     player.update();\n+   } else {\n+     console.warn('[Antigravity Patch] Safeguarded undefined player instance.');\n+   }`,
    diff: `<span class="diff-del">-   if (player.update) player.update();</span>\n<span class="diff-add">+   if (player && typeof player.update === 'function') {</span>\n<span class="diff-add">+     player.update();</span>\n<span class="diff-add">+   } else {</span>\n<span class="diff-add">+     console.warn('[Antigravity Patch] Safeguarded undefined player instance.');</span>\n<span class="diff-add">+   }</span>`
  },
  {
    type: "PERFORMANCE",
    desc: "Severe Frame Stutter: FPS dropped below 15 frames/sec",
    stack: "Warning: Long running script block took 142ms on requestAnimationFrame.\n  at PhysicsEngine.resolveCollisions (physics.js:10:20)\n  at Game.tick (game.js:115:8)",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23060401'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ffaa00' font-size='15'>FPS BOTTLENECK: physics.js</text></svg>",
    file: "physics.js",
    line: 10,
    rootCause: "O(N^2) brute-force collision pair resolution loop causing main thread freeze during dense entity interactions.",
    fixDescription: "Refactor collision resolution in `physics.js:10` to utilize spatial grid hashing query lookup to reduce frame tick complexity to O(N).",
    rawDiff: `--- a/website/v1/games/src/physics.js\n+++ b/website/v1/games/src/physics.js\n@@ -9,2 +9,3 @@\n-   for(let i=0; i<entities.length; i++) { for(let j=0; j<entities.length; j++) { checkCollision(entities[i], entities[j]); } }\n+   // Antigravity Patch: Spatial Hashing Optimization\n+   spatialGrid.queryNearby(entity, (other) => checkCollision(entity, other));`,
    diff: `<span class="diff-del">-   for(let i=0; i<entities.length; i++) { for(let j=0; j<entities.length; j++) { checkCollision(entities[i], entities[j]); } }</span>\n<span class="diff-add">+   // Antigravity Patch: Spatial Hashing Optimization</span>\n<span class="diff-add">+   spatialGrid.queryNearby(entity, (other) => checkCollision(entity, other));</span>`
  },
  {
    type: "SECURITY",
    desc: "Cross-Origin Channel Blocked: Access-Control-Allow-Origin missing",
    stack: "Fetch API Error: CORS preflight channel rejected http://api.internal/metrics\n  at Analytics.post (analytics.js:8:5)",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23050106'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%2300f2fe' font-size='15'>CORS RESTRICTION: api.internal</text></svg>",
    file: "analytics.js",
    line: 8,
    rootCause: "Strict CORS preflight request rejected by remote analytics server missing Access-Control-Allow-Origin header.",
    fixDescription: "Fallback fetch call in `analytics.js:8` to window.postMessage cross-domain message channel.",
    rawDiff: `--- a/website/v1/games/src/analytics.js\n+++ b/website/v1/games/src/analytics.js\n@@ -7,2 +7,3 @@\n-   fetch('http://api.internal/metrics', { mode: 'cors' });\n+   // Antigravity Patch: Safe postMessage fallback\n+   window.postMessage({ type: 'TELEMETRY_LOG', payload }, '*');`,
    diff: `<span class="diff-del">-   fetch('http://api.internal/metrics', { mode: 'cors' });</span>\n<span class="diff-add">+   // Antigravity Patch: Safe postMessage fallback</span>\n<span class="diff-add">+   window.postMessage({ type: 'TELEMETRY_LOG', payload }, '*');</span>`
  }
];

export const gamesCatalogue = [
  { id: 'orbitaldrift', title: '🛸 Orbital Drift', path: '../games/html/orbitaldrift/index.html', desc: '3D retro sci-fi arcade runner' },
  { id: 'lastwordszombies', title: '🧟 Last Words Zombies', path: '../games/html/lastwordszombies/index.html', desc: '🧟 Zombie 3D top-down typing survival' },
  { id: 'semestersurvival', title: '🎓 Semester Survival', path: '../games/html/semester-survival/index.html', desc: 'Fast-paced campus survival runner' },
  { id: 'serversavershield', title: '🛡️ Server Saver Shield', path: '../games/html/serversavershield/index.html', desc: 'Cybersecurity defense shield strategy' },
  { id: 'overtake', title: '🏎️ Overtake', path: '../games/html/overtake/index.html', desc: 'Pseudo-3D neon arcade highway racer' },
  { id: 'assassinanimals', title: '🦎 Assassin Animals', path: '../games/html/assassinanimals/index.html', desc: 'Tactical stealth animal roguelike' },
  { id: 'battlesharks2', title: '🦈 Battlesharks 2', path: '../games/html/battlesharks2/index.html', desc: 'Cyber ocean arena warfare' },
  { id: 'gravegain2d', title: '👹 GraveGain 2D', path: '../games/html/gravegain2d/index.html', desc: 'Dark fantasy top-down action RPG' },
  { id: 'gravegain3d', title: '⚔️ GraveGain 3D', path: '../games/html/gravegain3d/index.html', desc: 'Full 3D dungeon crawl adventure' },
  { id: 'aiwhackamole', title: '🔨 AI Whack-A-Mole', path: '../games/html/aiwhackamole/index.html', desc: 'Three.js 3D physics reaction test' },
  { id: 'soundpainter2', title: '🎹 Sound Painter 2', path: '../games/html/soundpainter2/index.html', desc: 'Interactive audio visualizer studio' },
  { id: 'venturemechanically', title: '💧 Venture Mechanically', path: '../games/html/venturemechanically/index.html', desc: 'Precision fluid mechanics puzzle' },
  { id: 'financialfreedom', title: '📈 Financial Freedom', path: '../games/html/financialfreedom/index.html', desc: 'Portfolio economy simulation sandbox' }
];
