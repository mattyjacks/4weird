import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { exceedsBodyLimit, isUuid } from "@/lib/validate";
import { cleanKeyLabel } from "@/lib/bot-validate";
import { botTesterBlocked, isBotTester, privilegedSessionBlocked } from "@/lib/bot-auth";
import {
  cleanBudgetCoins,
  cleanExpiryIso,
  cleanIpList,
  cleanLowBalanceFloor,
  cleanLowBalancePct,
  cleanMaxUses,
  cleanScopesSubset,
  cleanWarnPct,
  isIpMode,
  isLoggingMode,
  lowBalanceTripLine,
} from "@/lib/bot-key-policy";
import { KEY_POLICY_COLUMNS } from "../route";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;

type Ctx = { params: Promise<{ id: string }> };

async function ownerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// GET /api/bot/keys/[id]; one key's full policy + owner balance context.
// Supabase-login auth, owner only.
export async function GET(_req: Request, ctx: Ctx) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const keyId = (await ctx.params).id;
  if (!isUuid(keyId)) return fail("Invalid key.", 400);
  const uid = await ownerId();
  if (!uid) return fail("Login required.", 401);
  const getThrottle = rateLimit(`bot-keys-get:${uid}`, 30);
  if (!getThrottle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(getThrottle.retryAfter),
    });
  }
  try {
    const db = serviceClient();
    const { data: keyData, error } = await db
      .from("bot_api_keys")
      .select(KEY_POLICY_COLUMNS)
      .eq("id", keyId)
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return dbFail("api/bot/keys/[id]", error, "Unable to load key.");
    if (!keyData) return fail("Key not found.", 404);
    // Best-effort owner balance for the hard-stop meter (never fatal).
    // Server-side aggregate first (no LIMIT truncation); legacy scan fallback.
    let balance: number | null = null;
    try {
      const aggregate = await db
        .from("coin_ledger")
        .select("total:sum(delta)")
        .eq("user_id", uid)
        .single();
      const total = Number((aggregate.data as { total?: unknown } | null)?.total);
      if (!aggregate.error && Number.isFinite(total)) {
        balance = Math.round(total * 100) / 100;
      } else {
        throw new Error("aggregate unavailable");
      }
    } catch {
      try {
        const { data: ledger } = await db
          .from("coin_ledger")
          .select("delta")
          .eq("user_id", uid)
          .limit(5000);
        let sum = 0;
        for (const r of ((ledger ?? []) as unknown as { delta: unknown }[])) sum += Number(r.delta) || 0;
        balance = Math.round(sum * 100) / 100;
      } catch {
        balance = null;
      }
    }
    const k = keyData as unknown as Record<string, unknown>;
    const trip =
      k.hard_stop_enabled === true
        ? lowBalanceTripLine(Number(k.low_balance_floor) || 0, Number(k.low_balance_pct) || 0)
        : null;
    return ok({ key: keyData, balance, hardStopTripLine: trip });
  } catch (error) {
    return dbFail("api/bot/keys/[id]", error, "Unable to load key.");
  }
}

