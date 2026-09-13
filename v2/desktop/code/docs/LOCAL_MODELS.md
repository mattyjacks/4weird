# Local Models (Ollama); install, roles, launcher

VibeCodeWorker runs fully offline-capable: Ollama provides the local models,
and each orchestration job gets its own model assignment.

## 1. Installing Ollama

| Path | How |
|---|---|
| Zero-click (recommended) | Run `launch_vibecodeworker.bat --install-ollama`, **or** open the dashboard panel **1B. LOCAL MODELS (OLLAMA)** and press **INSTALL** (asks first). Downloads ~700MB+ from ollama.com and silently installs. |
| Automatic | `node scripts/node/ensure_ollama.js --install` |
| Manual | `winget install Ollama.Ollama`, or https://ollama.com/download |

The app **never** auto-installs on boot; installs need explicit consent.
What boot *does* do (when panel toggle `autoStart` is on): start
`ollama serve` in the background if Ollama is installed but stopped.

Check readiness any time: `node scripts/node/ensure_ollama.js`
(exit 0 = server up). Pull a tag: `node scripts/node/ensure_ollama.js --pull qwen3:8b`.

## 2. One model per job (roles)

The pipeline is split into four roles; each runs a different model:

| Role | Job | Default tag |
|---|---|---|
| `agent` | Everyday decisions, planning, tool calls | `qwen3:8b` |
| `vision` | Screenshot / frame understanding (needs vision) | `qwen2.5vl:7b` |
| `coder` | Autocode patches, review, heal edits | `qwen2.5-coder:7b` |
| `reasoner` | Deep diagnosis, self-improvement | `deepseek-r1:8b` |

Defaults are suggestions; change them in panel **1B**, which offers your
actually-installed tags plus starter hints. A role can also point at a cloud
provider; then it behaves exactly like the legacy single-model path.

Persistence: `config/default.json` → `localModels: { ollamaUrl, autoStart,
roles: { agent/vision/coder/reasoner: { provider, model } } }`.
Headless/CI override (model tag only): `VIBE_ROLE_AGENT`, `VIBE_ROLE_VISION`,
`VIBE_ROLE_CODER`, `VIBE_ROLE_REASONER`. Server address:
`OLLAMA_URL` (or `OLLAMA_HOST` bind addr - `0.0.0.0` is rewritten to
loopback for dialing).

## 3. Code map

- `lib/ollama_manager.js`; detect / serve / install / list / pull / ensure.
- `lib/model_roles.js`; role registry, validation, `resolveRoleModel`,
  `callRoleLLM(brain, role, prompt, image?, audio?)` (delegates to `callLLM`).
- `scripts/node/ensure_ollama.js`; launcher/CI preflight CLI.
- `src/components/ollama_ui_controller.js` + panel `1B` in `src/index.html`
  + `localModels` load/save in `src/modules/config_manager.js`.
- `app/main.js` - `ollama-*` IPC channels + boot auto-start.
- `tests/test_ollama_models.js`; offline unit tests (`npm run test:ollama`).

## 4. Launcher flags (`launch_vibecodeworker.bat`)

`--no-ollama` skip preflight · `--install-ollama` full auto-install ·
`--no-pause` no pause-on-error · everything else forwards to the app.
The launcher also self-repairs: missing Electron runtime triggers
`npm ci` (or `npm install` without a lockfile) automatically.
