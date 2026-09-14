import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { vocrehabValidateGameEvent } from "@/lib/vocrehab-games";

const VOCREHAB_GAME_IDS = ["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle"] as const;
const VOCREHAB_MAX_EVENTS = 200;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { game_id, events, summary } = (isPlainObject(body) ? body : {}) as {
    game_id?: unknown;
    events?: unknown;
    summary?: unknown;
  };

  if (typeof game_id !== "string" || !VOCREHAB_GAME_IDS.includes(game_id as (typeof VOCREHAB_GAME_IDS)[number])) {
    return fail("game_id must be one of the five arcade games.", 400);
  }
  if (!Array.isArray(events)) {
    return fail("events must be an array.", 400);
  }
  // Fail-open cap: truncate oversized runs, never reject with a scary error.
  const capped = events.slice(0, VOCREHAB_MAX_EVENTS);
  const valid = capped.filter((e) => vocrehabValidateGameEvent(e));
  const cleanSummary = isPlainObject(summary) ? summary : {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to save game runs.", 401);
  }

  const { data: session, error: sessionError } = await supabase
    .from("vocrehab_game_sessions")
    .insert({ user_id: user.id, game_id, summary: cleanSummary })
    .select("id")
    .single();
  if (sessionError || !session) {
    return dbFail("vocrehab/games", sessionError);
  }

  if (valid.length > 0) {
    const rows = valid.map((e) => {
      const evt = e as { t_ms: number; kind: string; detail: Record<string, unknown> };
      return {
        session_id: (session as { id: string }).id,
        user_id: user.id,
        t_ms: evt.t_ms,
        kind: evt.kind,
        detail: evt.detail,
      };
    });
    const { error: eventsError } = await supabase.from("vocrehab_game_events").insert(rows);
    if (eventsError) {
      return dbFail("vocrehab/games", eventsError);
    }
  }

  return ok({ session_id: (session as { id: string }).id, events_saved: valid.length });
}
