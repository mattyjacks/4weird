/**
 * Compute-provider adapters for the agent-rental marketplace.
 *
 * SERVER-ONLY: reads RUNPOD_API_KEY / DIGITALOCEAN_TOKEN. Never import this
 * module in a client component.
 *
 * RunPod is the default managed path: when RUNPOD_API_KEY is set, booking a
 * `runpod:auto` listing really provisions a pod via the RunPod REST API and
 * hands back the RunPod default endpoint
 * (https://<podId>-<port>.proxy.runpod.net). Nothing is ever faked: without
 * credentials, stock, or a budget fit the adapter returns a typed error and
 * the caller must surface that state.
 */

import { randomBytes } from "node:crypto";
import { RUNPOD_AUTO_ENDPOINT } from "@/lib/agent-market";
import type { DesktopKind } from "@/lib/desktop";
import { DESKTOP_IMAGE_GUI, DESKTOP_PORTS_GUI } from "@/lib/desktop";
import type { DesktopInterface } from "@/lib/desktop";
import {
  RUNPOD_API_BASE_DEFAULT,
  runpodApiBase,
  runpodConfigured,
} from "@/lib/runpod";

export type ProviderCode = "runpod" | "digitalocean" | "custom";

export type AgentRuntime =
  | "openclaw"
  | "nanoclaw"
  | "vibecodeworker"
  | "xonotic-vcw"
  | "xonotic-self"
  | "custom";

export type ProvisionSpec = {
  /** Listing name (used as the remote workload label). */
  name: string;
  /** Agent runtime the VM must run. */
  runtime: AgentRuntime;
  /** Max gross hourly budget in cents (listing quote). */
  maxPriceCentsPerHour?: number;
  /** Only used by the custom adapter: renter/owner-supplied endpoint. */
  endpointUrl?: string;
};

export type ProvisionOk = {
  endpointUrl: string;
  podId: string;
  gpuId: string;
  hourlyUsd: number;
  port: number;
};

export type ProvisionErrorCode =
  | "unconfigured"
  | "invalid_endpoint"
  | "over_budget"
  | "no_stock"
  | "provision_failed";

export type ProvisionResult =
  | ProvisionOk
  | { error: ProvisionErrorCode; message?: string };

export interface ComputeProvider {
  code: ProviderCode;
  name: string;
  /** False when the server lacks the credentials to provision. */
  configured(): boolean;
  provision(spec: ProvisionSpec): Promise<ProvisionResult>;
}

function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

function slugifyName(name: string): string {
  const s = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "agent";
}

function isXonoticRuntime(runtime: string): boolean {
  return runtime === "xonotic-vcw" || runtime === "xonotic-self";
}

/** Image + ports + env per runtime, from RunPod official public templates. */
export function workloadForRuntime(runtime: AgentRuntime): {
  image: string;
  ports: string[];
  env: Record<string, string>;
  port: number;
} {
  if (isXonoticRuntime(runtime)) {
    return {
      // Official RunPod Ubuntu base (template `runpod-ubuntu-2204`).
      image: "runpod/base:1.0.2-ubuntu2204",
      ports: ["26000/udp", "26000/tcp", "8888/http"],
      env: {
        GAME: "xonotic",
        PLAY_MODE: runtime === "xonotic-vcw" ? "vibecodeworker" : "self",
        XONOTIC_PORT: "26000",
      },
      port: 8888,
    };
  }
  if (runtime === "nanoclaw") {
    // Recommended path: NanoClaw on the PyTorch CUDA base. The bootstrap on
    // the pod installs NanoClaw, then bridges it to 4weird (bot key) +
    // optional Telegram. Website chat works with no extra config: the agent
    // posts through the bot key you put in FOURWEIRD_BOT_KEY. See
    // NANOCLAW_DEPLOY_GUIDE + components/agents/nanoclaw-deploy.tsx.
    return {
      image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
      ports: ["8888/http", "22/tcp"],
      env: {
        AGENT_RUNTIME: "nanoclaw",
        FOURWEIRD_BASE: "https://4weird.com",
        NANOCLAW_RECOMMENDED: "1",
      },
      port: 8888,
    };
  }
  return {
    // Official RunPod PyTorch base (template `runpod-torch-v240`).
    image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
    ports: ["8888/http", "22/tcp"],
    env: { AGENT_RUNTIME: runtime },
    port: 8888,
  };
}

/**
 * NanoClaw recommended deploy: env contract + bootstrap for a rented pod.
 * Serverful = this marketplace (always-on RunPod pod, billed per second up
 * to the booking escrow). Serverless = scale-to-zero endpoint you call per
 * job (see /docs/agents-compute + /swarm serverless chat). Both speak to
 * 4weird with the SAME bot key, so one agent can chat on the website
 * (clans + UnitUnite rooms, always labeled [BOT]) and on Telegram.
 *
 * Required on the pod: FOURWEIRD_BOT_KEY (bot4weird_… from /bot/setup).
 * Optional: TELEGRAM_BOT_TOKEN (+ TELEGRAM_CHAT_ID to lock it to you),
 * FOURWEIRD_BASE (default https://4weird.com), NANOCLAW_CHANNELS
 * (default "website", set "website,telegram" to bridge both).
 */
export const NANOCLAW_ENV_CONTRACT = [
  "FOURWEIRD_BOT_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "FOURWEIRD_BASE",
  "NANOCLAW_CHANNELS",
] as const;

/** Shell bootstrap run once on the rented pod to install + start NanoClaw. */
export function nanoclawBootstrap(): string {
  return [
    "# 4weird NanoClaw bootstrap (run once on your rented pod)",
    "# Needs: FOURWEIRD_BOT_KEY=bot4weird_… (from https://4weird.com/bot/setup)",
    "# Optional: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID for Telegram bridge",
    "export FOURWEIRD_BASE=https://4weird.com",
    'curl -s -H "x-bot-key: $FOURWEIRD_BOT_KEY" $FOURWEIRD_BASE/api/bot/me',
    "# then install + start NanoClaw with the website + telegram channels",
    "npm i -g nanoclaw  # or: pip install nanoclaw",
    'nanoclaw init --channels website,telegram --base "$FOURWEIRD_BASE"',
    "nanoclaw start",
  ].join("\n");
}

