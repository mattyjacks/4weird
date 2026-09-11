import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** GET /api/swarm/sessions/[id]; swarm config + recent messages. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid session id.", 400);
  try {
    const { data: session, error } = await supabase
      .from("swarm_sessions")
      .select("id,name,size,runtimes,system_prompt,agent_prompts,orchestration,model,temperature,tools,status,turns,gross_coins,created_at,ended_at")
      .eq("id", id)
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (error) return dbFail("api/swarm/session:get", error, "Unable to load the swarm.");
    if (!session) return fail("Swarm not found.", 404);
    const { data: messages, error: msgError } = await supabase
      .from("swarm_messages")
      .select("id,role,agent_index,agent_name,text,tool_calls,gross_coins,created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (msgError) return dbFail("api/swarm/session:messages", msgError, "Unable to load messages.");
    return ok({ session, messages: messages ?? [] });
  } catch (error) {
    return dbFail("api/swarm/session:get", error, "Unable to load the swarm.");
  }
}
