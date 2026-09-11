import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { exceedsBodyLimit } from "@/lib/validate";
import { cleanKeyLabel } from "@/lib/bot-validate";
import { botPepperConfigured, generateBotKey, keyPrefix, sha256Hash } from "@/lib/bot-auth";
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
  type LoggingMode,
} from "@/lib/bot-key-policy";

export const dynamic = "force-dynamic";

const maxRequestBytes = 8192;
const MAX_ACTIVE_KEYS = 10;

export const KEY_POLICY_COLUMNS =
  "id,prefix,label,created_at,last_used_at,revoked," +
  "expires_at,max_uses,use_count,lifetime_budget,lifetime_spent," +
  "daily_budget,daily_spent,daily_day,spend_warn_at_pct,warn_sent," +
  "hard_stop_enabled,low_balance_floor,low_balance_pct," +
  "ip_mode,ip_allowlist,ip_blocklist,scopes,logging_mode,log_retention_days,note";

// GET /api/bot/keys; list the caller's keys WITHOUT secrets, now with the
// full power-manager policy (budgets, expiry, uses, IPs, logging, …).
// Supabase-login auth.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!supabaseServiceRoleKey() || !botPepperConfigured()) return fail("Bot service is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  try {
    const db = serviceClient();
    const { data: rows, error } = await db
      .from("bot_api_keys")
      .select(KEY_POLICY_COLUMNS)
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });
    if (error) return dbFail("api/bot/keys", error, "Unable to load keys.");
    return ok({ keys: rows ?? [] });
  } catch (error) {
    return dbFail("api/bot/keys", error, "Unable to load keys.");
  }
}

