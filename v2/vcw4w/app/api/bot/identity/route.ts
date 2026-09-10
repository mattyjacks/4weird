import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isBotUsername } from "@/lib/bot-validate";

export const dynamic = "force-dynamic";

const maxRequestBytes = 4096;

interface IdentityRow {
  username: string | null;
  human_id: string;
}

function pickRow(data: unknown): IdentityRow | null {
  const row = (Array.isArray(data) ? data[0] : data) as IdentityRow | null;
  if (!row?.human_id) return null;
  return { username: row.username ?? null, human_id: row.human_id };
}

// GET /api/bot/identity — ensure the caller's bot identity exists and return
// { username (nullable until set), human_id }. Supabase-login auth.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: rpcData, error } = await supabase.rpc("ensure_bot_identity");
  if (error) return dbFail("api/bot/identity", error, "Unable to load bot identity.");
  const row = pickRow(rpcData);
  if (!row) return fail("Unable to load bot identity.", 500);
  return ok({ username: row.username, human_id: row.human_id });
}

// POST /api/bot/identity {username} — set the bot username ONCE. After it is
// set the identity is immutable: further attempts get 409.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return fail("Request is too large.", 413);
  }
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const throttle = rateLimit(`bot-identity:${data.user.id}`, 10);
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
  const username = isBotUsername((body as Record<string, unknown>)?.username);
  if (!username) {
    return fail("Username needs 3-24 lowercase letters, numbers, or _.", 400);
  }
  const { data: rpcData, error } = await supabase.rpc("set_bot_username", {
    p_username: username,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("already set")) {
      return fail("Username is already set and immutable.", 409);
    }
    if (msg.includes("taken")) {
      return fail("That username is taken.", 409);
    }
    if (msg.includes("invalid")) return fail("Invalid username.", 400);
    return fail("Unable to set username.", 500);
  }
  const row = pickRow(rpcData);
  if (!row) return fail("Unable to set username.", 500);
  return ok({ username: row.username, human_id: row.human_id });
}
