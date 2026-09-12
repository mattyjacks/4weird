import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { cleanVaultPath, isVaultScope, sanitizeVaultFilter } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

const FOLDER_CAP = 500;

type ScopeTuple = { scope: "personal" | "team" | "org"; scopeId: string };

async function requireMember(
  svc: ReturnType<typeof serviceClient>,
  userId: string,
  scope: string,
  scopeId: string,
): Promise<ScopeTuple | null> {
  if (!isVaultScope(scope)) return null;
  if (scope === "personal") {
    if (scopeId && scopeId !== userId) return null;
    return { scope, scopeId: userId };
  }
  if (!/^[0-9a-f-]{36}$/i.test(scopeId)) return null;
  const table = scope === "team" ? "team_members" : "org_members";
  const col = scope === "team" ? "team_id" : "org_id";
  const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeId).eq("user_id", userId).maybeSingle();
  return mem ? { scope, scopeId } : null;
}

async function authedUser(req: Request): Promise<{ userId: string } | { error: ReturnType<typeof fail> }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id ?? null;
  if (userId) return { userId };
  const bot = await resolveBotKey(req).catch(() => null);
  if (!bot) return { error: fail("Login required.", 401) };
  if (!keyHasScope(bot, "vault:write")) return { error: fail("Key lacks scope: vault:write.", 403) };
  return { userId: bot.userId };
}

/**
 * PATCH /api/vault/folders { scope, scope_id?, from, to }; rename a folder
 * (bulk path-prefix rename, live rows only). Fail-closed: any target
 * collision or >500 contained rows aborts with 409 before mutating.
 * Auth: session OR bot key with `vault:write`.
 */
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const auth = await authedUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.userId;
  const throttle = rateLimit(`vault-write:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const from = sanitizeVaultFilter(cleanVaultPath(input.from) || "");
  const to = sanitizeVaultFilter(cleanVaultPath(input.to) || "");
  if (!from || !to) return fail("Invalid folder.", 400);
  if (from === to) return ok({ renamed: 0, from, to });
  if (to.startsWith(`${from}/`)) return fail("Cannot move a folder inside itself.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const t = await requireMember(svc, userId, String(input.scope ?? "personal"), String(input.scope_id ?? userId));
  if (!t) return fail("Not a member of that scope.", 403);

  let list = svc.from("vault_files").select("id,path").is("deleted_at", null).like("path", `${from}/%`).limit(FOLDER_CAP + 1);
  list = t.scope === "personal" ? list.eq("scope", "personal").eq("owner_id", t.scopeId) : t.scope === "team" ? list.eq("scope", "team").eq("team_id", t.scopeId) : list.eq("scope", "org").eq("org_id", t.scopeId);
  const { data: rows, error } = await list;
  if (error) return dbFail("api/vault/folders", error, "Unable to list folder.");
  const contained = (rows ?? []) as { id: string; path: string }[];
  if (contained.length > FOLDER_CAP) return fail("Folder too large; split it first.", 409);
  if (contained.length === 0) return fail("Folder not found.", 404);

  // Target collision pre-check (exact file + subtree).
  const targets = contained.map((r) => `${to}${r.path.slice(from.length)}`);
  let clash = svc.from("vault_files").select("id").is("deleted_at", null).in("path", [to, ...targets].slice(0, FOLDER_CAP)).limit(1);
  clash = t.scope === "personal" ? clash.eq("scope", "personal").eq("owner_id", t.scopeId) : t.scope === "team" ? clash.eq("scope", "team").eq("team_id", t.scopeId) : clash.eq("scope", "org").eq("org_id", t.scopeId);
  const { data: clashRows } = await clash;
  if (clashRows && clashRows.length > 0) return fail("A file already has that name in this folder.", 409);

  let renamed = 0;
  for (let i = 0; i < contained.length; i++) {
    const { error: upErr } = await svc.from("vault_files").update({ path: targets[i] }).eq("id", contained[i].id);
    if (upErr) {
      if ((upErr as { code?: string }).code === "23505") return fail("A file already has that name in this folder.", 409);
      return dbFail("api/vault/folders", upErr, "Unable to rename folder.");
    }
    renamed++;
  }
  return ok({ renamed, from, to });
}

/**
 * DELETE /api/vault/folders?scope=&scope_id=&path=; trash every live file
 * under a folder prefix (share links revoked). Fail-closed past 500 rows.
 * Auth: session OR bot key with `vault:write`.
 */
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const auth = await authedUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.userId;
  const throttle = rateLimit(`vault-write:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const p = new URL(req.url).searchParams;
  const folder = sanitizeVaultFilter(cleanVaultPath(p.get("path") ?? "") || "");
  if (!folder) return fail("Invalid folder.", 400);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const t = await requireMember(svc, userId, p.get("scope") ?? "personal", p.get("scope_id") ?? userId);
  if (!t) return fail("Not a member of that scope.", 403);

  let list = svc.from("vault_files").select("id,bytes").is("deleted_at", null).like("path", `${folder}/%`).limit(FOLDER_CAP + 1);
  list = t.scope === "personal" ? list.eq("scope", "personal").eq("owner_id", t.scopeId) : t.scope === "team" ? list.eq("scope", "team").eq("team_id", t.scopeId) : list.eq("scope", "org").eq("org_id", t.scopeId);
  const { data: rows, error } = await list;
  if (error) return dbFail("api/vault/folders", error, "Unable to list folder.");
  const contained = (rows ?? []) as { id: string; bytes: number }[];
  if (contained.length > FOLDER_CAP) return fail("Folder too large; split it first.", 409);
  if (contained.length === 0) return fail("Folder not found.", 404);

  const now = new Date().toISOString();
  let deleted = 0;
  let freedBytes = 0;
  for (const r of contained) {
    const { error: upErr } = await svc.from("vault_files").update({ deleted_at: now }).eq("id", r.id);
    if (upErr) return dbFail("api/vault/folders", upErr, "Unable to delete folder.");
    await svc.from("vault_shares").delete().eq("file_id", r.id);
    deleted++;
    freedBytes += r.bytes;
  }
  return ok({ deleted, freedBytes, folder });
}
