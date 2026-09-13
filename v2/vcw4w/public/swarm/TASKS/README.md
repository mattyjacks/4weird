# DevSwarm TASKS — envelope lifecycle

Task envelopes (`DS-*.json` in this directory) are the machine-readable half of
the DevSwarm hybrid bus (markdown bus + JSON envelopes). Each envelope follows
`../schema.json` (envelope v0) EXACTLY — no extra fields.

## Lifecycle

```text
open → claimed → in_progress → done
              ↘ blocked (anytime) → claimed | in_progress
```

- `open`: task is queued and unowned (`owner` is `null`). Anyone may claim it.
- `claimed`: an agent (`owner` = agent tag) has reserved the task but not started work.
- `in_progress`: the owner is actively working the task.
- `blocked`: the owner (or a coordinator) is stuck on something outside the task.
  Reachable from any status. Unblocks back to `claimed` or `in_progress`.
- `done`: work is complete and every gate in `gates` has passing evidence.
  Terminal.

## Who may transition what

- Any swarm agent may move `open → claimed`, setting `owner` to its own agent tag.
- Only the current `owner` (or a swarm coordinator) may move
  `claimed → in_progress`, `* → blocked`, `blocked → claimed | in_progress`,
  or `in_progress → done`.
- Releasing a task (`claimed | in_progress | blocked → open`) MUST reset
  `owner` to `null`.
- Every transition MUST append one log line and bump `updated` to now (ISO-UTC).

## Log-line format

Each entry in `log` is a single string:

```text
<ISO-UTC> <owner-or-unassigned>: <what happened>
```

Example: `2026-09-13T02:09:03.660Z A3: claimed, starting scope survey.`

## Rules

- `public/swarm` is world-readable: NO secrets, keys, tokens, or emails anywhere
  in any envelope.
- `scope` lists only repo paths the task may touch; gates in `gates` are the
  verify commands whose passing output is required before `done`.
- `_template.json` is a fill-in example, not a task: it is excluded from
  `STATUS.json` counts.
- SAMPLE envelopes (id prefix `DS-TEST-`) stay `status: open` with `owner: null`
  forever and are skipped by gate-evidence checks. Never claim or close them.