type CatalogGpu = {
  id: string;
  availability?: string;
  secure?: boolean;
  price?: { secure?: number };
};

async function fetchPodGpuCatalog(): Promise<
  | { ok: true; gpus: CatalogGpu[] }
  | { ok: false; error: string }
> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = runpodApiBase();
  const params = new URLSearchParams({
    include: "AVAILABILITY",
    product: "POD",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}/catalog/gpus?${params.toString()}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `RunPod catalog HTTP ${res.status}.` };
    const data = (await res.json()) as { gpus?: CatalogGpu[] } | CatalogGpu[];
    const gpus = Array.isArray(data) ? data : (data.gpus ?? []);
    return { ok: true, gpus };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pick the cheapest Secure pod GPU with live stock that fits the max hourly
 * budget (USD/hr gross). Pure + unit-testable: pass catalog rows in.
 */
export function pickGpuUnderBudget(
  gpus: { id: string; availability?: string; secure?: boolean; priceSecure?: number }[],
  maxHourlyUsd: number,
): { id: string; hourlyUsd: number } | null {
  const budget = Number(maxHourlyUsd);
  if (!Number.isFinite(budget) || budget <= 0) return null;
  const fitting = gpus
    .filter(
      (g) =>
        g.secure &&
        (g.availability ?? "NONE") !== "NONE" &&
        Number.isFinite(g.priceSecure) &&
        (g.priceSecure as number) > 0 &&
        (g.priceSecure as number) <= budget,
    )
    .sort((a, b) => (a.priceSecure as number) - (b.priceSecure as number));
  if (fitting.length === 0) return null;
  const best = fitting[0];
  return { id: best.id, hourlyUsd: best.priceSecure as number };
}

export function cheapestSecureGpu(
  gpus: { id: string; availability?: string; secure?: boolean; priceSecure?: number }[],
): { id: string; hourlyUsd: number } | null {
  const avail = gpus
    .filter(
      (g) =>
        g.secure &&
        (g.availability ?? "NONE") !== "NONE" &&
        Number.isFinite(g.priceSecure) &&
        (g.priceSecure as number) > 0,
    )
    .sort((a, b) => (a.priceSecure as number) - (b.priceSecure as number));
  if (avail.length === 0) return null;
  return { id: avail[0].id, hourlyUsd: avail[0].priceSecure as number };
}

async function createRunpodPod(opts: {
  name: string;
  image: string;
  gpuId: string;
  ports: string[];
  env: Record<string, string>;
  /** Start-command override (RunPod runs it instead of the image default). */
  args?: string;
  diskGb?: number;
  /**
   * Start JupyterLab on 8888 (official images honor this: the provisioner
   * injects JUPYTER_PASSWORD and starts the server). Required for the
   * https://<podId>-8888.proxy.runpod.net URL to answer instead of showing
   * "Waiting for service to respond". Leave false for workers with a custom
   * `args` bootstrap that serves the port themselves (e.g. Blender).
   */
  startJupyter?: boolean;
  /** Provision SSH access (injects PUBLIC_KEY from the account's keys). */
  startSsh?: boolean;
}): Promise<{ ok: true; podId: string } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/pods`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${slugifyName(opts.name)}-${Date.now().toString(36)}`,
        image: opts.image,
        gpu: { id: opts.gpuId, count: 1 },
        ports: opts.ports,
        env: opts.env,
        ...(opts.args ? { args: opts.args } : {}),
        disk: opts.diskGb ?? 20,
        // Interactive pods (agents, CPU desktops, autoplay) serve Jupyter on
        // 8888; without this the proxy URL shows "Waiting for service".
        ...(opts.startJupyter ? { startJupyter: true } : {}),
        ...(opts.startSsh ? { startSsh: true } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `RunPod pod create HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = (await res.json()) as { id?: string; pod?: { id?: string } };
    const podId = String(data.id ?? data.pod?.id ?? "");
    if (!podId) return { ok: false, error: "RunPod returned no pod id." };
    return { ok: true, podId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 140)}` };
  } finally {
    clearTimeout(timer);
  }
}

/** RunPod default endpoint for an HTTP port (no custom URL needed). */
export function runpodProxyUrl(podId: string, port: number): string {
  return `https://${podId}-${port}.proxy.runpod.net`;
}

/**
 * Live pod state (server key). Best-effort: callers treat failure as
 * "unknown", never as proof the pod is gone.
 */
