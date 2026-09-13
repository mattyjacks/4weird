import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit } from "@/lib/rate-limit";
import {
  VAULT_BUCKET,
  VAULT_CUT_NOTE,
  VAULT_MAX_BLOB_BYTES,
  cleanVaultPath,
  isVaultKind,
  isVaultScope,
  isVaultSort,
  quoteVaultStorageSplit,
  sanitizeVaultFilter,
  vaultObjectKey,
} from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * True when a PostgREST error means the trash migration
 * (`20261107000000_vault_path_upsert_trash.sql`, `deleted_at` column) has
 * not been applied to the database yet. Callers retry without the trash
 * filter so lists keep working on pre-migration databases instead of 500ing.
 */
function isMissingTrashColumn(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? error ?? "");
  return code === "42703" || message.includes("deleted_at");
}

/**
 * GET /api/vault/blobs?scope=personal|team|org&scope_id=&limit=&prefix=
 * Lists the caller's files in ONE scope (strictly separated). `prefix`
 * filters to one folder (e.g. newgameplus/<slug>/<instance>/) for
 * GitHub-like folder views.
 * Auth: session OR bot key with `vault:read`.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  let viaBot = false;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:read")) return fail("Key lacks scope: vault:read.", 403);
    userId = bot.userId;
    viaBot = true;
  }
  const readThrottle = rateLimit(`vault-read:${userId}`, 60, 60_000);
  if (!readThrottle.allowed) return fail("Too many requests.", 429);
  const q = new URL(req.url).searchParams;
  const scope = q.get("scope") ?? "personal";
  if (!isVaultScope(scope)) return fail("Invalid scope.", 400);
  const scopeId = (q.get("scope_id") ?? "").trim();
  const limit = Math.max(1, Math.min(Number(q.get("limit") ?? 50) || 50, 100));
  // Folder filter: plain prefix match (cleanVaultPath-style, no globs), so a
  // Vault browser can render one folder at a time like a drive. LIKE
  // wildcards (%, _) are stripped so a crafted prefix cannot escape it.
  const prefix = sanitizeVaultFilter(q.get("prefix") ?? "");
  // Search / sort / filter (all optional, additive).
  const search = sanitizeVaultFilter(q.get("q") ?? "", 100);
  const sortRaw = q.get("sort");
  const sort = isVaultSort(sortRaw) ? sortRaw : "updated";
  const dirParam = (q.get("dir") ?? "").toLowerCase();
  const dirAsc =
    dirParam === "asc" ? true : dirParam === "desc" ? false : sort === "name" || sort === "kind";
  const kind = (q.get("kind") ?? "").slice(0, 16);
  if (kind && !isVaultKind(kind)) return fail("Invalid kind.", 400);
  // Trash: trashed=1 lists ONLY soft-deleted rows (owner/member only);
  // default hides them.
  const trashedOnly = (q.get("trashed") ?? "") === "1";

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
  // Bot callers have no session, so the anon client sees nothing under RLS:
  // serve them from the service client instead, behind the same explicit
  // membership gate enforced above (personal: own rows only).
  const cols = "id,scope,path,bytes,kind,quarantined,created_at,updated_at";
  const orderCol =
    sort === "name" ? "path" : sort === "size" ? "bytes" : sort === "kind" ? "kind" : "updated_at";
  if (viaBot) {
    const buildBotQuery = (trashAware: boolean) => {
      let q = svc.from("vault_files").select(cols).order(orderCol, { ascending: dirAsc }).limit(limit);
      if (trashAware) q = trashedOnly ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
      if (scope === "personal") {
        q = q.eq("scope", "personal").eq("owner_id", userId);
      } else if (scope === "team") {
        q = q.eq("scope", "team").eq("team_id", scopeId);
      } else {
        q = q.eq("scope", "org").eq("org_id", scopeId);
      }
      if (prefix) q = q.like("path", `${prefix}%`);
      if (search) q = q.ilike("path", `%${search}%`);
      if (kind) q = q.eq("kind", kind);
      return q;
    };
    let { data: rows, error } = await buildBotQuery(true);
    if (error && isMissingTrashColumn(error)) ({ data: rows, error } = await buildBotQuery(false));
    if (error) return dbFail("api/vault/blobs", error, "Unable to list files.");
    return ok({ files: rows ?? [], scope });
  }
  const buildQuery = (trashAware: boolean) => {
    let q = supabase
      .from("vault_files")
      .select(cols)
      .order(orderCol, { ascending: dirAsc })
      .limit(limit);
    // RLS hides trashed rows from the live policies; the trash policies expose
    // them, so belt-and-braces filter here too (service paths use svc above).
    if (trashAware) q = trashedOnly ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    if (scope === "personal") {
      q = q.eq("scope", "personal").eq("owner_id", userId);
    } else if (scope === "team") {
      if (!scopeId) return fail("scope_id required for team scope.", 400);
      q = q.eq("scope", "team").eq("team_id", scopeId);
    } else {
      if (!scopeId) return fail("scope_id required for org scope.", 400);
      q = q.eq("scope", "org").eq("org_id", scopeId);
    }
    if (prefix) q = q.like("path", `${prefix}%`);
    if (search) q = q.ilike("path", `%${search}%`);
    if (kind) q = q.eq("kind", kind);
    return q;
  };
  const first = buildQuery(true);
  // buildQuery returns a fail() Response when scope_id is missing for
  // team/org scopes; pass it straight through.
  if (first instanceof Response) return first;
  let { data: rows, error } = await first;
  if (error && isMissingTrashColumn(error)) {
    const retry = buildQuery(false);
    if (retry instanceof Response) return retry;
    ({ data: rows, error } = await retry);
  }
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
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
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
  // Distributed shield: at most 100 vault registrations/hour per account
  // across all instances (each registration reserves billable storage).
  const vaultDist = await globalBucket(acctBucketKey("vault-write-hour", userId), 100, 3600);
  if (vaultDist && !vaultDist.allowed) {
    return fail("Too many requests.", 429, throttleHeaders(vaultDist.retryAfter));
  }

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
  // inline when a teammate opens the signed URL. HTML/SVG/XML/JS are
  // rejected; use text/plain or octet-stream for code instead.
  // Blocked MIME set includes text/html|image/svg+xml plus
  // text/xml-external-parsed-entity|application/xml-dtd|application/x-javascript
  // script flavors; blocked extensions include html?|xhtml|svg| plus
  // xhtm|dhtml|jse|vbs|vbe|mhtml|mht script/htA-adjacent extras below.
  if (/^\s*(text\/html|image\/svg\+xml|application\/xhtml\+xml|text\/xml|application\/xml|text\/xml-external-parsed-entity|application\/xml-dtd|application\/x-javascript|multipart\/related|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)\s*(;|$)/i.test(mime)) {
    return fail("That content type cannot be stored inline. Use a safe type.", 400);
  }
  const lowerPath = path.toLowerCase();
  if (/\.(html?|xhtml|svg|svgz|shtml|hta|swf|xap|xht|xml|js|mjs|cjs|xhtm|dhtml|jse|vbs|vbe|mhtml|mht)$/.test(lowerPath)) {
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

  // Dedup per scope: same bytes already stored in THIS scope -> reuse the
  // blob row; never repoint another scope's storage_path (cross-scope leak).
  const ext = (path.split(".").pop() ?? "").slice(0, 8);
  const objectKey = vaultObjectKey({ scope, scopeId, sha256, ext });
  {
    const { data: existing, error: blobSelErr } = await svc
      .from("vault_blobs")
      .select("sha256,storage_path")
      .eq("sha256", sha256)
      .maybeSingle();
    if (blobSelErr) return dbFail("api/vault/blobs", blobSelErr, "Vault unavailable.");
    if (!existing) {
      const { error: blobInsErr } = await svc
        .from("vault_blobs")
        .insert({ sha256, bytes, mime, storage_path: objectKey });
      // 23505 = lost a dedup race with a concurrent upload of the same bytes;
      // the winner's row satisfies the FK below, so only other errors fail.
      // Surfacing this separately keeps a blob-layer failure from masquerading
      // as the file-row "Unable to register file." below.
      if (blobInsErr && blobInsErr.code !== "23505") {
        return dbFail("api/vault/blobs", blobInsErr, "Unable to store file bytes.");
      }
    }
  }

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
