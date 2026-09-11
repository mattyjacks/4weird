import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { clampLimit, isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bot/keys/[id]/logs?limit=&before=&status= — the key's request
// activity, newest first. Owner only (Supabase-login auth).
// `none`-mode requests store the compliance minimum only, so those rows
// carry null bodies by design. Totals include the 25% platform cut INCLUDED
// in every log-storage charge (log_cut_coins).
export async function GET(req: Request, ctx: Ctx) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const keyId = (await ctx.params).id;
  if (!isUuid(keyId)) return fail("Invalid key.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const uid = data.user.id;

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"), 25, 100);
  const before = url.searchParams.get("before") ?? "";
  const statusFilter = Math.floor(Number(url.searchParams.get("status") ?? ""));
  const hasStatus = Number.isInteger(statusFilter) && statusFilter >= 100 && statusFilter <= 599;

  try {
    const db = serviceClient();
    const { data: keyRow, error: keyError } = await db
      .from("bot_api_keys")
      .select("id,logging_mode,lifetime_spent,daily_spent,daily_budget,lifetime_budget")
      .eq("id", keyId)
      .eq("user_id", uid)
      .maybeSingle();
    if (keyError) return dbFail("api/bot/keys/[id]/logs", keyError, "Unable to load logs.");
    if (!keyRow) return fail("Key not found.", 404);

    // Best-effort retention sweep (never fatal to the read).
    try {
      await db.rpc("purge_expired_bot_key_logs");
    } catch {
      // ignore — retention is enforced on a schedule too.
    }

    let query = db
      .from("bot_key_request_logs")
      .select(
        "id,method,path,status,ip,coins_spent,log_cut_coins,bytes," +
          "prompt_text,output_text,context,request_preview,response_preview,created_at",
      )
      .eq("key_id", keyId)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before && !Number.isNaN(Date.parse(before))) {
      query = query.lt("created_at", new Date(before).toISOString());
    }
    if (hasStatus) query = query.eq("status", statusFilter);
    const { data: rows, error } = await query;
    if (error) {
      // Table/log RPC missing (migration not applied yet): honest empty.
      if (String(error.message ?? "").match(/relation|does not exist|function/i)) {
        return ok({
          logs: [],
          totals: { requests: 0, coinsSpent: 0, logBytes: 0, logCut: 0 },
          loggingMode: (keyRow as { logging_mode?: string }).logging_mode ?? "half",
          nextBefore: null,
        });
      }
      return dbFail("api/bot/keys/[id]/logs", error, "Unable to load logs.");
    }
    const list = ((rows ?? []) as unknown as Record<string, unknown>[]);
    let coinsSpent = 0;
    let logBytes = 0;
    let logCut = 0;
    for (const r of list) {
      coinsSpent += Number(r.coins_spent) || 0;
      logBytes += Number(r.bytes) || 0;
      logCut += Number(r.log_cut_coins) || 0;
    }
    const last = list[list.length - 1];
    return ok({
      logs: list,
      totals: {
        requests: list.length,
        coinsSpent: Math.round(coinsSpent * 100) / 100,
        logBytes,
        logCut: Math.round(logCut * 100) / 100,
      },
      loggingMode: (keyRow as { logging_mode?: string }).logging_mode ?? "half",
      nextBefore:
        list.length === limit && typeof last?.created_at === "string" ? last.created_at : null,
    });
  } catch (error) {
    return dbFail("api/bot/keys/[id]/logs", error, "Unable to load logs.");
  }
}
