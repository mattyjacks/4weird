import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

type VerifyCheck = { id?: unknown; label?: unknown; passed?: unknown; detail?: unknown };
type VerifyFinding = { severity?: unknown; title?: unknown; description?: unknown };

const VCW_SEVERITIES = ["low", "medium", "high", "critical"] as const;

function cleanSeverity(v: unknown): string {
  const s = String(v ?? "medium").trim().toLowerCase();
  return (VCW_SEVERITIES as readonly string[]).includes(s) ? s : "medium";
}

/**
 * POST /api/newgameplus/vcw-verify — transcribe a NewGamePlus commit's
 * executed local playtest into a REAL vcw_runs row (steps + bugs + verdict),
 * metered at standard VCW rates, so the commit carries VibeCodeWorker
 * ledger evidence instead of only in-memory claims.
 *
 * Body: { submission_id, commit_n?, slug, title, verdict, loops,
 *   checks: [{id,label,passed,detail}], steps: string[],
 *   findings: [{severity,title,description}] }.
 *
 * Honesty contract: every step is tagged [ngp-local] with
 * data.provenance 'local-headless', and the completion summary states the
 * evidence was transcribed from the in-process executed playtest — no
 * remote browser session is implied. Opt-in and separately metered
 * (outside plan.spend): run-open 10 + 1/step + 2/bug, 25% cut included.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  // Signed-in spenders bypass BotID false-positives, same as the build call.
  const botBlock = await requireHuman(req, "POST /api/newgameplus/vcw-verify", { allowAuthenticated: true });
  if (botBlock) return botBlock;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`newgameplus:vcw-verify:${auth.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const submissionId = String(input.submission_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return fail("submission_id (your saved draft) is required.", 400);
  const { data: submission } = await supabase
    .from("code_submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!submission) return fail("Draft not found on your account.", 404);

  const slug = String(input.slug ?? "").trim().slice(0, 64);
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return fail("A valid commit slug is required.", 400);
  const title = String(input.title ?? "Untitled Game").slice(0, 120);
  const commitN = Math.max(1, Math.floor(Number(input.commit_n ?? 1)) || 1);
  const verdictRaw = String(input.verdict ?? "inconclusive").trim().toLowerCase();
  const verdict = verdictRaw === "pass" ? "pass" : verdictRaw === "fail" ? "fail" : "inconclusive";
  const loops = Math.max(1, Math.min(99, Math.floor(Number(input.loops ?? 1)) || 1));
  const checks = (Array.isArray(input.checks) ? input.checks : []).slice(0, 30) as VerifyCheck[];
  const stepsIn = (Array.isArray(input.steps) ? input.steps : []).slice(0, 12).map((s) => String(s).slice(0, 500));
  const findingsIn = (Array.isArray(input.findings) ? input.findings : []).slice(0, 8) as VerifyFinding[];

  const goal = `NewGamePlus verify: ${title} (commit ${commitN}) — transcribed local executed playtest`.slice(0, 500);

  const { data: run, error: runError } = await supabase
    .from("vcw_runs")
    .insert({ user_id: auth.user.id, game_slug: slug, goal })
    .select("id")
    .single();
  if (runError || !run) return dbFail("newgameplus/vcw-verify run", runError, "Unable to open a VCW run.");
  const runId: string = run.id;

  async function rollback() {
    try {
      await supabase.from("vcw_runs").delete().eq("id", runId).eq("user_id", auth.user!.id);
    } catch {
      /* rollback best-effort; the meter fault below is authoritative */
    }
  }

  async function meter(op: string, qty: number): Promise<{ ok: boolean; gross: number; status: number; message: string }> {
    const { data: charged, error } = await supabase.rpc("meter_vcw_usage", {
      p_op: op,
      p_qty: qty,
      p_run: runId,
      p_source: "api",
    });
    if (!error) return { ok: true, gross: Number((charged as { gross?: unknown } ?? {}).gross) || 0, status: 200, message: "" };
    const message = String((error as { message?: unknown } | null)?.message ?? error ?? "");
    await rollback();
    if (/insufficient|balance|funds/i.test(message)) {
      return { ok: false, gross: 0, status: 402, message: "Insufficient Vibe Coins for VCW verify. Top up and retry." };
    }
    return { ok: false, gross: 0, status: 500, message: "Unable to meter VCW verify." };
  }

  const mRun = await meter("run-open", 1);
  if (!mRun.ok) {
    return mRun.status === 402
      ? fail(mRun.message, 402)
      : rpcFail("newgameplus/vcw-verify meter", { message: mRun.message }, rpcStatus, mRun.message);
  }

  // Transcribe: every check becomes an observation step, failures + serious
  // findings become bugs. All tagged local-headless — never remote play.
  const stepRows: { run_id: string; user_id: string; kind: string; text: string; data: Record<string, unknown> }[] = [];
  for (const c of checks) {
    const label = String(c.label ?? c.id ?? "check").slice(0, 120);
    const passed = c.passed === true;
    const detail = String(c.detail ?? "").slice(0, 300);
    stepRows.push({
      run_id: runId,
      user_id: auth.user.id,
      kind: "observation",
      text: `[ngp-local check] ${label}: ${passed ? "PASS" : "FAIL"}${detail && !passed ? ` — ${detail}` : ""}`.slice(0, 1000),
      data: { provenance: "local-headless", check_id: String(c.id ?? label).slice(0, 64), passed, commit_n: commitN },
    });
    if (stepRows.length >= 20) break;
  }
  for (const s of stepsIn) {
    if (!s.trim() || stepRows.length >= 30) continue;
    stepRows.push({
      run_id: runId,
      user_id: auth.user.id,
      kind: "observation",
      text: `[ngp-local] ${s}`.slice(0, 1000),
      data: { provenance: "local-headless", commit_n: commitN },
    });
  }
  for (const f of findingsIn.slice(0, 5)) {
    const t = String(f.title ?? "").slice(0, 120);
    if (!t.trim() || stepRows.length >= 32) continue;
    stepRows.push({
      run_id: runId,
      user_id: auth.user.id,
      kind: "finding",
      text: `[ngp-local finding] [${cleanSeverity(f.severity)}] ${t}`.slice(0, 1000),
      data: { provenance: "local-headless", commit_n: commitN },
    });
  }
  if (stepRows.length) {
    const { error: stepsError } = await supabase.from("vcw_run_steps").insert(stepRows);
    if (stepsError) {
      await rollback();
      return dbFail("newgameplus/vcw-verify steps", stepsError, "Unable to record VCW steps.");
    }
    const mSteps = await meter("action-step", stepRows.length);
    if (!mSteps.ok) {
      return mSteps.status === 402
        ? fail(mSteps.message, 402)
        : rpcFail("newgameplus/vcw-verify meter", { message: mSteps.message }, rpcStatus, mSteps.message);
    }
  }

  const bugRows: { user_id: string; run_id: string; game_slug: string; title: string; description: string; severity: string }[] = [];
  for (const c of checks) {
    if (c.passed === true || bugRows.length >= 8) continue;
    const label = String(c.label ?? c.id ?? "check").slice(0, 120);
    bugRows.push({
      user_id: auth.user.id,
      run_id: runId,
      game_slug: slug,
      title: `[${slug}] check failed: ${label}`.slice(0, 200),
      description: `Transcribed from NewGamePlus local executed playtest (commit ${commitN}, ${loops} loop(s)).\nDetail: ${String(c.detail ?? "no detail").slice(0, 500)}\nProvenance: local-headless — no remote browser session.`.slice(0, 10000),
      severity: "medium",
    });
  }
  for (const f of findingsIn) {
    const sev = cleanSeverity(f.severity);
    if ((sev !== "high" && sev !== "critical") || bugRows.length >= 12) continue;
    const t = String(f.title ?? "").slice(0, 120);
    if (!t.trim()) continue;
    bugRows.push({
      user_id: auth.user.id,
      run_id: runId,
      game_slug: slug,
      title: `[${slug}] ${t}`.slice(0, 200),
      description: `Transcribed from NewGamePlus local executed playtest (commit ${commitN}).\n${String(f.description ?? "").slice(0, 1000)}\nProvenance: local-headless — no remote browser session.`.slice(0, 10000),
      severity: sev,
    });
  }
  if (bugRows.length) {
    const { error: bugsError } = await supabase.from("vcw_bugs").insert(bugRows);
    if (bugsError) {
      await rollback();
      return dbFail("newgameplus/vcw-verify bugs", bugsError, "Unable to file VCW bugs.");
    }
    const mBugs = await meter("bug-file", bugRows.length);
    if (!mBugs.ok) {
      return mBugs.status === 402
        ? fail(mBugs.message, 402)
        : rpcFail("newgameplus/vcw-verify meter", { message: mBugs.message }, rpcStatus, mBugs.message);
    }
  }

  const passed = checks.filter((c) => c.passed === true).length;
  const summary = `NGP local executed playtest transcription: ${passed}/${checks.length} checks green over ${loops} loop(s) (commit ${commitN}). Evidence transcribed from in-process node:vm boot + rAF frames + synthetic input; no remote browser session.`.slice(0, 5000);
  const { error: completeError } = await supabase
    .from("vcw_runs")
    .update({ status: "completed", verdict, summary })
    .eq("id", runId)
    .eq("user_id", auth.user.id);
  if (completeError) {
    await rollback();
    return dbFail("newgameplus/vcw-verify complete", completeError, "Unable to complete the VCW run.");
  }

  return ok(
    {
      run_id: runId,
      game_slug: slug,
      verdict,
      steps: stepRows.length,
      bugs: bugRows.length,
      note: "VCW run recorded (transcribed local evidence, metered at VCW rates). Open it via GET /api/vcw/runs/[id]; full archive via /export; digest via /handoff.",
    },
    201,
  );
}
