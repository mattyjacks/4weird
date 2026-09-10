import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getGame } from "@/content/games";

export const dynamic = "force-dynamic";
const slugPattern = /^[a-z0-9-]{1,64}$/;
const maxBytes = 1024 * 1024;

function jsonError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
async function userOrError() { const supabase = await createClient(); const { data, error } = await supabase.auth.getUser(); if (error || !data.user) return { supabase, response: jsonError("Authentication required.", 401) }; return { supabase, user: data.user }; }

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return jsonError("Supabase is not configured.", 503);
  const auth = await userOrError(); if ("response" in auth) return auth.response;
  const game = request.nextUrl.searchParams.get("game"); const slot = request.nextUrl.searchParams.get("slot");
  if (game && (!slugPattern.test(game) || !getGame(game))) return jsonError("Unknown game slug.", 400);
  if (slot && !/^[1-3]$/.test(slot)) return jsonError("Slot must be 1, 2, or 3.", 400);
  let query = auth.supabase.from("game_saves").select("id,game_slug,slot,schema_version,data,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(50);
  if (game) query = query.eq("game_slug", game); if (slot) query = query.eq("slot", Number(slot));
  const { data, error } = await query; if (error) return jsonError("Unable to load saves.", 500); return NextResponse.json({ saves: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return jsonError("Supabase is not configured.", 503);
  const auth = await userOrError(); if ("response" in auth) return auth.response;
  const throttle = rateLimit(`save-put:${auth.user.id}`, 30);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many save attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } });
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be JSON.", 400); }
  if (!body || typeof body !== "object") return jsonError("Request body must be an object.", 400);
  const input = body as Record<string, unknown>; const gameSlug = String(input.game_slug ?? ""); const slot = Number(input.slot); const schemaVersion = input.schema_version === undefined ? 1 : Number(input.schema_version); const data = input.data;
  if (!slugPattern.test(gameSlug) || !getGame(gameSlug)) return jsonError("Unknown game slug.", 400);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) return jsonError("Slot must be 1, 2, or 3.", 400);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 1000) return jsonError("Invalid save schema version.", 400);
  if (!data || typeof data !== "object" || Array.isArray(data)) return jsonError("Save data must be a JSON object.", 400);
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > maxBytes) return jsonError("Save data is too large.", 413);
  const { data: saved, error } = await auth.supabase.from("game_saves").upsert({ user_id: auth.user.id, game_slug: gameSlug, slot, schema_version: schemaVersion, data }, { onConflict: "user_id,game_slug,slot" }).select("id,game_slug,slot,schema_version,created_at,updated_at").single();
  if (error) return jsonError("Unable to save game state.", 500);
  return NextResponse.json({ ok: true, save: saved }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return jsonError("Supabase is not configured.", 503);
  const auth = await userOrError(); if ("response" in auth) return auth.response;
  const throttle = rateLimit(`save-delete:${auth.user.id}`, 10);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many reset attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } });
  const game = request.nextUrl.searchParams.get("game") ?? "";
  const slot = Number(request.nextUrl.searchParams.get("slot") ?? "1");
  if (!slugPattern.test(game) || !getGame(game)) return jsonError("Unknown game slug.", 400);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) return jsonError("Slot must be 1, 2, or 3.", 400);
  const { error } = await auth.supabase.from("game_saves").delete().eq("user_id", auth.user.id).eq("game_slug", game).eq("slot", slot);
  if (error) return jsonError("Unable to reset game save.", 500);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
