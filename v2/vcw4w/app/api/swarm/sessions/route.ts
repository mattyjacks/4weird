import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { readCappedJson } from "@/lib/request-body";
import { isUuid } from "@/lib/validate";
import {
  SWARM_CUT_NOTE,
  SWARM_MAX_AGENTS,
  SWARM_MIN_AGENTS,
  cleanAgentPrompt,
  cleanSwarmName,
  cleanSwarmRuntime,
  cleanSwarmSize,
  cleanSystemPrompt,
  cleanTemperature,
  cleanToolIds,
  defaultAgentSpecs,
  isSwarmModel,
  isSwarmOrchestration,
  quoteSwarmTurn,
} from "@/lib/swarm";
import { isSwarmExecMode } from "@/lib/swarm-brain";

export const dynamic = "force-dynamic";

/**
 * GET /api/swarm/sessions; list my swarm hires (newest first).
 * POST /api/swarm/sessions; hire a swarm as a chatbot interface.
 * Body: { name?, size (1-5), runtimes?[], system_prompt?, agent_prompts?[],
 *   orchestration?: auto|lead|round-robin, model?: auto|openai|openrouter|local,
 *   temperature?, tools?[], exec_mode?: auto|serverless|serverful,
 *   parent_session_id?: uuid (child instance of another session) }.
 * Hiring itself is free; chat turns meter per-agent via meter_game_ai_usage
 * (kind inference, game swarm) with the 25% cut INCLUDED. The response quotes
 * the per-turn estimate so the hire panel can show it before the first send.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  try {
    const { data: rows, error } = await supabase
      .from("swarm_sessions")
      .select("id,name,size,runtimes,system_prompt,agent_prompts,orchestration,model,temperature,tools,exec_mode,parent_session_id,status,turns,gross_coins,created_at,ended_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return dbFail("api/swarm/sessions:list", error, "Unable to load swarms.");
    return ok({ sessions: rows ?? [] });
  } catch (error) {
    return dbFail("api/swarm/sessions:list", error, "Unable to load swarms.");
  }
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:create:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  // Capped body (16 KB): hire params are small; unbounded JSON parsing
  // would let one request burn disproportionate CPU/RAM.
  const parsed = await readCappedJson(req, 16 * 1024);
  if ("error" in parsed) return parsed.error;
  const input = (parsed.body ?? {}) as Record<string, unknown>;
  const size = cleanSwarmSize(input.size ?? 1);
  if (!size) return fail(`size must be ${SWARM_MIN_AGENTS}..${SWARM_MAX_AGENTS} agents.`, 400);
  const orchestration = isSwarmOrchestration(input.orchestration) ? input.orchestration : "auto";
  const model = isSwarmModel(input.model) ? input.model : "auto";
  const name = cleanSwarmName(input.name) || "Swarm";
  const systemPrompt = cleanSystemPrompt(input.system_prompt ?? input.systemPrompt);
  const temperature = cleanTemperature(input.temperature ?? 0.8);
  const tools = cleanToolIds(input.tools);
  const execMode = isSwarmExecMode(input.exec_mode) ? input.exec_mode : "auto";
  const parentSessionId =
    typeof input.parent_session_id === "string" && isUuid(input.parent_session_id)
      ? input.parent_session_id
      : null;

  const rawRuntimes = Array.isArray(input.runtimes) ? input.runtimes : [];
  const runtimes = Array.from({ length: size }, (_, i) =>
    cleanSwarmRuntime(rawRuntimes[i] ?? (input.runtime as unknown) ?? "vibecodeworker"),
  );
  const rawPrompts = Array.isArray(input.agent_prompts ?? input.agentPrompts)
    ? ((input.agent_prompts ?? input.agentPrompts) as unknown[])
    : [];
  const fallbackSpecs = defaultAgentSpecs(size);
  const agentPrompts = Array.from({ length: size }, (_, i) =>
    cleanAgentPrompt(rawPrompts[i] ?? fallbackSpecs[i].prompt),
  );

  try {
    // A claimed parent must be one of my own sessions; otherwise the link
    // is dropped (never a 400 oracle into someone else's rows).
    let parentId: string | null = null;
    if (parentSessionId) {
      const { data: parent } = await supabase
        .from("swarm_sessions")
        .select("id")
        .eq("id", parentSessionId)
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (parent) parentId = parentSessionId;
    }
    const { data: row, error } = await supabase
      .from("swarm_sessions")
      .insert({
        user_id: data.user.id,
        name,
        size,
        runtimes,
        system_prompt: systemPrompt,
        agent_prompts: agentPrompts,
        orchestration,
        model,
        temperature,
        tools,
        exec_mode: execMode,
        ...(parentId ? { parent_session_id: parentId } : {}),
      })
      .select("id,name,size,runtimes,system_prompt,agent_prompts,orchestration,model,temperature,tools,exec_mode,parent_session_id,status,turns,gross_coins,created_at")
      .single();
    if (error) {
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.includes("swarm_sessions") && (msg.includes("does not exist") || msg.includes("schema"))) {
        return fail("Swarm tables are not migrated yet; apply supabase/migrations/20260927000000_swarm_chat.sql.", 503);
      }
      return dbFail("api/swarm/sessions:create", error, "Unable to hire the swarm.");
    }
    const estimate = quoteSwarmTurn({ promptChars: 600, replyChars: 600 * size, agents: size });
    return ok({ session: row, estimate, note: `Hired! Chat turns meter per agent with ${SWARM_CUT_NOTE}` }, 201);
  } catch (error) {
    return dbFail("api/swarm/sessions:create", error, "Unable to hire the swarm.");
  }
}

