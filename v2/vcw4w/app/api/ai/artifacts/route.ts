import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { clampLimit } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/ai/artifacts?limit= — own autosaved AI artifacts (newest first).
// Auth: session OR bot key with `ai:read`.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "ai:read")) return fail("Key lacks scope: ai:read.", 403);
    userId = bot.userId;
  }
  const limit = clampLimit(new URL(req.url).searchParams.get("limit"), 25, 100);
  const { data: rows, error } = await supabase
    .from("ai_artifacts")
    .select("id,kind,tier,source,vault_file_id,bytes,coins,created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return dbFail("api/ai/artifacts", error, "Unable to load artifacts.");
  return ok({ artifacts: rows ?? [] });
}
