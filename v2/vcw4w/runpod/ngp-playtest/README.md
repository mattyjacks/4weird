# NGP headless playtest worker (scaffold — not wired into the app yet)

Real Chromium playtest of a generated single-file game: boot, 120+ real
frames, synthetic keyboard + pointer, HUD/pause/reset assertions — the same
contract as `lib/newgameplus.ts` `executePlaytest`, but with a real browser
instead of the `node:vm` stub canvas.

## Why serverless, why CPU

The desktop/autoplay path provisions a full Kasm pod for up to 60 minutes
(~9 coins CPU / ~38 GPU / ~132 boosted per run). This worker needs no GPU
(2D canvas), scales to zero, and finishes one job in ~10–30s — roughly two
orders of magnitude cheaper per verified commit.

## Endpoint recipe (manual, needs `RUNPOD_API_KEY`)

- Workers: CPU flavor, `min: 0` (scale to zero), `max: 1–3`
- `idleTimeout: 5s`, execution timeout `30s`, scaler `QUEUE_DELAY`
- Env: `PLAYTEST_TIMEOUT_S=25`, `PLAYTEST_FAIL_SHOT=1`
- Image: `<namespace>/ngp-playtest:v1` (this folder)

## Cost governor (to enforce when wiring)

- Verify final passing commits only, never quality 0 (same gates as
  `POST /api/newgameplus/vcw-verify`).
- One serverless verify per submission (idempotency on run goal).
- Cold start (image pull, minutes on first job) is expected: submit async,
  poll with `wait ≤ 45s`, and **always fall back to the in-process
  `executePlaytest`** (`detail: "local-fallback"`) — never fail a build
  on infra.
- Meter separately (outside `plan.spend`), same VCW rates style.

## Local check

`python handler.py --selftest` — static regex checks only, no playwright,
no keys. Must print a JSON verdict and exit 0.
