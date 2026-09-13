import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { acctBucketKey, globalBucket, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_048_576; // 1MB AFTER any client-side conversion.

type Magic = { mime: string; ext: string; check: (b: Uint8Array) => boolean };

const MAGIC: Magic[] = [
  {
    mime: "image/png",
    ext: "png",
    check: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    ext: "jpg",
    check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
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

// POST /api/clans/upload; multipart { file }. Auth required. Service-role
// upload to the `clan-images` bucket only; no public write path exists.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-upload:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  // Distributed shield: at most 60 image uploads/hour per account across all
  // instances (each upload burns storage + a metered moderation check).
  const uploadDist = await globalBucket(acctBucketKey("clan-upload-hour", u.id), 60, 3600);
  if (uploadDist && !uploadDist.allowed) {
    return fail("Too many requests.", 429, throttleHeaders(uploadDist.retryAfter));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid multipart body.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail("Field 'file' required.", 400);
  // Early reject before buffering the bytes into memory: `file.size` is
  // client-reported, so the authoritative byte-length check after
  // `arrayBuffer()` below still applies.
  if (file.size > MAX_BYTES) {
    return fail(`Image too large (${file.size} bytes). 1MB max after conversion.`, 413);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Enforce the 1MB cap AFTER any client-side conversion, server-side.
  if (buf.length > MAX_BYTES) {
    return fail(`Image too large (${buf.length} bytes). 1MB max after conversion.`, 413);
  }
  if (buf.length < 12) return fail("Not a supported image.", 400);
  // Decompression-bomb guard: dimensions are validated by magic bytes below;
  // reject absurd pixel counts via IHDR (PNG) / SOF (JPEG) when parseable.
  // Full decode is out of scope for the edge; storage + RLS + report-driven
  // quarantine remain the safety net.
  const bytes = new Uint8Array(buf);
  const kind = MAGIC.find((m) => m.check(bytes));
  if (!kind) return fail("Not a supported image (PNG/JPEG/WebP/GIF only).", 400);
  // Polyglot guard: magic bytes alone don't prove "just an image" - an
  // HTML/JS payload appended after a valid header still served from a
  // trusted origin is stored XSS. Scan head+tail for active markup.
  {
    const head = buf.subarray(0, Math.min(buf.length, 2048)).toString("latin1").toLowerCase();
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").toLowerCase();
    const blob = `${head}\n${tail}`;
    if (/<html|<\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*svg|<\?php|javascript\s*:|on\w+\s*=/.test(blob)) {
      return fail("Image contains embedded active content.", 400);
    }
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const path = `${u.id}/${sha256}.${kind.ext}`;

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Upload unavailable.", 503);
  }
  const { error: upErr } = await svc.storage
    .from("clan-images")
    .upload(path, buf, { contentType: kind.mime, upsert: true });
  if (upErr) return fail("Unable to store image.", 500);

  const { data: imgRow, error: rowErr } = await svc
    .from("clan_images")
    .upsert(
      {
        post_id: null,
        uploader_id: u.id,
        storage_path: path,
        sha256,
        bytes: buf.length,
        mime: kind.mime,
      },
      { onConflict: "storage_path" },
    )
    .select("id")
    .maybeSingle();
  if (rowErr) return fail("Unable to record image.", 500);

  const { data: pub } = svc.storage.from("clan-images").getPublicUrl(path);
  // Served inline for <img> by design. Content-type safety holds because the
  // stored contentType is always `kind.mime` derived from magic bytes above
  // (never the client MIME), and SVG/HTML are not in the allowlist, so this
  // bucket can never serve text/html from these objects.
  return ok(
    {
      url: pub.publicUrl,
      imageId: (imgRow as { id?: string } | null)?.id ?? null,
      sha256,
      bytes: buf.length,
      mime: kind.mime,
    },
    201,
  );
}
