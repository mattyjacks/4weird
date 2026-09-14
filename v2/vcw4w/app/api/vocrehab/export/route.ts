import { NextResponse } from "next/server";
import { fail, dbFail } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";
import {
  vocrehabExportAllowlist,
  vocrehabSerializeExport,
  type VocrehabExportSnapshot,
} from "@/lib/vocrehab-export";

const COUNSELOR_TABLES = new Set([
  "vocrehab_case_notes",
  "vocrehab_progress_measures",
  "vocrehab_rationalizations",
]);

const MAX_ROWS_PER_TABLE = 2000;

export async function GET(req: Request) {
  const rl = rateLimit(`vocrehab-export-ip:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, rateLimitHeaders(rl));
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Authentication required.", 401);

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const uid = user.user.id;

  // Own allowlisted snapshot only: iterate the allowlist's literal keys,
  // never client-supplied table names. Fail-open per table (missing table
  // or RLS denial yields [] rather than failing the whole download).
  const snapshot: VocrehabExportSnapshot = {};
  for (const [table, columns] of Object.entries(vocrehabExportAllowlist)) {
    if (table === "vocrehab_export_log") continue;
    const ownerColumn = COUNSELOR_TABLES.has(table) ? "counselor_id" : "user_id";
    try {
      const { data, error } = await supabase
        .from(table)
        .select(columns.join(","))
        .eq(ownerColumn, uid)
        .limit(MAX_ROWS_PER_TABLE);
      snapshot[table] = error || !Array.isArray(data) ? [] : data;
    } catch {
      snapshot[table] = [];
    }
  }

  const serialized = vocrehabSerializeExport(snapshot, format);

  // Append-only audit row for the download itself; fail-open.
  try {
    await supabase.from("vocrehab_export_log").insert({
      user_id: uid,
      format,
      bytes: serialized.length,
    });
  } catch {
    // Fail-open: the user's file still downloads when logging fails.
  }

  if (serialized.length === 0) return dbFail("api/vocrehab/export", { message: "Empty export payload" });
  return new NextResponse(serialized, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vocrehab-export.${format}"`,
    },
  });
}
