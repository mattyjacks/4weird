import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isSlug, isSlot, jsonBytes } from "@/lib/validate";

export const dynamic = "force-dynamic";

const slugPattern = /^[a-z0-9-]{1,64}$/;
const maxBytes = 1024 * 1024;

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const q = new URL(req.url).searchParams;
  const game = q.get("game");
  const slot = q.get("slot");
  let query = supabase
    .from("game_saves")
    .select("id,game_slug,slot,schema_version,data,created_at,updated_at")
    .eq("user_id", u.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (game) {
    if (!slugPattern.test(game)) return fail("Invalid game slug.", 400);
    query = query.eq("game_slug", game);
  }
  if (slot) {
    if (!/^[1-3]$/.test(slot)) return fail("Invalid slot.", 400);
    query = query.eq("slot", Number(slot));
  }
  const { data: rows, error } = await query;
  if (error) return dbFail("api/saves", error);
  return ok({ saves: rows ?? [] });
}

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const throttle = rateLimit(`save-put:${u.id}`, 30);
  if (!throttle.allowed) {
    return fail("Too many save attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body must be JSON.", 400);
  }
  if (!body || typeof body !== "object") return fail("Request body must be an object.", 400);
  const input = body as Record<string, unknown>;
  const slug = isSlug(input.game_slug);
  const slot = isSlot(input.slot);
  const schemaVersion = input.schema_version === undefined ? 1 : Number(input.schema_version);
  if (!slug) return fail("Invalid game slug.", 400);
  if (!slot) return fail("Slot must be 1, 2, or 3.", 400);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 1000) {
    return fail("Invalid save schema version.", 400);
  }
  const saveData = input.data;
  if (!saveData || typeof saveData !== "object" || Array.isArray(saveData)) {
    return fail("Save data must be a JSON object.", 400);
  }
  if (jsonBytes(saveData) > maxBytes) return fail("Save data is too large.", 413);
  // Cheat marking is irreversible per save slot. A later client save cannot
  // erase it after a cheat was used, even if the browser was tampered with.
  const { data: existing, error: existingError } = await supabase
    .from("game_saves")
    .select("data")
    .eq("user_id", u.id)
    .eq("game_slug", slug)
    .eq("slot", slot)
    .maybeSingle();
  if (existingError) return dbFail("api/saves", existingError);
  const dataObj = saveData as Record<string, unknown>;
  if ((existing as { data?: { cheat_mode?: boolean } } | null)?.data?.cheat_mode) {
    dataObj.cheat_mode = true;
  }
  // user_id comes from the session, never the body; RLS re-checks it.
  const { data: saved, error } = await supabase
    .from("game_saves")
    .upsert(
      { user_id: u.id, game_slug: slug, slot, schema_version: schemaVersion, data: dataObj },
      { onConflict: "user_id,game_slug,slot" },
    )
    .select("id,game_slug,slot,schema_version,created_at,updated_at")
    .single();
  if (error) return dbFail("api/saves", error, "Unable to save game state.");
  return ok({ ok: true, save: saved });
}

export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Authentication required.", 401);
  const throttle = rateLimit(`save-delete:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many reset attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  // Deletes are revoked at the database layer (cheat-marker invariant): a
  // cheated save must never be laundered via delete/recreate, so the client
  // cannot delete saves at all.
  return fail("Cloud saves cannot be reset from the client.", 410);
}
