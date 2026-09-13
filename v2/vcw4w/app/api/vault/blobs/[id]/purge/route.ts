import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { VAULT_BUCKET } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * POST /api/vault/blobs/[id]/purge; permanently delete a TRASHED file.
 * Blob bytes + storage object are removed only when no vault_files row in
 * ANY scope still references the sha (content-addressed dedup is shared).
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
    .select("id,scope,owner_id,team_id,org_id,bytes,sha256,quarantined,deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return dbFail("api/vault/purge", error, "Unable to load file.");
  const r = row as {
    scope: string;
    owner_id: string | null;
    team_id: string | null;
    org_id: string | null;
    bytes: number;
    sha256: string;
    quarantined: boolean | null;
    deleted_at: string | null;
  } | null;
  if (!r) return fail("File not found.", 404);
  if (!r.deleted_at) return fail("Trash the file first.", 400);
  // Legal hold: quarantined bytes under HUMAN review must neither be
  // destroyed nor resurrected mid-review (the sha256 evidence row lives on
  // in safety_reports either way; generic message leaks nothing).
  if (r.quarantined === true) return fail("File is under safety review and cannot be purged.", 409);
  {
    const { data: holds } = await svc
      .from("safety_reports")
      .select("id")
      .eq("target_type", "vault_file")
      .eq("target_id", id)
      .in("status", ["open", "reviewing"])
      .limit(1);
    if (holds && holds.length > 0) return fail("File is under safety review and cannot be purged.", 409);
  }
  let owns = r.scope === "personal" && r.owner_id === userId;
  if (!owns && r.scope !== "personal") {
    const table = r.scope === "team" ? "team_members" : "org_members";
    const col = r.scope === "team" ? "team_id" : "org_id";
    const scopeKey = String(r.scope === "team" ? r.team_id : r.org_id ?? "");
    const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeKey).eq("user_id", userId).maybeSingle();
    owns = Boolean(mem);
  }
  if (!owns) return fail("File not found.", 404);

  await svc.from("vault_shares").delete().eq("file_id", id);
  const { error: delErr } = await svc.from("vault_files").delete().eq("id", id);
  if (delErr) return dbFail("api/vault/purge", delErr, "Unable to purge file.");

  // Refcount GC: last row referencing these bytes removes object + blob row.
  const { count } = await svc.from("vault_files").select("id", { count: "exact", head: true }).eq("sha256", r.sha256);
  if (!count) {
    const { data: blob } = await svc.from("vault_blobs").select("storage_path").eq("sha256", r.sha256).maybeSingle();
    const storagePath = (blob as { storage_path?: string } | null)?.storage_path;
    if (storagePath) await svc.storage.from(VAULT_BUCKET).remove([storagePath]);
    await svc.from("vault_blobs").delete().eq("sha256", r.sha256);
  }
  return ok({ purged: true, freedBytes: r.bytes });
}
