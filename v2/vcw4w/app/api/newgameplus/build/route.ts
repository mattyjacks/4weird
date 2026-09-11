import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import {
  BUDGET_CONFIRM_THRESHOLD,
  BUDGET_DEFAULT,
  BUDGET_MAX,
  BUDGET_MIN,
  DRAFT_PROJECT_SLUG,
  NEWGAMEPLUS_CUT_NOTE,
  QUALITY_DEFAULT,
  QUALITY_MAX,
  QUALITY_MIN,
  buildVaultBundle,
  cleanBudget,
  cleanPrompt,
  cleanQuality,
  DRAFT_FOLDER,
  draftPathFor,
  laneForBudget,
  needsAmountConfirm,
  newInstanceId,
  planBuild,
  planFalForBuild,
  planSymphony,
  runMasteryLoop,
  timelineForLane,
} from "@/lib/newgameplus";
import { falConfigured } from "@/lib/fal";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): boolean {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

/**
 * POST /api/newgameplus/build ;; one prompt in, one tested game out.
 * Body: { prompt, quality?, budget?, org_id?, confirmed? }.
 *
 * Flow: validate → cost-optimize (cheapest viable) → conduct the swarm
 * symphony (Scout→Forge→[Pixel→Echo]→Sage, 3 bots fast lane / 5 deluxe) →
 * intelligently shortlist fal media for the prompt (keyword-matched,
 * budget-capped, fast-lane prefers fast ops) → generate the original
 * single-file HTML/CSS/JS (server work is ms, so the ≤5-min fast-lane
 * target always holds; deluxe runs longer but stays fast) → VibeCodeWorker
 * intelligent self-test (observe→reason→act repair loop) → meter the capped
 * spend (plan.spend, 25% cut included, fail closed on low balance) → push to
 * the Draft game folder inside your org (team project `draft-games`, path
 * `Draft/<slug>/index.html`) plus a personal `code_submissions` draft row.
 * Always succeeds with a playable artifact: persistence degrades honestly
 * when Supabase/auth or org permissions are missing, and fal assets degrade
 * to one-click prompts when FAL_KEY is unset (never faked, never charged).
 */
export async function POST(req: Request) {
  // No-auth builds still require a first-party caller: the builder meters
  // coins and writes drafts for signed-in users, so cross-site POSTs must
  // prove Origin even when this particular call carries no session.
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  // Signed-in spenders bypass BotID false-positives: a valid session proves a
  // debitable account, so logged-in automation/flagged browsers can still build.
  // Anonymous callers stay gated (free-play abuse shield).
  const botBlock = await requireHuman(req, "POST /api/newgameplus/build", { allowAuthenticated: true });
  if (botBlock) return botBlock;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const prompt = cleanPrompt(input.prompt);
  if (prompt.length < 3) return fail("A game prompt is required (3-500 chars). Just describe the game.", 400);
  if (/(?:process\.env|service_role|javascript:|<script[^>]+src\s*=)/i.test(prompt)) {
    return fail("Unsafe prompt is not accepted.", 400);
  }

  const quality = cleanQuality(input.quality);
  if (quality === null) return fail(`Quality must be an integer ${QUALITY_MIN}-${QUALITY_MAX} (default ${QUALITY_DEFAULT}).`, 400);
  const budget = cleanBudget(input.budget);
  if (budget === null) return fail(`Budget must be ${BUDGET_MIN}-${BUDGET_MAX} coins (default ${BUDGET_DEFAULT}).`, 400);

  const confirmed = input.confirmed === true || input.confirmed === "true";
  if (needsAmountConfirm(budget) && !confirmed) {
    return fail(
      `Confirm the Amount: ${budget} coins is above ${BUDGET_CONFIRM_THRESHOLD}. Resend with confirmed:true to launch.`,
      402,
    );
  }

  const orgId = isUuid(input.org_id ?? input.orgId) ? String(input.org_id ?? input.orgId) : null;

  const plan = planBuild(quality, budget);
  const lane = laneForBudget(budget);
  const symphony = planSymphony(prompt, quality, budget);
  const fal = planFalForBuild(prompt, budget, quality);
  const timeline = timelineForLane(lane);
  const falNote = fal.selected.map((r) => `${r.op} (${r.why})`).join("; ").slice(0, 300);
  // VCW test → improve → retest mastery via runMasteryLoop, which calls
  // generateGameSource + vcwSelfTest per iteration. Variant rotation
  // guarantees the same prompt never emits the same bytes twice; loop until pass.
  const mastery = runMasteryLoop(prompt, quality, falNote, 3);
  const game = { slug: mastery.final.slug, title: mastery.final.title, source: mastery.final.source };
  const test = mastery.final.test;
  const draftPath = draftPathFor(game.slug);
  // Weird Vault per-game per-instance bundle: html/ + css/ + js/ + content/.
  const instanceId = newInstanceId();
  const vault = buildVaultBundle({
    slug: game.slug,
    title: game.title,
    prompt,
    quality,
    source: game.source,
    test,
    iterations: mastery.iterations,
    instanceId,
    falNote,
  });

  // Persistence (best-effort, honest): personal draft + org Draft folder.
  // Signed-in builds are metered (plan.spend, 25% cut included); anonymous
  // builds stay free and local-only.
  let draft: { scope: string; submission_id: string | null; project_id: string | null; draft_path: string; note: string } = {
    scope: "local",
    submission_id: null,
    project_id: null,
    draft_path: draftPath,
    note: "Played locally below ;; sign in to save drafts.",
  };
  let charge: { billed: boolean; gross: number; cut: number } = { billed: false, gross: 0, cut: 0 };

  // Anonymous callers were throttled ONLY by BotID: a passed check meant
  // unlimited builds. Per-IP ceiling keeps the GUI usable for flagged humans
  // (via sign-in bypass above) without opening a free-build floodgate.
  if (!hasServerSupabase()) {
    // No persistence configured: local build below, nothing to throttle.
  } else {
    try {
      const probe = await createClient();
      const { data: probeData } = await probe.auth.getUser();
      if (!probeData.user) {
        const rl = rateLimit(`newgameplus:build:anon:${clientIp(req)}`, 10, 60_000);
        if (!rl.allowed) return fail("Rate limited. Sign in for a higher build allowance.", 429);
      }
    } catch {
      const rl = rateLimit(`newgameplus:build:anon:${clientIp(req)}`, 10, 60_000);
      if (!rl.allowed) return fail("Rate limited. Sign in for a higher build allowance.", 429);
    }
  }

  if (hasServerSupabase()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const rl = rateLimit(`newgameplus:build:${data.user.id}`, 10, 60_000);
        if (!rl.allowed) return fail("Rate limited.", 429);

        const { data: submission, error: subError } = await supabase
          .from("code_submissions")
          .insert({
            owner_id: data.user.id,
            title: `[NewGamePlus] ${game.title}`.slice(0, 80),
            source: game.source,
            status: "draft",
          })
          .select("id")
          .single();
        // Honest degradation (the route promises a playable artifact): a
        // failed draft save must never 500 the whole build. The game below
        // is complete and downloadable; only the saved copy is missing.
        if (subError) {
          console.error("[newgameplus/build draft]", subError.code ?? subError.message);
          draft = {
            scope: "local",
            submission_id: null,
            project_id: null,
            draft_path: draftPath,
            note: "Built below, but the draft could not be saved (download the .html to keep it).",
          };
        } else {
          draft = {
            scope: "personal",
            submission_id: submission?.id ?? null,
            project_id: null,
            draft_path: draftPath,
            note: "Saved to your personal drafts.",
          };
          // Coin metering (fail closed, like /api/code/zip): the capped
          // spend debits via the guarded RPC (balance guard + 25/75 split +
          // `NewGamePlus <slug> (qX)` ledger row). A failed charge rolls the
          // draft back so short balances never mint free builds.
          const { data: metered, error: meterError } = await supabase.rpc("meter_newgameplus_build", {
            p_submission: submission?.id ?? null,
            p_slug: game.slug.slice(0, 64),
            p_title: game.title.slice(0, 120),
            p_quality: quality,
            p_budget: budget,
            p_spend: plan.spend,
            p_lane: lane,
          });
          if (meterError) {
            try {
              await serviceClient().from("code_submissions").delete().eq("id", submission?.id);
            } catch {
              /* rollback best-effort; the charge failure below is authoritative */
            }
            const msg = String(meterError.message ?? "");
            if (/insufficient balance/i.test(msg)) {
              return fail(`Insufficient Vibe Coins: this build costs ${plan.spend} coins (25% cut included). Top up, lower Quality, or lower Budget.`, 402);
            }
            return rpcFail("newgameplus/build meter", meterError, rpcStatus, "Unable to meter this build.");
          }
          const billed = (metered ?? {}) as { gross?: unknown; cut?: unknown };
          charge = {
            billed: true,
            gross: Number(billed.gross) || plan.spend,
            cut: Number(billed.cut) || plan.cut,
          };
        }

        // Org push needs the saved personal draft row; when the draft save
        // degraded above there is nothing to link, so skip (the local game
        // below is still complete).
        if (orgId && draft.submission_id) {
          const { data: org } = await supabase.from("orgs").select("id,slug").eq("id", orgId).maybeSingle();
          if (!org) {
            draft.note = "Saved to personal drafts ;; org not found or not a member.";
          } else {
            const { data: teams } = await supabase.from("teams").select("id").eq("org_id", orgId).limit(1);
            const teamId = teams?.[0]?.id as string | undefined;
            if (!teamId) {
              draft.note = "Saved to personal drafts ;; this org has no workspace yet (create one on /teams).";
            } else {
              let projectId: string | null = null;
              const { data: existing } = await supabase
                .from("team_projects")
                .select("id")
                .eq("team_id", teamId)
                .eq("slug", DRAFT_PROJECT_SLUG)
                .maybeSingle();
              projectId = (existing?.id as string | undefined) ?? null;
              if (!projectId) {
                const { data: created, error: createError } = await supabase.rpc("create_project", {
                  p_team: teamId,
                  p_slug: DRAFT_PROJECT_SLUG,
                  p_name: "Draft Games",
                  p_visibility: "private",
                });
                if (createError) {
                  const msg = String(createError.message ?? "");
                  if (/forbidden/i.test(msg)) {
                    draft.note = "Saved to personal drafts ;; missing team.projects.create in this org.";
                  } else {
                    return rpcFail("newgameplus/build project", createError, rpcStatus, "Unable to open the Draft folder.");
                  }
                } else {
                  projectId = (created as { id?: string } | null)?.id ?? (created as unknown as string) ?? null;
                  if (typeof projectId !== "string") {
                    const { data: retry } = await supabase
                      .from("team_projects")
                      .select("id")
                      .eq("team_id", teamId)
                      .eq("slug", DRAFT_PROJECT_SLUG)
                      .maybeSingle();
                    projectId = (retry?.id as string | undefined) ?? null;
                  }
                }
              }
              if (projectId) {
                // Push the playable file plus the full vault bundle so the
                // org Draft folder mirrors newgameplus/<slug>/<instance>/.
                // Bundle paths are newgameplus/<slug>/<instance>/… (same instanceId
                // passed to buildVaultBundle above), so slice(3) strips the
                // bundle root and re-roots the html/css/js/content tree under
                // Draft/<slug>/<instanceId>/ with no doubled segment.
                const vaultPaths = [draftPath, ...vault.files.map((f) => `${DRAFT_FOLDER}/${game.slug}/${instanceId}/${f.path.split("/").slice(3).join("/")}`)];
                const vaultContents = [game.source, ...vault.files.map((f) => f.content)];
                let pushError: { message?: string } | null = null;
                for (let i = 0; i < vaultPaths.length; i++) {
                  const { error } = await supabase.rpc("push_file", {
                    p_project: projectId,
                    p_branch: "main",
                    p_path: vaultPaths[i],
                    p_content: vaultContents[i],
                    p_message: `NewGamePlus: ${game.title} (q${quality}, ${plan.spend} coins)`,
                  });
                  if (error) {
                    pushError = error as { message?: string };
                    break;
                  }
                }
                if (pushError) {
                  if (/forbidden/i.test(String(pushError.message ?? ""))) {
                    draft.note = "Saved to personal drafts ;; missing project.code.push in this org.";
                  } else {
                    return rpcFail("newgameplus/build push", pushError, rpcStatus, "Unable to push to the Draft folder.");
                  }
                } else {
                  draft = {
                    scope: `org:${(org as { slug?: string }).slug ?? orgId}`,
                    submission_id: draft.submission_id ?? submission?.id ?? null,
                    project_id: projectId,
                    draft_path: `${DRAFT_PROJECT_SLUG}/${draftPath}`,
                    note: "Pushed to the Draft game folder inside your org.",
                  };
                }
              }
            }
          }
        }
      }
    } catch (error) {
      return dbFail("newgameplus/build", error, "Unable to build the game.");
    }
  }

  return ok(
    {
      game: { slug: game.slug, title: game.title, source: game.source, bytes: game.source.length },
      plan: { ...plan, note: NEWGAMEPLUS_CUT_NOTE },
      charge,
      test: { verdict: test.verdict, loops: test.loops, steps: test.steps, checks: test.checks, findings: test.findings },
      draft,
      swarm: symphony,
      fal: { ...fal, configured: falConfigured() },
      timeline,
      mastery: {
        mastered: mastery.mastered,
        iterations: mastery.iterations.map((it) => ({
          variant: it.variant,
          slug: it.slug,
          title: it.title,
          verdict: it.test.verdict,
          checks: it.test.checks.length,
          passed: it.test.checks.filter((c) => c.passed).length,
          improvements: it.improvements,
        })),
      },
      vault: { folder: vault.folder, instanceId, files: vault.files.map((f) => ({ path: f.path, bytes: f.bytes })) },
      vaultFiles: vault.files,
    },
    201,
  );
}

/**
 * GET /api/newgameplus/build ;; list the caller's NewGamePlus drafts.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`newgameplus:list:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { data: rows, error } = await supabase
    .from("code_submissions")
    .select("id,title,status,created_at,updated_at")
    .eq("owner_id", data.user.id)
    .like("title", "[NewGamePlus]%")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return dbFail("newgameplus/build list", error, "Unable to load drafts.");
  return ok({ drafts: rows ?? [], limits: { quality: { min: QUALITY_MIN, max: QUALITY_MAX, def: QUALITY_DEFAULT }, budget: { min: BUDGET_MIN, max: BUDGET_MAX, def: BUDGET_DEFAULT, confirmAbove: BUDGET_CONFIRM_THRESHOLD } } });
}
