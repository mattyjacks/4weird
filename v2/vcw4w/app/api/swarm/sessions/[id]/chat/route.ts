import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { OPENROUTER_ENDPOINT, OPENROUTER_REFERER, OPENROUTER_TITLE, parseOpenRouterText } from "@/lib/openrouter-plays";
import {
  SWARM_CUT_NOTE,
  SWARM_GAME_SLUG,
  SWARM_METER_KIND,
  SWARM_METER_SOURCE,
  cleanSwarmMessage,
  cleanSwarmSize,
  isSwarmToolId,
  localSwarmReply,
  planSwarmTurn,
  quoteSwarmTurn,
  swarmSystemPrompt,
  type SwarmAgentSpec,
  type SwarmOrchestration,
} from "@/lib/swarm";

export const dynamic = "force-dynamic";

type SwarmRow = {
  id: string;
  name: string;
  size: number;
  runtimes: string[];
  system_prompt: string;
  agent_prompts: string[];
  orchestration: SwarmOrchestration;
  model: string;
  temperature: number;
  tools: string[];
  status: string;
  turns: number;
  gross_coins: number;
};

const AGENT_NAMES = ["Scout", "Forge", "Echo", "Pixel", "Sage"];

/** Parse `[tool: id; args]` tags a model may emit (em-dash, hyphen, colon all ok). */
function parseToolCalls(text: string, enabled: string[]): { id: string; args: string }[] {
  const out: { id: string; args: string }[] = [];
  const re = /\[tool:\s*([a-z0-9.*_-]+)\s*[--\-:]\s*([^\]]{1,200})\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text ?? ""))) !== null) {
    const id = m[1].trim();
    if (isSwarmToolId(id) && enabled.includes(id) && !out.some((c) => c.id === id)) {
      out.push({ id, args: m[2].trim().slice(0, 200) });
    }
    if (out.length >= 3) break;
  }
  return out;
}

