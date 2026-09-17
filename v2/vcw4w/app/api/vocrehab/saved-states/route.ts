import { dbFail, fail, ok } from "@/lib/api-respond";
import { canVocrehabActorUseGame, hasActiveVocrehabEnrollment, resolveVocrehabActor } from "@/lib/vocrehab-actor";

const games = new Set(["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle", "time-punch", "tool-match", "resume-rescue", "phone-greeting", "paycheck-plan", "energy-budget"]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export async function GET(req: Request) {
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/saved-states", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  const targetKid = new URL(req.url).searchParams.get("kid_id");
  const requestedId = new URL(req.url).searchParams.get("id");
  if (actor.kind === "kid" && targetKid && targetKid !== actor.kidId) return fail("You can only view your own saved games.", 403);
  if (actor.kind === "provider" && targetKid) {
    const { data: kid, error } = await actor.db.from("kid_accounts").select("id").eq("id", targetKid).eq("parent_id", actor.userId).eq("status", "active").maybeSingle();
    if (error) return dbFail("vocrehab/saved-states", error);
    if (!kid) return fail("Child account is not owned by this parent.", 403);
  }
  let query = actor.db.from("vocrehab_saved_game_states").select("id,game_id,template_id,enrollment_id,kid_id,title,state,updated_at").eq("user_id", actor.userId).order("updated_at", { ascending: false }).limit(100);
  query = actor.kind === "kid" ? query.eq("kid_id", actor.kidId) : targetKid ? query.eq("kid_id", targetKid) : query.is("kid_id", null);
  if (requestedId) query = query.eq("id", requestedId);
  const { data, error } = await query;
  if (error) return dbFail("vocrehab/saved-states", error);
  const permitted = (data ?? []).filter((row: { game_id?: string }) => typeof row.game_id === "string" && canVocrehabActorUseGame(actor, row.game_id));
  if (requestedId) {
    const savedState = permitted[0];
    if (!savedState) return fail("Saved state not found or unavailable.", 404);
    return ok({ saved_state: savedState });
  }
  return ok({ saved_states: permitted });
}

/** Update a saved state while retaining its existing parent/kid ownership. */
export async function PATCH(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/saved-states", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  if (!object(body) || typeof body.id !== "string" || !body.id) return fail("A saved state id is required.", 400);
  if (actor.kind === "kid") {
    const { data: current, error } = await actor.db.from("vocrehab_saved_game_states").select("game_id").eq("id", body.id).eq("user_id", actor.userId).eq("kid_id", actor.kidId).maybeSingle();
    if (error) return dbFail("vocrehab/saved-states", error);
    if (!current) return fail("Saved state not found.", 404);
    if (!canVocrehabActorUseGame(actor, String(current.game_id))) return fail("This game is not allowed by your parent.", 403);
  }
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length > 100) return fail("Title must be 100 characters or fewer.", 400);
    updates.title = body.title.trim() || "My saved game";
  }
  if (body.state !== undefined) {
    if (!object(body.state) || JSON.stringify(body.state).length > 64000) return fail("State must be a JSON object under 64 KB.", 400);
    updates.state = body.state;
  }
  if (body.template_id !== undefined) {
    if (body.template_id !== null && typeof body.template_id !== "string") return fail("template_id must be a UUID or null.", 400);
    if (body.template_id) {
      let currentQuery = actor.db.from("vocrehab_saved_game_states").select("id,game_id").eq("id", body.id).eq("user_id", actor.userId);
      if (actor.kind === "kid") currentQuery = currentQuery.eq("kid_id", actor.kidId);
      const { data: current, error: currentError } = await currentQuery.maybeSingle();
      if (currentError) return dbFail("vocrehab/saved-states", currentError);
      if (!current) return fail("Saved state not found.", 404);
      if (!canVocrehabActorUseGame(actor, String(current.game_id))) return fail("This game is not allowed by your parent.", 403);
      const { data: template, error } = await actor.db.from("vocrehab_game_templates").select("id,game_id,owner_id,created_by_kid_id,enrollment_id").eq("id", body.template_id).eq("owner_id", actor.userId).maybeSingle();
      if (error) return dbFail("vocrehab/saved-states", error);
      if (!template) return fail("Template is unavailable.", 404);
      if (template.game_id !== current.game_id) return fail("Template must use the same game as the saved state.", 400);
      if (actor.kind === "kid" && template.created_by_kid_id !== actor.kidId) {
        const { data: link, error: linkError } = await actor.db.from("vocrehab_provider_clients").select("id").eq("id", template.enrollment_id ?? "").eq("kid_id", actor.kidId).eq("parent_id", actor.userId).is("revoked_at", null).maybeSingle();
        if (linkError) return dbFail("vocrehab/saved-states", linkError);
        if (!link) return fail("That template was not assigned to your account.", 403);
      }
      updates.template_id = template.id;
    } else updates.template_id = null;
  }
  if (Object.keys(updates).length === 0) return fail("Provide a title, state, or template_id to update.", 400);
  updates.updated_at = new Date().toISOString();
  let query = actor.db.from("vocrehab_saved_game_states").update(updates).eq("id", body.id).eq("user_id", actor.userId);
  if (actor.kind === "kid") query = query.eq("kid_id", actor.kidId);
  const { data, error } = await query.select("id,game_id,template_id,enrollment_id,kid_id,title,state,updated_at").maybeSingle();
  if (error) return dbFail("vocrehab/saved-states", error);
  if (!data) return fail("Saved state not found.", 404);
  return ok({ saved_state: data });
}

