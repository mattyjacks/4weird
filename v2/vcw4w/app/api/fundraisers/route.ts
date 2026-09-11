import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isLaunchCategory, isUuid } from "@/lib/support";

export const dynamic = "force-dynamic";

function rpcStatus(msg: string): number {
  if (/login required/i.test(msg)) return 401;
  if (/not a moderator/i.test(msg)) return 403;
  if (/title required|story required|invalid category|goal must|end date must|creative projects only/i.test(msg)) return 400;
  return 400;
}

// GET /api/fundraisers?category=&status=open; public launch-campaign catalog.
// NOTE: fundraisers are UI-disabled via FUNDRAISERS_ENABLED=false in
// lib/support.ts while compliance is worked out, but this route is
// intentionally left working (not deleted, not 503) so re-enabling is instant.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const url = new URL(req.url);
  const category = isLaunchCategory(url.searchParams.get("category"));
  const supabase = await createClient();
  let q = supabase
    .from("launch_campaigns")
    .select("id,creator_id,clan_id,title,category,goal_coins,status,ends_at,created_at")
    .eq("moderation", "visible")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) return dbFail("api/fundraisers", error);
  // Attach progress per campaign (small catalog page: N+1 is bounded by limit).
  const campaigns = (data ?? []) as { id: string }[];
  const withProgress = await Promise.all(
    campaigns.map(async (c) => {
      const { data: prog } = await supabase.rpc("launch_campaign_progress", { p_campaign_id: c.id });
      return { ...c, progress: prog ?? { raised_gross: 0, backers: 0 } };
    }),
  );
  return ok({ campaigns: withProgress });
}

// POST /api/fundraisers; launch a game/startup campaign.
// { title, story, goal_coins, category, use_of_funds?, clan_id?, ends_at? }
// Intentionally left working while the UI flag disables it (see above).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`fundraisers:${data.user.id}`, 5, 3_600_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const clanId = isUuid(input.clan_id);
  const endsRaw = String(input.ends_at ?? "").trim();
  const { data: rpcData, error } = await supabase.rpc("create_launch_campaign", {
    p_clan_id: clanId || null,
    p_title: String(input.title ?? ""),
    p_story: String(input.story ?? ""),
    p_goal_coins: Number(input.goal_coins),
    p_category: String(input.category ?? ""),
    p_use_of_funds: String(input.use_of_funds ?? ""),
    p_ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
  });
  if (error) return rpcFail("api/fundraisers", error, rpcStatus, "Unable to create campaign.");
  return ok({ campaign: rpcData }, 201);
}
