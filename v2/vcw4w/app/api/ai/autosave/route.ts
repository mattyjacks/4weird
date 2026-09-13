import { createHash } from "node:crypto";
import { fetchEgressUrl } from "@/lib/ssrf-guard";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { VAULT_BLOCKED_EXT, VAULT_BUCKET, cleanVaultPath, isVaultScope, vaultObjectKey, vaultPathForKind } from "@/lib/blob-vault";
import {
  AUTOSAVE_CUT_NOTE,
  LOG_FULL_MAX_CHARS,
  LOG_HALF_PREVIEW_CHARS,
  isAiArtifactKind,
  isLogTier,
  planAutosave,
} from "@/lib/ai-autosave";

export const dynamic = "force-dynamic";
const MAX_INLINE_BYTES = 256 * 1024;

/**
 * POST /api/ai/autosave { kind, tier?, filename?, scope?, scope_id?, text?, url? }.
 * Autosaves an AI artifact (fal/Meshy/VCW/swarm/buddy/NGP output, chat
 * context, full/half/minimal logs, audio/video/text) to the caller's Weird
 * Vault scope, then returns follow-up work hints. Auth: session OR bot key
 * with `ai:autosave`. Provenance recorded; log tiers enforced (half drops
 * full text, minimal keeps metadata only).
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
    if (!keyHasScope(bot, "ai:autosave")) return fail("Key lacks scope: ai:autosave.", 403);
    userId = bot.userId;
    viaBot = true;
  }
  const throttle = rateLimit(`ai-autosave:${userId}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (!isAiArtifactKind(input.kind)) return fail("Invalid kind.", 400);
  const tier = isLogTier(input.tier) ? input.tier : "half";
  const scope = input.scope ?? "personal";
  if (!isVaultScope(scope)) return fail("Invalid scope.", 400);
  const scopeId = String(input.scope_id ?? userId);
  if (scope === "personal" && scopeId !== userId) return fail("Personal saves live on your account.", 403);
  if (scope !== "personal" && !/^[0-9a-f-]{36}$/i.test(scopeId)) return fail("Invalid scope_id.", 400);
  const source = ["fal", "meshy", "vcw", "swarm", "buddy", "newgameplus", "manual", "api"].includes(String(input.source))
    ? String(input.source)
    : "manual";

  // Resolve payload: inline text (tier-capped) or a server-fetched https URL.
  let bytes: Buffer | null = null;
  let mime = "application/octet-stream";
  const rawText = String(input.text ?? "");
  const url = String(input.url ?? "");
  if (rawText) {
    const capped =
      tier === "full"
        ? rawText.slice(0, LOG_FULL_MAX_CHARS)
        : tier === "half"
          ? rawText.slice(0, LOG_HALF_PREVIEW_CHARS)
          : "";
    bytes = Buffer.from(capped, "utf8");
    mime = "text/plain";
  } else if (url) {
    // SSRF guard: validate + fetch in one step (https-only, no private/
    // link-local/metadata IPs, stable DNS, no redirects that could downgrade
    // to intranet), streaming 50 MB cap. No caller logic runs between the
    // check and the fetch, minimizing the DNS TOCTOU gap.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetchEgressUrl(url, { signal: controller.signal });
    } catch (e) {
      clearTimeout(timer);
      // Guard rejections carry safe 400 messages; timeouts/aborts are 502s.
      if ((e as { name?: string })?.name === "AbortError") {
        return fail("Unable to fetch artifact URL.", 502);
      }
      return fail(e instanceof Error ? e.message : "Artifact URL is not allowed.", 400);
    }
    try {
        if (!res.ok) return fail("Unable to fetch artifact URL.", 502);
        const announced = Number(res.headers.get("content-length") ?? 0);
        if (Number.isFinite(announced) && announced > 50 * 1024 * 1024) {
          return fail("Artifact exceeds 50 MB.", 413);
        }
        const chunks: Buffer[] = [];
        let total = 0;
        const reader = res.body?.getReader();
        if (!reader) return fail("Unable to fetch artifact URL.", 502);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > 50 * 1024 * 1024) {
            try { await reader.cancel(); } catch { /* ignore */ }
            return fail("Artifact exceeds 50 MB.", 413);
          }
          chunks.push(Buffer.from(value));
        }
        bytes = Buffer.concat(chunks);
        mime = (res.headers.get("content-type") ?? "application/octet-stream").slice(0, 128);
        // Stored-XSS guard (mirrors vault/blobs): never store browser-active
        // markup fetched from a remote URL inline. Coerce to a safe type so
        // opening the signed URL cannot execute attacker HTML/SVG/JS from a
        // trusted Supabase origin.
        if (/^\s*(text\/html|image\/svg\+xml|application\/xhtml\+xml|text\/xml|application\/xml|multipart\/related|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)\s*(;|$)/i.test(mime)) {
          mime = "application/octet-stream";
        }
      } catch {
        return fail("Unable to fetch artifact URL.", 502);
      } finally {
        clearTimeout(timer);
      }
  } else {
    return fail("Provide text or an https url.", 400);
  }
  if (!bytes || bytes.length < 1) return fail("Nothing to save for this tier.", 400);
  if (bytes.length > MAX_INLINE_BYTES && mime === "text/plain") {
    bytes = bytes.subarray(0, MAX_INLINE_BYTES);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Autosave unavailable.", 503);
  }
  if (scope !== "personal") {
    const table = scope === "team" ? "team_members" : "org_members";
    const col = scope === "team" ? "team_id" : "org_id";
    const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeId).eq("user_id", userId).maybeSingle();
    if (!mem) return fail("Not a member of that scope.", 403);
  }

  const filename = String(input.filename ?? `${source}-${Date.now()}.txt`).slice(0, 128);
  const plan = planAutosave({ kind: input.kind, tier, filename });
  if (!plan) return fail("Invalid kind.", 400);
  // Never fall back to the raw filename: an unsanitizable name would land
  // verbatim (traversal sequences included) in vault_files.path.
  const rel = cleanVaultPath(vaultPathForKind(plan.kind, filename)) || "assets/untitled";
  if (VAULT_BLOCKED_EXT.test(rel)) return fail("That file extension cannot be stored inline.", 400);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const ext = (rel.split(".").pop() ?? "bin").slice(0, 8);
  const objectKey = vaultObjectKey({ scope, scopeId, sha256, ext });
  // Insert-only blob register: never repoint another scope's storage_path
  // (vault_blobs is keyed by sha256 globally; upsert would brick the first
  // scope's downloads at the [id] scope-prefix check).
  {
    const { data: existing, error: blobSelErr } = await svc
      .from("vault_blobs")
      .select("sha256")
      .eq("sha256", sha256)
      .maybeSingle();
    if (blobSelErr) return dbFail("api/ai/autosave", blobSelErr, "Autosave unavailable.");
    if (!existing) {
      const { error: blobErr } = await svc
        .from("vault_blobs")
        .insert({ sha256, bytes: bytes.length, mime, storage_path: objectKey });
      if (blobErr && (blobErr as { code?: string }).code !== "23505") {
        return dbFail("api/ai/autosave", blobErr, "Unable to save artifact.");
      }
    }
  }
  await svc.storage.from(VAULT_BUCKET).upload(objectKey, bytes, { contentType: mime, upsert: true });
  const cols =
    scope === "personal"
      ? { owner_id: userId, team_id: null, org_id: null }
      : scope === "team"
        ? { owner_id: null, team_id: scopeId, org_id: null }
        : { owner_id: null, team_id: null, org_id: scopeId };
  const { data: vf, error: vfErr } = await svc
    .from("vault_files")
    .upsert(
      {
        ...cols,
        scope,
        path: rel,
        sha256,
        bytes: bytes.length,
        kind: plan.kind,
        provenance: { source, tier, via: viaBot ? "bot" : "app", mime },
      },
      { onConflict: "scope,owner_id,team_id,org_id,path" },
    )
    .select("id")
    .single();
  if (vfErr || !vf) return dbFail("api/ai/autosave", vfErr, "Unable to save artifact.");
  const fileId = (vf as { id: string }).id;
  await svc.from("ai_artifacts").insert({
    owner_id: userId,
    team_id: scope === "team" ? scopeId : null,
    org_id: scope === "org" ? scopeId : null,
    kind: plan.kind,
    tier,
    source,
    vault_file_id: fileId,
    bytes: bytes.length,
    coins: 0,
  });

  return ok(
    {
      file: { id: fileId, path: rel },
      dropped: plan.dropped,
      followUps: plan.followUps,
      note: AUTOSAVE_CUT_NOTE,
    },
    201,
  );
}
