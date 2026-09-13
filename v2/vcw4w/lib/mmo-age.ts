/**
 * MMORPG server age-band enforcement — pure band comparison.
 *
 * Bands mirror `lib/age-gate.ts` (kids 0-12, teens 13-17, adults 18+;
 * "adults" means intense violence/horror themes only — sexual content is
 * never allowed anywhere on 4weird). Server bands say who a server is FOR;
 * the player's band comes from their verified account/kid-session band —
 * NEVER from a date of birth handled here.
 *
 * Rules:
 * - adults players enter every server (kids, teens, adults)
 * - teens players enter kids + teens servers only
 * - kids players enter kids servers only
 *
 * COMPLIANCE: pure TypeScript — no DOB, no PII, no fetch, no Supabase, no
 * storage of any kind. Unknown/invalid bands fail CLOSED (throw / filter
 * out), so an unrated or forged band can never sneak a kid onto an
 * adult server.
 */

export type ServerAgeBand = "kids" | "teens" | "adults";

/** The only legal bands, in ascending order. */
export const SERVER_AGE_BANDS: readonly ServerAgeBand[] = ["kids", "teens", "adults"] as const;

export const SERVER_BAND_LABEL: Record<ServerAgeBand, string> = {
  kids: "Kids (0-12)",
  teens: "Teens (13-17)",
  adults: "Adults (18+)",
};

/** Narrowing check: exactly one of the three bands, nothing else. */
export function isServerAgeBand(band: unknown): band is ServerAgeBand {
  return band === "kids" || band === "teens" || band === "adults";
}

/**
 * Assert `band` is exactly one of kids|teens|adults. Throws otherwise
 * (fail-closed: callers never proceed on a forged band).
 */
export function assertServerBand(band: unknown): asserts band is ServerAgeBand {
  if (!isServerAgeBand(band)) {
    throw new Error(`invalid server band: ${String(band)} (expected exactly one of kids|teens|adults)`);
  }
}

/**
 * Can a player of `playerBand` enter a server rated `serverBand`?
 * - adults -> true for every server
 * - teens  -> kids + teens servers only
 * - kids   -> kids servers only
 */
export function canEnterServer(playerBand: ServerAgeBand, serverBand: ServerAgeBand): boolean {
  assertServerBand(playerBand);
  assertServerBand(serverBand);
  if (playerBand === "adults") return true;
  if (playerBand === "teens") return serverBand === "kids" || serverBand === "teens";
  return serverBand === "kids";
}

/** Human-readable allow/deny reason for a player/server band pair. */
export function gateReasonFor(playerBand: ServerAgeBand, serverBand: ServerAgeBand): string {
  const allowed = canEnterServer(playerBand, serverBand);
  const player = SERVER_BAND_LABEL[playerBand];
  const server = SERVER_BAND_LABEL[serverBand];
  if (allowed) return `${player} players may enter ${server} servers.`;
  return `${player} players may not enter ${server} servers — this server is rated for ${server} only.`;
}

/** Every server band a player of `playerBand` may enter. */
export function allowedServerBandsFor(playerBand: ServerAgeBand): ServerAgeBand[] {
  assertServerBand(playerBand);
  if (playerBand === "adults") return ["kids", "teens", "adults"];
  if (playerBand === "teens") return ["kids", "teens"];
  return ["kids"];
}

/**
 * Keep only the servers a player of `playerBand` may enter. Servers with a
 * missing/invalid band are dropped (fail-closed), never passed through.
 */
export function filterServersForPlayer<T extends { band: unknown }>(
  playerBand: ServerAgeBand,
  servers: readonly T[],
): T[] {
  assertServerBand(playerBand);
  return servers.filter((s) => isServerAgeBand(s.band) && canEnterServer(playerBand, s.band));
}
