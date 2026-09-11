import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import {
  DESKTOP_PLANS,
  cleanDesktopName,
  desktopUsdToCoins,
  isDesktopKind,
  parseDesktopInterface,
  parseDesktopMaxUsd,
} from "@/lib/desktop";
import { provisionDesktopWorker, getLiveCheapestQuotes } from "@/lib/compute";
import { runpodConfigured } from "@/lib/runpod";
import { getPodIdlePolicy, describePodIdlePolicy, validatePodPolicyInput } from "@/lib/pod-idle";

export const dynamic = "force-dynamic";

/**
 * GET /api/desktop/provision; public plan catalog (no auth, no billing).
 * Returns both Virtual Desktop plans with their official RunPod images,
 * ports, the live cheapest-with-stock pricing example (real catalog data,
 * nulls when unavailable — never a made-up price), and the idle lifecycle
 * policy. CPU is listed first: it is the cheapest default.
 */
export async function GET() {
  const [quotes, policy] = await Promise.all([getLiveCheapestQuotes(), Promise.resolve(getPodIdlePolicy())]);
  return ok({
    plans: DESKTOP_PLANS.map((p) => ({
      kind: p.kind,
      name: p.name,
      tagline: p.tagline,
      image: p.image,
      template: p.templateId,
      port: p.port,
      ports: p.ports,
      disk_gb: p.diskGb,
      blurb: p.blurb,
      best_for: p.bestFor,
    })),
    pricing_example: {
      cheapest_gpu: quotes.gpu ? { id: quotes.gpu.id, hourly_usd: quotes.gpu.hourlyUsd } : null,
      cheapest_cpu: quotes.cpu ? { id: quotes.cpu.id, hourly_usd: quotes.cpu.hourlyUsd } : null,
      note: quotes.gpu
        ? `Live example: cheapest Secure GPU with stock right now is ${quotes.gpu.id} at ~$${Number(quotes.gpu.hourlyUsd).toFixed(2)}/hr (per second). Your pod may differ by stock; the provision response quotes your exact card.`
        : "Live GPU example unavailable (no RunPod key or no stock); the provision response still quotes your exact card.",
    },
    idle_policy: {
      warn_minutes: policy.warnMinutes,
      stop_grace_minutes: policy.stopGraceMinutes,
      terminate_hours: policy.terminateHours,
      summary: describePodIdlePolicy(policy),
    },
    billing: {
      billed_by: "runpod",
      per: "second",
      coins: "display-equivalent only (100 coins = $1.00); no Vibe cut on direct RunPod spend",
      usage: "/my/usage mirrors real RunPod spend via POST /api/agents/runpod-sync",
    },
    runpod_configured: runpodConfigured(),
  });
}

