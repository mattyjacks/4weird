// Admin replay contract — seeds reproduce exact item sets; logs carry ids only, never learner text (privacy).
export type VocrehabSeedLogRow = {
  seed: string;
  gameId: string;
  groupId?: string;
  startedAt: string;
  itemIds: string[];
  scoreBand?: string;
};

const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isIsoDate(s: unknown): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

export function validateSeedLogRow(row: unknown): boolean {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return false;
  const r = row as Record<string, unknown>;
  if ("transcript" in r || "notes" in r) return false;
  if (typeof r.seed !== "string" || !SEED_RE.test(r.seed)) return false;
  if (typeof r.gameId !== "string" || r.gameId.length === 0) return false;
  if (r.groupId !== undefined && (typeof r.groupId !== "string" || r.groupId.length === 0)) return false;
  if (!isIsoDate(r.startedAt)) return false;
  if (!Array.isArray(r.itemIds)) return false;
  for (const id of r.itemIds) {
    if (typeof id !== "string" || id.length === 0) return false;
  }
  if (r.scoreBand !== undefined && (typeof r.scoreBand !== "string" || r.scoreBand.length === 0)) return false;
  return true;
}

export function replayUrl(base: string, gameId: string, seed: string): string {
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}/vocrehab/games/${gameId}?seed=${seed}`;
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rowToLine(row: VocrehabSeedLogRow): string {
  const items = row.itemIds.join("|");
  return [
    csvCell(row.seed),
    csvCell(row.gameId),
    csvCell(row.groupId ?? ""),
    csvCell(row.startedAt),
    csvCell(items),
    csvCell(row.scoreBand ?? ""),
  ].join(",");
}

export function seedLogToCsv(rows: VocrehabSeedLogRow[]): string {
  const header = "seed,gameId,groupId,startedAt,items,band";
  return [header, ...rows.map(rowToLine)].join("\n");
}
