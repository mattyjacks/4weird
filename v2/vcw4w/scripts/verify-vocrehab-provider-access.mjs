import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
const migration = read("supabase/migrations/20261226000007_vocrehab_provider_client_links.sql");
const actor = read("lib/vocrehab-actor.ts");
const clients = read("app/api/vocrehab/clients/route.ts");
const clientPassword = read("app/api/vocrehab/clients/password/route.ts");
const gameRoute = read("app/api/vocrehab/games/route.ts");
const templates = read("app/api/vocrehab/templates/route.ts");
const states = read("app/api/vocrehab/saved-states/route.ts");
const gameSession = read("app/api/games/session/route.ts");
const familyKids = read("app/api/family/kids/route.ts");
const familyKidDetail = read("app/api/family/kids/[id]/route.ts");
const childStatus = read("app/api/family/kid-login/route.ts");
const playGuard = read("app/vocrehab/play/access-guard.tsx");
const playLayout = read("app/vocrehab/play/layout.tsx");
const reports = read("app/api/vocrehab/reports/route.ts");
const library = read("app/vocrehab/library/page.tsx");
const gameIds = ["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle", "phone-greeting", "time-punch", "tool-match", "paycheck-plan", "energy-budget", "resume-rescue"];
const frameGameIds = new Set(["file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle"]);
const gameFrame = read("components/vocrehab/vocrehab-game-frame.tsx");
const scheduleGame = read("components/vocrehab/vocrehab-game-schedule-juggle.tsx");
const scheduleStore = read("components/vocrehab/vocrehab-schedule-store.ts");
const scheduleRoute = read("app/vocrehab/play/schedule-juggle/page.tsx");
const templateComponents = Object.fromEntries(gameIds.map((id) => [id, read(`components/vocrehab/vocrehab-game-${id}.tsx`)]));
const allGameRoutesAcceptTemplateSeeds = gameIds.every((id) => {
  const route = read(`app/vocrehab/play/${id}/page.tsx`);
  if (frameGameIds.has(id)) return route.includes("VocrehabGameFrame") && gameFrame.includes("window.location.search") && gameFrame.includes("vocrehabUrlSeed");
  const component = read(`components/vocrehab/vocrehab-game-${id}.tsx`);
  return route.includes("searchParams") && route.includes("parseSeed") && route.includes("vocrehabSeed={seed}") && component.includes("vocrehabSeed");
});