/**
 * POST /api/desktop/provision; rent a Virtual Desktop on RunPod.
 *
 * Body: { kind: cpu|gpu, interface?: gui|jupyter, max_usd_per_hour?: number,
 *         name?: string, image?: string (advanced Docker ref),
 *         warn_minutes?, stop_grace_minutes?, terminate_hours? (idle policy) }
 *
 * Interface defaults to `gui` (Ubuntu graphical desktop streamed in the
 * browser); pass `jupyter` for a JupyterLab + SSH box instead. Auth required.
 * Provisions a REAL pod via the RunPod REST API and hands back a clickable
 * proxy URL; never faked. The desktop is recorded as yours (desktop_pods)
 * so you can stop / start / restart / terminate / delete it later from
 * /desktop (the RunPod control pane) or /runpods; only you can control it.
 * Idle policy: 60 min no input → warning chime, +15 min → stop, 24h
 * untended → terminate (configurable per pod). RunPod bills the operator's
 * card per second; coin figures are display equivalents only.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const botBlock = await requireHuman(req, "POST /api/desktop/provision", { allowAuthenticated: true });
  if (botBlock) return botBlock;
  const rl = rateLimit(`desktop:provision:${data.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const kindRaw = String(input.kind ?? "gpu").toLowerCase();
  if (!isDesktopKind(kindRaw)) return fail("Invalid kind. Use cpu or gpu.", 400);
  const iface = parseDesktopInterface(input.interface ?? input.iface ?? "gui");
  const maxRaw = input.max_usd_per_hour ?? input.maxUsdPerHour ?? 0;
  const maxUsd = Number(maxRaw) === 0 ? 0 : parseDesktopMaxUsd(maxRaw);
  if (Number(maxRaw) !== 0 && !maxUsd) {
    return fail("max_usd_per_hour must be $0.01-$1000, or 0 for cheapest available.", 400);
  }
  const name = cleanDesktopName(input.name ?? `desktop-${kindRaw}`) || `desktop-${kindRaw}`;
  const rawImage = typeof input.image === "string" && input.image.trim() ? input.image : undefined;
  const idleCheck = validatePodPolicyInput({
    warnMinutes: input.warn_minutes ?? input.warnMinutes,
    stopGraceMinutes: input.stop_grace_minutes ?? input.stopGraceMinutes,
    terminateHours: input.terminate_hours ?? input.terminateHours,
  });
  if (!idleCheck.ok) return fail(idleCheck.error, 400);

  const idleTouched =
    input.warn_minutes !== undefined ||
    input.warnMinutes !== undefined ||
    input.stop_grace_minutes !== undefined ||
    input.stopGraceMinutes !== undefined ||
    input.terminate_hours !== undefined ||
    input.terminateHours !== undefined;

  const provisioned = await provisionDesktopWorker({ name, kind: kindRaw, iface, maxUsdPerHour: maxUsd, ...(rawImage ? { image: rawImage } : {}) });

  if ("error" in provisioned) {
    return ok({
      started: false,
      kind: kindRaw,
      interface: iface,
      provision: { ok: false, code: provisioned.error, message: provisioned.message ?? "Provisioning failed." },
      note: "Virtual Desktop not started; no spend. Fix the provision state above and retry.",
    });
  }

  // Record ownership: only this user can control the pod later (/desktop,
  // /runpods). A failed mirror write must not fail the rental itself (pod id
  // is still returned), but the dashboard row is what enables stop/start/
  // restart + the idle watchdog + server sweep. Custom idle overrides are
  // stored per pod (NULL = default).
  let desktopId: string | null = null;
  try {
    const db = serviceClient();
    const { data: row, error: rowErr } = await db
      .from("desktop_pods")
      .insert({
        user_id: data.user.id,
        pod_id: provisioned.podId,
        kind: provisioned.kind,
        interface: provisioned.iface,
        endpoint_url: provisioned.endpointUrl,
        gpu_id: provisioned.gpuId,
        cpu_id: provisioned.cpuId,
        hourly_usd: provisioned.hourlyUsd,
        status: "running",
        image: provisioned.image,
        last_activity_at: new Date().toISOString(),
        warn_minutes: idleTouched && idleCheck.ok ? idleCheck.value.warnMinutes : null,
        stop_grace_minutes: idleTouched && idleCheck.ok ? idleCheck.value.stopGraceMinutes : null,
        terminate_hours: idleTouched && idleCheck.ok ? idleCheck.value.terminateHours : null,
      })
      .select("id")
      .single();
    if (!rowErr) desktopId = String((row as { id: string }).id);
  } catch {
    desktopId = null;
  }

  const coinsPerHour = desktopUsdToCoins(provisioned.hourlyUsd);
  const vncPassword = "vncPassword" in provisioned ? String(provisioned.vncPassword ?? "") : "";
  const idlePolicy = getPodIdlePolicy();
  return ok({
    started: true,
    kind: provisioned.kind,
    interface: provisioned.iface,
    desktop: desktopId ? { id: desktopId } : null,
    heartbeat_url: desktopId ? `/api/desktop/${desktopId}/heartbeat` : null,
    idle_policy: {
      warn_minutes: idlePolicy.warnMinutes,
      stop_grace_minutes: idlePolicy.stopGraceMinutes,
      terminate_hours: idlePolicy.terminateHours,
      summary: describePodIdlePolicy(idlePolicy),
    },
    connection: {
      endpointUrl: provisioned.endpointUrl,
      podId: provisioned.podId,
      gpu: provisioned.gpuId || null,
      cpu: provisioned.cpuId || null,
      hourlyUsd: provisioned.hourlyUsd,
      coinsPerHour,
      port: provisioned.port,
      image: provisioned.image,
      // Shown once at provision time only; never stored, never re-served.
      ...(vncPassword ? { vncPassword, vncNote: "Save this VNC password now; it will never be shown again." } : {}),
    },
    billing: {
      billed_by: "runpod",
      per: "second",
      hourly_usd: provisioned.hourlyUsd,
      coins_per_hour_equiv: coinsPerHour,
      note: "RunPod bills per second; stop the pod from /runpods when done. Mirror the spend on /my/usage via POST /api/agents/runpod-sync. No Vibe cut, no coin debit.",
    },
    note:
      provisioned.iface === "gui"
        ? `${provisioned.kind === "gpu" ? `GPU desktop live on ${provisioned.gpuId}` : `CPU desktop live (${provisioned.cpuId})`} at ~$${provisioned.hourlyUsd.toFixed(2)}/hr. Open the endpoint URL, log in with the VNC password, and your Ubuntu desktop streams in the browser. Manage it anytime from /runpods.`
        : `Jupyter box live (${provisioned.kind === "gpu" ? provisioned.gpuId : provisioned.cpuId}) at ~$${provisioned.hourlyUsd.toFixed(2)}/hr. Open the endpoint URL for JupyterLab, or SSH per the RunPod console. Manage it anytime from /runpods.`,
  });
}
