# VCWCODE Ports Notes

Reference only — do not change ports here; set them in a config overlay or env.

## Default port map

| Port  | Service             | Default value                          |
|-------|---------------------|----------------------------------------|
| 42069 | Desktop API         | `serverPort` in `config/default.json`  |
| 8888  | Static game host    | serves `gameUrl` playtest pages        |
| 11434 | Ollama (local LLM)  | `localModels.ollamaUrl` / `localUrl`   |

## Conflict resolution

1. Find the conflict: `netstat -ano | findstr :42069` (repeat for 8888 / 11434).
2. Identify the owning PID and decide which service keeps the port.
3. Move VCWCode, not system services:
   - API: set `"serverPort": <free-port>` in `config/local.json`
     (valid range 1–65535 per `vcwcode-schema.json`).
   - Static host: point it at a free port and update `gameUrl` to match.
   - Ollama: keep 11434 when possible; if moved, update both
     `localUrl` and `localModels.ollamaUrl`.
4. Re-validate the overlay against `vcwcode-schema.json` and restart.
5. Never edit `config/default.json` to resolve a conflict — overlays only.
