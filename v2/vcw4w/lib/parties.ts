/**
 * Party interop; one vocabulary for all four social kinds.
 *
 *   individual = a human profile (by handle or id)
 *   squad      = a team workspace (squads ARE teams; /api/squads alias)
 *   clan       = a clan (by slug)
 *   org        = an org (by slug)
 *
 * Any party can follow, invite, challenge, or post @ any other party.
 * Membership side-effects land in the real tables (team_members,
 * clan_members, org_members) plus a public ally badge.
 */

export const PARTY_KINDS = ["individual", "squad", "clan", "org"] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const PARTY_KIND_LABELS: Record<PartyKind, string> = {
  individual: "Individual",
  squad: "Squad",
  clan: "Clan",
  org: "Org",
};

export function isPartyKind(v: unknown): PartyKind | "" {
  const s = String(v ?? "").trim().toLowerCase();
  return (PARTY_KINDS as readonly string[]).includes(s) ? (s as PartyKind) : "";
}

export function isPartyId(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

export function cleanPartyRef(v: unknown): string {
  return String(v ?? "").trim().slice(0, 80);
}

export function cleanPartyMessage(v: unknown, max = 280): string {
  return String(v ?? "").trim().slice(0, max);
}

export function cleanPartyBody(v: unknown): string {
  return String(v ?? "").slice(0, 2000);
}

export function cleanGameSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{0,64}$/.test(s) ? s : "";
}