async function reasonWithOpenAi(opts: { key: string; model: string; system: string; user: string; temperature: number }): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.key}` },
        body: JSON.stringify({
          model: opts.model,
          instructions: opts.system,
          input: opts.user,
          max_output_tokens: 220,
          temperature: opts.temperature,
          store: false,
        }),
      });
      if (!res.ok) return null;
      const out = (await res.json()) as { output_text?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
      const text = (out.output ?? [])
        .flatMap((item) => (item.type === "message" ? (item.content ?? []) : []))
        .filter((part) => part.type === "output_text")
        .map((part) => part.text ?? "")
        .join("");
      return String(text || out.output_text || "").trim().slice(0, 800) || null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function reasonWithOpenRouter(opts: { key: string; model: string; system: string; user: string; temperature: number }): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.key}`,
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          max_tokens: 220,
          temperature: opts.temperature,
        }),
      });
      if (!res.ok) return null;
      return parseOpenRouterText(await res.json()).slice(0, 800) || null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * POST /api/swarm/sessions/[id]/chat; one swarm turn.
 * Body: { message (1-4000 chars) }.
 * Flow per agent: OBSERVE (plan) -> REASON (OpenAI/OpenRouter/local) ->
 * ACT (tool-call tags parsed) -> METER (one inference leg for the turn,
 * 25% cut INCLUDED). Local-only turns are free and labelled.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:chat:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid session id.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const message = cleanSwarmMessage((body as Record<string, unknown> | null)?.message);
  if (!message) return fail("message must be 1..4000 chars.", 400);

  const { data: session, error: sessError } = await supabase
    .from("swarm_sessions")
    .select("id,name,size,runtimes,system_prompt,agent_prompts,orchestration,model,temperature,tools,status,turns,gross_coins")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (sessError) return dbFail("api/swarm/chat:load", sessError, "Unable to load the swarm.");
  if (!session) return fail("Swarm not found.", 404);
  const row = session as SwarmRow;
  if (row.status !== "open") return fail("This swarm has ended.", 400);
  const size = cleanSwarmSize(row.size) || 1;
  const enabledTools = (row.tools ?? []).filter(isSwarmToolId);
  const plan = planSwarmTurn({
    message,
    size,
    mode: row.orchestration,
    turnIndex: row.turns,
    enabledTools,
  });

  const agents: SwarmAgentSpec[] = Array.from({ length: size }, (_, i) => ({
    name: AGENT_NAMES[i] ?? `Agent ${i + 1}`,
    runtime: ((row.runtimes ?? [])[i] ?? "vibecodeworker") as SwarmAgentSpec["runtime"],
    prompt: String((row.agent_prompts ?? [])[i] ?? ""),
  }));

  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? "";
  const openrouterModel = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
  const buddyModel = process.env.BUDDY_MODEL ?? "gpt-4o-mini";
  const modelPref = String(row.model ?? "auto").toLowerCase();
  const wantOpenAi = modelPref !== "local" && modelPref !== "openrouter" && Boolean(openaiKey.trim());
  const wantOpenRouter = !wantOpenAi && modelPref !== "local" && Boolean(openrouterKey.trim()) && !openrouterKey.includes("your-openrouter");

  const replies = await Promise.all(
    plan.steps.map(async (step, i) => {
      const agent = agents[step.agent] ?? agents[0];
      const system = swarmSystemPrompt({
        swarmName: row.name,
        globalPrompt: row.system_prompt,
        agent,
        agentIndex: i,
        orchestration: row.orchestration,
        tools: enabledTools,
      });
      const user = `Turn ${row.turns + 1}. Player says: ${message}\nYour delegated task: ${step.task}`;
      let text: string | null = null;
      let brain = "local";
      if (wantOpenAi) {
        text = await reasonWithOpenAi({ key: openaiKey, model: buddyModel, system, user, temperature: row.temperature });
        brain = text ? "openai" : "local";
      }
      if (!text && wantOpenRouter) {
        text = await reasonWithOpenRouter({ key: openrouterKey, model: openrouterModel, system, user, temperature: row.temperature });
        brain = text ? "openrouter" : "local";
      }
      if (!text) {
        const local = localSwarmReply({ agent, agentIndex: i, task: step.task, tools: step.tools, turnIndex: row.turns });
        return { agent: i, agentName: agent.name, runtime: agent.runtime, text: local.text, toolCalls: local.toolCalls, brain: "local" as const, fallback: true };
      }
      return { agent: i, agentName: agent.name, runtime: agent.runtime, text, toolCalls: parseToolCalls(text, enabledTools), brain, fallback: false };
    }),
  );

  const anyLive = replies.some((r) => !r.fallback);
  const replyChars = replies.reduce((n, r) => n + r.text.length, 0);
  const promptChars = message.length + String(row.system_prompt ?? "").length + 200 * size;
  const quote = quoteSwarmTurn({ promptChars, replyChars, agents: size });

  let metered: unknown = null;
  if (anyLive) {
    try {
      const { data: meterRow, error: meterError } = await supabase.rpc("meter_game_ai_usage", {
        p_game: SWARM_GAME_SLUG,
        p_kind: SWARM_METER_KIND,
        p_qty: quote.qty,
        p_session: null,
        p_source: SWARM_METER_SOURCE,
      });
      if (meterError) return rpcFail("api/swarm/chat:meter", meterError, rpcStatus, "Unable to meter this turn.");
      metered = meterRow;
    } catch (error) {
      return dbFail("api/swarm/chat:meter", error, "Unable to meter this turn.");
    }
  }

  try {
    await supabase.from("swarm_messages").insert({
      session_id: id,
      user_id: data.user.id,
      role: "user",
      agent_index: -1,
      agent_name: "",
      text: message,
      tool_calls: [],
      gross_coins: 0,
    });
    for (const r of replies) {
      await supabase.from("swarm_messages").insert({
        session_id: id,
        user_id: data.user.id,
        role: "swarm",
        agent_index: r.agent,
        agent_name: r.agentName,
        text: r.text,
        tool_calls: r.toolCalls,
        gross_coins: 0,
      });
    }
    await supabase
      .from("swarm_sessions")
      .update({ turns: row.turns + 1, gross_coins: Number(row.gross_coins ?? 0) + (anyLive ? quote.gross : 0) })
      .eq("id", id);
  } catch (error) {
    return dbFail("api/swarm/chat:save", error, "Swarm replied but the trail did not save.");
  }

  return ok({
    replies,
    plan: { mode: plan.mode, lead: plan.lead, trace: plan.trace, steps: plan.steps },
    cost: anyLive
      ? { ...quote, metered, note: `Swarm turns meter in Vibe Coins with ${SWARM_CUT_NOTE}` }
      : { gross: 0, cut: 0, provider: 0, qty: 0, display: "Free local reply", metered: null, note: "AI is unavailable, so this local swarm reply is free." },
    fallback: !anyLive,
  });
}
