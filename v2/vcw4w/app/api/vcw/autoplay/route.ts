import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
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
import { provisionAutoplayWorker } from "@/lib/compute";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/autoplay — start a VibeCodeWorker autoplay remote.
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
      note: "RunPod remote not started — no spend. Fix the provision state above and retry.",
    });
  }

  const quote = quoteAutoplayForUsd(provisioned.hourlyUsd, AUTOPLAY_MAX_MINUTES);
  const maxRunUsd = Math.round((provisioned.hourlyUsd / 60) * AUTOPLAY_MAX_MINUTES * 100) / 100;
  return ok({
    started: true,
    plan: {
      game_slug: plan.gameSlug,
      compute: plan.compute,
      site_mode: plan.siteMode,
      target_url: plan.targetUrl,
    },
    connection: {
      endpointUrl: provisioned.endpointUrl,
      podId: provisioned.podId,
      kind: provisioned.kind,
      gpu: provisioned.gpuId || null,
      cpu: provisioned.cpuId || null,
      hourlyUsd: provisioned.hourlyUsd,
      port: provisioned.port,
    },
    quote: {
      minutes: AUTOPLAY_MAX_MINUTES,
      gross_coins: quote.gross,
      cut_coins: quote.cut,
      provider_coins: quote.provider,
      max_run_usd: maxRunUsd,
    },
    desktop_url: VCW_DESKTOP_PATH,
    note: `Autoplay remote live for ${plan.gameSlug} (${plan.compute}, ${plan.siteMode}). Browser control is locked to ${plan.targetUrl}. RunPod bills ~$${provisioned.hourlyUsd.toFixed(2)}/hr per second (max ~$${maxRunUsd.toFixed(2)} over ${AUTOPLAY_MAX_MINUTES} min, then it self-terminates). Coin quote ${quote.gross} gross ${AUTOPLAY_CUT_NOTE}`,
  });
}

/** GET describes the rules without provisioning (login not required). */
export async function GET() {
  return ok({
    computes: ["cpu", "gpu", "gpu-boosted"],
    site_modes: ["on-site", "off-site"],
    rules: [
      "On-site mode: VibeCodeWorker remotes control the browser for 4weird games only.",
      "Off-site mode: Xonotic only, GPU boosted mode only (RunPod GPUs), desktop VibeCodeWorker install required.",
    ],
    desktop_url: VCW_DESKTOP_PATH,
    max_minutes: AUTOPLAY_MAX_MINUTES,
    note: AUTOPLAY_CUT_NOTE,
  });
}