// POST /api/bot/keys {label, …policy}; issue a key. Returns the FULL secret
// ONCE; it is never stored and can never be shown again. Every policy field
// is optional (sane defaults: unlimited budgets, never expires, half logs).
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/bot/keys");
  if (botBlock) return botBlock;
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!supabaseServiceRoleKey() || !botPepperConfigured()) return fail("Bot service is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const throttle = rateLimit(`bot-keys-issue:${data.user.id}`, 10);
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
  const label = cleanKeyLabel(input.label);
  if (!label) return fail("Label needs 1-40 characters.", 400);

  // ---- Optional power-manager policy (all validated, all safe-defaulted) ----
  const expiresAt = cleanExpiryIso(input.expires_at ?? input.expiresAt ?? "");
  if (expiresAt === null) return fail("Expiry must be a future date (max 5 years).", 400);
  const maxUses = cleanMaxUses(input.max_uses ?? input.maxUses ?? 0);
  if (maxUses < 0) return fail("max_uses must be 0 (unlimited) to 10,000,000.", 400);
  const lifetimeBudget = cleanBudgetCoins(input.lifetime_budget ?? input.lifetimeBudget ?? 0);
  if (lifetimeBudget < 0) return fail("lifetime_budget must be 0 (unlimited) to 1,000,000.", 400);
  const dailyBudget = cleanBudgetCoins(input.daily_budget ?? input.dailyBudget ?? 0);
  if (dailyBudget < 0) return fail("daily_budget must be 0 (unlimited) to 1,000,000.", 400);
  const warnPct = cleanWarnPct(input.spend_warn_at_pct ?? input.spendWarnAtPct ?? 80);
  if (warnPct < 0) return fail("spend_warn_at_pct must be 1-100.", 400);
  const hardStop = Boolean(input.hard_stop_enabled ?? input.hardStopEnabled ?? false);
  const floor = cleanLowBalanceFloor(input.low_balance_floor ?? input.lowBalanceFloor ?? 0);
  if (floor < 0) return fail("low_balance_floor must be 0 to 1,000,000.", 400);
  const floorPct = cleanLowBalancePct(input.low_balance_pct ?? input.lowBalancePct ?? 10);
  if (floorPct < 0) return fail("low_balance_pct must be 0-100.", 400);
  if (hardStop && !(floor > 0)) {
    return fail("Hard stop needs a low_balance_floor above 0.", 400);
  }
  const ipModeRaw = isIpMode(input.ip_mode ?? input.ipMode ?? "disabled");
  if (!ipModeRaw) return fail("ip_mode must be disabled, allowlist, or blocklist.", 400);
  const allow = cleanIpList(input.ip_allowlist ?? input.ipAllowlist ?? []);
  if (allow === null) return fail("ip_allowlist has a bad entry (IP or IPv4 CIDR, max 50).", 400);
  const block = cleanIpList(input.ip_blocklist ?? input.ipBlocklist ?? []);
  if (block === null) return fail("ip_blocklist has a bad entry (IP or IPv4 CIDR, max 50).", 400);
  if (ipModeRaw === "allowlist" && allow.length === 0) {
    return fail("Allowlist mode needs at least one IP.", 400);
  }
  const scopes = cleanScopesSubset(input.scopes ?? []);
  if (scopes === null) return fail("Invalid scopes subset.", 400);
  const loggingRaw = isLoggingMode(input.logging_mode ?? input.loggingMode ?? "half");
  const loggingMode: LoggingMode = loggingRaw === "" ? "half" : loggingRaw;
  if (!loggingMode) return fail("logging_mode must be full, half, or none.", 400);
  const retentionRaw = input.log_retention_days ?? input.logRetentionDays ?? 90;
  const retention = Math.floor(Number(retentionRaw));
  if (!Number.isInteger(retention) || retention < 1 || retention > 1825) {
    return fail("log_retention_days must be 1-1825.", 400);
  }
  const note = String(input.note ?? "").trim().slice(0, 280);

  try {
    const db = serviceClient();
    const { count } = await db
      .from("bot_api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id)
      .eq("revoked", false);
    if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
      return fail("Key limit reached. Revoke an old key first.", 409);
    }
  } catch {
    return fail("Unable to issue key.", 500);
  }

  const secret = generateBotKey();
  // Pepper is gated above, but hash defensively: sha256Hash throws when the
  // pepper is misconfigured, and that must stay a JSON failure, not an
  // unhandled HTML 500 (every API returns {success} or {error}).
  let keyHash: string;
  try {
    keyHash = sha256Hash(secret);
  } catch {
    return fail("Bot service is not configured.", 503);
  }
  const { data: rpcData, error } = await supabase.rpc("issue_bot_key", {
    p_label: label,
    p_key_hash: keyHash,
    p_prefix: keyPrefix(secret),
  });
  if (error) return fail("Unable to issue key.", 500);
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as {
    key_id: string;
    prefix: string;
    label: string;
    created_at: string;
  } | null;
  if (!row?.key_id) return fail("Unable to issue key.", 500);

  // Apply the policy columns (non-fatal if the migration hasn't run yet:
  // the key itself is already issued, so report success with a flag).
  let policyApplied = true;
  try {
    const db = serviceClient();
    const { error: policyError } = await db
      .from("bot_api_keys")
      .update({
        expires_at: expiresAt || null,
        max_uses: maxUses,
        lifetime_budget: lifetimeBudget,
        daily_budget: dailyBudget,
        spend_warn_at_pct: warnPct,
        hard_stop_enabled: hardStop,
        low_balance_floor: floor,
        low_balance_pct: floorPct,
        ip_mode: ipModeRaw,
        ip_allowlist: allow,
        ip_blocklist: block,
        scopes,
        logging_mode: loggingMode,
        log_retention_days: retention,
        note,
      })
      .eq("id", row.key_id)
      .eq("user_id", data.user.id);
    if (policyError) policyApplied = false;
  } catch {
    policyApplied = false;
  }

  return ok(
    {
      key: secret,
      id: row.key_id,
      prefix: row.prefix,
      label: row.label,
      created_at: row.created_at,
      policyApplied,
      warning: "Copy this key now; it will never be shown again.",
    },
    201,
  );
}