// PATCH /api/bot/keys/[id]; update label, lifetime/daily budgets, warn %,
// expiry, max uses, hard-stop guard, IP lists, scopes, logging, retention,
// note. Only provided fields change. Supabase-login auth, owner only.
export async function PATCH(req: Request, ctx: Ctx) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  // Bot tester sessions can play but never reconfigure keys.
  if (isBotTester(req)) return fail(botTesterBlocked(), 403);
  // Key reconfiguration is privileged like issuance: automation never
  // widens scopes, budgets, or lifetimes, even when logged in.
  const botBlock = await requireHuman(req, "PATCH /api/bot/keys/[id]");
  if (botBlock) return botBlock;
  const keyId = (await ctx.params).id;
  if (!isUuid(keyId)) return fail("Invalid key.", 400);
  const uid = await ownerId();
  if (!uid) return fail("Login required.", 401);
  {
    const blocked = privilegedSessionBlocked(req, uid);
    if (blocked) return fail(blocked, blocked === botTesterBlocked() ? 403 : 401);
  }
  const throttle = rateLimit(`bot-keys-patch:${uid}`, 20);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Request is too large.", 413);
  const input = (body ?? {}) as Record<string, unknown>;
  if (Object.keys(input).length === 0) return fail("Nothing to update.", 400);

  const patch: Record<string, unknown> = {};
  const has = (k: string) => input[k] !== undefined;

  if (has("label")) {
    const label = cleanKeyLabel(input.label);
    if (!label) return fail("Label needs 1-40 characters.", 400);
    patch.label = label;
  }
  if (has("expires_at") || has("expiresAt") || has("clear_expiry") || has("clearExpiry")) {
    const clear = Boolean(input.clear_expiry ?? input.clearExpiry ?? false);
    if (clear) {
      patch.expires_at = null;
    } else {
      const iso = cleanExpiryIso(input.expires_at ?? input.expiresAt ?? "");
      if (iso === null) return fail("Expiry must be a future date (max 5 years).", 400);
      if (iso) patch.expires_at = iso;
    }
  }
  if (has("max_uses") || has("maxUses")) {
    const v = cleanMaxUses(input.max_uses ?? input.maxUses);
    if (v < 0) return fail("max_uses must be 0 (unlimited) to 10,000,000.", 400);
    patch.max_uses = v;
  }
  if (has("lifetime_budget") || has("lifetimeBudget")) {
    const v = cleanBudgetCoins(input.lifetime_budget ?? input.lifetimeBudget);
    if (v < 0) return fail("lifetime_budget must be 0-1,000,000.", 400);
    patch.lifetime_budget = v;
    patch.warn_sent = false;
  }
  if (has("daily_budget") || has("dailyBudget")) {
    const v = cleanBudgetCoins(input.daily_budget ?? input.dailyBudget);
    if (v < 0) return fail("daily_budget must be 0-1,000,000.", 400);
    patch.daily_budget = v;
    patch.warn_sent = false;
  }
  if (has("spend_warn_at_pct") || has("spendWarnAtPct")) {
    const v = cleanWarnPct(input.spend_warn_at_pct ?? input.spendWarnAtPct);
    if (v < 0) return fail("spend_warn_at_pct must be 1-100.", 400);
    patch.spend_warn_at_pct = v;
    patch.warn_sent = false;
  }
  if (has("hard_stop_enabled") || has("hardStopEnabled")) {
    patch.hard_stop_enabled = Boolean(input.hard_stop_enabled ?? input.hardStopEnabled);
  }
  if (has("low_balance_floor") || has("lowBalanceFloor")) {
    const v = cleanLowBalanceFloor(input.low_balance_floor ?? input.lowBalanceFloor);
    if (v < 0) return fail("low_balance_floor must be 0-1,000,000.", 400);
    patch.low_balance_floor = v;
  }
  if (has("low_balance_pct") || has("lowBalancePct")) {
    const v = cleanLowBalancePct(input.low_balance_pct ?? input.lowBalancePct);
    if (v < 0) return fail("low_balance_pct must be 0-100.", 400);
    patch.low_balance_pct = v;
  }
  if (has("ip_mode") || has("ipMode")) {
    const m = isIpMode(input.ip_mode ?? input.ipMode);
    if (!m) return fail("ip_mode must be disabled, allowlist, or blocklist.", 400);
    patch.ip_mode = m;
  }
  if (has("ip_allowlist") || has("ipAllowlist")) {
    const v = cleanIpList(input.ip_allowlist ?? input.ipAllowlist);
    if (v === null) return fail("ip_allowlist has a bad entry (max 50).", 400);
    patch.ip_allowlist = v;
  }
  if (has("ip_blocklist") || has("ipBlocklist")) {
    const v = cleanIpList(input.ip_blocklist ?? input.ipBlocklist);
    if (v === null) return fail("ip_blocklist has a bad entry (max 50).", 400);
    patch.ip_blocklist = v;
  }
  if (has("scopes")) {
    const v = cleanScopesSubset(input.scopes);
    if (v === null) return fail("Invalid scopes subset.", 400);
    patch.scopes = v;
  }
  if (has("logging_mode") || has("loggingMode")) {
    const v = isLoggingMode(input.logging_mode ?? input.loggingMode);
    if (v === "") return fail("logging_mode must be full, half, or none.", 400);
    patch.logging_mode = v;
  }
  if (has("log_retention_days") || has("logRetentionDays")) {
    const v = Math.floor(Number(input.log_retention_days ?? input.logRetentionDays));
    if (!Number.isInteger(v) || v < 1 || v > 1825) {
      return fail("log_retention_days must be 1-1825.", 400);
    }
    patch.log_retention_days = v;
  }
  if (has("note")) {
    patch.note = String(input.note ?? "").trim().slice(0, 280);
  }
  if (has("reset_counters") || has("resetCounters")) {
    if (Boolean(input.reset_counters ?? input.resetCounters)) {
      patch.lifetime_spent = 0;
      patch.daily_spent = 0;
      patch.use_count = 0;
      patch.warn_sent = false;
    }
  }
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);

  // Cross-field guard: enabling the hard stop or allowlist mode with an
  // empty list must read back sane; check against the stored row.
  try {
    const db = serviceClient();
    const { data: current, error: readError } = await db
      .from("bot_api_keys")
      .select("hard_stop_enabled,low_balance_floor,ip_mode,ip_allowlist,revoked")
      .eq("id", keyId)
      .eq("user_id", uid)
      .maybeSingle();
    if (readError) return dbFail("api/bot/keys/[id]", readError, "Unable to update key.");
    if (!current) return fail("Key not found.", 404);
    const cur = current as unknown as Record<string, unknown>;
    if (cur.revoked === true) return fail("Key is revoked and cannot be edited.", 409);
    const hardStop = (patch.hard_stop_enabled ?? cur.hard_stop_enabled) === true;
    const floor = Number(patch.low_balance_floor ?? cur.low_balance_floor) || 0;
    if (hardStop && !(floor > 0)) {
      return fail("Hard stop needs a low_balance_floor above 0.", 400);
    }
    const mode = String(patch.ip_mode ?? cur.ip_mode ?? "disabled");
    const allow = (patch.ip_allowlist ?? cur.ip_allowlist ?? []) as unknown[];
    if (mode === "allowlist" && (!Array.isArray(allow) || allow.length === 0)) {
      return fail("Allowlist mode needs at least one IP.", 400);
    }
    const { data: updated, error: updateError } = await db
      .from("bot_api_keys")
      .update(patch)
      .eq("id", keyId)
      .eq("user_id", uid)
      .select(KEY_POLICY_COLUMNS)
      .maybeSingle();
    if (updateError) return dbFail("api/bot/keys/[id]", updateError, "Unable to update key.");
    return ok({ key: updated });
  } catch (error) {
    return dbFail("api/bot/keys/[id]", error, "Unable to update key.");
  }
}
