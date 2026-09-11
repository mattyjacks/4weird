import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanLoadoutIds, validateLoadout } from "@/lib/cosmetics";
import type { AvatarKind } from "@/components/buddy/avatars/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/cosmetics/equip — equip owned cosmetics (free, looks-only).
 * Body: { loadout: { hat?, glasses?, outfit?, accessory?, effect? }, kind? }.
 * Fail-closed: every id must be owned + fit the avatar kind. Pre-migration
 * the wardrobe is unavailable (503, nothing equipped blindly).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`cosmetics:equip:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const kindRaw = String(input.kind ?? input.avatar ?? "cube").toLowerCase();
  const kind: AvatarKind = kindRaw === "cloud" ? "cloud" : kindRaw === "anime" ? "anime" : "cube";
  const loadout = cleanLoadoutIds(input.loadout);
  try {
    const { data: owned, error: ownErr } = await supabase
      .from("user_cosmetics")
      .select("item_id")
      .eq("user_id", data.user.id);
    if (ownErr) throw ownErr;
    const ids = ((owned ?? []) as { item_id: string }[]).map((r) => r.item_id);
    const checked = validateLoadout(loadout, ids, kind);
    if (!checked.ok) return fail(checked.error, 400);
    const { error: upErr } = await supabase.from("user_loadouts").upsert(
      { user_id: data.user.id, items: checked.ids, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (upErr) throw upErr;
    return ok({ loadout, ids: checked.ids, kind });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "42P01") return fail("Wardrobe is not available on this deploy yet.", 503);
    return dbFail("api/cosmetics/equip", error, "Unable to save loadout.");
  }
}
