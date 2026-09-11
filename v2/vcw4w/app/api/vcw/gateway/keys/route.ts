import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { botPepperConfigured, sha256Hash } from "@/lib/bot-auth";
import { gatewayKeyPrefix, generateVcwGatewayKey } from "@/lib/vcw-gateway";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_KEYS = 10;
const VCW_GATEWAY_SCOPES = ["vcw:read", "vcw:write"] as const;

// GET /api/vcw/gateway/keys; list the caller's gateway keys WITHOUT
// secrets (hashes never leave the server). Supabase-login auth.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:gateway:keys:list:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  try {
    const db = serviceClient();
    const { data: rows, error } = await db
      .from("vcw_api_keys")
      .select("id,prefix,label,scopes,revoked,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });
    if (error) return dbFail("vcw/gateway/keys list", error, "Unable to load keys.");
    return ok({ keys: rows ?? [] });
  } catch (error) {
    return dbFail("vcw/gateway/keys list", error, "Unable to load keys.");
  }
}

function cleanLabel(value: unknown): string {
  return String(value ?? "").trim().slice(0, 80);
}

function cleanScopes(value: unknown): string[] | null {
  const raw = value === undefined ? ["vcw:read"] : value;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const seen = new Set<string>();
  for (const entry of raw) {
    const scope = String(entry ?? "").trim();
    if (!(VCW_GATEWAY_SCOPES as readonly string[]).includes(scope)) return null;
    seen.add(scope);
  }
  if (seen.size === 0) return null;
  return [...seen];
}

function cleanBudgetCoins(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || v > 1_000_000) return -1;
  return Math.round(v * 100) / 100;
}

function cleanExpiry(value: unknown): string | null | false {
  if (value === undefined || value === null || value === "") return null;
  const iso = String(value).trim();
  const ms = Date.parse(iso);
  // Expiry must be a future date.
  if (!Number.isFinite(ms) || ms <= Date.now()) return false;
  return new Date(ms).toISOString();
}

// POST /api/vcw/gateway/keys {label, scopes, lifetime_budget?,
// daily_budget?, expires_at?}; issue a gateway key. Returns the FULL secret
// ONCE; only its scrypt hash is stored. Supabase-login auth + same-origin.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!supabaseServiceRoleKey() || !botPepperConfigured()) {
    return fail("Gateway service is not configured.", 503);
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`vcw:gateway:keys:issue:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many attempts. Try again shortly.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const label = cleanLabel(input.label);
  if (!label) return fail("Label needs 1-80 characters.", 400);
  const scopes = cleanScopes(input.scopes);
  if (!scopes) return fail("Scopes must be a subset of vcw:read, vcw:write.", 400);
  const lifetimeBudget = cleanBudgetCoins(input.lifetime_budget ?? input.lifetimeBudget);
  if (lifetimeBudget < 0) return fail("lifetime_budget must be 0 (unlimited) to 1,000,000.", 400);
  const dailyBudget = cleanBudgetCoins(input.daily_budget ?? input.dailyBudget);
  if (dailyBudget < 0) return fail("daily_budget must be 0 (unlimited) to 1,000,000.", 400);
  const expiresAt = cleanExpiry(input.expires_at ?? input.expiresAt);
  if (expiresAt === false) return fail("Expiry must be a future date.", 400);

  try {
    const db = serviceClient();
    const { count } = await db
      .from("vcw_api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id)
      .eq("revoked", false);
    if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
      return fail("Key limit reached. Revoke an old key first.", 409);
    }
  } catch (error) {
    return dbFail("vcw/gateway/keys count", error, "Unable to issue key.");
  }

  const secret = generateVcwGatewayKey();
  // Pepper is gated above, but hash defensively: sha256Hash throws when the
  // pepper is misconfigured, and that must stay a JSON failure, not an
  // unhandled HTML 500. The full key is never logged.
  let keyHash: string;
  try {
    keyHash = sha256Hash(secret);
  } catch {
    return fail("Gateway service is not configured.", 503);
  }
  const prefix = gatewayKeyPrefix(secret);

  try {
    const db = serviceClient();
    const { data: row, error } = await db
      .from("vcw_api_keys")
      .insert({
        user_id: data.user.id,
        key_hash: keyHash,
        prefix,
        label,
        scopes,
        lifetime_budget: lifetimeBudget,
        daily_budget: dailyBudget,
        expires_at: expiresAt,
      })
      .select("id,prefix")
      .single();
    if (error) return dbFail("vcw/gateway/keys issue", error, "Unable to issue key.");
    const created = (row ?? {}) as { id?: unknown; prefix?: unknown };
    if (typeof created.id !== "string") return fail("Unable to issue key.", 500);
    return ok(
      {
        key: secret,
        id: created.id,
        prefix: typeof created.prefix === "string" ? created.prefix : prefix,
        warning: "Copy this key now; it will never be shown again.",
      },
      201,
    );
  } catch (error) {
    return dbFail("vcw/gateway/keys issue", error, "Unable to issue key.");
  }
}
