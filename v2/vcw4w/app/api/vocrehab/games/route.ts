import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rpcStatus } from "@/lib/agent-market";
import { vocrehabValidateGameEvent } from "@/lib/vocrehab-games";
import { vocrehabValidateGame2Event } from "@/lib/vocrehab-games2";
import { vocrehabValidateGame3Event } from "@/lib/vocrehab-games3";
import { vocrehabValidateEnergyEvent } from "@/lib/vocrehab-energy";
import { canVocrehabActorUseGame, hasActiveVocrehabEnrollment, resolveVocrehabActor } from "@/lib/vocrehab-actor";

const VOCREHAB_GAME_IDS = ["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle", "phone-greeting", "time-punch", "tool-match", "paycheck-plan", "energy-budget", "resume-rescue"] as const;
const VOCREHAB_MAX_EVENTS = 200;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { action, game_id, events, summary, session_id, active_seconds } = (isPlainObject(body) ? body : {}) as {
    action?: unknown;
    game_id?: unknown;
    events?: unknown;
    summary?: unknown;
    session_id?: unknown;
    active_seconds?: unknown;
  };

  if (typeof game_id !== "string" || !VOCREHAB_GAME_IDS.includes(game_id as (typeof VOCREHAB_GAME_IDS)[number])) {
    return fail("game_id must be one of the 11 arcade games.", 400);
  }
  if (action === "start" || action === "heartbeat" || action === "end") {
    const actor = await resolveVocrehabActor(req);
    if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
    if (actor.kind !== "kid") return ok({ session: null, metered: false });
    if (!canVocrehabActorUseGame(actor, game_id)) return fail("This game is not allowed by your parent.", 403);
    const access = await hasActiveVocrehabEnrollment(actor);
    if (access.error) return dbFail("vocrehab/games", access.error);
    if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
    if (action === "start") {
      const { data, error } = await actor.db.rpc("start_kid_session", {
        p_kid: actor.kidId,
        p_token_hash: actor.tokenHash,
        p_game: game_id,
        p_version: "vocrehab-1",
        p_new_bytes: 0,
        p_min_age: 0,
      });
      if (error) return rpcFail("vocrehab/games:start", error, rpcStatus, "This play session could not start.");
      return ok({ session: data, metered: true });
    }
    if (typeof session_id !== "string" || !/^[0-9a-f-]{36}$/i.test(session_id)) return fail("A valid session_id is required.", 400);
    if (action === "heartbeat") {
      const seconds = Number(active_seconds);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) return fail("active_seconds must be 1..300.", 400);
      const { data, error } = await actor.db.rpc("heartbeat_kid_session", {
        p_kid: actor.kidId,
        p_token_hash: actor.tokenHash,
        p_session: session_id,
        p_seconds: seconds,
      });
      if (error) return rpcFail("vocrehab/games:heartbeat", error, rpcStatus, "This play session has reached a parent limit.");
      return ok({ beat: data, metered: true });
    }
    const { data, error } = await actor.db.rpc("end_kid_session", {
      p_kid: actor.kidId,
      p_token_hash: actor.tokenHash,
      p_session: session_id,
    });
    if (error) return rpcFail("vocrehab/games:end", error, rpcStatus, "Unable to end play session.");
    return ok({ session: data, metered: true });
  }
  if (!Array.isArray(events)) {
    return fail("events must be an array.", 400);
  }
  // Fail-open cap: truncate oversized runs, never reject with a scary error.
  const capped = events.slice(0, VOCREHAB_MAX_EVENTS);
  const valid = capped.filter((e) =>
    vocrehabValidateGameEvent(e) ||
    vocrehabValidateGame2Event(e).ok ||
    vocrehabValidateGame3Event(e).ok ||
    vocrehabValidateEnergyEvent(e),
  );
  const cleanSummary = isPlainObject(summary) ? summary : {};

  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  if (actor.kind === "kid") {
    if (!canVocrehabActorUseGame(actor, game_id)) return fail("This game is not allowed by your parent.", 403);
    const { data: enrollment, error } = await actor.db.from("vocrehab_provider_clients").select("id").eq("parent_id", actor.userId).eq("kid_id", actor.kidId).is("revoked_at", null).maybeSingle();
    if (error) return dbFail("vocrehab/games", error);
    if (!enrollment) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  }

  const { data: session, error: sessionError } = await actor.db
    .from("vocrehab_game_sessions")
    .insert({ user_id: actor.userId, kid_id: actor.kind === "kid" ? actor.kidId : null, game_id, summary: cleanSummary })
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
        user_id: actor.userId,
        t_ms: evt.t_ms,
        kind: evt.kind,
        detail: evt.detail,
      };
    });
    const { error: eventsError } = await actor.db.from("vocrehab_game_events").insert(rows);
    if (eventsError) {
      return dbFail("vocrehab/games", eventsError);
    }
  }

  return ok({ session_id: (session as { id: string }).id, events_saved: valid.length });
}
