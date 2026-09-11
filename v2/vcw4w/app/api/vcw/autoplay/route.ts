import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";
import {
  AUTOPLAY_MAX_MINUTES,
  AUTOPLAY_CUT_NOTE,
  VCW_DESKTOP_PATH,
  isAutoplayCompute,
  isAutoplaySiteMode,
  quoteAutoplayForUsd,
  resolveAutoplayPlan,
} from "@/lib/vcw-autoplay";
import { getPodIdlePolicy, describePodIdlePolicy } from "@/lib/pod-idle";
import { provisionAutoplayWorker } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/autoplay; start a VibeCodeWorker autoplay remote.
 *
 * Body: { game_slug, compute: cpu|gpu|gpu-boosted,
 *         site_mode?: on-site|off-site, desktop_installed?: boolean }
 *
 * Enforcement (shared with the client via lib/vcw-autoplay):
 * - 4weird catalog games: on-site only (browser control locked to the
 *   first-party play URL). Off-site is refused.
 * - Xonotic: gpu-boosted only + off-site only + desktop install required.
 *   Anything else is refused with needsDesktop + desktopUrl.
 *
 * Auth required. Never provisions without live RunPod stock/credentials:
 * unconfigured / no_stock / over_budget / provision_failed come back as
 * an honest started:false payload (mirrors /api/agents/[id]/book), never
 * a faked endpoint. RunPod bills the operator's card per second; coin
 * figures below are gross autoplay quotes (25% cut included).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:autoplay:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const gameSlug = String(input.game_slug ?? input.gameSlug ?? "").toLowerCase();
  const compute = String(input.compute ?? "cpu").toLowerCase();
  const siteModeRaw = String(input.site_mode ?? input.siteMode ?? "on-site").toLowerCase();
  const desktopInstalled = input.desktop_installed === true || input.desktopInstalled === true;

  if (!/^[a-z0-9-]{1,64}$/.test(gameSlug)) return fail("Invalid game_slug.", 400);
  if (!isAutoplayCompute(compute)) return fail("Invalid compute. Use cpu, gpu, or gpu-boosted.", 400);
  if (siteModeRaw !== "on-site" && siteModeRaw !== "off-site") {
    return fail("Invalid site_mode. Use on-site or off-site.", 400);
  }
  if (!isAutoplaySiteMode(siteModeRaw)) return fail("Invalid site_mode.", 400);

  const plan = resolveAutoplayPlan({
    gameSlug,
    compute,
    siteMode: siteModeRaw,
    desktopInstalled,
    catalogSlugs: gameSlugs,
  });
  if (!plan.ok) {
    const status = plan.needsDesktop ? 403 : 400;
    return fail(plan.error, status);
  }

  const provisioned = await provisionAutoplayWorker({
    name: `vcw-autoplay-${plan.gameSlug}`,
    gameSlug: plan.gameSlug,
    compute: plan.compute,
    siteMode: plan.siteMode,
  });

  if ("error" in provisioned) {
    return ok({
      started: false,
      plan: {
        game_slug: plan.gameSlug,
        compute: plan.compute,
        site_mode: plan.siteMode,
        target_url: plan.targetUrl,
      },
      provision: { ok: false, code: provisioned.error, message: provisioned.message ?? "Provisioning failed." },
      desktop_url: VCW_DESKTOP_PATH,
      note: "RunPod remote not started; no spend. Fix the provision state above and retry.",
    });
  }

  const quote = quoteAutoplayForUsd(provisioned.hourlyUsd, AUTOPLAY_MAX_MINUTES);
  const maxRunUsd = Math.round((provisioned.hourlyUsd / 60) * AUTOPLAY_MAX_MINUTES * 100) / 100;
  const idlePolicy = getPodIdlePolicy();

  // Record ownership: autoplay remotes used to be fire-and-forget (pod id
  // returned once, never stored) so they could never be stopped and never
  // shut off. Now the creator owns a row (vcw_autoplay_remotes) and can
  // stop/start/restart/terminate it from /desktop or /runpods; the client
  // watchdog + server sweep enforce the idle policy on it.
  let remoteId: string | null = null;
  try {
    const db = serviceClient();
    const { data: row, error: rowErr } = await db
      .from("vcw_autoplay_remotes")
      .insert({
        user_id: data.user.id,
        pod_id: provisioned.podId,
        game_slug: plan.gameSlug,
        compute: plan.compute,
        site_mode: plan.siteMode,
        endpoint_url: provisioned.endpointUrl,
        gpu_id: provisioned.gpuId,
        cpu_id: provisioned.cpuId,
        image: "image" in provisioned ? String(provisioned.image ?? "") : "",
        hourly_usd: provisioned.hourlyUsd,
        status: "running",
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (!rowErr) remoteId = String((row as { id: string }).id);
  } catch {
    remoteId = null;
  }

  const vncPassword = "vncPassword" in provisioned ? String(provisioned.vncPassword ?? "") : "";
  return ok({
    started: true,
    plan: {
      game_slug: plan.gameSlug,
      compute: plan.compute,
      site_mode: plan.siteMode,
      target_url: plan.targetUrl,
    },
    remote: remoteId ? { id: remoteId } : null,
    heartbeat_url: remoteId ? `/api/vcw/autoplay/${remoteId}/heartbeat` : null,
    pod_url: remoteId ? `/api/vcw/autoplay/${remoteId}/pod` : null,
    idle_policy: {
      warn_minutes: idlePolicy.warnMinutes,
      stop_grace_minutes: idlePolicy.stopGraceMinutes,
      terminate_hours: idlePolicy.terminateHours,
      summary: describePodIdlePolicy(idlePolicy),
    },
    connection: {
      endpointUrl: provisioned.endpointUrl,
      podId: provisioned.podId,
      kind: provisioned.kind,
      gpu: provisioned.gpuId || null,
      cpu: provisioned.cpuId || null,
      hourlyUsd: provisioned.hourlyUsd,
      port: provisioned.port,
      image: "image" in provisioned ? provisioned.image : null,
      // Shown once at provision time only; never stored, never re-served.
      ...(vncPassword ? { vncPassword, vncNote: "Save this VNC password now; it will never be shown again." } : {}),
    },
    quote: {
      minutes: AUTOPLAY_MAX_MINUTES,
      gross_coins: quote.gross,
      cut_coins: quote.cut,
      provider_coins: quote.provider,
      max_run_usd: maxRunUsd,
    },
    desktop_url: VCW_DESKTOP_PATH,
    note: `Autoplay remote live for ${plan.gameSlug} (${plan.compute}, ${plan.siteMode}). Open the stream URL, log in with the VNC password, and open the locked game URL (${plan.targetUrl}) in the remote Chromium. RunPod bills ~$${provisioned.hourlyUsd.toFixed(2)}/hr per second (max ~$${maxRunUsd.toFixed(2)} over ${AUTOPLAY_MAX_MINUTES} min of use). ${idlePolicy.warnMinutes} min with no input rings a warning chime; ${idlePolicy.stopGraceMinutes} more idle min stops the pod; ${idlePolicy.terminateHours}h untended terminates it. Coin quote ${quote.gross} gross ${AUTOPLAY_CUT_NOTE} Coins bill per elapsed worker-minute on heartbeat (first debit from creation); stop the remote from /runpods to end billing.`,
  });
}

/** GET describes the rules without provisioning (login not required). */
export async function GET() {
  const idlePolicy = getPodIdlePolicy();
  return ok({
    computes: ["cpu", "gpu", "gpu-boosted"],
    site_modes: ["on-site", "off-site"],
    rules: [
      "On-site mode: VibeCodeWorker remotes control the browser for 4weird games only.",
      "Off-site mode: Xonotic only, GPU boosted mode only (RunPod GPUs), desktop VibeCodeWorker install required.",
      "Every remote boots a Kasm graphical desktop on 6901 (Chromium inside): the stream link always loads; open the locked game URL in the remote browser.",
    ],
    desktop_url: VCW_DESKTOP_PATH,
    max_minutes: AUTOPLAY_MAX_MINUTES,
    idle_policy: {
      warn_minutes: idlePolicy.warnMinutes,
      stop_grace_minutes: idlePolicy.stopGraceMinutes,
      terminate_hours: idlePolicy.terminateHours,
      summary: describePodIdlePolicy(idlePolicy),
    },
    note: AUTOPLAY_CUT_NOTE,
  });
}