/** Delete only the caller's own saved state (or the selected parent's child state). */
export async function DELETE(req: Request) {
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/saved-states", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("A saved state id is required.", 400);
  if (actor.kind === "kid") {
    const { data: current, error: currentError } = await actor.db.from("vocrehab_saved_game_states").select("game_id").eq("id", id).eq("user_id", actor.userId).eq("kid_id", actor.kidId).maybeSingle();
    if (currentError) return dbFail("vocrehab/saved-states", currentError);
    if (!current) return fail("Saved state not found.", 404);
    if (!canVocrehabActorUseGame(actor, String(current.game_id))) return fail("This game is not allowed by your parent.", 403);
  }
  let query = actor.db.from("vocrehab_saved_game_states").delete().eq("id", id).eq("user_id", actor.userId);
  if (actor.kind === "kid") query = query.eq("kid_id", actor.kidId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return dbFail("vocrehab/saved-states", error);
  if (!data) return fail("Saved state not found.", 404);
  return ok({ deleted: true, id: data.id });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with a parent account or use your active child session.", 401);
  const access = await hasActiveVocrehabEnrollment(actor);
  if (access.error) return dbFail("vocrehab/saved-states", access.error);
  if (!access.allowed) return fail("Ask your parent/provider to enable your VocRehab workspace.", 403);
  if (!object(body) || typeof body.game_id !== "string" || !games.has(body.game_id) || !object(body.state) || JSON.stringify(body.state).length > 64000) return fail("Provide a valid game and state under 64 KB.", 400);
  if (!canVocrehabActorUseGame(actor, body.game_id)) return fail("This game is not allowed by your parent.", 403);
  let kidId = actor.kind === "kid" ? actor.kidId : null;
  if (actor.kind === "provider" && body.kid_id !== undefined && body.kid_id !== null) {
    if (typeof body.kid_id !== "string") return fail("kid_id must be a child account id.", 400);
    const { data: kid } = await actor.db.from("kid_accounts").select("id").eq("id", body.kid_id).eq("parent_id", actor.userId).maybeSingle();
    if (!kid) return fail("Child account is not owned by this parent.", 403);
    kidId = kid.id;
  }
  let templateId: string | null = null;
  let enrollmentId: string | null = null;
  if (body.template_id !== undefined && body.template_id !== null) {
    if (typeof body.template_id !== "string") return fail("template_id must be a UUID.", 400);
    const { data: template, error } = await actor.db.from("vocrehab_game_templates").select("id,owner_id,created_by_kid_id,enrollment_id,game_id").eq("id", body.template_id).maybeSingle();
    if (error) return dbFail("vocrehab/saved-states", error);
    if (!template || template.game_id !== body.game_id || template.owner_id !== actor.userId) return fail("Template is unavailable or belongs to another game/account.", 404);
    if (actor.kind === "kid" && template.created_by_kid_id !== actor.kidId && template.enrollment_id === null) return fail("That template was not assigned to your account.", 403);
    if (kidId && template.enrollment_id) {
      const { data: link } = await actor.db.from("vocrehab_provider_clients").select("id").eq("id", template.enrollment_id).eq("kid_id", kidId).eq("parent_id", actor.userId).is("revoked_at", null).maybeSingle();
      if (!link) return fail("Template is not assigned to this child.", 403);
      enrollmentId = link.id;
    }
    templateId = template.id;
  }
  if (actor.kind === "kid") {
    const { data: link } = await actor.db.from("vocrehab_provider_clients").select("id").eq("kid_id", actor.kidId).eq("parent_id", actor.userId).is("revoked_at", null).maybeSingle();
    enrollmentId = link?.id ?? null;
  }
  const { data, error } = await actor.db.from("vocrehab_saved_game_states").insert({ user_id: actor.userId, kid_id: kidId, enrollment_id: enrollmentId, game_id: body.game_id, template_id: templateId, title: typeof body.title === "string" ? body.title.trim().slice(0, 100) || "My saved game" : "My saved game", state: body.state }).select("id,game_id,template_id,enrollment_id,kid_id,title,state,updated_at").single();
  if (error || !data) return dbFail("vocrehab/saved-states", error ?? new Error("No saved state returned"));
  return ok({ saved_state: data });
}
