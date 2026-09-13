import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, isSlug } from "@/lib/validate";
import { houseCreatorUserId } from "@/lib/support";

export const dynamic = "force-dynamic";

/**
 * GET /api/games/creator?game_slug=<slug>; who to tip for a game.
 * Resolves the mapped developer (game_rates.dev_user_id first, then
 * game_developers) plus their active support tiers, so game pages can tip
 * and subscribe without pasting a user ID by hand. Public read; guests get
 * the same resolution (tipping itself still needs login at POST /api/support/*).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) {
    return ok({ game_slug: "", dev_user_id: null, developers: [], verified: null, tiers: [], source: null });
  }
  const rl = rateLimit(`game-creator:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const url = new URL(req.url);
  const slug = isSlug(url.searchParams.get("game_slug") ?? url.searchParams.get("game"));
  if (!slug) return fail("Invalid game_slug.", 400);
  const supabase = await createClient();

  let devUserId: string | null = null;
  let developers: string[] = [];

  const { data: rate, error: rateError } = await supabase
    .from("game_rates")
    .select("dev_user_id")
    .eq("game_slug", slug)
    .maybeSingle();
  if (rateError) return dbFail("api/games/creator", rateError, "Unable to load game creator.");
  if (rate?.dev_user_id) devUserId = String(rate.dev_user_id);

  // game_developers is authenticated-read; guests get [] here, which is fine
  // because game_rates.dev_user_id already covers the primary mapping.
  const { data: devs } = await supabase.from("game_developers").select("user_id").eq("game_slug", slug);
  if (devs && devs.length > 0) {
    developers = devs.map((d) => String(d.user_id));
    if (!devUserId) devUserId = developers[0];
  }

  let tiers: unknown[] = [];
  let verified: boolean | null = null;
  // Unmapped games tip the house creator (Matt@MattyJacks.com via
  // HOUSE_CREATOR_USER_ID). Empty env = no fallback; the widget renders
  // the manual-ID form instead of a bad recipient.
  let source: "mapped" | "house" | null = devUserId ? "mapped" : null;
  if (!devUserId) {
    const house = houseCreatorUserId();
    if (house) {
      devUserId = house;
      source = "house";
    }
  }
  if (devUserId) {
    const { data: tierRows, error: tierError } = await supabase
      .from("support_tiers")
      .select("id,owner_user_id,clan_id,title,blurb,coins_monthly,active,created_at")
      .eq("owner_user_id", devUserId)
      .eq("active", true)
      .order("coins_monthly", { ascending: true })
      .limit(20);
    if (tierError) return dbFail("api/games/creator", tierError, "Unable to load creator tiers.");
    tiers = tierRows ?? [];
    // profiles is self-read; a non-owner read returns null -> unknown, not unverified.
    const { data: profile } = await supabase.from("profiles").select("is_verified").eq("id", devUserId).maybeSingle();
    if (profile && typeof profile.is_verified === "boolean") verified = profile.is_verified;
  }

  return ok({ game_slug: slug, dev_user_id: devUserId, developers, verified, tiers, source });
}
