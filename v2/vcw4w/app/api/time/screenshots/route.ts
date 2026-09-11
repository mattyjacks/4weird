import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/time/screenshots - Upload Upwork-style screen capture proof
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-screenshot:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { entryId, imageUrl, isBlurred = false, activityLevel = 100, memo } = body || {};

  if (!entryId || !imageUrl) {
    return fail("entryId and imageUrl are required.", 400);
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
      image_url: imageUrl,
      is_blurred: !!isBlurred,
      activity_level: Math.min(Math.max(Number(activityLevel) || 100, 0), 100),
      memo: memo ? String(memo).slice(0, 200) : null,
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time/screenshots", error, "Failed to save screenshot.");

  return ok({ screenshot }, 201);
}
