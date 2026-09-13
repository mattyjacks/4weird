# VCWCODE Env Checklist

Key NAMES only — values live in env / server-only config, never in committed files.

## Checklist (from `.env.example`)

- [ ] `VIBE_WEB_ENGINE`
- [ ] `VCWCODE_PORT` (or equivalent API-port override, if defined in `.env.example`)
- [ ] `OLLAMA_URL` (or equivalent local-model URL override, if defined in `.env.example`)
- [ ] Any provider key names listed in `.env.example` (names only — no values here)

## Min-1-key rule

- At least ONE provider/model key must be set for live model calls
  (local Ollama URL counts when Ollama is the provider).
- No keys set = offline / static-only mode: app must still boot,
  serve the game host, and report models unavailable — never crash,
  never log a secret, never commit a key to the repo.
- Verify with `node -e "JSON.parse(...)"` on config overlays after any env change.