export async function getPodLive(
  podId: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const id = String(podId ?? "").trim();
  if (!id) return { ok: false, error: "Missing pod id." };
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}/pods/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `RunPod pod get HTTP ${res.status}.` };
    const data = (await res.json()) as { status?: unknown; pod?: { status?: unknown } };
    const status = String(data.status ?? data.pod?.status ?? "UNKNOWN");
    return { ok: true, status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lifecycle action on a pod. Only the user who created the pod (the booking
 * renter, the blender job owner, or the desktop owner recorded in Supabase)
 * may call this; every API route enforces that ownership check before
 * reaching here. Valid actions: stop (releases GPU/CPU, keeps disk),
 * start (boots an EXITED/ERROR pod), restart (in-place container restart),
 * terminate (permanently deletes the pod, disk lost).
 *
 * A 409 "wrong state" is reported as failure with its message so callers can
 * mark the job stopped anyway when the pod is already EXITED/TERMINATED.
 */
export type PodLifecycleAction = "stop" | "start" | "restart" | "terminate";

export async function podAction(
  podId: string,
  action: PodLifecycleAction,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const id = String(podId ?? "").trim();
  if (!id) return { ok: false, error: "Missing pod id." };
  if (action !== "stop" && action !== "start" && action !== "restart" && action !== "terminate") {
    return { ok: false, error: "Invalid pod action. Use stop, start, restart, or terminate." };
  }
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/pods/${encodeURIComponent(id)}/action`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `RunPod pod ${action} HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    // Terminate returns 204 with no body; no pod status to report.
    if (res.status === 204) return { ok: true, status: "TERMINATED" };
    const text = await res.text().catch(() => "");
    if (!text) return { ok: true, status: "UNKNOWN" };
    const data = JSON.parse(text) as { status?: unknown; pod?: { status?: unknown } };
    return { ok: true, status: String(data.status ?? data.pod?.status ?? "UNKNOWN") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 140)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Permanently delete a pod (DELETE /pods/:id). Equivalent to the terminate
 * action for callers that prefer REST delete semantics. Only the pod's
 * creator may call this; enforced by the API route's ownership check.
 */
export async function deleteRunpodPod(
  podId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const id = String(podId ?? "").trim();
  if (!id) return { ok: false, error: "Missing pod id." };
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/pods/${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `RunPod pod delete HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 140)}` };
  } finally {
    clearTimeout(timer);
  }
}

export function isPodLifecycleAction(value: unknown): value is PodLifecycleAction {
  return value === "stop" || value === "start" || value === "restart" || value === "terminate" || value === "delete";
}

/**
 * Stop a pod (releases GPU/CPU compute, keeps disk). A 409 "wrong state" is
 * reported as failure with its message so callers can mark the job stopped
 * anyway when the pod is already EXITED/TERMINATED.
 */
export async function stopPodAction(
  podId: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  return podAction(podId, "stop");
}

/**
 * Start a stopped pod (EXITED/ERROR back toward RUNNING). Creator-only -
 * enforced by the calling API route's ownership check.
 */
export async function startPodAction(
  podId: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  return podAction(podId, "start");
}

/**
 * Restart a RUNNING pod's container in place. Creator-only; enforced by
 * the calling API route's ownership check.
 */
export async function restartPodAction(
  podId: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  return podAction(podId, "restart");
}

/**
 * Terminate a pod permanently (container disk lost). Creator-only -
 * enforced by the calling API route's ownership check.
 */
export async function terminatePodAction(
  podId: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  return podAction(podId, "terminate");
}

/**
 * Run one creator-requested lifecycle action on a pod. `delete` maps to the
 * REST DELETE (same effect as `terminate`); everything else maps to the pod
 * action endpoint. Every caller must verify the requester created the pod
 * (booking renter / listing owner, blender job owner, desktop owner) BEFORE
 * calling this; this helper performs no auth.
 */
export async function runPodLifecycle(
  podId: string,
  action: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  if (action === "delete") {
    const deleted = await deleteRunpodPod(podId);
    return deleted.ok ? { ok: true, status: "TERMINATED" } : deleted;
  }
  if (action !== "stop" && action !== "start" && action !== "restart" && action !== "terminate") {
    return { ok: false, error: "Invalid action. Use stop, start, restart, terminate, or delete." };
  }
  return podAction(podId, action);
}

export const runpodProvider: ComputeProvider = {
  code: "runpod",
  name: "RunPod",
  configured() {
    return runpodConfigured();
  },
  async provision(spec: ProvisionSpec) {
    if (!runpodConfigured()) return { error: "unconfigured" };
    const maxCents = Math.max(0, Math.floor(Number(spec.maxPriceCentsPerHour ?? 0)));
    // Listings without a max fall back to a $1.00/hr ceiling (the trial gift).
    const maxUsd = maxCents > 0 ? maxCents / 100 : 1;
    const catalog = await fetchPodGpuCatalog();
    if (!catalog.ok) return { error: "provision_failed", message: catalog.error };
    const rows = catalog.gpus.map((g) => ({
      id: g.id,
      availability: g.availability,
      secure: g.secure,
      priceSecure: Number(g.price?.secure ?? 0),
    }));
    const pick = pickGpuUnderBudget(rows, maxUsd);
    if (!pick) {
      const cheapest = cheapestSecureGpu(rows);
      if (!cheapest) return { error: "no_stock", message: "No RunPod Secure GPU stock right now." };
      return {
        error: "over_budget",
        message: `Cheapest available Secure GPU is ${cheapest.id} at $${cheapest.hourlyUsd.toFixed(2)}/hr, above your $${maxUsd.toFixed(2)}/hr max.`,
      };
    }
    const workload = workloadForRuntime(spec.runtime);
    const created = await createRunpodPod({
      name: spec.name,
      image: workload.image,
      gpuId: pick.id,
      ports: workload.ports,
      env: workload.env,
      // Jupyter on 8888 so the proxy URL answers (official images start it
      // from this flag); SSH so the renter can reach the box directly.
      startJupyter: true,
      startSsh: true,
    });
    if (!created.ok) return { error: "provision_failed", message: created.error };
    return {
      endpointUrl: runpodProxyUrl(created.podId, workload.port),
      podId: created.podId,
      gpuId: pick.id,
      hourlyUsd: pick.hourlyUsd,
      port: workload.port,
    };
  },
};

export const digitaloceanProvider: ComputeProvider = {
  code: "digitalocean",
  name: "DigitalOcean",
  configured() {
    return Boolean(process.env.DIGITALOCEAN_TOKEN);
  },
  async provision(spec: ProvisionSpec) {
    if (!process.env.DIGITALOCEAN_TOKEN) return { error: "unconfigured" };
    // No auto-provision path yet: a supplied https endpoint is used as-is,
    // otherwise the booking keeps the `runpod:auto`-style placeholder and the
    // operator wires the Droplet separately. Never synthesize a URL.
    const endpoint = String(spec.endpointUrl ?? "");
    if (endpoint && endpoint !== RUNPOD_AUTO_ENDPOINT) {
      if (!isHttpsUrl(endpoint)) return { error: "invalid_endpoint" };
      return { endpointUrl: endpoint, podId: "", gpuId: "", hourlyUsd: 0, port: 443 };
    }
    return { error: "provision_failed", message: "DigitalOcean auto-provision is not wired yet; supply an https endpoint or use RunPod." };
  },
};

export const customProvider: ComputeProvider = {
  code: "custom",
  name: "Custom endpoint",
  configured() {
    // Bring-your-own-endpoint needs no server credentials.
    return true;
  },
  async provision(spec: ProvisionSpec) {
    if (!isHttpsUrl(spec.endpointUrl)) return { error: "invalid_endpoint" };
    return {
      endpointUrl: String(spec.endpointUrl),
      podId: "",
      gpuId: "",
      hourlyUsd: 0,
      port: 443,
    };
  },
};

export const COMPUTE_PROVIDERS: ComputeProvider[] = [
  runpodProvider,
  digitaloceanProvider,
  customProvider,
];

export function providerStatus(): { code: ProviderCode; name: string; configured: boolean }[] {
  return COMPUTE_PROVIDERS.map((p) => ({
    code: p.code,
    name: p.name,
    configured: p.configured(),
  }));
}

// ---------------------------------------------------------------------------
// VibeCodeWorker autoplay remotes (CPU or GPU pods that play 4weird games).
//
// Enforcement lives in lib/vcw-autoplay.ts (resolveAutoplayPlan) and is
// re-checked here so a direct call cannot bypass it:
// - on-site: 4weird catalog games only (x’importe quoi URLs refused).
// - off-site: xonotic only, gpu-boosted only (desktop driver required -
//   checked by the API via desktopInstalled, recorded here in env).
// ---------------------------------------------------------------------------

import type { AutoplayCompute, AutoplaySiteMode } from "@/lib/vcw-autoplay";

export type AutoplayWorkload = {
  kind: "cpu" | "gpu";
  image: string;
  ports: string[];
  env: Record<string, string>;
  port: number;
};

function cleanAutoplayGame(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 64);
}

