import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const peer = new URL(req.url).searchParams.get("with");
  if (!isUuid(peer)) return fail("Choose a friend.", 400);
  const rl = rateLimit(`msg-read:${u.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Too many requests.", 429);
  // Defense-in-depth friendship check (RLS is authoritative).
  try {
    const { data: fr } = await supabase
      .from("friendships")
      .select("id")
      .or(`and(requester_id.eq.${u.id},addressee_id.eq.${peer}),and(requester_id.eq.${peer},addressee_id.eq.${u.id})`)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();
    if (!fr) return fail("Messages are only available to friends.", 403);
  } catch {
    return dbFail("api/messages", "friendship check failed");
  }
  const { data: messages, error } = await supabase
    .from("direct_messages")
    .select("id,sender_id,recipient_id,body,created_at,read_at")
    .or(`and(sender_id.eq.${u.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${u.id})`)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return dbFail("api/messages", error, "Unable to load messages.");
  return ok({ messages: messages ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`msg:${u.id}`, 30);
  if (!throttle.allowed) {
    return fail("Too many messages. Try again shortly.", 429, {
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
  const recipient = String(input.recipient_id ?? "");
  const text = String(input.body ?? "").trim();
  if (!isUuid(recipient) || !text || text.length > 2000) return fail("Invalid message.", 400);
  const { data: row, error } = await supabase
    .from("direct_messages")
    .insert({ sender_id: u.id, recipient_id: recipient, body: text })
    .select("id,created_at")
    .single();
  if (error) return fail("Messages are only available to friends.", 403);
  return ok({ message: row });
}
