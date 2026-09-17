import { dbFail, fail, ok } from "@/lib/api-respond";
import { canVocrehabActorUseGame, hasActiveVocrehabEnrollment, resolveVocrehabActor } from "@/lib/vocrehab-actor";

const games = new Set(["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle", "time-punch", "tool-match", "resume-rescue", "phone-greeting", "paycheck-plan", "energy-budget"]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export async function GET(req: Request) {
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/templates", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  let query = actor.db.from("vocrehab_game_templates").select("id,owner_id,created_by_kid_id,enrollment_id,game_id,title,description,state,is_shared,created_at,updated_at").order("updated_at", { ascending: false }).limit(100);
  query = actor.kind === "kid"
    ? query.eq("created_by_kid_id", actor.kidId)
    : query.eq("owner_id", actor.userId);
  const { data: own, error } = await query;
  if (error) return dbFail("vocrehab/templates", error);
  let assigned: unknown[] = [];
  if (actor.kind === "kid") {
    const { data: links, error: linkError } = await actor.db.from("vocrehab_provider_clients").select("id").eq("parent_id", actor.userId).eq("kid_id", actor.kidId).is("revoked_at", null);
    if (linkError) return dbFail("vocrehab/templates", linkError);
    const ids = (links ?? []).map((row: { id: string }) => row.id);
    if (ids.length) {
      const { data, error: assignedError } = await actor.db.from("vocrehab_game_templates").select("id,owner_id,created_by_kid_id,enrollment_id,game_id,title,description,state,is_shared,created_at,updated_at").in("enrollment_id", ids).order("updated_at", { ascending: false }).limit(100);
      if (assignedError) return dbFail("vocrehab/templates", assignedError);
      assigned = data ?? [];
    }
  }
  const unique = new Map<string, unknown>();
  for (const row of [...(own ?? []), ...assigned] as Array<{ id: string; game_id?: string }>) {
    if (typeof row.game_id === "string" && canVocrehabActorUseGame(actor, row.game_id)) unique.set(row.id, row);
  }
  return ok({ templates: [...unique.values()] });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/templates", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  if (!object(body) || typeof body.game_id !== "string" || !games.has(body.game_id) || typeof body.title !== "string" || body.title.trim().length < 1 || body.title.length > 100 || !object(body.state) || JSON.stringify(body.state).length > 64000) return fail("Provide a valid game, title, and state under 64 KB.", 400);
  if (!canVocrehabActorUseGame(actor, body.game_id)) return fail("This game is not allowed by your parent.", 403);
  let enrollmentId: string | null = null;
  if (body.enrollment_id !== undefined && body.enrollment_id !== null) {
    if (actor.kind !== "provider" || typeof body.enrollment_id !== "string") return fail("Only the parent/provider account can assign a template to a client.", 403);
    const { data: link, error } = await actor.db.from("vocrehab_provider_clients").select("id,kid_id").eq("id", body.enrollment_id).eq("parent_id", actor.userId).is("revoked_at", null).maybeSingle();
    if (error) return dbFail("vocrehab/templates", error);
    if (!link) return fail("Client enrollment not found.", 404);
    enrollmentId = link.id;
  }
  const { data, error } = await actor.db.from("vocrehab_game_templates").insert({
    owner_id: actor.userId,
    created_by_kid_id: actor.kind === "kid" ? actor.kidId : null,
    enrollment_id: enrollmentId,
    game_id: body.game_id,
    title: body.title.trim(),
    description: typeof body.description === "string" ? body.description.slice(0, 500) : "",
    state: body.state,
    is_shared: enrollmentId !== null,
  }).select("id,owner_id,created_by_kid_id,enrollment_id,game_id,title,description,state,is_shared,created_at").single();
  if (error || !data) return dbFail("vocrehab/templates", error ?? new Error("No template returned"));
  return ok({ template: data });
}
