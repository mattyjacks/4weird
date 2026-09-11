import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function cleanScreenshotUrl(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v || v.length > 8192) return "";
  // Allow: our own https storage URLs, and small client-captured data:image URLs.
  if (v.startsWith("https://")) return v.length <= 2048 ? v : "";
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) {
    return v.length <= 2 * 1024 * 1024 ? v : "";
  }
  return "";
}

// POST /api/time/screenshots - Upload Upwork-style screen capture proof
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
    return fail("imageUrl must be an https URL or a data:image capture.", 400);
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
