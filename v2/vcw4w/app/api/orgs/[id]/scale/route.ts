import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function idFrom(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  // /api/orgs/[id]/scale → the segment before "scale".
  const i = parts.lastIndexOf("scale");
  return parts[i - 1] ?? "";
}

function statusOf(message: string): number {
  if (/forbidden|only the org creator/i.test(message)) return 403;
  if (/limit reached|already a member/i.test(message)) return 409;
  return rpcStatus(message);
}

const STRATEGIES = ["oldest_activity_first", "random_chance", "oldest_joined_first", "never_contributed"];

function isUuid(v: unknown): boolean {
  return /^[0-9a-f-]{36}$/i.test(String(v ?? ""));
}

/**
 * GET /api/orgs/[id]/scale - member count, effective cap (10k + headroom,
 * or purchased seats on self-hosted servers), prune settings. Members only.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!isUuid(orgId)) return fail("Invalid org.", 400);
  const { data: scale, error } = await supabase.rpc("org_scale_status", { p_org: orgId });
  if (error) return rpcFail("api/orgs/scale", error, statusOf, "Unable to load scale status.");
  return ok({ scale });
}

/**
 * POST /api/orgs/[id]/scale - creator controls for big orgs.
 * { action: "prune-settings", auto_enabled, threshold?, batch_size?, strategy? }
 * { action: "prune", strategy?, limit?, user_ids?, dry_run? } - manual prune
 *   (dry_run previews victims in strategy order without deleting).
 * { action: "headroom", slots } - prepay cloud compute: 10 coins/100 slots.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!isUuid(orgId)) return fail("Invalid org.", 400);
  const throttle = rateLimit(`org-scale:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
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
    const { data: settings, error } = await supabase.rpc("set_org_prune_settings", {
      p_org: orgId,
      p_auto: Boolean(input.auto_enabled),
      p_threshold: Number(input.threshold ?? 9000),
      p_batch: Number(input.batch_size ?? 200),
      p_strategy: strategy,
    });
    if (error) return rpcFail("api/orgs/scale", error, statusOf, "Unable to save prune settings.");
    return ok({ settings });
  }

  if (action === "prune") {
    const strategy = String(input.strategy ?? "oldest_activity_first");
    if (!STRATEGIES.includes(strategy)) return fail("Unknown pruning strategy.", 400);
    const rawIds = Array.isArray(input.user_ids) ? input.user_ids : [];
    const userIds = rawIds.filter(isUuid).slice(0, 200);
    const { data: result, error } = await supabase.rpc("prune_org_members", {
      p_org: orgId,
      p_strategy: strategy,
      p_limit: Math.max(1, Math.min(1000, Number(input.limit ?? 200) || 200)),
      p_user_ids: userIds.length ? userIds : null,
      p_dry_run: Boolean(input.dry_run),
    });
    if (error) return rpcFail("api/orgs/scale", error, statusOf, "Unable to prune members.");
    return ok({ prune: result });
  }

  if (action === "headroom") {
    const slots = Math.floor(Number(input.slots ?? 0));
    if (!Number.isFinite(slots) || slots < 100 || slots > 100000) {
      return fail("slots must be 100..100000.", 400);
    }
    const { data: receipt, error } = await supabase.rpc("buy_org_headroom", {
      p_org: orgId,
      p_slots: slots,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/self-hosted orgs grow by seats/i.test(msg)) {
        return fail("Self-hosted orgs grow by purchased seats, not coin headroom.", 400);
      }
      return rpcFail("api/orgs/scale", error, statusOf, "Unable to buy headroom.");
    }
    return ok({ headroom: receipt }, 201);
  }

  return fail("Invalid action (prune-settings, prune, headroom).", 400);
}
