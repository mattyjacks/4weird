import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { cleanHandle, isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { data: rows, error } = await supabase.rpc("my_friends");
  if (error) return fail("internal error", 500);
  return ok({ friendships: rows ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`friend-req:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many friend requests. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const handle = cleanHandle((body as Record<string, unknown> | null)?.handle);
  if (!handle) return fail("Use a 3–40 character handle.", 400);
  const { error } = await supabase.rpc("request_friend_by_handle", { p_handle: handle });
  if (error) return fail("Unable to create request.", 409);
  return ok({});
}

export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`friend-resp:${u.id}`, 20);
  if (!throttle.allowed) {
    return fail("Too many updates. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const id = String(input.id ?? "");
  const accept = input.accept;
  if (!isUuid(id) || typeof accept !== "boolean") return fail("Invalid request.", 400);
  const { data: rpcData, error } = await supabase.rpc("respond_friend_request", {
    p_id: id,
    p_accept: accept,
  });
  if (error || !rpcData) return fail("Request update denied.", 403);
  return ok({});
}
