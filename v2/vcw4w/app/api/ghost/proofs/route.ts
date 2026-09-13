import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_048_576;

// Full signatures, matching /api/clans/upload: 8-byte PNG, GIF87a/89a,
// RIFF....WEBP. Short prefixes (e.g. 3-byte "GIF") accept polyglots.
const MAGIC: Array<{ mime: string; ext: string; check: (b: Uint8Array) => boolean }> = [
  {
    mime: "image/png",
    ext: "png",
    check: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  { mime: "image/jpeg", ext: "jpg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/gif",
    ext: "gif",
    check: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61,
  },
  {
    mime: "image/webp",
    ext: "webp",
    check: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/**
 * POST /api/ghost/proofs; multipart {file, timer_id, caption?}. Worker-
 * ATTACHED proof screenshots for timer sessions (≤1 MB, magic-byte checked,
 * service-role upload to `ghost-proofs`). We never capture screens; the
 * worker supplies proof, like freelance work diaries but consensual by construction.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`ghost-proof:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid multipart body.", 400);
  }
  const file = form.get("file");
  const timerId = String(form.get("timer_id") ?? "");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 140);
  if (!(file instanceof Blob)) return fail("Field 'file' required.", 400);
  if (!/^[0-9a-f-]{36}$/i.test(timerId)) return fail("timer_id is required.", 400);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return fail("Image too large (1MB max).", 413);
  if (buf.length < 12) return fail("Not a supported image.", 400);
  const kind = MAGIC.find((m) => m.check(new Uint8Array(buf)));
  if (!kind) return fail("Not a supported image (PNG/JPEG/WebP/GIF only).", 400);
  // Polyglot guard (mirrors /api/clans/upload): magic bytes alone don't prove
  // "just an image" - an HTML/JS payload appended after a valid header would
  // otherwise be served from a trusted Supabase origin. Scan head+tail.
  {
    const head = buf.subarray(0, Math.min(buf.length, 2048)).toString("latin1").toLowerCase();
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").toLowerCase();
    if (/<html|<\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*svg|<\?php|javascript\s*:|on\w+\s*=/.test(`${head}\n${tail}`)) {
      return fail("Image contains embedded active content.", 400);
    }
  }

  // The timer must be mine and still open (or just closed; proof lands late).
  const { data: timer } = await supabase
    .from("ghost_timers")
    .select("id,worker_id")
    .eq("id", timerId)
    .maybeSingle();
  if (!timer || (timer as { worker_id: string }).worker_id !== u.id) {
    return fail("Only the worker attaches proof to their own timer.", 403);
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const path = `${u.id}/${timerId}/${sha256}.${kind.ext}`;
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Upload unavailable.", 503);
  }
  const { error: upErr } = await svc.storage.from("ghost-proofs").upload(path, buf, { contentType: kind.mime, upsert: true });
  if (upErr) return fail("Unable to store image.", 500);
  const { data: row, error: rowErr } = await svc
    .from("ghost_proofs")
    .insert({ timer_id: timerId, worker_id: u.id, storage_path: path, sha256, bytes: buf.length, mime: kind.mime, caption })
    .select("id")
    .maybeSingle();
  if (rowErr) return dbFail("api/ghost/proofs", rowErr, "Unable to record proof.");
  // Private bucket: mint a 1-hour signed URL (same discipline as vault +
  // blender) with attachment disposition, so opening it downloads the file
  // instead of rendering bytes inline from a trusted origin. Never a
  // permanent public URL for worker screenshots.
  const { data: signed, error: signErr } = await svc.storage.from("ghost-proofs").createSignedUrl(path, 3600, {
    download: `proof-${sha256.slice(0, 12)}.${kind.ext}`,
  });
  if (signErr || !signed?.signedUrl) return dbFail("api/ghost/proofs", signErr, "Unable to sign proof URL.");
  return ok({ url: signed.signedUrl, expires_in: 3600, proofId: (row as { id?: string } | null)?.id ?? null, sha256 }, 201);
}
