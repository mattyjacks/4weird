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
import { provisionDesktopWorker } from "@/lib/compute";
import { runpodConfigured } from "@/lib/runpod";

export const dynamic = "force-dynamic";

/**
 * GET /api/desktop/provision; public plan catalog (no auth, no billing).
 * Returns both Virtual Desktop plans with their official RunPod images,
 * ports, and billing honesty note.
 */
export async function GET() {
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
 * Body: { kind: cpu|gpu, interface?: gui|jupyter, max_usd_per_hour?: number, name?: string }
 *
 * Interface defaults to `gui` (Ubuntu graphical desktop streamed in the
 * browser); pass `jupyter` for a JupyterLab + SSH box instead. Auth required.
 * Provisions a REAL pod via the RunPod REST API and hands back a clickable
 * proxy URL; never faked. The desktop is recorded as yours (desktop_pods)
 * so you can stop / start / restart / terminate / delete it later from
 * /runpods; only you can control it. RunPod bills the operator's card per
 * second; coin figures are display equivalents only (no Vibe cut, no debit).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const botBlock = await requireHuman(req, "POST /api/desktop/provision");
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

  const provisioned = await provisionDesktopWorker({ name, kind: kindRaw, iface, maxUsdPerHour: maxUsd });

  if ("error" in provisioned) {
    return ok({
      started: false,
      kind: kindRaw,
      interface: iface,
      provision: { ok: false, code: provisioned.error, message: provisioned.message ?? "Provisioning failed." },
      note: "Virtual Desktop not started; no spend. Fix the provision state above and retry.",
    });
  }

  // Record ownership: only this user can control the pod later (/runpods).
  // A failed mirror write must not fail the rental itself (pod id is still
  // returned), but the dashboard row is what enables stop/start/restart.
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
      })
      .select("id")
      .single();
    if (!rowErr) desktopId = String((row as { id: string }).id);
  } catch {
    desktopId = null;
  }

  const coinsPerHour = desktopUsdToCoins(provisioned.hourlyUsd);
  const vncPassword = "vncPassword" in provisioned ? String(provisioned.vncPassword ?? "") : "";
  return ok({
    started: true,
    kind: provisioned.kind,
    interface: provisioned.iface,
    desktop: desktopId ? { id: desktopId } : null,
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
