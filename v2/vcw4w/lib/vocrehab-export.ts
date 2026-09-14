/**
 * VocRehab allowlisted export serializer (plan §11.1.8, §13.4).
 *
 * Pure module: zero I/O, zero imports, safe for client + server.
 * `vocrehabExportAllowlist` is the single source of truth for what may
 * leave the module through GET /api/vocrehab/export — the RPC
 * `vocrehab_export_snapshot()` returns these shapes and
 * `vocrehabSerializeExport` drops anything not listed here.
 *
 * Table notes (see Appendix B):
 * - game summaries only: `vocrehab_game_sessions` carries the per-run
 *   summary; raw `vocrehab_game_events` telemetry is excluded by default.
 * - counselor tables (`vocrehab_case_notes`, `vocrehab_progress_measures`,
 *   `vocrehab_rationalizations`) export approved rows only — the status
 *   filter lives in the RPC; the serializer keeps the `status` column so
 *   the downloaded file proves what state each row was in.
 */

export type VocrehabExportFormat = "json" | "csv";

/** Fail-open size caps: per-table row cap + total output byte cap. */
export const vocrehabExportMaxRowsPerTable = 500;
export const vocrehabExportMaxOutputBytes = 2_000_000;

/**
 * Table → columns allowlist. No dynamic table names anywhere in the
 * export path: the route iterates these literal keys only.
 */
export const vocrehabExportAllowlist: Record<string, readonly string[]> = {
  vocrehab_module_progress: ["id", "user_id", "module", "done", "xp", "updated_at"],
  vocrehab_game_sessions: ["id", "user_id", "game_id", "summary", "score_band", "created_at"],
  vocrehab_assessments: ["id", "user_id", "kind", "payload", "profile", "created_at"],
  vocrehab_documents: ["id", "user_id", "kind", "title", "body", "updated_at"],
  vocrehab_roleplay_turns: ["id", "user_id", "session_id", "scenario", "role", "text", "created_at"],
  vocrehab_calculator_runs: ["id", "user_id", "wage", "hours", "estimate_json", "params_version", "created_at"],
  vocrehab_disclosure_states: ["id", "user_id", "node", "updated_at"],
  vocrehab_case_notes: ["id", "counselor_id", "client_ref", "body", "status", "updated_at"],
  vocrehab_progress_measures: ["id", "counselor_id", "client_ref", "goal", "status", "updated_at"],
  vocrehab_rationalizations: ["id", "counselor_id", "client_ref", "body", "status", "updated_at"],
  vocrehab_consents: ["id", "user_id", "purpose", "granted", "created_at"],
  vocrehab_export_log: ["id", "user_id", "format", "bytes", "created_at"],
};

/** Snapshot shape returned by `vocrehab_export_snapshot()` (JSONB per table). */
export type VocrehabExportSnapshot = Record<string, unknown[]>;

const VOCREHAB_FORMULA_LEADS = new Set(["=", "+", "-", "@"]);

function vocrehabGuardCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // CSV formula-injection guard (plan §13.4.3): prefix risky cells with a
  // single quote so spreadsheet apps never evaluate them as formulas.
  const first = text.charAt(0);
  const guarded = VOCREHAB_FORMULA_LEADS.has(first) ? `'${text}` : text;
  // RFC 4180 quoting: quote when the cell holds a comma, quote, or newline.
  if (/[",\r\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

function vocrehabPickAllowlistedRow(
  table: string,
  columns: readonly string[],
  row: unknown,
): Record<string, unknown> {
  const src = (row ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const col of columns) out[col] = src[col] ?? null;
  void table;
  return out;
}

function vocrehabFilterSnapshot(snapshot: VocrehabExportSnapshot): Record<string, Record<string, unknown>[]> {
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const [table, columns] of Object.entries(vocrehabExportAllowlist)) {
    const rows = snapshot[table];
    if (!Array.isArray(rows)) continue;
    out[table] = rows
      .slice(0, vocrehabExportMaxRowsPerTable)
      .map((row) => vocrehabPickAllowlistedRow(table, columns, row));
  }
  return out;
}

/**
 * Serialize an own-data snapshot to JSON or CSV using only allowlisted
 * tables/columns. Emits no HTML markup — plain JSON text or RFC-4180 CSV.
 * Unknown format strings fall back to JSON (never throw on the export path).
 */
export function vocrehabSerializeExport(
  snapshot: VocrehabExportSnapshot,
  format: VocrehabExportFormat | string,
): string {
  const filtered = vocrehabFilterSnapshot(snapshot);
  if (format !== "csv") {
    const body = JSON.stringify({ vocrehab_export_version: 1, tables: filtered }, null, 2);
    return body.length > vocrehabExportMaxOutputBytes
      ? body.slice(0, vocrehabExportMaxOutputBytes)
      : body;
  }
  const chunks: string[] = [];
  for (const [table, columns] of Object.entries(vocrehabExportAllowlist)) {
    const rows = filtered[table] ?? [];
    chunks.push(`# table:${table}`);
    chunks.push(columns.map(vocrehabGuardCsvCell).join(","));
    for (const row of rows) {
      chunks.push(columns.map((col) => vocrehabGuardCsvCell(row[col])).join(","));
    }
    chunks.push("");
  }
  const body = chunks.join("\n");
  return body.length > vocrehabExportMaxOutputBytes
    ? body.slice(0, vocrehabExportMaxOutputBytes)
    : body;
}
