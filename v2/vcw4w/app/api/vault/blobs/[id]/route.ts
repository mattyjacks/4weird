import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";
import { isUuid } from "@/lib/validate";
import { VAULT_CUT_NOTE, quoteVaultStorageSplit } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault/blobs/[id]; owner/member reads one file + (when clean) a
 * short-lived download URL. Quarantined rows NEVER include a URL.
 * Auth: session OR bot key with `vault:read`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:read")) return fail("Key lacks scope: vault:read.", 403);
    userId = bot.userId;
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid file.", 400);

  // RLS policies enforce scope separation on the user client.
  const { data: row, error } = await supabase
    .from("vault_files")
    .select("id,scope,owner_id,team_id,org_id,path,bytes,kind,provenance,quarantined,sha256,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return dbFail("api/vault/blob", error, "Unable to load file.");
  if (!row) return fail("File not found.", 404);

  // Explicit ownership/membership check before minting a download URL:
  // RLS alone over-grants team files on public/internal teams.
  const r = row as { scope: string; owner_id: string | null; team_id: string | null; org_id: string | null; quarantined: boolean; sha256: string; [k: string]: unknown };
  let owns = r.scope === "personal" && r.owner_id === userId;
  if (!owns && r.scope !== "personal") {
    try {
      const svc = serviceClient();
      const table = r.scope === "team" ? "team_members" : "org_members";
      const col = r.scope === "team" ? "team_id" : "org_id";
      const scopeKey = String(r.scope === "team" ? r.team_id : r.org_id ?? "");
      const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeKey).eq("user_id", userId).maybeSingle();
      owns = Boolean(mem);
    } catch {
      owns = false;
    }
  }
  if (!owns) return fail("File not found.", 404);

  let download: string | null = null;
  if (!r.quarantined) {
    try {
      const svc = serviceClient();
      const { data: blob } = await svc
        .from("vault_blobs")
        .select("storage_path")
        .eq("sha256", String(r.sha256))
        .maybeSingle();
      const storagePath = (blob as { storage_path?: string } | null)?.storage_path;
      if (storagePath) {
        const { data: signed } = await svc.storage
          .from("game-blobs")
          .createSignedUrl(storagePath, 3600, { download: String(r.path ?? "download").split("/").pop() ?? "download" });
        download = signed?.signedUrl ?? null;
      }
    } catch {
      download = null;
    }
  }
  const pub: Record<string, unknown> = { ...r };
  delete pub.owner_id;
  delete pub.team_id;
  delete pub.org_id;
  return ok({ file: { ...pub, download } });
}

/**
 * POST /api/vault/blobs/[id]; confirm bytes landed (size check),
 * then meter storage (fail closed). Auth: session OR `vault:write`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  let viaBot = false;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:write")) return fail("Key lacks scope: vault:write.", 403);
    userId = bot.userId;
    viaBot = true;
  }
  const throttle = rateLimit(`vault-ready:${userId}`, 20, 60_000);
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
    .select("id,scope,owner_id,team_id,org_id,bytes,sha256")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return dbFail("api/vault/ready", error, "File not found.", 404);
  const r = row as { scope: string; owner_id: string | null; team_id: string | null; org_id: string | null; bytes: number; sha256: string };
  const owns =
    (r.scope === "personal" && r.owner_id === userId) ||
    (r.scope !== "personal" &&
      (await svc
        .from(r.scope === "team" ? "team_members" : "org_members")
        .select("user_id")
        .eq(r.scope === "team" ? "team_id" : "org_id", (r.scope === "team" ? r.team_id : r.org_id) ?? "")
        .eq("user_id", userId)
        .maybeSingle()
        .then((m) => Boolean(m.data))));
  if (!owns) return fail("File not found.", 404);

  const { data: blob } = await svc
    .from("vault_blobs")
    .select("storage_path,bytes")
    .eq("sha256", r.sha256)
    .maybeSingle();
  const storagePath = (blob as { storage_path?: string } | null)?.storage_path;
  if (!storagePath) return fail("Upload not registered.", 409);
  const folder = storagePath.split("/").slice(0, -1).join("/");
  const { data: listed } = await svc.storage.from("game-blobs").list(folder);
  const base = storagePath.split("/").pop() ?? "";
  const stored = (listed ?? []).find((o) => o.name === base);
  if (!stored) return fail("Bytes not uploaded yet.", 409);
  if (typeof stored.metadata?.size === "number" && stored.metadata.size !== r.bytes) {
    return fail("Size mismatch; re-upload.", 409);
  }

  const quote = quoteVaultStorageSplit(r.bytes);
  if (viaBot) {
    const { error: mErr } = await svc.rpc("meter_vault_storage_for", {
      p_user: userId,
      p_file: id,
      p_gross: quote.gross,
      p_cut: quote.cut,
    });
    if (mErr) return rpcFail("api/vault/ready", mErr, rpcStatus, "Unable to meter storage.");
  } else {
    const { error: mErr } = await supabase.rpc("meter_vault_storage", {
      p_file: id,
      p_gross: quote.gross,
      p_cut: quote.cut,
    });
    if (mErr) return rpcFail("api/vault/ready", mErr, rpcStatus, "Unable to meter storage.");
  }
  return ok({ ready: true, quote, note: VAULT_CUT_NOTE });
}
