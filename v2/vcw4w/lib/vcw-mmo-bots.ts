/**
 * VCW MMORPG bot/autoplay QA driver — pure, client-safe helpers.
 *
 * Bot player driver against the `window.GraveGainMMO` contract owned by the
 * games lane (`public/games/shared/mmorpg-net.js`, read-only reference —
 * never imported or edited here):
 *   - `spawnBot(serverId, band)` creates a synthetic player bound to one of
 *     the netcore servers (`us-east-1`, `eu-1`, `asia-1`).
 *   - `botTick` / `botHeartbeat` run the walk + heartbeat loop, emitting
 *     snapshots in the netcore schema
 *     (`{ x, y, hp, maxhp, gold, kills, floor, sector, progress, boss,
 *        winner, seed, ageBand, serverId, playerId }`).
 *   - `assertBandJoin` enforces the docs/mmorpg/age-bands entry rule
 *     (kids -> kids-only, teens -> kids + teens, adults -> all).
 *   - `quoteForSnapshot` mirrors the netcore `coinQuotePure` display quote
 *     (`coins = gold + kills * 10`, capped) — display ONLY, never a ledger
 *     write; coin movement is economy-owned.
 *
 * Rules (same as `lib/vcw-mmorpg-presence.ts`):
 * - NEVER read cookies here (no auth decisions in this module).
 * - NEVER import `lib/vcw-gateway*.ts` (gateway/BYOK wiring lives
 *   server-side when the simulate route is promoted).
 * - Fail-open: invalid input returns `null`, loops never throw, so autoplay
 *   QA harnesses never crash on bad fixtures.
 * - No DOM, no fetch, no timers — the caller owns the loop. A browser
 *   harness may feed `botHeartbeat(bot).snapshot` into
 *   `window.GraveGainMMO.render()` / POST it to a heartbeat route.
 *
 * In-scope home for the vcw lane (`lib/vcw-*.ts`). The requested
 * `lib/mmo-bots.ts` path is outside lane-owned globs; this file is the
 * lane-compliant equivalent — steward may alias/promote it.
 */

export const MMO_AGE_BANDS = ["kids", "teens", "adults"] as const;
export type MmoAgeBand = (typeof MMO_AGE_BANDS)[number];

export function isMmoAgeBand(value: unknown): value is MmoAgeBand {
  return typeof value === "string" && (MMO_AGE_BANDS as readonly string[]).includes(value);
}

/** Netcore server ids mirrored from `mmorpg-net.js` SERVERS (reference). */
export const MMO_SERVERS = ["us-east-1", "eu-1", "asia-1"] as const;
export type MmoServerId = (typeof MMO_SERVERS)[number];

export function isMmoServerId(value: unknown): value is MmoServerId {
  return typeof value === "string" && (MMO_SERVERS as readonly string[]).includes(value);
}

/**
 * Entry matrix from `app/docs/mmorpg/age-bands`: a player band lists the
 * shard bands that player may enter. Nobody enters above their band, ever.
 */
const BAND_ENTRY: Record<MmoAgeBand, readonly MmoAgeBand[]> = {
  kids: ["kids"],
  teens: ["kids", "teens"],
  adults: ["kids", "teens", "adults"],
};

/** True when a player of `playerBand` may enter a `shardBand` shard. */
export function canJoinBand(playerBand: unknown, shardBand: unknown): boolean {
  if (!isMmoAgeBand(playerBand) || !isMmoAgeBand(shardBand)) return false;
  return BAND_ENTRY[playerBand].includes(shardBand);
}

export type BandJoinVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Age-band join assertion for QA: `{ ok: true }` when entry is allowed,
 * otherwise `{ ok: false, reason }` naming both bands (fail-open: unknown
 * bands deny with a reason instead of throwing).
 */
