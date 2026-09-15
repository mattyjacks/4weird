/**
 * GraveGain2dB MMO social / event layer (DS-GG2DB-07, games lane, v2-native).
 *
 * NEW-file scope only: `v2/vcw4w/lib/gravegain2dB-mmo.ts` + the public
 * `gravegain2dB/mmo/` browser bundle. Extends the patterns of
 * `public/games/gravegain-mmo-events/` (rotation/assess/codex/titles) and the
 * `gravegain-mmorpg-*.js` net/events helpers — those files are READ-ONLY and
 * are never edited or imported here (client-safe: this module is
 * dependency-free, no server imports, no cookies, no ledger writes).
 *
 * What this is: hub presence shapes, party/lobby-code helpers, friends,
 * chat + emoji-emote hooks, world-event announcements, public breach-event
 * aggregation ("Break the Citadel Chain": many 4-player authoritative rooms
 * on ONE shared seed, relay objectives -> global progress -> world boss ->
 * contributor rewards), and season/codex hooks.
 *
 * What this is NOT: a giant single destructible instance. There is no shared
 * physics world here. Each breach room simulates its own 4-player instance on
 * the room server; only the room server's signed report moves global state.
 *
 * ---------------------------------------------------------------------------
 * IRON RULE — contributions only from authoritative room servers.
 * Zero client score / destruction claims are accepted, ever.
 *
 * Verification path (the only path by which progress/rewards move):
 *
 *   1. Client plays inside a room server's authoritative sim. The client may
 *      send *inputs* (move, swing, emote) — never scores, damage totals,
 *      objective clears, or boss kills.
 *   2. The room server simulates, then emits a signed RoomReport:
 *      `{ roomId, serverId, eventSeed, tickSeq, legs, damage, sig }`.
 *      `serverId` must be in the operator's trusted registry and `sig` must
 *      verify against that server's key (HMAC/ed25519 — verification lives
 *      server-side in the API route, never in this file or the browser).
 *   3. The aggregator (server route) runs `verifyRoomReport()` below:
 *      unknown server -> reject; bad/missing sig -> reject; eventSeed
 *      mismatch -> reject; tickSeq regression/replay -> reject; relay legs
 *      out of order -> reject. Anything the client POSTs directly that is not
 *      a server-signed RoomReport fails the same gate as `CLIENT_CLAIM`.
 *   4. Only verified reports enter `aggregateVerifiedReports()` -> global
 *      progress -> world-boss unlock -> `contributorRewards()`.
 *   5. Season/codex entries (`seasonProgressFromVerified()`,
 *      `codexEntriesFromVerified()`) are derived from the verified ledger,
 *      never from client-submitted totals.
 *
 * Client functions in this file are display/queue helpers only: they shape
 * what the UI shows and what inputs it may send. They mint no progress.
 * ---------------------------------------------------------------------------
 *
 * Economy boundary: ZERO coin-ledger writes/reads here (no tables, no
 * migrations touched). Rewards produced are *entitlement claims*
 * (`ContributorReward`: playerId + tier + reason) for the economy lane to
 * settle through its own guarded path.
 */

/** Game slug for every channel/room name in this slice. */
export const GG2DB_GAME = "gravegain2db";

/** Hub room id every client idles in before matchmaking. */
export const GG2DB_HUB_ROOM = "hub";

/** Breach event id for the flagship public event. */
export const GG2DB_BREACH_EVENT_ID = "break-the-citadel-chain";

/** Authoritative room size: exactly 4 players per breach room. */
export const GG2DB_ROOM_SIZE = 4;

/** Max players shown in hub presence (cap, mirrors MMORPG net cap style). */
export const GG2DB_HUB_CAP = 64;

/** Max party size (one breach room). */
export const GG2DB_PARTY_MAX = 4;

/** Lobby codes: 6 chars, no confusables (no 0/O, 1/I/L). */
export const GG2DB_LOBBY_LEN = 6;
const LOBBY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Chat: single message cap; history cap per room. */
export const GG2DB_CHAT_MAX_LEN = 140;
export const GG2DB_CHAT_HISTORY = 50;

