# VCWCODE Env Guide — `.env.example` → `.env`

All paths relative to `v2/desktop/code`. Source: `.env.example`.

## 1. Setup (30 seconds)

```bat
cd v2\desktop\code
copy .env.example .env
notepad .env
```

Fill in **a minimum of 1 API key** (that is the documented rule, stated at
the top of `.env.example`). Pick whichever provider you already have —
the app launches with zero keys but cloud features need at least one.

```powershell
# Confirm .env is git-ignored (package.json build.files excludes !.env / !.env.*)
git check-ignore -v .env
```

## 2. Which keys map to which features

| Variable | Feature it unlocks |
| --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek Harness / Reasoner R1 / Chat V3 / V4 Flash — native `dsh` self-improvement loops, high token efficiency |
| `META_API_KEY` | Meta Muse Spark 1.3 Contributor (via Meta Model API or OpenRouter) — ultra-low-cost multimodal reasoning |
| `OPENAI_API_KEY` | ChatGPT / GPT-5.x / GPT-4o — flagship general intelligence, default fast engine |
| `OPENROUTER_API_KEY` | Multi-model aggregator (Muse Spark, Gemini 2.5 Pro/Flash, Claude) under one key |
| `GEMINI_API_KEY` | Google Cloud Gemini access |
| `LOCAL_LLM_URL` | Local endpoint (`http://localhost:11434/api/chat`) — Ollama / LM Studio, **no key needed** |
| `OLLAMA_URL` + `VIBE_ROLE_AGENT/VISION/CODER/REASONER` | Ollama lifecycle + per-role local models (e.g. `qwen3:8b`, `qwen2.5vl:7b`, `qwen2.5-coder:7b`, `deepseek-r1:8b`); mirrors dashboard panel "1B. LOCAL MODELS (OLLAMA)" / `config/default.json` |
| `ELEVENLABS_API_KEY` | BYOK voice layer — spoken bug alerts, commentary, voice-command playtests, NPC/VO packs, missing-SFX covers, Scribe dialogue QA. The PCM analyzer (`/api/audio/analyze`) works offline without it |
| `FAL_KEY` | fal.ai media runs (art, video, voice, 3D); desktop FAL KEY drawer is preferred, this env var is the fallback |
| `FOURWEIRD_BOT_KEY` | Act as your 4weird bot from the desktop (from `https://4weird.com/bot/setup`); desktop BOT TOKEN drawer is preferred, this env var is the fallback |
| `HOST` / `PORT` / `VIBE_API_TOKEN` | Cloud hosting — set `VIBE_API_TOKEN` (min 32 chars, `openssl rand -hex 24`) before exposing `:42069`; mutating `/api` calls then need `X-Vibe-Auth` / Bearer. Rate limit 120 req/min/IP, 30s timeout, 1MB body cap |
| `OPENCODE_*` | OpenCode bridge — autonomous direct-code-editing + self-heal (`OPENCODE_ENABLED/MODE/MODEL/AGENT/AUTO_APPROVE/TIMEOUT_MS/SERVER_URL/...`) |
| `VIBE_WEB_ENGINE` | Web engine driver: `ultralight` (default) \| `electron` \| `chromium`; also switchable at runtime via dashboard / `/api/engine` endpoints |
| `VIBE_PROVIDER` / `VIBE_BUDGET_LIMIT` / `VIBE_MAX_INPUT_TOKENS` / `VIBE_MAX_OUTPUT_TOKENS` / `VIBE_AUDIO_CHANNEL` | Runtime defaults (provider, spend cap, token caps, mono/stereo doctrine) |
| `VIBE_LOG_DIR` / `NODE_ENV` | Log dir + environment |

Keys are also saved locally into `%APPDATA%\vibecodeworker\credentials.json`
so they persist across builds/updates — `.env` is the seed, not the only
store.

## 3. Never commit `.env`

- `.env` / `.env.*` / `credentials.json` are excluded from builds
  (`package.json` `build.files`) **and** git-ignored (`.gitignore`).
  Keep it that way — never `git add -f .env`.
- Prefer the desktop drawers (FAL KEY, BOT TOKEN) over pasting secrets
  into chat/logs/screenshots; the drawers store keys encrypted outside
  the app folder so rebuilds keep them.
- Paste only key *names* (`DEEPSEEK_API_KEY=sk-…`) in bug reports,
  never values. If a secret leaks, revoke it at the provider and
  regenerate `VIBE_API_TOKEN` the same way.

## 4. Quick sanity check

```bat
rem From v2\desktop\code — app should boot; cloud calls need >=1 key above
launch_vibecodeworker.bat --no-ollama
```

```powershell
Invoke-RestMethod http://127.0.0.1:42069/api/status | ConvertTo-Json -Depth 6
```
