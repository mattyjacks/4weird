import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clampLimit, isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

const KINDS = new Set([
  "join", "leave", "kill", "boss", "loot", "chat", "emote", "win", "seed",
]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  const q = new URL(req.url).searchParams;
  const limit = clampLimit(q.get("limit"), 50, 100);
  const since = (q.get("since") ?? "").trim().slice(0, 64) || null;
  const { data: rpcData, error } = await supabase.rpc("read_mp_events", {
    p_match: id,
    p_since: since,
    p_limit: limit,
  });
  if (error) return fail("Event history denied.", 403);
  const rows = (Array.isArray(rpcData) ? rpcData : []) as Record<string, unknown>[];
  const events = rows.map((e) => ({
    id: String(e.id ?? ""),
    user_id: String(e.user_id ?? ""),
    kind: String(e.kind ?? ""),
    text: String(e.text ?? ""),
    created_at: String(e.created_at ?? ""),
  }));
  return ok({ events });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`match-events:${u.id}`, 60);
  if (!throttle.allowed) {
    return fail("Too many match events. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid match.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const kind = String(input.kind ?? "").trim().toLowerCase();
  if (!KINDS.has(kind)) return fail("Invalid event kind.", 400);
  const text = String(input.text ?? "").trim();
  if (text.length < 1 || text.length > 140) return fail("Invalid event text.", 400);
  const { error } = await supabase.rpc("post_mp_event", {
    p_match: id,
    p_kind: kind,
    p_text: text,
  });
  if (error) return fail("Event denied.", 403);
  return ok({ posted: true });
}
