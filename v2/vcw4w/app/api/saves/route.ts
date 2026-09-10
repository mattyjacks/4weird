import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const slugPattern = /^[a-z0-9-]{1,64}$/;
const maxBytes = 1024 * 1024;

function jsonError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
async function userOrError() { const supabase = await createClient(); const { data, error } = await supabase.auth.getUser(); if (error || !data.user) return { supabase, response: jsonError("Authentication required.", 401) }; return { supabase, user: data.user }; }

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return jsonError("Supabase is not configured.", 503);
  const auth = await userOrError(); if ("response" in auth) return auth.response;
  const game = request.nextUrl.searchParams.get("game"); const slot = request.nextUrl.searchParams.get("slot");
  if (game && !slugPattern.test(game)) return jsonError("Invalid game slug.", 400);
  if (slot && !/^[1-3]$/.test(slot)) return jsonError("Slot must be 1, 2, or 3.", 400);
  let query = auth.supabase.from("game_saves").select("id,game_slug,slot,schema_version,data,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(50);
  if (game) query = query.eq("game_slug", game); if (slot) query = query.eq("slot", Number(slot));
  const { data, error } = await query; if (error) return jsonError("Unable to load saves.", 500); return NextResponse.json({ saves: data ?? [] });
}

export async function PUT(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return jsonError("Supabase is not configured.", 503);
  const auth = await userOrError(); if ("response" in auth) return auth.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be JSON.", 400); }
  if (!body || typeof body !== "object") return jsonError("Request body must be an object.", 400);
  const input = body as Record<string, unknown>; const gameSlug = String(input.game_slug ?? ""); const slot = Number(input.slot); const data = input.data;
  if (!slugPattern.test(gameSlug)) return jsonError("Invalid game slug.", 400);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) return jsonError("Slot must be 1, 2, or 3.", 400);
  if (!data || typeof data !== "object" || Array.isArray(data)) return jsonError("Save data must be a JSON object.", 400);
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > maxBytes) return jsonError("Save data is too large.", 413);
  const { error } = await auth.supabase.from("game_saves").upsert({ user_id: auth.user.id, game_slug: gameSlug, slot, schema_version: Number(input.schema_version) || 1, data }, { onConflict: "user_id,game_slug,slot" });
  if (error) return jsonError("Unable to save game state.", 500); return NextResponse.json({ ok: true });
}
