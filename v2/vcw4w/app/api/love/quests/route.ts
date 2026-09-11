import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

// Clan quests — the second 💌 mint source besides daily bonuses.
// GET /api/love/quests?clan_id= — list quests + completions (public).
// POST {action:"create", clan_id, title, reward} — owner/mod creates (1..10 💌).
// POST {action:"complete", quest_id, user_id} — owner/mod marks a member done,
//   minting reward 💌 to their balance + earned counter.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const clanId = new URL(req.url).searchParams.get("clan_id")?.trim() ?? "";
  if (!clanId) return fail("clan_id required.", 400);
  const supabase = await createClient();
  const [{ data: quests }, { data: completions }] = await Promise.all([
    supabase
      .from("clan_quests")
      .select("id,clan_id,title,reward_ll,active,created_at")
      .eq("clan_id", clanId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("clan_quest_completions")
      .select("quest_id,user_id,created_at")
      .limit(500),
  ]);
  const questIds = new Set(((quests ?? []) as { id: string }[]).map((q) => q.id));
  return ok({
    quests: quests ?? [],
    completions: ((completions ?? []) as { quest_id: string }[]).filter((c) => questIds.has(c.quest_id)),
  });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`love-quest:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "").trim().toLowerCase();
  if (action === "create") {
    const clanId = String(input.clan_id ?? "").trim();
    const title = String(input.title ?? "").trim().slice(0, 120);
    const reward = Number(input.reward ?? 0);
    if (!clanId || title.length < 3) return fail("clan_id + title (3..120) required.", 400);
    if (!Number.isInteger(reward) || reward < 1 || reward > 10) return fail("reward must be 1..10 💌.", 400);
    const { data: rpcData, error } = await supabase.rpc("create_clan_quest", {
      p_clan_id: clanId,
      p_title: title,
      p_reward: reward,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/moderator/i.test(msg)) return fail("Only clan owners/mods create quests.", 403);
      if (/invalid/i.test(msg)) return fail("Invalid quest.", 400);
      return fail("Unable to create quest.", 500);
    }
    return ok({ id: rpcData as string }, 201);
  }
  if (action === "complete") {
    const questId = String(input.quest_id ?? "").trim();
    const userId = String(input.user_id ?? "").trim();
    if (!questId || !userId) return fail("quest_id + user_id required.", 400);
    const { error } = await supabase.rpc("complete_clan_quest", { p_quest_id: questId, p_user_id: userId });
    if (error) {
      const msg = String(error.message ?? "");
      if (/moderator/i.test(msg)) return fail("Only clan owners/mods complete quests.", 403);
      if (/already completed/i.test(msg)) return fail("Quest already completed.", 409);
      if (/not found|closed/i.test(msg)) return fail("Quest not available.", 400);
      return fail("Unable to complete quest.", 500);
    }
    return ok({ quest_id: questId, user_id: userId });
  }
  return fail("Invalid action.", 400);
}
