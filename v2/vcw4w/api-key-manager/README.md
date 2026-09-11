# 4weird API Key Manager

A tiny Tauri v2 `.exe` that keeps your API keys in the **OS credential store**
and hands them to desktop agents (Codex CLI, OpenCode, any terminal)
in one click; raw, PowerShell `$env:`, bash `export`, or `.env` line.

## Feature parity with the vibecodeworker desktop key manager

| vibecodeworker desktop (`v2/desktop/vibecodeworker`) | This manager |
|---|---|
| Bot key drawer: `bot4weird_`+20 shape check, masked badge, save / live-verify (`GET /api/bot/me`) / clear / stored-or-not status | Same shapes, same verify endpoint, same masked display, same flows; slot **4weird Bot key** |
| FAL KEY drawer: opaque-key shape guard, masked badge, save / **free** nil-UUID verify probe / clear / status | Same guard, same free probe, same flows; slot **fal.ai key** |
| RunPod key: BYOK input kept **session-only** (`run.html`) | **Strict upgrade:** same key, now vault-persisted; verify = read-only `GET /v2/pods` probe (free) |
| Phone control token / session lock password | Out of scope on purpose: local UI secrets, not provider API keys |
| FAL "cheap test" render | Out of scope on purpose: it spends real money rendering media; key *management* never spends |

Plus agent slots the desktop never persisted: **OpenAI** (`sk-`/`sk-proj-`),
**Anthropic** (`sk-ant-`), **Google AI** (`AIza`), **OpenRouter** (`sk-or-v1-`),
each with shape validation and a free live probe (model list / key info).

## Security model

- **Storage:** `keyring` crate → Windows Credential Manager (DPAPI-encrypted at
  rest, unlocked with your Windows login), macOS Keychain, Linux Secret Service.
  Service name: `4weird-api-key-manager`. The program writes **zero** secret
  material to its own files, stdout, or logs; check `src-tauri/src/lib.rs`:
  every error string is static.
- **Memory:** secret buffers are `Zeroizing` (wiped on drop); the frontend
  drops revealed values after copy and auto-hides reveals after 15 s.
- **Display:** statuses expose a masked fingerprint (`abcd…wxyz`) only. Full
  values leave the vault solely via your explicit Reveal / Copy click.
- **Webview:** strict CSP (no inline scripts/styles, `connect-src` limited to
  `ipc:` + the seven provider APIs), minimal capability set (`core:default`
  only; no fs, dialog, notification, or shell access).
- **Honest limits:** clipboard contents are owned by the OS once copied
  (paste promptly); JS cannot truly zero RAM (we overwrite + drop references).
  Verify probes are read-only and free; `--smoke` writes only a random scratch
  entry it immediately deletes.

## Handing keys to agents

- **Codex CLI** needs `OPENAI_API_KEY`: slot → Copy: PowerShell →
  paste in the terminal before `codex`.
- **OpenCode** reads provider env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, …): use **Copy all saved as .env**,
  paste once, launch `opencode` from that shell.
- **Google AI (Gemini) flows** need `GEMINI_API_KEY`: Copy: bash/.env.
- **4weird bot work** uses `FOURWEIRD_BOT_KEY` as the `x-bot-key` header value.
- **fal / RunPod scripts** use `FAL_KEY` / `RUNPOD_API_KEY` (same names as the
  `vcw4w` server env vars, so `.env` output drops straight in).

## Build the .exe

Prereqs (Windows): Rust MSVC toolchain (`rustup`), WebView2 runtime (preinstalled
on Win 10/11). No Node build step; the frontend is static files.

```powershell
cd v2\vcw4w\api-key-manager\src-tauri
cargo build --release
```

Output: `src-tauri\target\release\fourweird-api-key-manager.exe`.
A stable copy is staged at `api-key-manager\4weird-api-key-manager.exe`, and
`v2\vcw4w\4weird API Key Manager.lnk` (root shortcut) points at it.

Headless self-test (no window; proves the real OS vault round-trips):

```powershell
.\4weird-api-key-manager.exe --smoke   # → SMOKE OK: credential-store round-trip OK …
```

## Files

```
api-key-manager/
  README.md                  ← this file
  4weird-api-key-manager.exe ← staged release binary (copied from target/)
  frontend/
    index.html               ← UI shell (no inline JS/CSS per CSP)
    styles.css
    app.js                   ← slot catalog, free verify probes, copy formats
  src-tauri/
    Cargo.toml               ← tauri =2.11.5 (warm cache) + serde + keyring 3 + zeroize 1
    build.rs / tauri.conf.json / capabilities/default.json
    icons/                   ← reused 4weird icon set
    src/main.rs              ← --smoke gate + run()
    src/lib.rs               ← vault: validators, km_* commands, smoke_test()
```