const checks = [
  ["canonical child table + parent foreign ownership", migration.includes("references public.kid_accounts(id)") && migration.includes("k.parent_id = auth.uid()")],
  ["provider account tied to same adult parent id", migration.includes("check (counselor_id = parent_id)")],
  ["child login resolves through existing kid session helper", actor.includes("getKidSession(db") && actor.includes("session.kid.parent_id")],
  ["child password change verifies current password and updates the canonical kid account", clientPassword.includes("verifyKidPassword(currentPassword") && clientPassword.includes("hashKidPassword(newPassword)") && clientPassword.includes("sameOrigin(req)")],
  ["provider password reset UI reuses the canonical parent child-account reset route", library.includes("resetProviderChildPassword") && library.includes("/api/family/kids/${encodeURIComponent(kidId)}") && library.includes("method: \"PATCH\"") && library.includes("name=\"new_password\"")],
  ["canonical parent reset validates, hashes, rate-limits, and revokes every child session", familyKidDetail.includes("rateLimit(`family-patch:") && familyKidDetail.includes("isPassword(input.password)") && familyKidDetail.includes("hashKidPassword(password)") && familyKidDetail.includes('rpc("set_kid_password"') && familyKidDetail.includes("sameOrigin(req)")],
  ["only parent-owned active kids can be enrolled", clients.includes("kid.parent_id !== actor.userId") && clients.includes("kid.status !== \"active\"")],
  ["child template and saved-state APIs require active VocRehab enrollment", templates.includes("hasActiveVocrehabEnrollment(actor)") && states.includes("hasActiveVocrehabEnrollment(actor)")],
  ["provider enrollment writes require adult actor and same-origin requests", clients.includes('actor.kind !== "provider"') && clients.includes("sameOrigin(req)") && actor.includes('profile?.age_band !== "adult"')],
  ["saved state and run records carry canonical kid id", states.includes("kid_id: kidId") && gameRoute.includes("kid_id: actor.kind === \"kid\" ? actor.kidId : null")],
  ["child game runs honor parent game and feature allowlists", gameRoute.includes("canVocrehabActorUseGame(actor, game_id)") && actor.includes("canKidUseFeature(actor.controls, `game:${gameId}`)")],
  ["saved templates and states honor child game permissions", templates.includes("canVocrehabActorUseGame(actor, body.game_id)") && templates.includes("canVocrehabActorUseGame(actor, row.game_id)") && states.includes("canVocrehabActorUseGame(actor, body.game_id)") && states.includes("canVocrehabActorUseGame(actor, String(current.game_id))")],
  ["active child cookie takes precedence over retained parent session for game metering", gameSession.includes('if (req.cookies.has("kid_session")) return kidSessionPlay(req, supabase)')],
  ["family administration rejects retained parent sessions while child context is active", familyKids.includes("hasKidSessionCookie(req)") && familyKidDetail.includes("hasKidSessionCookie(req)")],
  ["all arcade routes enforce child access and meter play with the family session RPCs", playLayout.includes("VocrehabPlayAccessGuard") && playGuard.includes('"schedule-juggle"') && playGuard.includes("allowed_games") && playGuard.includes("daily_minutes") && playGuard.includes("in_window") && playGuard.includes('JSON.stringify({ action: "start", game_id: segment })') && playGuard.includes('action: "heartbeat"') && gameRoute.includes('rpc("start_kid_session"') && gameRoute.includes('rpc("heartbeat_kid_session"') && gameRoute.includes('rpc("end_kid_session"') && childStatus.includes("vocrehab_enabled: Boolean(vocationalLink)")],
  ["reports require parent-owned active enrollment and filter by child", reports.includes(".eq(\"parent_id\", actor.userId)") && reports.includes(".eq(\"kid_id\", enrollment.kid_id)")],
  ["library persists a template seed and launches the matching starting scenario", library.includes("stateObject.seed") && library.includes("/api/vocrehab/saved-states") && library.includes('new URLSearchParams({ seed })') && library.includes("launchParams.toString()")],
  ["saved-state GET returns only a caller-owned row by id", states.includes('searchParams.get("id")') && states.includes('query.eq("id", requestedId)') && states.includes('eq("user_id", actor.userId)') && states.includes('eq("kid_id", actor.kidId)')],
  ["Schedule Juggle templates hydrate their full calendar snapshot and override device-local storage", library.includes('launchParams.set("savedStateId", savedStateId)') && scheduleGame.includes('new URLSearchParams({ id: requestedStateId })') && scheduleGame.includes('scheduleDispatch({ type: "hydrate", state: loaded })') && scheduleStore.includes("preferExternalSnapshot") && scheduleStore.includes("isScheduleStateV2")],
  ["Schedule Juggle opens directly to its untimed calendar workspace", scheduleRoute.includes("vocrehabStartInWorkspace") && gameFrame.includes('vocrehabStartInWorkspace ? "run"')],
  ["shared game frame loads authorized saved template state for its matching game", gameFrame.includes('params.get("savedStateId")') && gameFrame.includes('/api/vocrehab/saved-states?') && gameFrame.includes('payload.saved_state?.game_id !== vocrehabGameId') && gameFrame.includes("vocrehabTemplateState")],
  ["Schedule Juggle template launch hands off the saved-state row id for authorized hydration", library.includes('json.saved_state?.id') && library.includes('launchParams.set("savedStateId", savedStateId)') && library.includes('launchParams.toString()') && library.includes('template.game_id === "schedule-juggle"')],
  ["all non-Schedule Juggle games hydrate saved authored fields", gameIds.filter((id) => id !== "schedule-juggle").every((id) => {
    const component = templateComponents[id];
    const frameDriven = frameGameIds.has(id) && component.includes("vocrehabTemplateState");
    const standaloneLoader = component.includes("useVocrehabTemplateState") || (component.includes("saved-states?") && component.includes("saved_state?.game_id"));
    return frameDriven || standaloneLoader;
  })],
  ["all 11 game routes hydrate their scenario seed from templates", allGameRoutesAcceptTemplateSeeds],
];

let failed = false;
for (const [name, passed] of checks) {
  console.log(`[vocrehab-provider-access] ${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failed = true;
}
if (failed) process.exitCode = 1;
