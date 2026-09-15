/**
 * MMORPG server-browser age helpers (client-safe, dependency-free).
 *
 * Entry rule is a strict ladder: adults > teens > kids.
 * - an `adults` player may enter kids, teens, and adults servers
 * - a `teens` player may enter kids and teens servers only
 * - a `kids` player may enter kids servers only
 *
 * Everything here is fail-open and SSR-safe: no browser APIs, no network,
 * no secrets. Invalid inputs degrade to the safest restrictive answer for
 * gating (`canEnterServer` returns false) and to 0 for pricing.
 */

export type MmorpgGameKind = "1d" | "2d" | "3d" | "4d" | "5d";
export type MmorpgAgeBand = "kids" | "teens" | "adults";

export type MmorpgServer = {
  id: string;
  name: string;
  game: MmorpgGameKind;
  ageBand: MmorpgAgeBand;
  players: number;
  maxPlayers: number;
  costPerMin: number;
  hostFree: boolean;
  rentalFeePerHour: number;
  /** Game page slug for the Join link. Falls back to the game-kind default. */
  slug?: string;
};

/** Rank ladder for the adults > teens > kids entry rule. */
export const MMORPG_AGE_RANK: Record<MmorpgAgeBand, number> = {
  kids: 0,
  teens: 1,
  adults: 2,
};

export function isMmorpgGameKind(value: unknown): value is MmorpgGameKind {
  return value === "1d" || value === "2d" || value === "3d" || value === "4d" || value === "5d";
}

export function isMmorpgAgeBand(value: unknown): value is MmorpgAgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

/**
 * Entry check: a player may enter servers at or below their own band.
 * Unknown bands fail closed (false) — never fail open on gating.
 */
export function canEnterServer(
  userBand: MmorpgAgeBand | string | null | undefined,
  serverBand: MmorpgAgeBand | string | null | undefined,
): boolean {
  if (!isMmorpgAgeBand(userBand) || !isMmorpgAgeBand(serverBand)) return false;
  return MMORPG_AGE_RANK[userBand] >= MMORPG_AGE_RANK[serverBand];
}

/** Human-readable hint for the adults > teens > kids entry rule. */
export function ageGateHint(serverBand: MmorpgAgeBand | string | null | undefined): string {
  switch (serverBand) {
    case "adults":
      return "Adults only (18+). Teens and kids accounts cannot enter — adults > teens > kids.";
    case "teens":
      return "Teens and adults may enter (13+). Kids accounts cannot enter — adults > teens > kids.";
    case "kids":
    default:
      return "Open to everyone — kids, teens, and adults may enter.";
  }
}

/**
 * Per-player cost per minute: costPerMin split across current players.
 * Returns 0 when the host plays free, and degrades fail-open (never NaN):
 * invalid/negative rates become 0, an empty server quotes the full rate.
 */
export function perPlayerCostPerMin(
  server: Pick<MmorpgServer, "costPerMin" | "players" | "hostFree"> | null | undefined,
): number {
  if (!server || server.hostFree) return 0;
  const rate = Number(server.costPerMin);
  const players = Math.floor(Number(server.players));
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (!Number.isFinite(players) || players <= 0) return rate;
  return rate / players;
}

/** Display helper: "Free" or "<n> coins/min". Never throws. */
export function formatCostPerMin(value: unknown, hostFree?: boolean): string {
  if (hostFree) return "Free";
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return "Free";
  const rounded = Math.round(v * 100) / 100;
  return `${rounded} coin${rounded === 1 ? "" : "s"}/min`;
}

/** Default game-page slug per game kind (Join link fallback). */
export const MMORPG_DEFAULT_SLUG: Record<MmorpgGameKind, string> = {
  "1d": "gravegain1d",
  "2d": "gravegain2dA",
  "3d": "gravegain3d",
  "4d": "gravegain4d",
  "5d": "gravegain5d",
};

/** Resolve the Join-link slug: explicit slug wins, else the game-kind default. */
export function serverSlug(server: Pick<MmorpgServer, "game" | "slug">): string {
  const raw = typeof server?.slug === "string" ? server.slug.trim() : "";
  if (/^[a-z0-9-]+$/.test(raw)) return raw;
  if (isMmorpgGameKind(server?.game)) return MMORPG_DEFAULT_SLUG[server.game];
  return "gravegain2dA";
}

/** Join href for a server card: /games/<slug>?mmorpg=<id>. */
export function serverJoinHref(server: Pick<MmorpgServer, "game" | "id" | "slug">): string {
  const slug = serverSlug(server);
  const id = typeof server?.id === "string" ? server.id : "";
  return `/games/${encodeURIComponent(slug)}?mmorpg=${encodeURIComponent(id)}`;
}

/** Fail-open list guard: non-array input becomes []. */
export function toSafeServerList(value: unknown): MmorpgServer[] {
  return Array.isArray(value) ? (value as MmorpgServer[]) : [];
}
