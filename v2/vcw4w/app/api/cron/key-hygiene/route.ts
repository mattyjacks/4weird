import { createHash, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/key-hygiene; nightly quantum-hygiene sweep (see vercel.json).
// - Revokes bot_api_keys past expires_at (defense in depth: resolveBotKey
//   already denies expired keys; this flips the flag so listings stay honest).
// Auth: CRON_SECRET via Authorization: Bearer only (never ?secret=).
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  const ah = createHash("sha256").update(bearer).digest();
  const bh = createHash("sha256").update(secret).digest();
  try {
    return timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

async function sweep() {
  const db = serviceClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("bot_api_keys")
    .update({ revoked: true })
    .lt("expires_at", now)
    .eq("revoked", false)
    .select("id");
  if (error) {
    console.error("[cron/key-hygiene]", error.code ?? error.message);
    return fail("Key hygiene sweep failed.", 500);
  }
  return ok({ revoked: Array.isArray(data) ? data.length : 0, at: now });
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return sweep();
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return sweep();
}
