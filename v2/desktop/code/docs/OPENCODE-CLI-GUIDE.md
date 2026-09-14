# OpenCode CLI Guide (VibeCodeWorker)

How VibeCodeWorker uses the OpenCode CLI (`opencode run`) for autonomous
bug-fix + heal loops. Server mode (`opencode serve`) is covered briefly for
contrast; this guide does not change server-mode behavior.

Bridge: `lib/opencode_bridge.js` · Config: `config/default.json` (`opencode` block).

## 1. Install per OS

| OS | Install | Verify |
|---|---|---|
| Linux | `curl -fsSL https://opencode.ai/install \| bash` | `opencode --version` |
| macOS | `curl -fsSL https://opencode.ai/install \| bash` or `brew install opencode` | `opencode --version` |
| Windows | `choco install opencode` **or** `npm install -g opencode-ai` | `opencode --version` |

If the binary is not on `PATH`, point at it explicitly (see env table):

```cmd
set OPENCODE_BINARY=C:\tools\opencode\opencode.exe
opencode --version
```

Docs: https://opencode.ai/docs

## 2. `opencode run` (CLI, default) vs `opencode serve` (server)

| | `opencode run` (CLI mode, `mode: "cli"`) | `opencode serve` (server mode, `mode: "server"`) |
|---|---|---|
| What it does | Spawns one `opencode run` child per fix; OpenCode edits repo files itself, then exits | Talks HTTP to a long-lived `opencode serve` instance (no per-run cold boot) |
| Start anything first? | No — just install the CLI | Yes: `opencode serve --port 4096` |
| Binary resolution | `PATH` lookup (`where`/`which`) or `OPENCODE_BINARY` / absolute `binary` | Same detection for status; requests go to `serverUrl` |
| Args built by | `buildRunArgs()` → `run [--model X] [--agent build] [--auto] --format json` | `serverCreateSession` → `serverSendMessage` → `serverGetDiff` |
| Timeout | `timeoutMs` (default 600000) as spawn timeout | `timeoutMs` as message timeout |
| When to use | Default; simplest; matches heal-loop `fresh`/`same` flows | Long sessions, reusable context, no spawn overhead |

CLI detection Mats (in `detectOpenCode()`):
1. Resolve `binary` via `PATH` (`where` on Windows, `which` elsewhere); absolute paths skip the lookup.
2. Probe with `opencode --version` (10 s timeout, best-effort).
3. Return `{ available, binary, path, version, hint }`; `hint` carries the install hint when unavailable.

`autoApprove` passthrough: `true` appends `--auto` so fixes never stall on
permission prompts. `timeoutMs` passthrough: forwarded as the spawn timeout.

## 3. Config + env vars

File config lives in `config/default.json` under `opencode`:

```json
{
  "opencode": {
    "enabled": false,
    "mode": "cli",
    "binary": "opencode",
    "model": "",
    "agent": "build",
    "autoApprove": true,
    "timeoutMs": 600000,
    "serverUrl": "http://127.0.0.1:4096",
    "serverUsername": "opencode",
    "serverPassword": "",
    "workspaceRoot": "",
    "exportDir": ""
  }
}
```

CLI-relevant defaults: `binary: "opencode"` (PATH lookup), `agent: "build"`,
`autoApprove: true` (`--auto`), `timeoutMs: 600000`.
Empty `model` = OpenCode default; empty `workspaceRoot` = repo root;
empty `exportDir` = `<vibecodeworker>/data/opencode_exports`.

Env vars override file config (`getOpenCodeConfig()`):

| Env var | Maps to | Example |
|---|---|---|
| `OPENCODE_ENABLED` | `enabled` | `1` / `true` |
| `OPENCODE_MODE` | `mode` | `cli` |
| `OPENCODE_BINARY` | `binary` | `/usr/local/bin/opencode` |
| `OPENCODE_MODEL` | `model` | `anthropic/claude-sonnet-4-5` |
| `OPENCODE_AGENT` | `agent` | `build` |
| `OPENCODE_AUTO_APPROVE` | `autoApprove` | `1` / `true` |
| `OPENCODE_TIMEOUT_MS` | `timeoutMs` | `600000` |
| `OPENCODE_WORKSPACE` | `workspaceRoot` | `C:\GitHub5\4weird` |
| `OPENCODE_SERVER_URL` | `serverUrl` | `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_USERNAME` | `serverUsername` | `opencode` |
| `OPENCODE_SERVER_PASSWORD` | `serverPassword` | (server mode only) |

Never commit secrets: keep passwords/tokens in env, not in `config/default.json`.

## 4. Verify via `/api/opencode/status`

1. Syntax-check the bridge (from `v2/desktop/code`):
   ```cmd
   node --check lib/opencode_bridge.js
   ```
2. Start the desktop API server, then:
   ```cmd
   curl http://127.0.0.1:42069/api/opencode/status
   ```
   (Port comes from `serverPort` in `config/default.json`.)
3. Expected when the CLI is installed:
   ```json
   { "enabled": false, "mode": "cli", "available": true, "version": "opencode ...", "binary": "opencode" }
   ```
4. Expected when missing: `available: false` plus a `hint` with the install
   command for your OS. Install, re-run `opencode --version`, then re-hit status.
5. To enable fixes: set `"enabled": true` (or `OPENCODE_ENABLED=1`) and POST a
   bug-fix or start a heal cycle; CLI mode needs no server running.

## 5. Follow-ups

- Server mode (`opencode serve` handlers, auth, session/diff/revert) is
  intentionally untouched — coordinate with the server-mode owner before changing it.
- `old-v1/` is a read-only mirror; no OpenCode files live there.
