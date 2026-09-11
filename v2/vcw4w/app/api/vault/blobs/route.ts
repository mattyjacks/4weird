import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  VAULT_BUCKET,
  VAULT_CUT_NOTE,
  VAULT_MAX_BLOB_BYTES,
  cleanVaultPath,
  isVaultScope,
  quoteVaultStorageSplit,
  vaultObjectKey,
} from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault/blobs?scope=personal|team|org&scope_id=&limit=
 * Lists the caller's files in ONE scope (strictly separated).
 * Auth: session OR bot key with `vault:read`.
 */
export async function GET(req: Request) {
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
  const q = new URL(req.url).searchParams;
  const scope = q.get("scope") ?? "personal";
  if (!isVaultScope(scope)) return fail("Invalid scope.", 400);
  const scopeId = (q.get("scope_id") ?? "").trim();
  const limit = Math.max(1, Math.min(Number(q.get("limit") ?? 50) || 50, 100));

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  // Explicit membership gate (defense in depth beyond RLS): team/org list
  // requires direct membership, so public/internal visibility can never
  // over-grant file metadata to strangers.
  if (scope !== "personal") {
    if (!/^[0-9a-f-]{36}$/i.test(scopeId)) return fail("Invalid scope_id.", 400);
    const table = scope === "team" ? "team_members" : "org_members";
    const col = scope === "team" ? "team_id" : "org_id";
    const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeId).eq("user_id", userId).maybeSingle();
    if (!mem) return fail("Not a member of that scope.", 403);
  }
  // Scope gate: personal callers see only their own rows; team/org rows go
  // through the membership-checked RLS policies on the user client.
  let query = supabase
    .from("vault_files")
    .select("id,scope,path,bytes,kind,quarantined,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (scope === "personal") {
    query = query.eq("scope", "personal").eq("owner_id", userId);
  } else if (scope === "team") {
    if (!scopeId) return fail("scope_id required for team scope.", 400);
    query = query.eq("scope", "team").eq("team_id", scopeId);
  } else {
    if (!scopeId) return fail("scope_id required for org scope.", 400);
    query = query.eq("scope", "org").eq("org_id", scopeId);
  }
  void svc;
  const { data: rows, error } = await query;
  if (error) return dbFail("api/vault/blobs", error, "Unable to list files.");
  return ok({ files: rows ?? [], scope });
}

/**
 * POST /api/vault/blobs { scope, scope_id?, path, bytes, sha256, kind?, mime? }
 * Registers a file + returns a signed upload URL (browser PUTs bytes
 * direct to storage, like the Blender flow, so Vercel body limits never
 * matter). Metered storage quote returned; the charge lands on /ready
 * after bytes are verified. Auth: session OR bot key with `vault:write`.
 */
export async function POST(req: Request) {
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
  const throttle = rateLimit(`vault-write:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const scope = input.scope ?? "personal";
  if (!isVaultScope(scope)) return fail("Invalid scope.", 400);
  const path = cleanVaultPath(input.path);
  if (!path) return fail("Invalid path.", 400);
  const bytes = Math.floor(Number(input.bytes ?? 0));
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > VAULT_MAX_BLOB_BYTES) {
    return fail("Invalid bytes (1..52428800 - 50 MB max so all games load fast).", 400);
  }
  const sha256 = String(input.sha256 ?? "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    return fail("sha256 (client-computed hex) required.", 400);
  }
  const kind = String(input.kind ?? "asset").slice(0, 16);
  const mime = String(input.mime ?? "application/octet-stream").slice(0, 128);
  // Stored-XSS guard: never store browser-active markup that would execute
  // inline when a teammate opens the signed URL. HTML/SVG/XML are rejected;
  // use text/plain or octet-stream for code instead.
  if (/^\s*(text\/html|image\/svg\+xml|application\/xhtml\+xml|text\/xml|application\/xml|multipart\/related)\s*(;|$)/i.test(mime)) {
    return fail("That content type cannot be stored inline. Use a safe type.", 400);
  }
  const lowerPath = path.toLowerCase();
  if (/\.(html?|xhtml|svg|shtml|hta|swf|xap)$/.test(lowerPath)) {
    return fail("That file extension cannot be stored inline.", 400);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }

  // Resolve the scope owner column (exactly one).
  const scopeId = String(input.scope_id ?? userId);
  const cols =
    scope === "personal"
      ? { owner_id: userId, team_id: null, org_id: null }
      : scope === "team"
        ? { owner_id: null, team_id: scopeId, org_id: null }
        : { owner_id: null, team_id: null, org_id: scopeId };
  if (scope === "personal" && scopeId !== userId) {
    return fail("Personal files live on your own account.", 403);
  }
  if (scope !== "personal" && !/^[0-9a-f-]{36}$/i.test(scopeId)) {
    return fail("Invalid scope_id.", 400);
  }

  // Membership gate for shared scopes (service client bypasses RLS, so we
  // check explicitly): team membership or org membership required.
  if (scope !== "personal") {
    const table = scope === "team" ? "team_members" : "org_members";
    const col = scope === "team" ? "team_id" : "org_id";
    const { data: mem, error: memErr } = await svc
      .from(table)
      .select("user_id")
      .eq(col, scopeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memErr || !mem) return fail("Not a member of that scope.", 403);
  }

  // Dedup: same bytes already stored -> reuse the blob + object key.
  const ext = (path.split(".").pop() ?? "").slice(0, 8);
  const objectKey = vaultObjectKey({ scope, scopeId, sha256, ext });
  await svc.from("vault_blobs").upsert(
    { sha256, bytes, mime, storage_path: objectKey },
    { onConflict: "sha256" },
  );

  const { data: file, error: fileErr } = await svc
    .from("vault_files")
    .upsert(
      {
        ...cols,
        scope,
        path,
        sha256,
        bytes,
        kind,
        provenance: { mime, uploader: userId, via: viaBot ? "bot" : "app" },
      },
      { onConflict: "scope,owner_id,team_id,org_id,path" },
    )
    .select("id")
    .single();
  if (fileErr || !file) return dbFail("api/vault/blobs", fileErr, "Unable to register file.");

  const { data: signed, error: signErr } = await svc.storage
    .from(VAULT_BUCKET)
    .createSignedUploadUrl(objectKey);
  if (signErr || !signed) return dbFail("api/vault/blobs", signErr, "Unable to issue upload URL.");

  const quote = quoteVaultStorageSplit(bytes);
  return ok(
    {
      file,
      uploadUrl: signed.signedUrl,
      objectKey,
      quote,
      note: VAULT_CUT_NOTE,
      hint: "PUT bytes to uploadUrl, then POST /api/vault/blobs/[id] to confirm + meter.",
    },
    201,
  );
}