/** Emote allowlist: id -> glyph. Only these ids ever render. */
export const GG2DB_EMOTES: Record<string, string> = {
  wave: "\u{1F44B}",
  gg: "\u{1F389}",
  rip: "\u{1FAA6}",
  lantern: "\u{1F3EE}",
  cheer: "\u{1F64C}",
  sweat: "\u{1F605}",
  skull: "\u{1F480}",
  heart: "\u{1F49C}",
  run: "\u{1F4A8}",
  trap: "\u{1FAA4}",
  crown: "\u{1F451}",
  hush: "\u{1F92B}",
};

/** Relay legs in strict order: leg i counts only when legs < i cleared. */
export const GG2DB_RELAY_LEGS = [
  "outer-ward",
  "chain-span",
  "gatehouse",
  "citadel-core",
] as const;
export type Gg2dbRelayLeg = (typeof GG2DB_RELAY_LEGS)[number];

/** Global damage needed to unlock the world boss after relays complete. */
export const GG2DB_BOSS_THRESHOLD = 1_000_000;

/** Minimum share of threshold each relay leg must carry (mirrors fronts rule). */
export const GG2DB_LEG_MIN_PCT = 20;

/** Reward tiers by verified contribution share of the global pool. */
export const GG2DB_REWARD_TIERS = [
  { tier: "chainbreaker", minSharePct: 5 },
  { tier: "ward-cleaver", minSharePct: 1 },
  { tier: "linkbearer", minSharePct: 0.2 },
] as const;

/** World-event phases for announcements. */
export type Gg2dbEventPhase = "relay" | "boss" | "claimed" | "idle";

/** Hub presence entry (ephemeral display state, never authoritative). */
export type Gg2dbHubPresence = {
  playerId: string;
  room: string;
  partyId: string;
  emote: string;
  seenAtMs: number;
};

/** Party of up to 4, joined via lobby code. */
export type Gg2dbParty = {
  id: string;
  lobbyCode: string;
  eventSeed: string;
  memberIds: string[];
  createdAtMs: number;
};

/** Friend link state machine: requested -> friends | blocked. */
export type Gg2dbFriendState = "requested" | "friends" | "blocked";
export type Gg2dbFriendLink = {
  a: string;
  b: string;
  state: Gg2dbFriendState;
  updatedAtMs: number;
};

/** Sanitized chat message (display only). */
export type Gg2dbChatMessage = {
  from: string;
  text: string;
  emote: string;
  atMs: number;
};

/** World-event announcement for the hub banner. */
export type Gg2dbAnnouncement = {
  eventId: string;
  phase: Gg2dbEventPhase;
  headline: string;
  detail: string;
  globalPct: number;
};

/** One verified per-room contribution leg (server-attested). */
export type Gg2dbVerifiedLeg = {
  leg: Gg2dbRelayLeg;
  damage: number;
};

/**
 * Authoritative room report. Minted ONLY by the room server sim.
 * `sig` is the operator-key signature over the canonical payload; it is
 * checked server-side, never in the browser. Any report without a valid
 * signature is a client claim and is rejected.
 */
export type Gg2dbRoomReport = {
  roomId: string;
  serverId: string;
  eventSeed: string;
  tickSeq: number;
  legs: Gg2dbVerifiedLeg[];
  bossDamage: number;
  playerIds: string[];
  sig: string;
};

/** Trust context for verification (operator registry + run state). */
export type Gg2dbTrust = {
  serverIds: string[];
  eventSeed: string;
  lastTickByRoom: Record<string, number>;
};

/** Verdict of the verification gate. */
export type Gg2dbVerifyVerdict =
  | { ok: true }
  | { ok: false; reason: "CLIENT_CLAIM" | "UNKNOWN_SERVER" | "SEED_MISMATCH" | "STALE_TICK" | "BAD_LEGS" | "BAD_SHAPE" };

/** Aggregated global progress across all verified rooms. */
export type Gg2dbGlobalProgress = {
  rooms: number;
  relayDamage: number;
  relayPct: number;
  legsMet: string[];
  bossDamage: number;
  bossPct: number;
  phase: Gg2dbEventPhase;
  perPlayer: Record<string, number>;
};

/** Reward entitlement for the economy lane to settle (no coins minted here). */
export type Gg2dbContributorReward = {
  playerId: string;
  tier: string;
  sharePct: number;
  reason: string;
};

/** Season progress derived from the verified ledger. */
export type Gg2dbSeasonProgress = {
  seasonId: string;
  roomsCleared: number;
  bossKills: number;
  codexEntries: string[];
};

