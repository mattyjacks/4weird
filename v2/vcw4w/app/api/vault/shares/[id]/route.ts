import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/vault/shares/[id]; revoke a share link. Only someone who owns
 * the file (or belongs to its scope) may revoke. Auth: session OR bot key
 * with `vault:share`.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:share")) return fail("Key lacks scope: vault:share.", 403);
    userId = bot.userId;
  }
  const throttle = rateLimit(`vault-share:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid share.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const { data: share, error } = await svc.from("vault_shares").select("id,file_id").eq("id", id).maybeSingle();
  if (error) return dbFail("api/vault/shares", error, "Unable to load link.");
  if (!share) return fail("Link not found.", 404);
  const { data: file } = await svc
    .from("vault_files")
    .select("scope,owner_id,team_id,org_id")
    .eq("id", (share as { file_id: string }).file_id)
    .maybeSingle();
  const v = file as { scope: string; owner_id: string | null; team_id: string | null; org_id: string | null } | null;
  let owns = !!v && v.scope === "personal" && v.owner_id === userId;
  if (v && !owns && v.scope !== "personal") {
    const table = v.scope === "team" ? "team_members" : "org_members";
    const col = v.scope === "team" ? "team_id" : "org_id";
    const scopeKey = String(v.scope === "team" ? v.team_id : v.org_id ?? "");
    const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeKey).eq("user_id", userId).maybeSingle();
    owns = Boolean(mem);
  }
  if (!owns) return fail("Link not found.", 404);
  const { error: delErr } = await svc.from("vault_shares").delete().eq("id", id);
  if (delErr) return dbFail("api/vault/shares", delErr, "Unable to revoke link.");
  return ok({ revoked: true });
}
