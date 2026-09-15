# GraveGain2dB MMO — Break the Citadel Chain

Scope: **MMO event data + docs only.** Append-only new files; existing
`seasons.*` / `titles.js` / `codex-unlocks.js` / `worldboss.*` files are
read-only and untouched. Rooms/sim are owned by another builder and are
not modified here.

Files owned by this slice:

- `public/games/gravegain-mmo-events/seasons.breachchain.json` — event data
- `public/games/gravegain2dB/mmo.js` — browser attestation helper (no net)
- `docs/gravegain2dB-mmo.md` — this spec

Related (read-only, not edited): `lib/gravegain2dB-mmo.ts` (server-gated
aggregation: `verifyRoomReport` + `aggregateVerifiedReports`).

## 1. Flow

```text
board -> squad -> N rooms -> verified objectives -> global bar -> boss -> idempotent rewards
```

1. **Board** — player opens the 2dB mission board (hub station). Board
   lists the live event `break-the-citadel-chain`, its seed
   `citadel-chain-s3-2db`, the 4 fronts, threshold `1000000`, and the
   global bar. Board is display-only; it mints nothing.
2. **Squad** — up to 4 players form a squad (lobby code, 6 chars, no
   confusables). Squad admission is capacity/duplicate check only, not
   progress authority.
3. **N rooms** — squads deploy into authoritative room servers. Each room
   runs its own 4-player sim on the ONE shared event seed. There is no
   shared physics world; rooms never trust each other or the client.
4. **Verified objectives** — when a squad clears an objective, the room
   server mints ONE signed attestation (see section 2) and submits it to
   `POST /api/mmo/events/[id]/contribute`. The aggregator verifies sig +
   seed + nonce + clamps. Client-posted scores are rejected as
   `CLIENT_CLAIM`.
5. **Global bar** — verified values aggregate per front. Front counts only
   when its share reaches >= 20% of threshold (mirrors
   `worldboss.rotation.json` kill rule). Relay complete = all 4 fronts met.
6. **Boss** — relay completion unlocks `citadel-warder`. Boss damage (also
   room-server-attested) counts toward the kill threshold. Banner text:
   `CHAIN BROKEN — the World Boss wakes!`
7. **Idempotent rewards** — contributors redeem via
   `POST /api/mmo/events/[id]/redeem` with `{ user_id, kind }`. Server
   enforces `UNIQUE(user, event, kind)`: first redeem settles the
   entitlement, repeats return the original grant. Tiers by verified share:
   `chainbreaker` >= 5%, `ward-cleaver` >= 1%, `linkbearer` >= 0.2%.
8. **Solo-fallback** — when the MMO layer is offline/unreachable,
   `SOLO_FALLBACK = true`: the game boots, stages, and scores missions
   locally. Local clears never mint attestations and never touch the
   global bar. Reconnecting does not backfill local scores.

## 2. Attestation shape

Minted ONLY by the room server. Canonical field order for the sig:

```json
{
  "event_id": "break-the-citadel-chain",
  "room_id": "room-abc123",
  "seed": "citadel-chain-s3-2db",
  "mission": "minefall",
  "user_ids": ["u1", "u2", "u3", "u4"],
  "objective_id": "outer-ward:breach-alpha",
  "value": 25000,
  "nonce": "n-9f2c-0001",
  "iat": 1790000000,
  "sig": "<operator-key signature over canonical payload>"
}
```

Rules:

- `event_id` must equal `break-the-citadel-chain`.
- `room_id`, `seed`, `mission`, `objective_id`, `nonce` are
  `[A-Za-z0-9_-]`, length-capped (`nonce` <= 64).
- `user_ids`: 1–4 distinct ids (room size = 4).
- `value`: integer, `1..100000` (client helper clamps; server re-clamps).
- `nonce`: unique per `(room, objective)`; replays rejected.
- `iat`: unix seconds, `>= 0`; future-drift tolerance server-side.
- `sig`: non-empty; cryptographic validity checked server-side against
  the room-server key registry, never in the browser (`mmo.js` checks
  presence/shape only).

