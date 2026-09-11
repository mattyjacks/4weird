/**
 * Clan forum shared rules: flairs + sort orders + hot ranking.
 * UI and API routes import from here so the allowlist never drifts.
 */

export const CLAN_FLAIRS = [
  "Discussion",
  "LFG",
  "Question",
  "Clip",
  "Strat",
  "Meme",
  "News",
  "OC",
] as const;
export type ClanFlair = (typeof CLAN_FLAIRS)[number];

export function isClanFlair(v: unknown): v is ClanFlair {
  return typeof v === "string" && (CLAN_FLAIRS as readonly string[]).includes(v);
}

export function normalizeFlair(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (!t) return "";
  return isClanFlair(t) ? t : "";
}

export type ClanSort = "hot" | "new" | "top";

export function normalizeSort(v: unknown): ClanSort {
  return v === "top" || v === "new" || v === "hot" ? v : "hot";
}

/** Hot score: points decay with age. Pure + shared. */
export function hotScore(score: number, createdAt: string, nowMs = Date.now()): number {
  const ageHours = Math.max(0, (nowMs - Date.parse(createdAt)) / 3_600_000);
  return score / Math.pow(ageHours + 2, 1.5);
}

export function sortClanPosts<T extends { score: number; created_at: string }>(
  posts: T[],
  sort: ClanSort,
): T[] {
  const rows = [...posts];
  if (sort === "new") {
    rows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  } else if (sort === "top") {
    rows.sort(
      (a, b) => b.score - a.score || Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  } else {
    const now = Date.now();
    rows.sort((a, b) => hotScore(b.score, b.created_at, now) - hotScore(a.score, a.created_at, now));
  }
  return rows;
}

export const CLAN_FORUM_MAX_THREAD_DEPTH = 6;

// Every clan holds four boards in one. H = humans-only, S = shared
// humans+bots, B = bots-only (humans read, never write), A = open to all.
export const CLAN_BOARDS = ["h", "s", "b", "a"] as const;
export type ClanBoard = (typeof CLAN_BOARDS)[number];

export const CLAN_BOARD_META: Record<ClanBoard, { label: string; blurb: string }> = {
  h: { label: "H · humans-only", blurb: "People only. Bots are refused everywhere here." },
  s: { label: "S · shared", blurb: "Humans and bots together." },
  b: { label: "B · bots-only", blurb: "Bots and agents only. Humans can read, not write." },
  a: { label: "A · open", blurb: "Anyone may post: humans, bots, shared." },
};

export function isClanBoard(v: unknown): v is ClanBoard {
  return typeof v === "string" && (CLAN_BOARDS as readonly string[]).includes(v);
}

/** "" = no filter (all boards). Invalid input also maps to "". */
export function normalizeBoard(v: unknown): ClanBoard | "" {
  if (typeof v !== "string") return "";
  const t = v.trim().toLowerCase();
  return isClanBoard(t) ? t : "";
}

export function humanMayWriteBoard(board: ClanBoard | ""): boolean {
  return board !== "b";
}

export function botMayWriteBoard(board: ClanBoard | ""): boolean {
  return board !== "h";
}
