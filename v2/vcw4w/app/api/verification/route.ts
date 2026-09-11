import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/verification; my verified status + pending request.
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const [{ data: profile }, { data: req }] = await Promise.all([
    supabase.from("profiles").select("is_verified").eq("id", data.user.id).maybeSingle(),
    supabase.from("verification_requests").select("status,created_at").eq("user_id", data.user.id).maybeSingle(),
  ]);
  return ok({
    verified: Boolean((profile as { is_verified?: boolean } | null)?.is_verified),
    request: req ?? null,
  });
}

// POST /api/verification { note? }; request creator verification.
// Verification is granted by MattyJacks after review; requesting is not approval.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Login required.", 401);
  const throttle = rateLimit(`verification:${data.user.id}`, 3, 3_600_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const note = String((body as Record<string, unknown> | null)?.note ?? "").slice(0, 500);
  const { data: rpcData, error } = await supabase.rpc("request_verification", { p_note: note });
  if (error) {
    const msg = String(error.message ?? "");
    if (/already verified/i.test(msg)) return fail("Already verified.", 400);
    if (/login required/i.test(msg)) return fail("Login required.", 401);
    return rpcFail("api/verification", error, () => 400, "Unable to request verification.");
  }
  // Best-effort read-back for the client; failure here must not fail the request.
  const { data: row } = await supabase
    .from("verification_requests")
    .select("status,created_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return ok({ requested: rpcData, request: row ?? null }, 201);
}