export function assertBandJoin(playerBand: unknown, shardBand: unknown): BandJoinVerdict {
  if (!isMmoAgeBand(playerBand)) return { ok: false, reason: `Unknown player band "${String(playerBand).slice(0, 32)}".` };
  if (!isMmoAgeBand(shardBand)) return { ok: false, reason: `Unknown shard band "${String(shardBand).slice(0, 32)}".` };
  if (BAND_ENTRY[playerBand].includes(shardBand)) return { ok: true };
  return { ok: false, reason: `${playerBand} players may not enter ${shardBand} shards.` };
}

/** Synthetic snapshot in the netcore `sanitizeSnapshot` schema. */
export type MmoSnapshot = {
  x: number;
  y: number;
  hp: number;
  maxhp: number;
  gold: number;
  kills: number;
  floor: number;
  sector: number;
  progress: number;
  boss: string;
  winner: boolean;
  seed: string;
  ageBand: MmoAgeBand;
  serverId: string;
  playerId: string;
};

export type MmoBot = {
  playerId: string;
  serverId: MmoServerId;
  band: MmoAgeBand;
  seed: string;
  tick: number;
  x: number;
  y: number;
  hp: number;
  gold: number;
  kills: number;
  floor: number;
  state: number;
};

export type SpawnBotOptions = {
  playerId?: unknown;
  seed?: unknown;
  shardBand?: unknown;
};

const MAX_ID_LEN = 64;
const MAX_SEED_LEN = 32;

function cleanToken(value: unknown, max: number, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const out = value.replace(/[\0-\x1F\x7F]/g, "").trim().slice(0, max);
  return out || fallback;
}

/** Deterministic PRNG (mulberry32) so dry-runs replay from the same seed. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Spawn a synthetic bot player against the `window.GraveGainMMO` contract.
 * Returns `null` (fail-open) when the server id or band is unknown, or when
 * the band fails the shard-band join assertion.
 */
export function spawnBot(
  serverId: unknown,
  band: unknown,
  opts?: SpawnBotOptions,
): MmoBot | null {
  if (!isMmoServerId(serverId) || !isMmoAgeBand(band)) return null;
  const shardBand = opts?.shardBand === undefined ? band : opts.shardBand;
  if (assertBandJoin(band, shardBand).ok === false) return null;
  const seed = cleanToken(opts?.seed, MAX_SEED_LEN, `${serverId}-${band}`);
  const playerId = cleanToken(opts?.playerId, MAX_ID_LEN, `bot-${band}-${hashSeed(seed).toString(36)}`);
  const rng = mulberry32(hashSeed(`${seed}:${playerId}`));
  return {
    playerId,
    serverId,
    band,
    seed,
    tick: 0,
    x: Math.floor(rng() * 800),
    y: Math.floor(rng() * 600),
    hp: 100,
    gold: 0,
    kills: 0,
    floor: 1,
    state: hashSeed(`${seed}:${playerId}:walk`),
  };
}

/** Current synthetic snapshot for a bot (netcore schema, no live global). */
export function botSnapshot(bot: MmoBot): MmoSnapshot {
  return {
    x: Math.round(bot.x),
    y: Math.round(bot.y),
    hp: Math.max(0, Math.floor(bot.hp)),
    maxhp: 100,
    gold: Math.max(0, Math.floor(bot.gold)),
    kills: Math.max(0, Math.floor(bot.kills)),
    floor: Math.max(1, Math.floor(bot.floor)),
    sector: bot.tick % 8,
    progress: Math.min(100, (bot.tick * 7) % 101),
    boss: bot.tick > 0 && bot.tick % 25 === 0 ? "boss" : "",
    winner: false,
    seed: bot.seed,
    ageBand: bot.band,
    serverId: bot.serverId,
    playerId: bot.playerId,
  };
}

/**
 * Advance one walk tick: seeded random walk on x/y, trickle gold, a kill
 * every few ticks, small self-damage with revive at 0 (bots never die in
 * dry-run — hp resets so loops run unbounded).
 */
