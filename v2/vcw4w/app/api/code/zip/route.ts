import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { requireHuman } from "@/lib/botid";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";
import { clientIp } from "@/lib/validate";
import {
  SUBMIT_CUT_NOTE,
  ZIP_MAX_BYTES,
  auditZipPackage,
  cleanGameRoot,
  listZipEntries,
  quoteAuditSplit,
  quoteZipStorageSplit,
} from "@/lib/zip-submit";
import { extractTextSamples } from "@/lib/server/zip-extract";

export const dynamic = "force-dynamic";

/**
 * POST /api/code/zip; multipart { file (.zip), title?, game_root? }.
 *
 * Auth: login session OR bot key with `code:submit`.
 * Flow: size/magic gate (50 MB) -> static audit (names + bounded text
 * samples) -> coin-meter storage+audit (fail closed) -> private upload to
 * the `game-blobs` bucket -> code_submissions row -> verdict.
 *
 * Safety (lawful by design): `denied`/`unsafe` forces status 'rejected' +
 * quarantined=true; never served, never rendered; plus a safety_reports
 * row for HUMAN moderator review. CSAM evidence = sha256 only, never
 * viewable bytes, never described. NCMEC referral is BY A HUMAN; uploader
 * IPs are salted hashes disclosed ONLY on valid legal process.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  // Valid bot4weird_ keys (code:submit) pass inside requireHuman; forged keys
  // fall through to the BotID check and fail closed like any bot.
  const botBlock = await requireHuman(req, "POST /api/code/zip");
  if (botBlock) return botBlock;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  let viaBot = false;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "code:submit")) return fail("Key lacks scope: code:submit.", 403);
    userId = bot.userId;
    viaBot = true;
  }

  const throttle = rateLimit(`code-zip:${userId}`, 5, 60_000);
  if (!throttle.allowed) {
    return fail("Too many uploads. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  // Distributed shield: at most 20 zip submissions/hour per account across
  // all instances (metered storage bills per byte; farms must not get N x
  // the local quota by spreading uploads).
  const zipDist = await globalBucket(acctBucketKey("zip-hour", userId), 20, 3600);
  if (zipDist && !zipDist.allowed) {
    return fail("Too many uploads. Try again shortly.", 429, throttleHeaders(zipDist.retryAfter));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid multipart body.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail("Field 'file' (.zip) required.", 400);
  const filename = String(
    (file as File).name ?? (form.get("filename") as string | null) ?? "game.zip",
  ).slice(0, 128);
  // Extension is authoritative; file.type is client-controlled and ignored.
  if (!/\.zip$/i.test(filename)) {
    return fail("Only .zip packages are accepted.", 400);
  }
  const title = String(form.get("title") ?? filename.replace(/\.zip$/i, "") ?? "Untitled game")
    .trim()
    .slice(0, 80);
  if (title.length < 2) return fail("Title (2+ chars) required.", 400);
  const gameRootRaw = String(form.get("game_root") ?? form.get("gameRoot") ?? "");
  const gameRoot = cleanGameRoot(gameRootRaw);
  if (gameRootRaw.trim() && !gameRoot && gameRootRaw.trim() !== "") {
    return fail("Invalid game_root (relative path, no .. or leading /).", 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > ZIP_MAX_BYTES) {
    return fail("Package exceeds the 50 MB cap. Keep it lean so every game loads fast.", 413);
  }
  // Magic: PK local-header signature + end-of-central-directory record.
  const hasLocalHeader = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  let hasEocd = false;
  const tailStart = Math.max(0, buf.length - 66500);
  for (let i = buf.length - 22; i >= tailStart; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      hasEocd = true;
      break;
    }
  }
  if (buf.length < 22 || !hasLocalHeader || !hasEocd) {
    return fail("Not a readable .zip package.", 400);
  }

  const entries = listZipEntries(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  const samples = extractTextSamples(buf);
  const texts: Record<string, string> = {};
  for (const s of samples) texts[s.name] = s.text;
  // Beautiful preview: first 12 text files, 8 KB each, for safe packages
  // only (quarantined rows store [] and never display contents).
  const previews = samples.slice(0, 12).map((s) => ({
    name: s.name.slice(0, 160),
    text: s.text.slice(0, 8192),
  }));
  const report = auditZipPackage({
    entries,
    texts,
    totalBytes: buf.length,
    gameRoot,
  });

  const storageQuote = quoteZipStorageSplit(buf.length);
  const auditQuote = quoteAuditSplit(report.verdict !== "safe");

  let svc: ReturnType<typeof serviceClient>;
  try {
    svc = serviceClient();
  } catch {
    return fail("Upload unavailable.", 503);
  }

  // Meter AFTER the row exists (charges reference the real submission id).
  // Session callers use the auth.uid-guarded RPC; bot callers (no session)
  // use the service-only `_for` twin after scope check above.
  async function meter(kind: "storage" | "audit" | "audit_deep", q: { gross: number; cut: number }) {
    if (viaBot) {
      const { error } = await svc.rpc("meter_submission_charge_for", {
        p_user: userId,
        p_submission: submissionId,
        p_kind: kind,
        p_gross: q.gross,
        p_cut: q.cut,
      });
      return error;
    }
    const { error } = await supabase.rpc("meter_submission_charge", {
      p_submission: submissionId,
      p_kind: kind,
      p_gross: q.gross,
      p_cut: q.cut,
    });
    return error;
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const quarantined = report.verdict === "denied" || report.verdict === "unsafe";
  const status = quarantined ? "rejected" : "submitted";
  const storagePath = `submissions/${userId}/${sha256}.zip`;

  // Quarantined bytes still upload (evidence preservation) but are NEVER
  // served: no signed URL is ever issued for quarantined rows.
  const { error: upErr } = await svc.storage
    .from("game-blobs")
    .upload(storagePath, buf, { contentType: "application/zip", upsert: true });
  if (upErr) {
    if (/not found|bucket/i.test(upErr.message ?? "")) {
      return fail("Storage bucket 'game-blobs' is not provisioned yet. Ask an admin to create it.", 503);
    }
    return fail("Unable to store package.", 500);
  }

  const { data: row, error: rowErr } = await svc
    .from("code_submissions")
    .insert({
      owner_id: userId,
      title,
      source: `zip:${sha256.slice(0, 12)}`,
      status,
      zip_bytes: buf.length,
      zip_sha256: sha256,
      storage_path: storagePath,
      game_root: gameRoot,
      verdict: report.verdict,
      quarantined,
      audit_findings: report.findings,
      preview_files: quarantined ? [] : previews,
      audit_coins: auditQuote.gross,
      storage_coins: storageQuote.gross,
    })
    .select("id")
    .single();
  if (rowErr || !row) {
    await svc.storage.from("game-blobs").remove([storagePath]);
    return dbFail("api/code/zip", rowErr, "Unable to save submission.");
  }
  const submissionId = (row as { id: string }).id;

  try {
    const errStorage = await meter("storage", storageQuote);
    if (errStorage) throw errStorage;
    const errAudit = await meter(report.verdict === "safe" ? "audit" : "audit_deep", auditQuote);
    if (errAudit) throw errAudit;
  } catch (error) {
    // Fail closed: no free storage; roll back the row + bytes.
    await svc.from("code_submissions").delete().eq("id", submissionId);
    await svc.storage.from("game-blobs").remove([storagePath]);
    const err = error as { code?: string; message?: string };
    return rpcFail("api/code/zip", err, rpcStatus, "Unable to meter this submission.");
  }

  // Safety queue for humans: denied/unsafe filed as a report (hash-only
  // evidence, salted uploader-IP hash for lawful-process disclosure only).
  if (quarantined) {
    const salt = process.env.SIGNUP_IP_HASH_SALT ?? "unconfigured";
    const ipHash =
      salt === "unconfigured"
        ? null
        : createHash("sha256").update(salt + clientIp(req), "utf8").digest("hex");
    const category = report.findings.some((f) =>
      /adult|sexual|csam/i.test(`${f.code} ${f.detail}`),
    )
      ? "sexual"
      : report.findings.some((f) => /cybercrime|phishing/i.test(f.code))
        ? "cybercrime"
        : "malware";
    await svc.from("safety_reports").insert({
      reporter_id: null,
      target_type: "submission",
      target_id: row.id,
      category,
      detail: `Automod ${report.verdict}: ${report.findings
        .slice(0, 3)
        .map((f) => f.code)
        .join(", ")}`.slice(0, 500),
      sha256,
      uploader_ip_hash: ipHash,
      status: "open",
    });
  }

  return ok(
    {
      submission: row,
      verdict: report.verdict,
      quarantined,
      status,
      gameRoot: report.gameRoot,
      entryFound: report.entryFound,
      findings: report.findings,
      files: report.files,
      bytes: buf.length,
      storage: storageQuote,
      audit: auditQuote,
      note: SUBMIT_CUT_NOTE,
      safety:
        "Quarantined packages are never served and queue for human moderator review. " +
        "Authority referrals happen by a human through proper channels; IPs are disclosed only on valid legal process.",
    },
    201,
  );
}
