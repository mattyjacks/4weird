/**
 * VCW MMORPG presence/autoplay hook — client-safe typed helpers.
 *
 * Foundation only: builds the POST /api/presence shape
 * { serverId, game, ageBand } and posts it fail-open.
 *
 * Rules:
 * - NEVER read cookies here (no auth decisions in this module).
 * - NEVER import lib/vcw-gateway*.ts (gateway/BYOK wiring lives
 *   server-side when the heartbeat route is promoted).
 * - Fail-open: invalid input returns null, failed posts resolve null
 *   instead of throwing, so autoplay loops never crash on presence.
 *
 * In-scope home for the vcw lane (lib/vcw-*.ts). The requested
 * lib/mmorpg-presence.ts path is steward-owned; this file is the
 * lane-compliant equivalent — steward may alias/promote it.
 */

/** Presence POST body shape for /api/presence. */
export type MmorpgPresenceBody = {
  serverId: string;
  game: string;
  ageBand: string;
};

export type MmorpgPeer = {
  id: string;
  game?: string;
};

export type ServerPresenceOptions = {
  game?: unknown;
  ageBand?: unknown;
  peers?: unknown;
};

const DEFAULT_GAME = "4weird";
const DEFAULT_AGE_BAND = "all";
const MAX_ID_LEN = 128;

function cleanId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_ID_LEN) return null;
  return trimmed;
}

function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 64);
  return trimmed || fallback;
}

/**
 * Normalize peer list fail-open: keeps string ids (or { id } rows),
 * drops everything else, caps at 200 entries.
 */
export function normalizePeers(peers: unknown): MmorpgPeer[] {
  if (!Array.isArray(peers)) return [];
  const out: MmorpgPeer[] = [];
  for (const entry of peers.slice(0, 200)) {
    if (typeof entry === "string") {
      const id = cleanId(entry);
      if (id) out.push({ id });
      continue;
    }
    if (entry && typeof entry === "object") {
      const id = cleanId((entry as Record<string, unknown>).id);
      if (!id) continue;
      const game = (entry as Record<string, unknown>).game;
      out.push(
        typeof game === "string" && game.trim()
          ? { id, game: game.trim().slice(0, 64) }
          : { id },
      );
    }
  }
  return out;
}

/**
 * Build the POST /api/presence body for a server. Returns null on
 * invalid serverId (fail-open: caller skips the POST).
 */
export function serverPresence(
  serverId: unknown,
  opts?: ServerPresenceOptions,
): MmorpgPresenceBody | null {
  const id = cleanId(serverId);
  if (!id) return null;
  return {
    serverId: id,
    game: cleanLabel(opts?.game, DEFAULT_GAME),
    ageBand: cleanLabel(opts?.ageBand, DEFAULT_AGE_BAND),
  };
}

/**
 * POST a presence body to /api/presence. Fail-open: resolves the
 * normalized peer list on success, null on any failure. Sends no
 * auth headers and reads no cookies — gateway/BYOK is wired
 * server-side when the heartbeat route is promoted.
 */
export async function postServerPresence(
  body: MmorpgPresenceBody | null,
  fetchImpl: typeof fetch = fetch,
): Promise<MmorpgPeer[]> {
  if (!body) return [];
  try {
    const res = await fetchImpl("/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json().catch(() => null);
    if (data && typeof data === "object") {
      const peers = (data as Record<string, unknown>).peers;
      if (Array.isArray(peers)) return normalizePeers(peers);
    }
    return [];
  } catch {
    return [];
  }
}
