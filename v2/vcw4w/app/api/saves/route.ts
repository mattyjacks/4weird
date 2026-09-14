import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isSaveKind, isSlug, isSlot, jsonBytes } from "@/lib/validate";


const slugPattern = /^[a-z0-9-]{1,64}$/;
const maxBytes = 1024 * 1024;

// Strict plain-type allowlist for save payloads (DS-SEC-GAMES-01).
const SAVE_MAX_DEPTH = 10;
const SAVE_MAX_KEYS = 1000;
const SAVE_MAX_ARRAY = 10000;
const SAVE_MAX_STRING = 65536;
const SAVE_MAX_KEY_LEN = 128;

function isPlainSaveKey(key: string): boolean {
  if (key.length === 0 || key.length > SAVE_MAX_KEY_LEN) return false;
  if (key === "__proto__" || key === "constructor" || key === "prototype") return false;
  return true;
}

function isPlainSaveValue(value: unknown, depth: number, budget: { keys: number }): boolean {
  if (value === null) return true;
  const t = typeof value;
  if (t === "boolean") return true;
  if (t === "number") return Number.isFinite(value);
  if (t === "string") return (value as string).length <= SAVE_MAX_STRING;
  if (depth >= SAVE_MAX_DEPTH) return false;
  if (Array.isArray(value)) {
    if (value.length > SAVE_MAX_ARRAY) return false;
    for (const item of value) {
      if (!isPlainSaveValue(item, depth + 1, budget)) return false;
    }
    return true;
  }
  if (t === "object") {
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return false;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!isPlainSaveKey(k)) return false;
      budget.keys += 1;
      if (budget.keys > SAVE_MAX_KEYS) return false;
      if (!isPlainSaveValue(v, depth + 1, budget)) return false;
    }
    return true;
  }
  // undefined, function, symbol, bigint: never plain JSON game state.
  return false;
}

function isPlainSaveData(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  try {
    return isPlainSaveValue(data, 0, { keys: 0 });
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  // An unreadable session (bad/expired cookie) is "logged out", not a 500:
  // keep the failure a stable JSON 401 instead of an unhandled throw.
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return fail("Authentication required.", 401);
  }
  let u: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    u = data?.user ?? null;
  } catch {
    return fail("Authentication required.", 401);
  }
  if (!u) return fail("Authentication required.", 401);
  const rl = rateLimit(`save-get:${u.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Too many requests.", 429);
  const q = new URL(req.url).searchParams;
  const game = q.get("game");
  const slot = q.get("slot");
  const kindParam = q.get("kind");
  let kindFilter: "manual" | "auto" | null = null;
  if (kindParam !== null) {
    kindFilter = isSaveKind(kindParam);
    if (kindFilter === null) return fail("Invalid save kind.", 400);
  }
  let query = supabase
    .from("game_saves")
    .select("id,game_slug,slot,kind,schema_version,data,created_at,updated_at")
    .eq("user_id", u.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (game) {
    if (!slugPattern.test(game)) return fail("Invalid game slug.", 400);
    query = query.eq("game_slug", game);
  }
  if (slot) {
    if (!/^[0-3]$/.test(slot)) return fail("Invalid slot.", 400);
    query = query.eq("slot", Number(slot));
  }
  if (kindFilter !== null) {
    query = query.eq("kind", kindFilter);
  }
  try {
    const { data: rows, error } = await query;
    if (error) return dbFail("api/saves", error);
    return ok({ saves: rows ?? [] });
  } catch (error) {
    return dbFail("api/saves", error);
  }
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
  const kind: "manual" | "auto" | null =
    input.kind === undefined ? "manual" : isSaveKind(input.kind);
  const schemaVersion = input.schema_version === undefined ? 1 : Number(input.schema_version);
  if (!slug) return fail("Invalid game slug.", 400);
  if (slot === null) return fail("Slot must be 0, 1, 2, or 3.", 400);
  if (kind === null) return fail("Invalid save kind.", 400);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 1000) {
    return fail("Invalid save schema version.", 400);
  }
  const saveData = input.data;
  if (!saveData || typeof saveData !== "object" || Array.isArray(saveData)) {
    return fail("Save data must be a JSON object.", 400);
  }
  if (jsonBytes(saveData) > maxBytes) return fail("Save data is too large.", 413);
  // Saves must be plain game state: a strict allowlist of JSON value types
  // (null, boolean, finite number, length-capped string, array, plain object)
  // with bounded depth, key counts, and key shapes. Anything else (class
  // instances cannot survive JSON, but undefined/functions/symbols/bigints,
  // __proto__/constructor/prototype keys, oversized strings, or runaway
  // nesting) is rejected. This replaces the old content blocklist: markup or
  // handler-looking strings are inert JSON data and are rendered only through
  // safe sinks, so shape enforcement — not pattern matching — is the guard.
  // (DS-SEC-GAMES-01)
  if (!isPlainSaveData(saveData)) {
    return fail("Save data must be plain JSON game state.", 400);
  }
  // Cheat marking is irreversible per save slot. A later client save cannot
  // erase it after a cheat was used, even if the browser was tampered with.
  // Check BOTH kinds (manual + auto): set_cheat_setting only marks the
  // manual row, so a kind-scoped read would let the auto companion launder
  // a cheated slot. Cross-check cheat_settings.cheated_at too (a fresh
  // cheat toggle with no save row yet still brands the slot).
  const { data: existingRows, error: existingError } = await supabase
    .from("game_saves")
    .select("data,kind")
    .eq("user_id", u.id)
    .eq("game_slug", slug)
    .eq("slot", slot);
  if (existingError) return dbFail("api/saves", existingError);
  const { data: cheatRow } =
    slot === 0
      ? { data: null }
      : await supabase
          .from("cheat_settings")
          .select("cheated_at")
          .eq("user_id", u.id)
          .eq("game_slug", slug)
          .eq("slot", slot)
          .maybeSingle();
  const existing = (existingRows as { data?: { cheat_mode?: boolean } }[] | null)?.find(
    (r) => r?.data?.cheat_mode,
  ) ?? null;
  const cheatBranded = Boolean(
    (cheatRow as { cheated_at?: string | null } | null)?.cheated_at,
  );
  const dataObj = saveData as Record<string, unknown>;
  if (slot === 0) {
    // Slot 0 is the cheat-proof safety slot: it can never be marked
    // cheat-moded, so any client-supplied marker is stripped. (A database
    // trigger enforces the same invariant for non-API writes.)
    delete dataObj.cheat_mode;
  } else if (
    (existing as { data?: { cheat_mode?: boolean } } | null)?.data?.cheat_mode ||
    cheatBranded
  ) {
    dataObj.cheat_mode = true;
  }
  // user_id comes from the session, never the body; RLS re-checks it.
  const { data: saved, error } = await supabase
    .from("game_saves")
    .upsert(
      { user_id: u.id, game_slug: slug, slot, kind, schema_version: schemaVersion, data: dataObj },
      { onConflict: "user_id,game_slug,slot,kind" },
    )
    .select("id,game_slug,slot,kind,schema_version,created_at,updated_at")
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
