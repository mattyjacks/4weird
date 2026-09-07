# VibeCodeWorker Local REST API & SDK Reference Guide

The **VibeCodeWorker Local REST API** allows AI agents (such as Gemini), CLI scripts, and developer tools to control, inspect, playtest, patch, and debug HTML5 games running in the 4weird platform.

---

## 🚀 Quick Start

The API server runs by default on `http://127.0.0.1:42069`.

### Start API Server Standalone:
```bash
node ai/v1/VibeCodeWorker/start_api_server.js
```

### Start with Electron GUI:
```bash
cd ai/v1/VibeCodeWorker
npm start
```

---

## 📡 REST API Endpoints

### 1. `GET /api/status`
Returns API health, active game, runtime mode, uptime, and memory usage.

```bash
curl http://127.0.0.1:42069/api/status
```

---

### 2. `GET /api/games`
Discovers and returns all 21 games with metadata, paths, and local URLs.

```bash
curl http://127.0.0.1:42069/api/games
```

---

### 3. `POST /api/game/launch`
Launches a target game in the game runner or iframe viewport.

```bash
curl -X POST http://127.0.0.1:42069/api/game/launch \
     -H "Content-Type: application/json" \
     -d '{"gameId": "friendslop"}'
```

---

### 4. `GET /api/game/screenshot`
Captures real-time game viewport screenshot.

- Binary PNG: `curl http://127.0.0.1:42069/api/game/screenshot`
- Base64 JSON: `curl "http://127.0.0.1:42069/api/game/screenshot?format=json"`

---

### 5. `GET /api/game/logs`
Returns JS console logs, warnings, errors, and uncaught exceptions.

```bash
curl http://127.0.0.1:42069/api/game/logs
```

---

### 6. `GET /api/game/state`
Queries current DOM elements, canvas context, and global JS scope (`window.gameState`, `window.game`).

```bash
curl http://127.0.0.1:42069/api/game/state
```

---

### 7. `POST /api/game/action`
Sends mouse clicks, key presses, or touch inputs to the game.

```bash
curl -X POST http://127.0.0.1:42069/api/game/action \
     -H "Content-Type: application/json" \
     -d '{"type": "click", "x": 300, "y": 200}'
```

---

### 8. `POST /api/game/eval`
Executes JavaScript inside the active game context.

```bash
curl -X POST http://127.0.0.1:42069/api/game/eval \
     -H "Content-Type: application/json" \
     -d '{"script": "return window.game ? window.game.score : 0;"}'
```

---

### 9. `POST /api/game/patch`
Patches source code of a game file and triggers live hot-reload. Creates a timestamped `.bak` backup.

```bash
curl -X POST http://127.0.0.1:42069/api/game/patch \
     -H "Content-Type: application/json" \
     -d '{
       "filePath": "website/v1/games/html/friendslop/game.js",
       "targetContent": "const DEBUG = false;",
       "replacementContent": "const DEBUG = true;"
     }'
```

---

### 10. `GET /api/dashboard`
Returns consolidated live status, games, bug reports, and recent action logs.

```bash
curl http://127.0.0.1:42069/api/dashboard
```

---

## 📦 Node.js SDK Usage (`VibeCodeWorker_client.js`)

```javascript
const { VibeCodeWorkerClient } = require('./lib/VibeCodeWorker_client');

const client = new VibeCodeWorkerClient('http://127.0.0.1:42069');

async function run() {
  // Launch game
  await client.launchGame('friendslop');

  // Click canvas
  await client.click(400, 300);

  // Read state
  const state = await client.getGameState();
  console.log('Game State:', state);

  // Capture Base64 screenshot
  const shot = await client.getScreenshot('game', 'base64');
  console.log('Screenshot length:', shot.base64.length);
}

run();
```