/**
 * Remote image + ports + env for an autoplay run. Throws on any
 * disallowed combination (fail closed; the API maps it to 400).
 */
export function autoplayWorkloadFor(opts: {
  gameSlug: string;
  compute: AutoplayCompute;
  siteMode: AutoplaySiteMode;
}): AutoplayWorkload {
  const slug = cleanAutoplayGame(opts.gameSlug);
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) throw new Error("Invalid game slug.");
  const compute = opts.compute;
  if (compute !== "cpu" && compute !== "gpu" && compute !== "gpu-boosted") {
    throw new Error("Invalid autoplay compute.");
  }
  const siteMode = opts.siteMode === "off-site" ? "off-site" : "on-site";
  const isXonotic = slug === "xonotic";

  if (isXonotic) {
    if (compute !== "gpu-boosted") throw new Error("Xonotic autoplay needs GPU boosted mode.");
    if (siteMode !== "off-site") throw new Error("Xonotic has no on-site runtime; use off-site mode.");
  } else if (siteMode !== "on-site") {
    throw new Error("Autoplay browser control is on-site only - 4weird games only.");
  }

  const baseEnv: Record<string, string> = {
    VCW_AUTOPLAY: "1",
    VCW_AUTOPLAY_GAME: slug,
    VCW_AUTOPLAY_COMPUTE: compute,
    VCW_AUTOPLAY_SITE: siteMode,
    // Idle lifecycle: the browser watchdog + server sweep own the actual
    // stop/terminate (see lib/pod-idle.ts); this env is the backstop hint
    // for humans reading `env` in the RunPod console.
    VIBE_MAX_MINUTES: "75",
    VCW_TARGET_URL:
      siteMode === "off-site" ? "https://dpgame.xonotic.workers.dev/" : `https://4weird.com/games/${slug}/play`,
  };
  if (isXonotic) {
    baseEnv.GAME = "xonotic";
    baseEnv.VIBE_OPEN_SOURCE_GAME_ID = "xonotic";
    baseEnv.VIBE_XONOTIC_MODE = "desktop";
    baseEnv.VCW_AUTOPLAY_BOOSTED = "1";
  } else {
    baseEnv.VIBE_GAME = slug;
  }
  if (compute === "gpu-boosted") baseEnv.VCW_AUTOPLAY_BOOSTED = "1";

  if (compute === "cpu") {
    // CPU autoplay boots the SAME Kasm graphical desktop as /desktop GUI
    // (DESKTOP_IMAGE_GUI on 6901): runpod/base has no VNC/desktop server, so
    // pointing the stream at 6901 on the base image could never load
    // ("Waiting for service"). Kasm ships Chromium + a VNC stream, so the
    // tester opens the stream link, then the locked game URL inside it.
    const vncPw = randomBytes(18).toString("base64url").slice(0, 24);
    return {
      kind: "cpu",
      image: DESKTOP_IMAGE_GUI,
      ports: [...DESKTOP_PORTS_GUI],
      env: { ...baseEnv, AGENT_RUNTIME: "vibecodeworker", VNC_PW: vncPw, DESKTOP_MODE: "kasm-autoplay" },
      port: 6901,
    };
  }
  // GPU + gpu-boosted autoplay: same Kasm desktop (GPU-accelerated), so the
  // stream URL always answers. Vision/model env stays for the harness.
  const gpuVncPw = randomBytes(18).toString("base64url").slice(0, 24);
  return {
    kind: "gpu",
    image: DESKTOP_IMAGE_GUI,
    ports: [...DESKTOP_PORTS_GUI],
    env: {
      ...baseEnv,
      AGENT_RUNTIME: "vibecodeworker",
      VNC_PW: gpuVncPw,
      DESKTOP_MODE: "kasm-autoplay",
      VIBE_MODEL: "qwen2.5vl:7b",
      VIBE_MODE: "cloud-game-plus-model",
    },
    port: 6901,
  };
}

type CpuCatalogRow = { id: string; perVcpuUsd: number };

