import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function isUuid(v: unknown): boolean {
  return /^[0-9a-f-]{36}$/i.test(String(v ?? ""));
}

function statusOf(message: string): number {
  if (/not a moderator|only the clan owner/i.test(message)) return 403;
  if (/limit reached|already a/i.test(message)) return 409;
  return rpcStatus(message);
}

const STRATEGIES = ["oldest_activity_first", "random_chance", "oldest_joined_first", "never_contributed"];

// GET /api/clans/[slug]/scale — public: member count, cap (100k + headroom),
// prune settings, supporter status, tribute status. One round trip for the
// clan scale + commons panel.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const [
    { data: scale, error: scaleError },
    { data: supporters, error: supportersError },
    { data: tribute, error: tributeError },
  ] = await Promise.all([
    supabase.rpc("clan_scale_status", { p_clan: clanId }),
    supabase.rpc("clan_supporter_status", { p_clan: clanId }),
    supabase.rpc("clan_tribute_status", { p_clan: clanId }),
  ]);
  if (scaleError) return rpcFail("api/clans/scale", scaleError, statusOf, "Unable to load scale status.");
  if (supportersError) return rpcFail("api/clans/scale", supportersError, statusOf, "Unable to load supporters.");
  if (tributeError) return rpcFail("api/clans/scale", tributeError, statusOf, "Unable to load tribute status.");
  return ok({ scale, supporters, tribute });
}

// POST /api/clans/[slug]/scale — owner/mod controls.
// { action: "prune-settings", auto_enabled, threshold?, batch_size?, strategy? }
// { action: "prune", strategy?, limit?, user_ids?, dry_run? }
// { action: "headroom", slots } — 10 coins per 1,000 bonus slots.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-scale:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");

  if (action === "prune-settings") {
    const strategy = String(input.strategy ?? "oldest_activity_first");
    if (!STRATEGIES.includes(strategy)) return fail("Unknown pruning strategy.", 400);
    const { data: settings, error } = await supabase.rpc("set_clan_prune_settings", {
      p_clan: clanId,
      p_auto: input.auto_enabled !== false,
      p_threshold: Number(input.threshold ?? 90000),
      p_batch: Number(input.batch_size ?? 500),
      p_strategy: strategy,
    });
    if (error) return rpcFail("api/clans/scale", error, statusOf, "Unable to save prune settings.");
    return ok({ settings });
  }

  if (action === "prune") {
    const strategy = String(input.strategy ?? "oldest_activity_first");
    if (!STRATEGIES.includes(strategy)) return fail("Unknown pruning strategy.", 400);
    const rawIds = Array.isArray(input.user_ids) ? input.user_ids : [];
    const userIds = rawIds.filter(isUuid).slice(0, 200);
    const { data: result, error } = await supabase.rpc("prune_clan_members", {
      p_clan: clanId,
      p_strategy: strategy,
      p_limit: Math.max(1, Math.min(1000, Number(input.limit ?? 500) || 500)),
      p_user_ids: userIds.length ? userIds : null,
      p_dry_run: Boolean(input.dry_run),
    });
    if (error) return rpcFail("api/clans/scale", error, statusOf, "Unable to prune members.");
    return ok({ prune: result });
  }

  if (action === "headroom") {
    const slots = Math.floor(Number(input.slots ?? 0));
    if (!Number.isFinite(slots) || slots < 1000 || slots > 1000000) {
      return fail("slots must be 1000..1000000.", 400);
    }
    const { data: receipt, error } = await supabase.rpc("buy_clan_headroom", {
      p_clan: clanId,
      p_slots: slots,
    });
    if (error) return rpcFail("api/clans/scale", error, statusOf, "Unable to buy headroom.");
    return ok({ headroom: receipt }, 201);
  }

  return fail("Invalid action (prune-settings, prune, headroom).", 400);
}
