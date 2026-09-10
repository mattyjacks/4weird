import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { cleanKeyLabel } from "@/lib/bot-validate";
import { generateBotKey, keyPrefix, sha256Hash } from "@/lib/bot-auth";

export const dynamic = "force-dynamic";

const maxRequestBytes = 4096;
const MAX_ACTIVE_KEYS = 10;

// GET /api/bot/keys — list the caller's keys WITHOUT secrets
// (prefix/label/created/last_used/revoked). Supabase-login auth.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!supabaseServiceRoleKey()) return fail("Bot service is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  try {
    const db = serviceClient();
    const { data: rows, error } = await db
      .from("bot_api_keys")
      .select("id,prefix,label,created_at,last_used_at,revoked")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });
    if (error) return dbFail("api/bot/keys", error, "Unable to load keys.");
    return ok({ keys: rows ?? [] });
  } catch (error) {
    return dbFail("api/bot/keys", error, "Unable to load keys.");
  }
}

// POST /api/bot/keys {label} — issue a key. Returns the FULL secret ONCE;
// it is never stored and can never be shown again.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Request is too large.", 413);
  }
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!supabaseServiceRoleKey()) return fail("Bot service is not configured.", 503);
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
  const label = cleanKeyLabel((body as Record<string, unknown>)?.label);
  if (!label) return fail("Label needs 1-40 characters.", 400);

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
  const { data: rpcData, error } = await supabase.rpc("issue_bot_key", {
    p_label: label,
    p_key_hash: sha256Hash(secret),
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
  return ok(
    {
      key: secret,
      id: row.key_id,
      prefix: row.prefix,
      label: row.label,
      created_at: row.created_at,
      warning: "Copy this key now — it will never be shown again.",
    },
    201,
  );
}
