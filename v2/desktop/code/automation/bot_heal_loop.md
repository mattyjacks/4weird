# bot_heal_loop — bot-driven bugtest/fix/retest loop (DS-OCT-05)

## What it is

`automation/bot_heal_loop.js` is a dependency-free (Node builtins + two
read-only sibling requires) state machine that lets a **bot or scheduler**
drive the desktop heal cycle with **zero prompts**:

```
BOOT -> BUGTEST -> COLLECT -> FIX -> RETEST -> ... -> DONE
```

- **BUGTEST / RETEST** — run the game test tools (`testCommand`, default
  `node tests/test_vibecodeworker.js` from `v2/desktop/code`).
- **COLLECT** — turn failing output lines into bug objects
  (`BOTHEAL-<iter>-<n>`).
- **FIX** — hand the bugs to `lib/opencode_bridge.js` on the **autoApprove
  path** (`autoApprove: true`, i.e. `opencode run --auto`), so a fix run
  never stalls on a permission prompt.
- **DONE** — terminal verdict, printed as JSON on stdout:
  `healed` (tests green) · `budget_exhausted` (maxTokens / maxSpendUSD) ·
  `iterations_exhausted` (maxIterations) · `error` (unrecoverable).
- **Every transition** (`BOOT->BUGTEST`, `BUGTEST->COLLECT`, …) is appended
  to `smart_log` (source `bot-heal-loop`, category `heal-loop`).
  Logging is best-effort and never breaks the loop.

## Ownership / hard rules

- This envelope owns **only** `automation/bot_heal_loop.js`, this doc, and
  `tests/test_bot_heal_loop.js` (all NEW — never edit `workers/`, `lib/`,
  or `server/` from here).
- `lib/opencode_bridge.js` (DS-OCT-01) and `lib/heal_budget.js` (DS-OCT-02)
  are consumed via `require` **read-only**. `heal_budget.js` may not have
  landed yet: the driver detects its shape (`createBudget()` or
  `HealBudget` class with `record`/`isExhausted`) and falls back to a
  built-in ledger otherwise (tokens ≈ `ceil(chars/4)`, priced from
  `priceInPer1k`/`priceOutPer1k` config, defaults $3/$15 per 1M).
- Out of scope on purpose (sibling envelopes): remote-terminal/MCP wiring
  (DS-OCT-03), coin debit RPC (DS-OCT-07 + economy lane), `vcwcode-*`
  automation (DS-VCWCODE-10), exe-embedded opencode (DS-EXE-OPENCODE-01).

## Config: file + CLI flags (flags win)

Optional JSON file (explicit `--config`, `BOT_HEAL_CONFIG` env, or adjacent
`automation/bot_heal_loop.config.json` when present):

```json
{
  "gameId": "gravegain2d",
  "testCommand": "node tests/test_gravegain2d_playtest.js",
  "testCwd": "C:/GitHub5/4weird/v2/desktop/code",
  "maxIterations": 3,
  "maxTokens": 200000,
  "maxSpendUSD": 1.0,
  "instructions": "Keep the fix scoped to the reported bugs."
}
```

CLI:

```
node automation/bot_heal_loop.js --game gravegain2d \
  --test-command "node tests/test_gravegain2d_playtest.js" \
  --max-iterations 3 --max-tokens 200000 --max-spend-usd 1.0 \
  [--test-cwd <dir>] [--config <path>] [--instructions <text>] [--json]
```

Env shortcuts: `BOT_HEAL_GAME`, `BOT_HEAL_TEST_COMMAND`, `BOT_HEAL_CONFIG`.
`--json` prints only the verdict JSON. Exit codes: `0` healed ·
`2` budget_exhausted · `3` iterations_exhausted · `1` error.

## Bot / scheduler launch (zero prompts)

```bat
node v2\desktop\code\automation\bot_heal_loop.js --game mygame ^
  --test-command "node tests/test_vibecodeworker.js" ^
  --max-iterations 3 --max-tokens 200000 --max-spend-usd 1.0 --json
```

Requirements for unattended runs: `OPENCODE_ENABLED=1` plus either an
installed `opencode` binary on PATH (`OPENCODE_BINARY` override) or
`OPENCODE_MODE=server` with `opencode serve` reachable. If the binary is
missing the run ends `error` with the install hint instead of burning
budget. No secrets are logged (keys live in env, never in smart_log rows).

## Tests

`node tests/test_bot_heal_loop.js` — 4 stubbed scenarios, no real game
tools, no real opencode (all steps injected):

- A. bugtest fails twice then passes → `healed` (2 fixes, transitions
  `BOOT->BUGTEST … RETEST->DONE` all observed).
- B. always-fails + tight token budget → `budget_exhausted`.
- C. always-fails + `maxIterations: 2` → `iterations_exhausted`.
- D. file + CLI config merge (flags win, `autoApprove` forced true).

Gates for this envelope: `node --check` on all three files + the smoke
test above (`SMOKE_OK 4/4`).
