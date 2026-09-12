import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { readCappedJson } from "@/lib/request-body";
import {
  cleanBrainFacts,
  cleanBrainGoals,
  cleanBrainPersona,
  cleanBrainSummary,
  emptyBrain,
  isSwarmExecMode,
  type SwarmBrain,
} from "@/lib/swarm-brain";

export const dynamic = "force-dynamic";

/**
 * GET /api/swarm/brain; my internal brain (persona, memory, exec mode).
 * Returns the stored row, or an empty-brain default when none exists yet.
 * PATCH /api/swarm/brain; update my brain.
 * Body: { persona?, facts?[], goals?[], exec_mode?: auto|serverless|serverful,
 *   memory_summary? }. Omitted fields are untouched. Facts/goals replace
 *   wholesale (the chat turn merges incrementally instead).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  try {
    const { data: row, error } = await supabase
      .from("swarm_brains")
      .select("persona,facts,goals,exec_mode,memory_summary,updated_at")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (error) return dbFail("api/swarm/brain:get", error, "Unable to load the brain.");
    return ok({ brain: row ?? { ...emptyBrain(), updated_at: null } });
  } catch (error) {
    return dbFail("api/swarm/brain:get", error, "Unable to load the brain.");
  }
}

export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:brain:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  // Capped body (16 KB): persona/facts/goals are small; unbounded JSON
  // parsing would let one request burn disproportionate CPU/RAM.
  const parsed = await readCappedJson(req, 16 * 1024);
  if ("error" in parsed) return parsed.error;
  const input = (parsed.body ?? {}) as Record<string, unknown>;
  const patch: Partial<SwarmBrain> & { updated_at?: string } = { updated_at: new Date().toISOString() };
  if (input.persona !== undefined) patch.persona = cleanBrainPersona(input.persona);
  if (input.facts !== undefined) patch.facts = cleanBrainFacts(input.facts);
  if (input.goals !== undefined) patch.goals = cleanBrainGoals(input.goals);
  if (input.exec_mode !== undefined) {
    if (!isSwarmExecMode(input.exec_mode)) return fail("exec_mode must be auto|serverless|serverful.", 400);
    patch.exec_mode = input.exec_mode;
  }
  if (input.memory_summary !== undefined) patch.memory_summary = cleanBrainSummary(input.memory_summary);
  if (Object.keys(patch).length <= 1) return fail("Nothing to update.", 400);
  try {
    const { data: row, error } = await supabase
      .from("swarm_brains")
      .upsert({ user_id: data.user.id, ...patch }, { onConflict: "user_id" })
      .select("persona,facts,goals,exec_mode,memory_summary,updated_at")
      .single();
    if (error) {
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.includes("swarm_brains") && (msg.includes("does not exist") || msg.includes("schema"))) {
        return fail("Swarm brain tables are not migrated yet; apply supabase/migrations/20261022000100_swarm_brain.sql.", 503);
      }
      return dbFail("api/swarm/brain:patch", error, "Unable to update the brain.");
    }
    return ok({ brain: row });
  } catch (error) {
    return dbFail("api/swarm/brain:patch", error, "Unable to update the brain.");
  }
}