export function botTick(bot: MmoBot): MmoSnapshot {
  const rng = mulberry32((bot.state + bot.tick * 2654435761) >>> 0);
  bot.tick += 1;
  bot.x = Math.max(0, Math.min(800, bot.x + (rng() - 0.5) * 60));
  bot.y = Math.max(0, Math.min(600, bot.y + (rng() - 0.5) * 60));
  bot.gold += Math.floor(rng() * 4);
  if (bot.tick % 3 === 0) bot.kills += 1;
  if (bot.tick % 10 === 0) bot.floor += 1;
  bot.hp -= Math.floor(rng() * 6);
  if (bot.hp <= 0) {
    bot.hp = 100;
    bot.gold = Math.max(0, bot.gold - 5);
  }
  return botSnapshot(bot);
}

/** Netcore `heartbeatBody` shape for one bot: `{ playerId, serverId, snapshot }`. */
export function botHeartbeat(bot: MmoBot): {
  playerId: string;
  serverId: string;
  snapshot: MmoSnapshot;
} {
  return { playerId: bot.playerId, serverId: bot.serverId, snapshot: botSnapshot(bot) };
}

export type MmoCoinQuote = { gold: number; kills: number; coins: number; currency: "VCW" };

/**
 * Display-only coin quote mirroring netcore `coinQuotePure`
 * (`coins = gold + kills * 10`, capped at 1,000,000). NEVER a ledger write.
 */
export function quoteForSnapshot(snap: Pick<MmoSnapshot, "gold" | "kills">): MmoCoinQuote {
  const gold = Number.isFinite(snap.gold) && snap.gold > 0 ? Math.floor(snap.gold) : 0;
  const kills = Number.isFinite(snap.kills) && snap.kills > 0 ? Math.floor(snap.kills) : 0;
  const coins = Math.max(0, Math.min(1000000, gold + kills * 10));
  return { gold, kills, coins, currency: "VCW" };
}

export type ShardSimulation = {
  serverId: MmoServerId;
  bots: number;
  ticks: number;
  heartbeats: ReturnType<typeof botHeartbeat>[];
  quotes: MmoCoinQuote[];
};

/** Shard caps: 32 players per docs/mmorpg (first-come within band). */
export const MMO_SIM_MAX_BOTS = 32;
export const MMO_SIM_MAX_TICKS = 120;

/**
 * Dry-run a shard: spawn `bots` bots on `serverId` (round-robin bands) and
 * walk `ticks` ticks. Pure + synchronous — no network, no DB, no timers.
 * Returns `null` on invalid input (fail-open; the route maps it to 400).
 */
export function simulateShard(
  serverId: unknown,
  bots: unknown,
  ticks: unknown,
): ShardSimulation | null {
  if (!isMmoServerId(serverId)) return null;
  if (typeof bots !== "number" || !Number.isInteger(bots) || bots < 1 || bots > MMO_SIM_MAX_BOTS) {
    return null;
  }
  if (typeof ticks !== "number" || !Number.isInteger(ticks) || ticks < 1 || ticks > MMO_SIM_MAX_TICKS) {
    return null;
  }
  const bands: MmoAgeBand[] = ["kids", "teens", "adults"];
  const roster: MmoBot[] = [];
  for (let i = 0; i < bots; i++) {
    const band = bands[i % bands.length];
    const bot = spawnBot(serverId, band, { playerId: `bot-${band}-${i + 1}`, seed: `${serverId}-dryrun` });
    if (bot) roster.push(bot);
  }
  if (roster.length === 0) return null;
  for (let t = 0; t < ticks; t++) {
    for (const bot of roster) botTick(bot);
  }
  const heartbeats = roster.map((bot) => botHeartbeat(bot));
  const quotes = heartbeats.map((h) => quoteForSnapshot(h.snapshot));
  return { serverId, bots: roster.length, ticks, heartbeats, quotes };
}
