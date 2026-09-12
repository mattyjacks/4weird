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
  cleanArchetype,
  cleanBudget,
  cleanPrompt,
  cleanQuality,
  cleanStyleNotes,
  DRAFT_FOLDER,
  draftPathFor,
  laneForBudget,
  needsAmountConfirm,
  newInstanceId,
  planBuild,
  planFalForBuild,
  planSymphony,
  resolveArchetype,
  runMasteryLoop,
  timelineForLane,
} from "@/lib/newgameplus";
import { createHash } from "node:crypto";
import { VAULT_BUCKET, vaultObjectKey } from "@/lib/blob-vault";
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
  const archetype = cleanArchetype(input.archetype);
  if (archetype === null) return fail("Archetype must be one of custom|free|catcher|dodger|breaker|shooter|rpg (default custom).", 400);
  const style = cleanStyleNotes(input.style ?? input.style_notes);
  if (/(?:process\.env|service_role|javascript:|<script[^>]+src\s*=)/i.test(style)) {
    return fail("Unsafe style notes are not accepted.", 400);
  }

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
  // Style notes score like prompt words (theme + meld signals) but never
  // leak into titles; the resolved request rides the symphony brief.
  const scoringPrompt = (style ? `${prompt} ${style}` : prompt).slice(0, 620);
  const previewResolve = resolveArchetype(scoringPrompt, 0, archetype);
  const archetypeNote = previewResolve.freeform
    ? "completely custom (freeform engine, no parent archetype)"
    : previewResolve.parents.length > 1
      ? `meld ${previewResolve.parents.join(" x ")}`
      : `solo ${previewResolve.parents[0]}`;
  const symphony = planSymphony(prompt, quality, budget, archetypeNote);
  const fal = planFalForBuild(prompt, budget, quality);
  const timeline = timelineForLane(lane);
  const falNote = fal.selected.map((r) => `${r.op} (${r.why})`).join("; ").slice(0, 300);
  // VCW test → improve → retest mastery via runMasteryLoop, which calls
  // generateGameSource + vcwSelfTest per iteration. Variant rotation
  // guarantees the same prompt never emits the same bytes twice; the loop
  // keeps committing (new variant per loop) until the build passes with
  // polish or the capped spend runs out — every loop is a testable commit.
  const mastery = runMasteryLoop(prompt, quality, falNote, 8, plan.spend, archetype, style);
  const actualSpend = Math.max(1, Math.min(plan.spend, mastery.actualSpend || plan.spend));
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
    archetype: { displayLabel: mastery.final.displayLabel, parents: mastery.final.parents, blendNote: mastery.final.blendNote },
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
  let vaultSaved = false;
  let vaultSavedFiles = 0;

  // Single session probe, reused for the throttle AND metering below:
  // revalidating twice would double latency and open a TOCTOU window
  // between the anon throttle and the spend guard.
  let authedUser: { id: string; email?: string | null } | null = null;
  if (!hasServerSupabase()) {
    // No persistence configured: local build below, nothing to throttle.
  } else {
    try {
      const probe = await createClient();
      const { data: probeData, error: probeError } = await probe.auth.getUser();
      if (probeError) console.error("[newgameplus/build auth]", String(probeError.message ?? probeError).slice(0, 200));
      if (probeData.user) {
        authedUser = probeData.user;
      } else {
        const rl = rateLimit(`newgameplus:build:anon:${clientIp(req)}`, 10, 60_000);
        if (!rl.allowed) return fail("Rate limited. Sign in for a higher build allowance.", 429);
      }
    } catch (error) {
      console.error("[newgameplus/build auth]", String((error as Error)?.message ?? error).slice(0, 200));
      const rl = rateLimit(`newgameplus:build:anon:${clientIp(req)}`, 10, 60_000);
      if (!rl.allowed) return fail("Rate limited. Sign in for a higher build allowance.", 429);
    }
  }

  if (hasServerSupabase()) {
    try {
      const supabase = await createClient();
      const data = authedUser ? { user: authedUser } : { user: null };
      if (data.user) {
        const rl = rateLimit(`newgameplus:build:${data.user.id}`, 10, 60_000);
        if (!rl.allowed) return fail("Rate limited.", 429);

        // Draft size guard: code_submissions.source caps at 256KB. Fail
        // honest (413) instead of tripping the CHECK as a mystery save error.
        if (Buffer.byteLength(game.source, "utf8") > 262144) {
          return fail("This build is too large to save as a draft (256KB cap). Download the .html to keep it.", 413);
        }

        // Self-healing FK safeguard (mirrors ensure_bot_identity): accounts
        // whose profiles row predates provisioning would otherwise FK-fail
        // every draft save. Best-effort; the insert below stays authoritative.
        try {
          const svc = serviceClient();
          const { data: prof } = await svc.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
          if (!prof) {
            const email = (data.user.email ?? null) as string | null;
            const fallback = (email?.split("@")[0] ?? "player").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 40) || "player";
            await svc.from("profiles").insert({ id: data.user.id, email, display_name: fallback });
          }
        } catch {
          /* provisioning is best-effort; the draft insert reports the truth */
        }

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
          const se = subError as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
          const code = String(se.code ?? "");
          console.error("[newgameplus/build draft]", {
            code: code.slice(0, 16),
            message: String(se.message ?? subError).slice(0, 300),
            details: String(se.details ?? "").slice(0, 300),
            hint: String(se.hint ?? "").slice(0, 200),
          });
          draft = {
            scope: "local",
            submission_id: null,
            project_id: null,
            draft_path: draftPath,
            note: `Built below, but the draft could not be saved (download the .html to keep it).${code ? ` [${code}]` : ""}`,
          };
        } else {
          draft = {
            scope: "personal",
            submission_id: submission?.id ?? null,
            project_id: null,
            draft_path: draftPath,
            note: "Saved to your personal drafts.",
          };
          // Coin metering (fail closed, like /api/code/zip): the ACTUAL loop
          // spend debits via the guarded RPC (balance guard + 25/75 split +
          // `NewGamePlus <slug> (qX)` ledger row). A failed charge rolls the
          // draft back so short balances never mint free builds.
          const { data: metered, error: meterError } = await supabase.rpc("meter_newgameplus_build", {
            p_submission: submission?.id ?? null,
            p_slug: game.slug.slice(0, 64),
            p_title: game.title.slice(0, 120),
            p_quality: quality,
            p_budget: budget,
            p_spend: actualSpend,
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
              return fail(`Insufficient Vibe Coins: this build costs ${actualSpend} coins (25% cut included). Top up, lower Quality, or lower Budget.`, 402);
            }
            return rpcFail("newgameplus/build meter", meterError, rpcStatus, "Unable to meter this build.");
          }
          const billed = (metered ?? {}) as { gross?: unknown; cut?: unknown };
          charge = {
            billed: true,
            gross: Number(billed.gross) || actualSpend,
            cut: Number(billed.cut) || Math.round(actualSpend * 0.25 * 100) / 100,
          };
        }

        // Auto-persist the vault bundle to personal Vault rows so /vault
        // shows the newgameplus folder with zero org setup. Best-effort and
        // never build-failing: bundle dust sits inside the 500MB personal
        // free quota, so no storage metering here (build metering above is
        // the single charge). Stored as text/plain (XSS-safe) kind code.
        if (draft.submission_id) {
          try {
            const svc = serviceClient();
            for (const f of vault.files) {
              const bytes = Buffer.byteLength(f.content, "utf8");
              if (bytes < 1) continue;
              const sha256 = createHash("sha256").update(f.content, "utf8").digest("hex");
              const ext = (f.path.split(".").pop() ?? "txt").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "txt";
              const objectKey = vaultObjectKey({ scope: "personal", scopeId: data.user.id, sha256, ext });
              const { data: existing } = await svc.from("vault_blobs").select("sha256").eq("sha256", sha256).maybeSingle();
              if (!existing) {
                const up = await svc.storage
                  .from(VAULT_BUCKET)
                  .upload(objectKey, Buffer.from(f.content, "utf8"), { contentType: "text/plain", upsert: true });
                if (up.error) throw up.error;
                const { error: blobErr } = await svc
                  .from("vault_blobs")
                  .insert({ sha256, bytes, mime: "text/plain", storage_path: objectKey });
                if (blobErr && !/duplicate|unique|conflict/i.test(String(blobErr.message ?? ""))) throw blobErr;
              }
              const { error: fileErr } = await svc.from("vault_files").upsert(
                {
                  owner_id: data.user.id,
                  team_id: null,
                  org_id: null,
                  scope: "personal",
                  path: f.path,
                  sha256,
                  bytes,
                  kind: "code",
                  provenance: { mime: "text/plain", uploader: data.user.id, via: "newgameplus" },
                },
                { onConflict: "scope,owner_id,team_id,org_id,path" },
              );
              if (fileErr) throw fileErr;
              vaultSavedFiles++;
            }
            vaultSaved = vaultSavedFiles > 0;
          } catch (error) {
            console.error("[newgameplus/build vault]", String((error as Error)?.message ?? error).slice(0, 200));
          }
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
                // Re-root by stripping the bundle folder prefix (falls back
                // to the legacy slice only if the layout ever drifts).
                const bundlePrefix = `${vault.folder}/`;
                const relPaths = vault.files.map((f) =>
                  f.path.startsWith(bundlePrefix) ? f.path.slice(bundlePrefix.length) : f.path.split("/").slice(3).join("/"),
                );
                const vaultPaths = [draftPath, ...relPaths.map((rel) => `${DRAFT_FOLDER}/${game.slug}/${instanceId}/${rel}`)];
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
      game: { slug: game.slug, title: game.title, source: game.source, bytes: game.source.length, archetype: mastery.final.archetype },
      resolved: {
        label: mastery.final.displayLabel,
        family: mastery.final.archetype,
        parents: mastery.final.parents,
        blendNote: mastery.final.blendNote,
        freeform: mastery.final.freeform,
      },
      plan: { ...plan, note: NEWGAMEPLUS_CUT_NOTE },
      charge,
      test: { verdict: test.verdict, loops: test.loops, steps: test.steps, checks: test.checks, findings: test.findings },
      draft,
      swarm: symphony,
      fal: { ...fal, configured: falConfigured() },
      timeline,
      mastery: {
        mastered: mastery.mastered,
        actualSpend,
        iterations: mastery.iterations.map((it) => ({
          variant: it.variant,
          slug: it.slug,
          title: it.title,
          verdict: it.test.verdict,
          checks: it.test.checks.length,
          passed: it.test.checks.filter((c) => c.passed).length,
          improvements: it.improvements,
          bytes: it.bytes,
          spendSlice: it.spendSlice,
          spentCumulative: it.spentCumulative,
          polished: it.polished,
          archetype: it.archetype,
          displayLabel: it.displayLabel,
          parents: it.parents,
        })),
      },
      // Every loop is a testable commit: full source + verdict + checks per
      // commit so the builder can auto-load any commit into the preview and
      // the Vault can version them like GitHub commits.
      commits: mastery.iterations.map((it, n) => ({
        n: n + 1,
        variant: it.variant,
        slug: it.slug,
        title: it.title,
        source: it.source,
        bytes: it.bytes,
        improvements: it.improvements,
        spendSlice: it.spendSlice,
        spentCumulative: it.spentCumulative,
        polished: it.polished,
        archetype: it.archetype,
        displayLabel: it.displayLabel,
        parents: it.parents,
        vaultPath: `${DRAFT_FOLDER}/${it.slug}/${instanceId}/commit-${n + 1}`,
        evidence: {
          verdict: it.test.verdict,
          loops: it.test.loops,
          passed: it.test.checks.filter((c) => c.passed).length,
          total: it.test.checks.length,
          checks: it.test.checks,
          steps: it.test.steps,
          findings: it.test.findings,
        },
      })),
      vault: { folder: vault.folder, instanceId, files: vault.files.map((f) => ({ path: f.path, bytes: f.bytes })), saved: vaultSaved, savedFiles: vaultSavedFiles },
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
