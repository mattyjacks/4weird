import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanLoadoutIds } from "@/lib/cosmetics";

export const dynamic = "force-dynamic";

/**
 * GET /api/cosmetics/inventory — owned item ids + equipped loadout.
 * Pre-migration (tables missing) returns an empty wardrobe with
 * pendingMigration:true instead of failing the widget.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`cosmetics:inventory:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  try {
    const { data: owned, error: ownErr } = await supabase
      .from("user_cosmetics")
      .select("item_id")
      .eq("user_id", data.user.id);
    if (ownErr) throw ownErr;
    const { data: loadout, error: loadErr } = await supabase
      .from("user_loadouts")
      .select("items")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (loadErr) throw loadErr;
    const ids = ((owned ?? []) as { item_id: string }[]).map((r) => r.item_id);
    return ok({
      owned: ids,
      loadout: cleanLoadoutIds((loadout as { items?: unknown } | null)?.items ?? {}),
      pendingMigration: false,
    });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "42P01") {
      return ok({ owned: [], loadout: cleanLoadoutIds({}), pendingMigration: true });
    }
    return dbFail("api/cosmetics/inventory", error, "Unable to load wardrobe.");
  }
}
