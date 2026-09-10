import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { data: rows, error } = await supabase
    .from("game_stat_events")
    .select("active_seconds,actions,kills,deaths")
    .eq("user_id", u.id)
    .limit(10000);
  if (error) return dbFail("api/stats", error);
  const totals = ((rows as { active_seconds: number; actions: number; kills: number; deaths: number }[] | null) ?? []).reduce(
    (x, v) => ({
      sec: x.sec + v.active_seconds,
      actions: x.actions + v.actions,
      kills: x.kills + v.kills,
      deaths: x.deaths + v.deaths,
    }),
    { sec: 0, actions: 0, kills: 0, deaths: 0 },
  );
  const { data: average } = await supabase.rpc("community_stat_averages");
  return ok({
    stats: {
      playtime: `${Math.floor(totals.sec / 3600)}h ${Math.floor((totals.sec % 3600) / 60)}m`,
      kills: totals.kills,
      deaths: totals.deaths,
      actions_per_minute: totals.sec ? Math.round((totals.actions / totals.sec) * 60 * 10) / 10 : 0,
    },
    average: Array.isArray(average) ? average[0] : (average ?? {}),
  });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`stats:${u.id}`, 60);
  if (!throttle.allowed) {
    return fail("Too many telemetry events. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const game = isSlug(input.game_slug);
  const n = (k: string): number => (Number.isInteger(input[k]) ? Number(input[k]) : -1);
  if (
    !game ||
    n("active_seconds") < 0 ||
    n("active_seconds") > 3600 ||
    n("actions") < 0 ||
    n("actions") > 100000 ||
    n("kills") < 0 ||
    n("kills") > 100000 ||
    n("deaths") < 0 ||
    n("deaths") > 100000
  ) {
    return fail("Invalid telemetry.", 400);
  }
  const { error } = await supabase.from("game_stat_events").insert({
    user_id: u.id,
    game_slug: game,
    active_seconds: n("active_seconds"),
    actions: n("actions"),
    kills: n("kills"),
    deaths: n("deaths"),
  });
  if (error) return fail("Unable to record stats.", 500);
  return ok({});
}
