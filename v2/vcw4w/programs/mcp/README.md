# @4weird/mcp

Official 4weird Model Context Protocol server (Remastery README §4.5
Feature 18, Wave 2). Exposes 4weird capabilities to AI coding tools
(Claude Desktop, Cursor, Antigravity) over stdio — no worker-search tools.

## Tools

| Tool | Description |
|---|---|
| `run_vcw_game_test` | Trigger an automated VibeCodeWorker game QA run (`gameSlug`, optional `captureMode`, `durationSeconds`) and return detected bugs. |
| `get_game_state` | Fetch live leaderboards, save state, and catalog metadata for a game (`gameSlug`). |
| `query_squad_tasks` | Retrieve active Kanban sprint cards and tasks for a squad (`squadId`). |

## Build

```bash
cd programs/mcp && npm run build
```

`npm run build` typechecks and emits `build/index.js`. Run the server with
`npm start` (reads MCP frames on stdin, writes on stdout).

## Configure

| Env var | Default | Purpose |
|---|---|---|
| `FOURWEIRD_API_URL` | `https://4weird.com` | Base URL of the 4weird HTTP API the tools call. |
| `FOURWEIRD_API_TOKEN` | (unset) | Optional bearer token, supplied at runtime only. Never commit a real key. |

Example client config (placeholders only):

```json
{
  "mcpServers": {
    "4weird": {
      "command": "node",
      "args": ["C:/GitHub5/4weird/v2/vcw4w/programs/mcp/build/index.js"],
      "env": { "FOURWEIRD_API_URL": "https://4weird.com" }
    }
  }
}
```

## Layout

- `package.json` — package `@4weird/mcp`, `build` script (`tsc`).
- `tsconfig.json` — strict NodeNext config, `src` → `build`.
- `src/index.ts` — server, tool schemas, and HTTP-backed handlers.
