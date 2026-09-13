import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { botTesterBlocked, isBotTester, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * POST /api/vault/blobs/[id]/restore; pull a trashed file back to live.
 * A live file on the same path blocks with 409 (restore-or-rename).
 * Auth: session OR bot key with `vault:write`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:write")) return fail("Key lacks scope: vault:write.", 403);
    userId = bot.userId;
  }
  // Resurrection mid-review would break quarantine legal holds below.
  if (isBotTester(req)) return fail(botTesterBlocked(), 403);
  const throttle = rateLimit(`vault-write:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid file.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const { data: row, error } = await svc
    .from("vault_files")
    .select("id,scope,owner_id,team_id,org_id,path,deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return dbFail("api/vault/restore", error, "Unable to load file.");
  const r = row as {
    scope: string;
    owner_id: string | null;
    team_id: string | null;
    org_id: string | null;
    path: string;
    deleted_at: string | null;
  } | null;
  if (!r) return fail("File not found.", 404);
  if (!r.deleted_at) return fail("File is not in trash.", 409);
  let owns = r.scope === "personal" && r.owner_id === userId;
  if (!owns && r.scope !== "personal") {
    const table = r.scope === "team" ? "team_members" : "org_members";
    const col = r.scope === "team" ? "team_id" : "org_id";
    const scopeKey = String(r.scope === "team" ? r.team_id : r.org_id ?? "");
    const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeKey).eq("user_id", userId).maybeSingle();
    owns = Boolean(mem);
  }
  if (!owns) return fail("File not found.", 404);
  // A live row already owns this path (re-uploaded after trashing).
  let clash = svc.from("vault_files").select("id").eq("scope", r.scope).eq("path", r.path).is("deleted_at", null).limit(1);
  clash = r.scope === "personal" ? clash.eq("owner_id", r.owner_id ?? "") : r.scope === "team" ? clash.eq("team_id", r.team_id ?? "") : clash.eq("org_id", r.org_id ?? "");
  const { data: clashRows } = await clash;
  if (clashRows && clashRows.length > 0) {
    return fail("A live file already has that name. Rename one first.", 409);
  }
  const { error: reErr } = await svc.from("vault_files").update({ deleted_at: null }).eq("id", id);
  if (reErr) return dbFail("api/vault/restore", reErr, "Unable to restore file.");
  return ok({ restored: true });
}