const AUTOPLAY_CPU_STATIC: CpuCatalogRow[] = [
  { id: "cpu3c", perVcpuUsd: 0.03 },
  { id: "cpu5c", perVcpuUsd: 0.035 },
  { id: "cpu3g", perVcpuUsd: 0.04 },
  { id: "cpu5g", perVcpuUsd: 0.046 },
  { id: "cpu3m", perVcpuUsd: 0.055 },
  { id: "cpu5m", perVcpuUsd: 0.065 },
];

const AUTOPLAY_CPU_VCPU = 2;

function autoplayCpuHourly(row: CpuCatalogRow, vcpu = AUTOPLAY_CPU_VCPU): number {
  return Math.round(row.perVcpuUsd * vcpu * 10000) / 10000;
}

async function fetchAutoplayCpuCatalog(): Promise<CpuCatalogRow[]> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return [];
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const params = new URLSearchParams({ include: "AVAILABILITY", product: "POD", vcpuCount: String(AUTOPLAY_CPU_VCPU) });
    const res = await fetch(`${base}/catalog/cpus?${params.toString()}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as
      | { cpus?: { id?: string; price?: { securePerVcpu?: number } }[] }
      | { id?: string; price?: { securePerVcpu?: number } }[];
    const arr = Array.isArray(data) ? data : (data.cpus ?? []);
    const rows: CpuCatalogRow[] = [];
    for (const c of arr) {
      const id = String(c?.id ?? "");
      const per = Number(c?.price?.securePerVcpu ?? 0);
      if (/^(cpu3[cgm]|cpu5[cgm])$/.test(id) && per > 0) rows.push({ id, perVcpuUsd: per });
    }
    return rows;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function createRunpodCpuPod(opts: {
  name: string;
  image: string;
  cpuId: string;
  vcpuCount: number;
  ports: string[];
  env: Record<string, string>;
  diskGb?: number;
  /** Start JupyterLab on 8888 so the proxy URL answers (see createRunpodPod). */
  startJupyter?: boolean;
  /** Provision SSH access (injects PUBLIC_KEY from the account's keys). */
  startSsh?: boolean;
}): Promise<{ ok: true; podId: string } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/pods`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${slugifyName(opts.name)}-${Date.now().toString(36)}`,
        image: opts.image,
        cpu: { id: opts.cpuId, vcpuCount: opts.vcpuCount },
        ports: opts.ports,
        env: opts.env,
        disk: opts.diskGb ?? 10,
        ...(opts.startJupyter ? { startJupyter: true } : {}),
        ...(opts.startSsh ? { startSsh: true } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `RunPod pod create HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = (await res.json()) as { id?: string; pod?: { id?: string } };
    const podId = String(data.id ?? data.pod?.id ?? "");
    if (!podId) return { ok: false, error: "RunPod returned no pod id." };
    return { ok: true, podId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 140)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Boosted (Xonotic vision) GPU preference: GeForce RTX 4090 first, RTX 5090
 * fallback. Priciest-card picking is gone on purpose; datacenter compute
 * cards cost up to 9x more yet render games worse than GeForce. Pure +
 * unit-testable: pass catalog rows in.
 */
export const BOOSTED_GPU_PREFERENCE = [
  "NVIDIA GeForce RTX 4090",
  "NVIDIA GeForce RTX 5090",
];

export function pickBoostedGpu(
  gpus: { id: string; availability?: string; secure?: boolean; priceSecure?: number }[],
): { id: string; hourlyUsd: number } | null {
  const byId = new Map(gpus.map((g) => [g.id, g]));
  for (const id of BOOSTED_GPU_PREFERENCE) {
    const g = byId.get(id);
    if (
      g &&
      g.secure &&
      (g.availability ?? "NONE") !== "NONE" &&
      Number.isFinite(g.priceSecure) &&
      (g.priceSecure as number) > 0
    ) {
      return { id, hourlyUsd: g.priceSecure as number };
    }
  }
  return null;
}

export type ProvisionAutoplayResult =
  | {
      endpointUrl: string;
      podId: string;
      kind: "cpu" | "gpu";
      gpuId: string;
      cpuId: string;
      hourlyUsd: number;
      port: number;
      image: string;
      /** Kasm VNC password, shown once to the owner (never stored). */
      vncPassword?: string;
    }
  | { error: ProvisionErrorCode; message?: string };

/**
 * Live cheapest-with-stock quotes for the control-pane pricing example.
 * Real catalog data only: returns nulls (never a made-up price) when the
 * key is missing or the fetch fails. Both legs are best-effort and settle
 * independently so one failing lane never blocks the other.
 */
export async function getLiveCheapestQuotes(): Promise<{
  gpu: { id: string; hourlyUsd: number } | null;
  cpu: { id: string; hourlyUsd: number } | null;
}> {
  if (!runpodConfigured()) return { gpu: null, cpu: null };
  const [gpuCat, cpuRows] = await Promise.all([
    fetchPodGpuCatalog(),
    fetchAutoplayCpuCatalog().catch(() => [] as CpuCatalogRow[]),
  ]);
  let gpu: { id: string; hourlyUsd: number } | null = null;
  if (gpuCat.ok) {
    gpu = cheapestSecureGpu(
      gpuCat.gpus.map((g) => ({
        id: g.id,
        availability: g.availability,
        secure: g.secure,
        priceSecure: Number(g.price?.secure ?? 0),
      })),
    );
  }
  let cpu: { id: string; hourlyUsd: number } | null = null;
  const pool = cpuRows.length > 0 ? cpuRows : [];
  const ranked = pool
    .filter((c) => /^(cpu3[cgm]|cpu5[cgm])$/.test(c.id) && c.perVcpuUsd > 0)
    .sort((a, b) => autoplayCpuHourly(a) - autoplayCpuHourly(b));
  if (ranked[0]) cpu = { id: ranked[0].id, hourlyUsd: autoplayCpuHourly(ranked[0]) };
  return { gpu, cpu };
}

/**
 * Provision a RunPod CPU or GPU autoplay remote. Never fakes: without
 * credentials, stock, or a budget fit it returns a typed error.
 */
export async function provisionAutoplayWorker(opts: {
  name: string;
  gameSlug: string;
  compute: AutoplayCompute;
  siteMode: AutoplaySiteMode;
  maxPriceCentsPerHour?: number;
}): Promise<ProvisionAutoplayResult> {
  if (!runpodConfigured()) return { error: "unconfigured" };
  let workload: AutoplayWorkload;
  try {
    workload = autoplayWorkloadFor({ gameSlug: opts.gameSlug, compute: opts.compute, siteMode: opts.siteMode });
  } catch (err) {
    return { error: "provision_failed", message: err instanceof Error ? err.message : "Invalid autoplay plan." };
  }

  if (workload.kind === "cpu") {
    const live = await fetchAutoplayCpuCatalog();
    const pool = live.length > 0 ? live : AUTOPLAY_CPU_STATIC;
    const ranked = pool
      .filter((c) => /^(cpu3[cgm]|cpu5[cgm])$/.test(c.id) && c.perVcpuUsd > 0)
      .sort((a, b) => autoplayCpuHourly(a) - autoplayCpuHourly(b));
    if (!ranked.length) return { error: "no_stock", message: "No RunPod CPU stock right now." };
    const maxCents = Math.max(0, Math.floor(Number(opts.maxPriceCentsPerHour ?? 0)));
    if (maxCents > 0) {
      const maxUsd = maxCents / 100;
      const fitting = ranked.find((c) => autoplayCpuHourly(c) <= maxUsd);
      if (!fitting) {
        return {
          error: "over_budget",
          message: `Cheapest CPU remote is $${autoplayCpuHourly(ranked[0]).toFixed(2)}/hr, above your $${maxUsd.toFixed(2)}/hr max.`,
        };
      }
      const created = await createRunpodCpuPod({
        name: opts.name,
        image: workload.image,
        cpuId: fitting.id,
        vcpuCount: AUTOPLAY_CPU_VCPU,
        ports: workload.ports,
        env: workload.env,
        // Kasm serves 6901 itself; Jupyter would only add a second server.
        startJupyter: false,
        startSsh: true,
      });
      if (!created.ok) return { error: "provision_failed", message: created.error };
      const hourlyUsd = autoplayCpuHourly(fitting);
      return {
        endpointUrl: runpodProxyUrl(created.podId, workload.port),
        podId: created.podId,
        kind: "cpu",
        gpuId: "",
        cpuId: fitting.id,
        hourlyUsd,
        port: workload.port,
        image: workload.image,
        vncPassword: String(workload.env.VNC_PW ?? ""),
      };
    }
    const best = ranked[0];
    const created = await createRunpodCpuPod({
      name: opts.name,
      image: workload.image,
      cpuId: best.id,
      vcpuCount: AUTOPLAY_CPU_VCPU,
        ports: workload.ports,
        env: workload.env,
        // Kasm serves 6901 itself; Jupyter would only add a second server.
        startJupyter: false,
        startSsh: true,
      });
      if (!created.ok) return { error: "provision_failed", message: created.error };
      const hourlyUsd = autoplayCpuHourly(best);
    return {
      endpointUrl: runpodProxyUrl(created.podId, workload.port),
      podId: created.podId,
      kind: "cpu",
      gpuId: "",
      cpuId: best.id,
      hourlyUsd,
      port: workload.port,
      image: workload.image,
      vncPassword: String(workload.env.VNC_PW ?? ""),
    };
  }

  const catalog = await fetchPodGpuCatalog();
  if (!catalog.ok) return { error: "provision_failed", message: catalog.error };
  const rows = catalog.gpus.map((g) => ({
    id: g.id,
    availability: g.availability,
    secure: g.secure,
    priceSecure: Number(g.price?.secure ?? 0),
  }));
  if (opts.compute === "gpu-boosted") {
    const best = pickBoostedGpu(rows);
    if (!best) return { error: "no_stock", message: "No RTX 4090/5090 Secure GPU stock right now." };
    const created = await createRunpodPod({
      name: opts.name,
      image: workload.image,
      gpuId: best.id,
        ports: workload.ports,
        env: workload.env,
        // Kasm serves 6901 itself; Jupyter would only add a second server.
        startJupyter: false,
        startSsh: true,
      });
      if (!created.ok) return { error: "provision_failed", message: created.error };
      return {
        endpointUrl: runpodProxyUrl(created.podId, workload.port),
        podId: created.podId,
        kind: "gpu",
        gpuId: best.id,
      cpuId: "",
      hourlyUsd: best.hourlyUsd,
      port: workload.port,
      image: workload.image,
      vncPassword: String(workload.env.VNC_PW ?? ""),
    };
  }
  const maxCents = Math.max(0, Math.floor(Number(opts.maxPriceCentsPerHour ?? 0)));
  const maxUsd = maxCents > 0 ? maxCents / 100 : 1;
  const pick = pickGpuUnderBudget(rows, maxUsd);
  if (!pick) {
    const cheapest = cheapestSecureGpu(rows);
    if (!cheapest) return { error: "no_stock", message: "No RunPod Secure GPU stock right now." };
    return {
      error: "over_budget",
      message: `Cheapest available Secure GPU is ${cheapest.id} at $${cheapest.hourlyUsd.toFixed(2)}/hr, above your $${maxUsd.toFixed(2)}/hr max.`,
    };
  }
  const created = await createRunpodPod({
    name: opts.name,
    image: workload.image,
    gpuId: pick.id,
      ports: workload.ports,
      env: workload.env,
      // Kasm serves 6901 itself; Jupyter would only add a second server.
      startJupyter: false,
      startSsh: true,
    });
  if (!created.ok) return { error: "provision_failed", message: created.error };
  return {
    endpointUrl: runpodProxyUrl(created.podId, workload.port),
    podId: created.podId,
    kind: "gpu",
    gpuId: pick.id,
    cpuId: "",
    hourlyUsd: pick.hourlyUsd,
    port: workload.port,
    image: workload.image,
    vncPassword: String(workload.env.VNC_PW ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Blender render workers (/blender): a pinned RTX 4090 pod (5090 fallback)
// that boots Blender and renders a .blend to mp4. The start command carries
// the whole bootstrap via env (BLENDER_BOOTSTRAP) so no shell quoting
// crosses the RunPod API boundary.
// ---------------------------------------------------------------------------

export async function provisionBlenderWorker(opts: {
  name: string;
  image: string;
  ports: string[];
  env: Record<string, string>;
  bootstrap: string;
  diskGb?: number;
}): Promise<ProvisionAutoplayResult> {
  if (!runpodConfigured()) return { error: "unconfigured" };
  const catalog = await fetchPodGpuCatalog();
  if (!catalog.ok) return { error: "provision_failed", message: catalog.error };
  const rows = catalog.gpus.map((g) => ({
    id: g.id,
    availability: g.availability,
    secure: g.secure,
    priceSecure: Number(g.price?.secure ?? 0),
  }));
  const pick = pickBoostedGpu(rows);
  if (!pick) {
    return { error: "no_stock", message: "No RTX 4090/5090 Secure GPU stock right now." };
  }
  const created = await createRunpodPod({
    name: opts.name,
    image: opts.image,
    gpuId: pick.id,
    ports: opts.ports,
    env: { ...opts.env, BLENDER_BOOTSTRAP: opts.bootstrap },
    args: 'bash -c "$BLENDER_BOOTSTRAP"',
    diskGb: opts.diskGb ?? 30,
  });
  if (!created.ok) return { error: "provision_failed", message: created.error };
  return {
    endpointUrl: runpodProxyUrl(created.podId, 8888),
    podId: created.podId,
    kind: "gpu",
    gpuId: pick.id,
    cpuId: "",
    hourlyUsd: pick.hourlyUsd,
    port: 8888,
    image: opts.image,
  };
}

// ---------------------------------------------------------------------------
// Virtual Desktop remotes (/desktop): a real RunPod pod you drive in the
// browser. CPU = official Ubuntu 22.04 base (JupyterLab + SSH on 8888);
// GPU = official RunPod Desktop Kasm image (graphical desktop on 6901).
// Never fakes: without credentials, stock, or a budget fit this returns a
// typed error and the API surfaces that state. RunPod bills the operator's
// card per second; coin figures elsewhere are display equivalents only.
// ---------------------------------------------------------------------------

export type DesktopWorkload = {
  kind: "cpu" | "gpu";
  iface: DesktopInterface;
  image: string;
  ports: string[];
  env: Record<string, string>;
  port: number;
  diskGb: number;
};

/**
 * Image + ports + env for a Virtual Desktop pod. Pure + unit-testable.
 * Default (`gui`): Ubuntu graphical desktop (Kasm) on 6901 for BOTH kinds -
 * GPU streams with hardware acceleration, CPU runs the same desktop with
 * software rendering. `jupyter`: JupyterLab + SSH on 8888 (official Ubuntu
 * 22.04 base for CPU, PyTorch CUDA base for GPU).
 */
export function desktopWorkloadFor(kind: DesktopKind, iface: DesktopInterface = "gui"): DesktopWorkload {
  const face: DesktopInterface = iface === "jupyter" ? "jupyter" : "gui";
  if (face === "jupyter") {
    if (kind === "gpu") {
      return {
        kind: "gpu",
        iface: "jupyter",
        image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
        ports: ["8888/http", "22/tcp"],
        env: { DESKTOP_MODE: "gpu-jupyter" },
        port: 8888,
        diskGb: 60,
      };
    }
    if (kind === "cpu") {
      return {
        kind: "cpu",
        iface: "jupyter",
        image: "runpod/base:1.0.2-ubuntu2204",
        ports: ["8888/http", "22/tcp"],
        env: { DESKTOP_MODE: "ubuntu-jupyter" },
        port: 8888,
        diskGb: 20,
      };
    }
    throw new Error("Invalid desktop kind.");
  }
  if (kind === "gpu" || kind === "cpu") {
    // Per-pod random VNC password (never the hardcoded "password" every pod
    // shared): generated here, planted in env, returned once to the owner.
    const vncPw = randomBytes(18).toString("base64url").slice(0, 24);
    return {
      kind,
      iface: "gui",
      image: DESKTOP_IMAGE_GUI,
      ports: [...DESKTOP_PORTS_GUI],
      env: { VNC_PW: vncPw, DESKTOP_MODE: "kasm" },
      port: 6901,
      // RunPod caps CPU pod container disks at 20 GB (HTTP 400 above it).
      diskGb: kind === "gpu" ? 60 : 20,
    };
  }
  throw new Error("Invalid desktop kind.");
}

export type ProvisionDesktopResult =
  | {
      endpointUrl: string;
      podId: string;
      kind: "cpu" | "gpu";
      iface: DesktopInterface;
      gpuId: string;
      cpuId: string;
      hourlyUsd: number;
      port: number;
      image: string;
      /** GUI only: per-pod VNC password, shown once to the owner. */
      vncPassword?: string;
    }
  | { error: ProvisionErrorCode; message?: string };

async function createRunpodDesktopPod(opts: {
  name: string;
  image: string;
  gpuId: string;
  ports: string[];
  env: Record<string, string>;
  diskGb: number;
  /** Kasm GPU desktops serve 6901 themselves; no Jupyter needed. */
  startJupyter?: boolean;
  startSsh?: boolean;
}): Promise<{ ok: true; podId: string } | { ok: false; error: string }> {
  const key = (process.env.RUNPOD_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RUNPOD_API_KEY is not set." };
  const base = (process.env.RUNPOD_API_BASE ?? "").trim().replace(/\/+$/, "") || RUNPOD_API_BASE_DEFAULT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}/pods`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${slugifyName(opts.name)}-${Date.now().toString(36)}`,
        image: opts.image,
        gpu: { id: opts.gpuId, count: 1 },
        ports: opts.ports,
        env: opts.env,
        disk: opts.diskGb,
        ...(opts.startJupyter ? { startJupyter: true } : {}),
        ...(opts.startSsh ? { startSsh: true } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `RunPod pod create HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    const data = (await res.json()) as { id?: string; pod?: { id?: string } };
    const podId = String(data.id ?? data.pod?.id ?? "");
    if (!podId) return { ok: false, error: "RunPod returned no pod id." };
    return { ok: true, podId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: `RunPod request failed: ${msg.slice(0, 140)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A custom container image reference for advanced launches from the control
 * pane. Docker-ref shaped only (registry/name:tag); shell, URLs, and empty
 * strings are refused. Length-capped so it cannot smuggle RunPod API fields.
 */
export function cleanCustomImage(value: unknown): string | null {
  const v = String(value ?? "").trim().slice(0, 256);
  if (!v) return null;
  if (/[\s"'`$\\;|&<>]/.test(v)) return null;
  if (!/^[a-z0-9][a-z0-9._/-]*[a-z0-9](:[a-z0-9._-]+)?$/i.test(v)) return null;
  if (!v.includes("/") && !v.includes(":")) return null;
  return v;
}

/**
 * Provision a Virtual Desktop pod. GUI (default) boots an Ubuntu graphical
 * desktop (Kasm) on 6901 for both kinds; Jupyter boots JupyterLab + SSH on
 * 8888 instead. CPU GUI runs the same Kasm desktop with software rendering.
 * Advanced control-pane launches may override the image (validated Docker
 * ref); ports stay the interface defaults so the stream URL keeps working.
 */
export async function provisionDesktopWorker(opts: {
  name: string;
  kind: DesktopKind;
  iface?: DesktopInterface;
  maxUsdPerHour?: number;
  /** Advanced: validated custom container image (cleanCustomImage). */
  image?: string;
}): Promise<ProvisionDesktopResult> {
  if (!runpodConfigured()) return { error: "unconfigured" };
  const face: DesktopInterface = opts.iface === "jupyter" ? "jupyter" : "gui";
  let workload: DesktopWorkload;
  try {
    workload = desktopWorkloadFor(opts.kind, face);
  } catch (err) {
    return { error: "provision_failed", message: err instanceof Error ? err.message : "Invalid desktop kind." };
  }
  const customImage = opts.image ? cleanCustomImage(opts.image) : null;
  if (opts.image && !customImage) {
    return { error: "provision_failed", message: "Invalid custom image. Use a Docker ref like registry/name:tag." };
  }
  if (customImage) {
    workload = { ...workload, image: customImage };
  }

  if (workload.kind === "cpu") {
    const live = await fetchAutoplayCpuCatalog();
    const pool = live.length > 0 ? live : AUTOPLAY_CPU_STATIC;
    const ranked = pool
      .filter((c) => /^(cpu3[cgm]|cpu5[cgm])$/.test(c.id) && c.perVcpuUsd > 0)
      .sort((a, b) => autoplayCpuHourly(a) - autoplayCpuHourly(b));
    if (!ranked.length) return { error: "no_stock", message: "No RunPod CPU stock right now." };
    const best = ranked[0];
    const created = await createRunpodCpuPod({
      name: opts.name,
      image: workload.image,
      cpuId: best.id,
      vcpuCount: AUTOPLAY_CPU_VCPU,
      ports: workload.ports,
      env: workload.env,
      diskGb: workload.diskGb,
      // Jupyter interface: start JupyterLab on 8888 so the proxy URL
      // answers. GUI interface: Kasm serves 6901 itself; no Jupyter needed.
      startJupyter: workload.iface === "jupyter",
      startSsh: true,
    });
    if (!created.ok) return { error: "provision_failed", message: created.error };
    return {
      endpointUrl: runpodProxyUrl(created.podId, workload.port),
      podId: created.podId,
      kind: "cpu",
      iface: workload.iface,
      gpuId: "",
      cpuId: best.id,
      hourlyUsd: autoplayCpuHourly(best),
      port: workload.port,
      image: workload.image,
      ...(workload.iface === "gui" ? { vncPassword: String(workload.env.VNC_PW ?? "") } : {}),
    };
  }

  const catalog = await fetchPodGpuCatalog();
  if (!catalog.ok) return { error: "provision_failed", message: catalog.error };
  const rows = catalog.gpus.map((g) => ({
    id: g.id,
    availability: g.availability,
    secure: g.secure,
    priceSecure: Number(g.price?.secure ?? 0),
  }));
  const maxUsd = Number(opts.maxUsdPerHour ?? 0);
  const pick =
    Number.isFinite(maxUsd) && maxUsd > 0
      ? pickGpuUnderBudget(rows, maxUsd)
      : cheapestSecureGpu(rows);
  if (!pick) {
    const cheapest = cheapestSecureGpu(rows);
    if (!cheapest) return { error: "no_stock", message: "No RunPod Secure GPU stock right now." };
    return {
      error: "over_budget",
      message: `Cheapest available Secure GPU is ${cheapest.id} at $${cheapest.hourlyUsd.toFixed(2)}/hr, above your $${Number(maxUsd).toFixed(2)}/hr max.`,
    };
  }
  const created = await createRunpodDesktopPod({
    name: opts.name,
    image: workload.image,
    gpuId: pick.id,
    ports: workload.ports,
    env: workload.env,
    diskGb: workload.diskGb,
    // GUI interface: Kasm serves 6901 itself; no Jupyter needed.
    // Jupyter interface: start JupyterLab on 8888 so the proxy URL answers.
    startJupyter: workload.iface === "jupyter",
    startSsh: true,
  });
  if (!created.ok) return { error: "provision_failed", message: created.error };
  return {
    endpointUrl: runpodProxyUrl(created.podId, workload.port),
    podId: created.podId,
    kind: "gpu",
    iface: workload.iface,
    gpuId: pick.id,
    cpuId: "",
    hourlyUsd: pick.hourlyUsd,
    port: workload.port,
    image: workload.image,
    ...(workload.iface === "gui" ? { vncPassword: String(workload.env.VNC_PW ?? "") } : {}),
  };
}
