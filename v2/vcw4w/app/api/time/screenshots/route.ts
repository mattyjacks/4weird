import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, supabaseUrl } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Stored image URLs render in the work diary, so arbitrary external https
// URLs would be a tracking/content-spoofing vector (same stance as clan
// posts: upload-issued URLs only). Accept our own Supabase storage URLs
// plus small client-captured data:image URLs; nothing else.
function isOwnStorageUrl(v: string): boolean {
  try {
    const parsed = new URL(v);
    const base = (supabaseUrl() ?? "").trim();
    if (!base) return false;
    if (parsed.host !== new URL(base).host) return false;
    return /\/storage\/v1\/object\//.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

function cleanScreenshotUrl(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v || v.length > 8192) return "";
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) {
    return v.length <= 2 * 1024 * 1024 ? v : "";
  }
  if (v.startsWith("https://") && v.length <= 2048 && isOwnStorageUrl(v)) return v;
  return "";
}

// POST /api/time/screenshots - Upload work-diary screen capture proof
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-screenshot:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { entryId, imageUrl, isBlurred = false, activityLevel = 100, memo } =
    (body as Record<string, unknown>) || {};

  if (!entryId || !imageUrl) {
    return fail("entryId and imageUrl are required.", 400);
  }
  const safeImageUrl = cleanScreenshotUrl(imageUrl);
  if (!safeImageUrl) {
    return fail("imageUrl must be a data:image capture or your own storage URL.", 400);
  }

  // Ensure user owns the entry
  const { data: entry } = await supabase
    .from("timer_entries")
    .select("id, user_id")
    .eq("id", entryId)
    .single();

  if (!entry || entry.user_id !== u.id) {
    return fail("Timer entry not found or unauthorized.", 403);
  }

  const { data: screenshot, error } = await supabase
    .from("timer_screenshots")
    .insert({
      entry_id: entryId,
      user_id: u.id,
      image_url: safeImageUrl,
      is_blurred: !!isBlurred,
      activity_level: Math.min(Math.max(Number(activityLevel) || 100, 0), 100),
      memo: memo ? String(memo).slice(0, 200) : null,
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time/screenshots", error, "Failed to save screenshot.");

  return ok({ screenshot }, 201);
}