function cleanId(value: unknown, maxLen = 64): string {
  try {
    const s = String(value ?? "").trim();
    if (!s || s.length > maxLen) return "";
    if (!/^[A-Za-z0-9_-]+$/.test(s)) return "";
    return s;
  } catch {
    return "";
  }
}

function cleanNum(value: unknown, fallback = 0): number {
  try {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return n;
  } catch {
    return fallback;
  }
}

function nowMs(value?: unknown): number {
  const n = Math.floor(cleanNum(value, NaN));
  if (Number.isFinite(n) && n > 0) return n;
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

/** Normalize a player id fail-open ("" when unusable). */
export function cleanPlayerId(value: unknown): string {
  return cleanId(value, 32);
}

/** Normalize an event seed fail-open. */
export function cleanEventSeed(value: unknown): string {
  return cleanId(value, 64);
}

/**
 * Mint a lobby code. Display helper only — codes carry no authority.
 * `rand` is injectable for tests; defaults to Math.random, never throws.
 */
export function makeLobbyCode(rand?: () => number): string {
  try {
    const r: () => number =
      typeof rand === "function"
        ? rand
        : () => {
            try {
              return Math.random();
            } catch {
              return 0.5;
            }
          };
    let out = "";
    for (let i = 0; i < GG2DB_LOBBY_LEN; i++) {
      const f = r();
      const k = Number.isFinite(f) ? Math.abs(Math.floor(f * LOBBY_ALPHABET.length)) : 0;
      out += LOBBY_ALPHABET[k % LOBBY_ALPHABET.length];
    }
    return out;
  } catch {
    return "GG2DBB";
  }
}

/** Validate a lobby code shape (6 chars from the alphabet). */
export function isLobbyCode(value: unknown): boolean {
  try {
    const s = String(value ?? "").trim().toUpperCase();
    if (s.length !== GG2DB_LOBBY_LEN) return false;
    for (const ch of s) {
      if (LOBBY_ALPHABET.indexOf(ch) < 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Normalize one hub presence entry fail-open (null when unusable). */
export function sanitizePresence(entry: unknown): Gg2dbHubPresence | null {
  try {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const playerId = cleanPlayerId(row.playerId ?? row.id);
    if (!playerId) return null;
    const emote = String(row.emote ?? "");
    return {
      playerId,
      room: cleanId(row.room, 32) || GG2DB_HUB_ROOM,
      partyId: cleanId(row.partyId, 32),
      emote: GG2DB_EMOTES[emote] ? emote : "",
      seenAtMs: nowMs(row.seenAtMs),
    };
  } catch {
    return null;
  }
}

/** Cap + dedupe a hub presence list (display only). */
export function normalizeHubList(list: unknown): Gg2dbHubPresence[] {
  try {
    if (!Array.isArray(list)) return [];
    const out: Gg2dbHubPresence[] = [];
    const seen = new Set<string>();
    for (const entry of list) {
      const clean = sanitizePresence(entry);
      if (!clean || seen.has(clean.playerId)) continue;
      seen.add(clean.playerId);
      out.push(clean);
      if (out.length >= GG2DB_HUB_CAP) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Can this player join the party? Pure capacity/duplicate check —
 * matchmaking admission, not progress authority.
 */
export function canJoinParty(party: Gg2dbParty | null | undefined, playerId: unknown): boolean {
  try {
    if (!party || typeof party !== "object") return false;
    const id = cleanPlayerId(playerId);
    if (!id) return false;
    const members = Array.isArray(party.memberIds) ? party.memberIds : [];
    if (members.indexOf(id) >= 0) return true;
    return members.length < GG2DB_PARTY_MAX;
  } catch {
    return false;
  }
}

/** Transition a friend link fail-open (returns the unchanged link on bad input). */
export function friendTransition(
  link: Gg2dbFriendLink | null | undefined,
  next: Gg2dbFriendState,
): Gg2dbFriendLink | null {
  try {
    if (!link || typeof link !== "object") return null;
    const a = cleanPlayerId(link.a);
    const b = cleanPlayerId(link.b);
    if (!a || !b || a === b) return null;
    if (next !== "requested" && next !== "friends" && next !== "blocked") return link;
    if (link.state === "blocked" && next === "friends") return link;
    return { a, b, state: next, updatedAtMs: nowMs() };
  } catch {
    return null;
  }
}

/** Sanitize one chat message (ASCII printable, length-capped, emote allowlisted). */
export function sanitizeChat(entry: unknown): Gg2dbChatMessage | null {
  try {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const from = cleanPlayerId(row.from ?? row.playerId);
    if (!from) return null;
    let text = "";
    try {
      const raw = String(row.text ?? "");
      for (const ch of raw) {
        const c = ch.codePointAt(0) ?? 0;
        if (c >= 32 && c < 127 && text.length < GG2DB_CHAT_MAX_LEN) text += ch;
      }
    } catch {
      text = "";
    }
    if (!text) return null;
    const emote = String(row.emote ?? "");
    return {
      from,
      text,
      emote: GG2DB_EMOTES[emote] ? emote : "",
      atMs: nowMs(row.atMs),
    };
  } catch {
    return null;
  }
}

/** Render an emote id to its glyph ("" for unknown — never renders raw input). */
export function emoteGlyph(id: unknown): string {
  try {
    const key = String(id ?? "");
    return GG2DB_EMOTES[key] ?? "";
  } catch {
    return "";
  }
}

/** Build the hub banner announcement from verified global progress. */
export function buildAnnouncement(progress: Gg2dbGlobalProgress | null | undefined): Gg2dbAnnouncement {
  const safe: Gg2dbAnnouncement = {
    eventId: GG2DB_BREACH_EVENT_ID,
    phase: "idle",
    headline: "The Citadel Chain holds… for now.",
    detail: "Join a breach room to forge the first link.",
    globalPct: 0,
  };
  try {
    if (!progress || typeof progress !== "object") return safe;
    const pct = Math.max(0, Math.min(100, cleanNum(progress.relayPct, 0)));
    const phase = progress.phase;
    if (phase === "boss") {
      return {
        eventId: GG2DB_BREACH_EVENT_ID,
        phase,
        headline: "CHAIN BROKEN — the World Boss wakes!",
        detail: `Relay complete across ${Math.max(0, Math.floor(cleanNum(progress.rooms, 0)))} rooms. Damage counts toward the kill.`,
        globalPct: 100,
      };
    }
    if (phase === "claimed") {
      return {
        eventId: GG2DB_BREACH_EVENT_ID,
        phase,
        headline: "Citadel claimed. Contributors honored.",
        detail: "Rewards settled from verified room reports.",
        globalPct: 100,
      };
    }
    if (phase === "relay") {
      return {
        eventId: GG2DB_BREACH_EVENT_ID,
        phase,
        headline: `Break the Citadel Chain — ${Math.floor(pct)}% forged`,
        detail: `${progress.legsMet.length}/${GG2DB_RELAY_LEGS.length} relay legs met across verified rooms.`,
        globalPct: pct,
      };
    }
    return safe;
  } catch {
    return safe;
  }
}

/**
 * THE GATE. Verify one room report against operator trust.
 *
 * Accepts ONLY server-signed reports: `serverId` must be registered,
 * `sig` must be a non-empty operator signature (cryptographic check happens
 * in the API route holding the keys — this pure gate enforces presence +
 * shape + registry + seed + monotonic tick + relay order), `eventSeed` must
 * match the run, `tickSeq` must advance per room (replays rejected), relay
 * legs must arrive in order with finite non-negative damage, and at most
 * GG2DB_ROOM_SIZE distinct player ids may be attached.
 *
 * Anything else — including any client-posted score/damage/clear object that
 * lacks a registered server signature — returns `{ ok: false,
 * reason: "CLIENT_CLAIM" }` (or the more specific mismatch reason).
 */
export function verifyRoomReport(report: unknown, trust: Gg2dbTrust | null | undefined): Gg2dbVerifyVerdict {
  try {
    if (!report || typeof report !== "object") return { ok: false, reason: "CLIENT_CLAIM" };
    if (!trust || typeof trust !== "object") return { ok: false, reason: "BAD_SHAPE" };
    const row = report as Record<string, unknown>;
    const serverId = cleanId(row.serverId, 64);
    const roomId = cleanId(row.roomId, 64);
    const eventSeed = cleanEventSeed(row.eventSeed);
    const sig = typeof row.sig === "string" ? row.sig.trim() : "";
    if (!serverId || !roomId || !eventSeed || !sig) return { ok: false, reason: "CLIENT_CLAIM" };
    const registry = Array.isArray(trust.serverIds) ? trust.serverIds : [];
    if (registry.indexOf(serverId) < 0) return { ok: false, reason: "UNKNOWN_SERVER" };
    if (eventSeed !== cleanEventSeed(trust.eventSeed)) return { ok: false, reason: "SEED_MISMATCH" };
    const tick = Number(row.tickSeq);
    if (!Number.isInteger(tick) || tick < 0) return { ok: false, reason: "BAD_SHAPE" };
    const lastByRoom = trust.lastTickByRoom && typeof trust.lastTickByRoom === "object" ? trust.lastTickByRoom : {};
    const last = Number(lastByRoom[roomId] ?? -1);
    if (Number.isFinite(last) && tick <= last) return { ok: false, reason: "STALE_TICK" };
    const legs = row.legs;
    if (!Array.isArray(legs) || legs.length === 0 || legs.length > GG2DB_RELAY_LEGS.length) {
      return { ok: false, reason: "BAD_LEGS" };
    }
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i] as Record<string, unknown>;
      if (!leg || typeof leg !== "object") return { ok: false, reason: "BAD_LEGS" };
      if (leg.leg !== GG2DB_RELAY_LEGS[i]) return { ok: false, reason: "BAD_LEGS" };
      const dmg = Number(leg.damage);
      if (!Number.isFinite(dmg) || dmg < 0 || dmg > GG2DB_BOSS_THRESHOLD * 10) {
        return { ok: false, reason: "BAD_LEGS" };
      }
    }
    const bossDamage = Number(row.bossDamage ?? 0);
    if (!Number.isFinite(bossDamage) || bossDamage < 0 || bossDamage > GG2DB_BOSS_THRESHOLD * 10) {
      return { ok: false, reason: "BAD_SHAPE" };
    }
    const playerIds = Array.isArray(row.playerIds) ? row.playerIds : [];
    const seen = new Set<string>();
    for (const p of playerIds) {
      const id = cleanPlayerId(p);
      if (!id) return { ok: false, reason: "BAD_SHAPE" };
      seen.add(id);
    }
    if (seen.size === 0 || seen.size > GG2DB_ROOM_SIZE) return { ok: false, reason: "BAD_SHAPE" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "BAD_SHAPE" };
  }
}

/**
 * Aggregate ONLY verified room reports into global progress.
 * Caller MUST run each report through `verifyRoomReport()` first; this
 * function defensively re-checks order/shape but never contacts a key —
 * pass verified reports only. Client claims must never reach this function.
 */
export function aggregateVerifiedReports(reports: unknown): Gg2dbGlobalProgress {
  const empty: Gg2dbGlobalProgress = {
    rooms: 0,
    relayDamage: 0,
    relayPct: 0,
    legsMet: [],
    bossDamage: 0,
    bossPct: 0,
    phase: "relay",
    perPlayer: {},
  };
  try {
    if (!Array.isArray(reports) || reports.length === 0) return empty;
    const legTotals: Record<string, number> = {};
    for (const l of GG2DB_RELAY_LEGS) legTotals[l] = 0;
    const perPlayer: Record<string, number> = {};
    const rooms = new Set<string>();
    let bossDamage = 0;
    for (const item of reports.slice(0, 10_000)) {
      if (!item || typeof item !== "object") continue;
      const rep = item as Gg2dbRoomReport;
      const roomId = cleanId(rep.roomId, 64);
      if (!roomId) continue;
      rooms.add(roomId);
      const legs = Array.isArray(rep.legs) ? rep.legs : [];
      for (let i = 0; i < legs.length && i < GG2DB_RELAY_LEGS.length; i++) {
        const dmg = Number((legs[i] as Gg2dbVerifiedLeg).damage);
        if (Number.isFinite(dmg) && dmg > 0) legTotals[GG2DB_RELAY_LEGS[i]] += dmg;
      }
      const boss = Number(rep.bossDamage ?? 0);
      if (Number.isFinite(boss) && boss > 0) bossDamage += boss;
      const players = Array.isArray(rep.playerIds) ? rep.playerIds : [];
      const roomTotal =
        legs.reduce((sum, l) => sum + (Number((l as Gg2dbVerifiedLeg).damage) || 0), 0) + (Number.isFinite(boss) ? boss : 0);
      const share = players.length > 0 ? roomTotal / players.length : 0;
      for (const p of players) {
        const id = cleanPlayerId(p);
        if (!id) continue;
        perPlayer[id] = (perPlayer[id] ?? 0) + share;
      }
    }
    const relayDamage = GG2DB_RELAY_LEGS.reduce((sum, l) => sum + legTotals[l], 0);
    const relayPct = Math.min(100, (relayDamage / GG2DB_BOSS_THRESHOLD) * 100);
    const legsMet = GG2DB_RELAY_LEGS.filter((l) => (legTotals[l] / GG2DB_BOSS_THRESHOLD) * 100 >= GG2DB_LEG_MIN_PCT);
    const bossPct = Math.min(100, (bossDamage / GG2DB_BOSS_THRESHOLD) * 100);
    const phase: Gg2dbEventPhase = legsMet.length >= GG2DB_RELAY_LEGS.length ? (bossPct >= 100 ? "claimed" : "boss") : "relay";
    return { rooms: rooms.size, relayDamage, relayPct, legsMet: [...legsMet], bossDamage, bossPct, phase, perPlayer };
  } catch {
    return empty;
  }
}

/**
 * Contributor rewards from the verified ledger. Entitlements only — the
 * economy lane settles them; this function mints no coins.
 */
export function contributorRewards(progress: Gg2dbGlobalProgress | null | undefined): Gg2dbContributorReward[] {
  try {
    if (!progress || typeof progress !== "object") return [];
    if (progress.phase !== "boss" && progress.phase !== "claimed") return [];
    const entries = Object.entries(progress.perPlayer ?? {});
    const total = entries.reduce((sum, [, v]) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
    if (!(total > 0)) return [];
    const out: Gg2dbContributorReward[] = [];
    for (const [playerId, value] of entries) {
      const sharePct = (value / total) * 100;
      for (const t of GG2DB_REWARD_TIERS) {
        if (sharePct >= t.minSharePct) {
          out.push({
            playerId,
            tier: t.tier,
            sharePct: Math.round(sharePct * 100) / 100,
            reason: `verified ${GG2DB_BREACH_EVENT_ID} contribution`,
          });
          break;
        }
      }
    }
    out.sort((a, b) => b.sharePct - a.sharePct);
    return out.slice(0, 1000);
  } catch {
    return [];
  }
}

/** Season progress derived from verified reports (never from client totals). */
export function seasonProgressFromVerified(
  seasonId: unknown,
  reports: unknown,
  bossKills: unknown,
): Gg2dbSeasonProgress {
  const safe: Gg2dbSeasonProgress = {
    seasonId: cleanId(seasonId, 32) || "necromoon",
    roomsCleared: 0,
    bossKills: 0,
    codexEntries: [],
  };
  try {
    if (!Array.isArray(reports)) return safe;
    const rooms = new Set<string>();
    for (const item of reports) {
      if (!item || typeof item !== "object") continue;
      const roomId = cleanId((item as Gg2dbRoomReport).roomId, 64);
      if (roomId) rooms.add(roomId);
    }
    const kills = Math.max(0, Math.floor(cleanNum(bossKills, 0)));
    const entries: string[] = [];
    if (rooms.size >= 1) entries.push("front:citadel-chain-joined");
    if (rooms.size >= 4) entries.push("front:citadel-chain-relayed");
    if (kills >= 1) entries.push("boss:citadel-warder-down");
    return { seasonId: safe.seasonId, roomsCleared: rooms.size, bossKills: kills, codexEntries: entries };
  } catch {
    return safe;
  }
}

/** Merge a season codex delta keeping best-rank-wins (mirrors MMO codex merge). */
export function mergeCodexEntries(
  primary: unknown,
  delta: unknown,
): Record<string, { category: string; rank: number }> {
  try {
    const out: Record<string, { category: string; rank: number }> = {};
    const absorb = (src: unknown, rank: number) => {
      if (!Array.isArray(src)) return;
      for (const raw of src.slice(0, 500)) {
        const id = cleanId(raw, 64);
        if (!id) continue;
        const cur = out[id];
        if (!cur || rank > cur.rank) out[id] = { category: "fronts", rank };
      }
    };
    if (primary && typeof primary === "object") {
      for (const [k, v] of Object.entries(primary as Record<string, unknown>)) {
        const id = cleanId(k, 64);
        if (!id) continue;
        const rank = Math.max(0, Math.min(3, Math.floor(cleanNum((v as { rank?: unknown }).rank, 0))));
        out[id] = { category: "fronts", rank };
      }
    }
    absorb(delta, 1);
    return out;
  } catch {
    return {};
  }
}