See `public/games/gravegain2dB/mmo.js` (`sanitizeAttestation`,
`contributionId`, `redeemClaim`, `isSoloFallback`).

## 3. Anti-fraud

- **Sig**: unknown server -> reject; missing/bad sig -> reject
  (`CLIENT_CLAIM`). Keys live server-side only.
- **Nonce**: `UNIQUE(room, objective, nonce)` on `mmo_contributions`.
  Duplicate submit returns the stored row, never double-counts.
- **Clamps**: per-objective `value` capped (`VALUE_MAX = 100000`);
  per-room user cap 4; tick/seq monotonic per room; relay legs in strict
  order (see `lib/gravegain2dB-mmo.ts` `verifyRoomReport`).
- **Seed gate**: attestation `seed` must equal the live event seed.
- **Rewards**: `UNIQUE(user, event, kind)` on `mmo_rewards`. Redeem is
  idempotent; no coin-ledger writes happen in the MMO layer (economy lane
  settles entitlements through its own guarded path).
- **Client claims**: any score/damage/clear object without a registered
  server sig fails the same gate. Browser helpers mint no progress.

## 4. Telemetry events

Emit these names (fail-open, display/analytics only, never authoritative):

| Event | When |
| --- | --- |
| `mmo.board_view` | mission board rendered |
| `mmo.squad_form` | squad/lobby created or joined |
| `mmo.room_start` | authoritative room sim started |
| `mmo.objective_verified` | contribute accepted (server-verified) |
| `mmo.contribution_accepted` | contribute stored (new row) |
| `mmo.contribution_rejected` | contribute rejected (reason code) |
| `mmo.global_tick` | global bar re-rendered |
| `mmo.boss_unlock` | relay complete, boss phase entered |
| `mmo.boss_kill` | boss threshold reached |
| `mmo.reward_redeem` | redeem settled (new grant) |
| `mmo.reward_duplicate` | redeem repeat (original returned) |
| `mmo.solo_fallback` | game entered offline solo mode |

## 5. Storage + API spec (SPEC TEXT ONLY — do not create routes here)

Required Supabase tables (to be created by the backend lane):

- `mmo_events` — one row per event: `id` (`break-the-citadel-chain`),
  `seed`, `threshold`, `fronts JSONB`, `window_start`, `window_end`,
  `phase` (`relay | boss | claimed | idle`).
- `mmo_rooms` — one row per authoritative room: `id`, `event_id FK`,
  `server_id`, `seed`, `mission`, `user_ids TEXT[]`, `last_tick`,
  `created_at`.
- `mmo_contributions` — one row per verified attestation:
  `id`, `event_id FK`, `room_id FK`, `objective_id`, `value INT`,
  `nonce`, `sig`, `verified_at`. Constraint:
  `UNIQUE(room_id, objective_id, nonce)`.
- `mmo_rewards` — one row per settled grant: `id`, `user_id`,
  `event_id FK`, `kind` (`chain-cache | chainbreaker | ward-cleaver |
  linkbearer`), `share_pct`, `granted_at`. Constraint:
  `UNIQUE(user_id, event_id, kind)`.

Required endpoints (to be implemented by the backend lane; NOT created
by this change):

- `GET /api/mmo/events/active` — returns the live event (`id`, `seed`,
  `threshold`, `fronts`, `phase`, `globalPct`, `legsMet`). Public, cached.
- `POST /api/mmo/events/[id]/contribute` — body: attestation shape
  (section 2). Verifies server sig + seed + nonce + clamps, upserts on
  `(room, objective, nonce)`, returns stored row or reject reason.
- `POST /api/mmo/events/[id]/redeem` — body: `{ user_id, kind }`.
  Enforces `UNIQUE(user, event, kind)`; first call settles, repeats return
  the original grant.

No routes, migrations, or ledger writes are part of this slice.
