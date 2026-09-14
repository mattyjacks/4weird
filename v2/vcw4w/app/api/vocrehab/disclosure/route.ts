import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";
import { vocrehabDisclosureGraph, vocrehabDisclosureTransition } from "@/lib/vocrehab-disclosure";

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-disclosure-ip:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, rateLimitHeaders(rl));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const verdict = vocrehabDisclosureTransition(input.from, input.to);
  if (!verdict.ok) return fail(verdict.reason, 400);
  const node = vocrehabDisclosureGraph[verdict.to];

  // Guest-ok validation with zero writes; persist only on explicit save.
  if (input.save !== true) return ok({ from: verdict.from, node, exits: node.exits });

  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Sign in to save disclosure progress.", 401);
  const { error } = await supabase.from("vocrehab_disclosure_states").insert({
    user_id: user.user.id,
    node_id: verdict.to,
    path: [verdict.from, verdict.to],
  });
  if (error) return dbFail("api/vocrehab/disclosure", error);
  return ok({ from: verdict.from, node, exits: node.exits, saved: true });
}
