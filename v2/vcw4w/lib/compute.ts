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

import { RUNPOD_AUTO_ENDPOINT } from "@/lib/agent-market";
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
  return {
    // Official RunPod PyTorch base (template `runpod-torch-v240`).
    image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
    ports: ["8888/http", "22/tcp"],
    env: { AGENT_RUNTIME: runtime },
    port: 8888,
  };
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
        disk: 20,
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
    return { error: "provision_failed", message: "DigitalOcean auto-provision is not wired yet — supply an https endpoint or use RunPod." };
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
// - off-site: xonotic only, gpu-boosted only (desktop driver required —
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
 * disallowed combination (fail closed — the API maps it to 400).
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
    if (siteMode !== "off-site") throw new Error("Xonotic has no on-site runtime — use off-site mode.");
  } else if (siteMode !== "on-site") {
    throw new Error("Autoplay browser control is on-site only — 4weird games only.");
  }

  const baseEnv: Record<string, string> = {
    VCW_AUTOPLAY: "1",
    VCW_AUTOPLAY_GAME: slug,
    VCW_AUTOPLAY_COMPUTE: compute,
    VCW_AUTOPLAY_SITE: siteMode,
    VIBE_MAX_MINUTES: "55",
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
    return {
      kind: "cpu",
      image: "runpod/base:1.0.2-ubuntu2404",
      ports: ["6901/http", "8888/http"],
      env: { ...baseEnv, AGENT_RUNTIME: "vibecodeworker" },
      port: 6901,
    };
  }
  return {
    kind: "gpu",
    image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
    ports: ["6901/http", "6902/http", "8888/http"],
    env: {
      ...baseEnv,
      AGENT_RUNTIME: "vibecodeworker",
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
        disk: 10,
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

/** Most capable Secure GPU with stock (highest hourly price proxy). */
function pickBoostedGpu(
  gpus: { id: string; availability?: string; secure?: boolean; priceSecure?: number }[],
): { id: string; hourlyUsd: number } | null {
  const avail = gpus.filter(
    (g) =>
      g.secure &&
      (g.availability ?? "NONE") !== "NONE" &&
      Number.isFinite(g.priceSecure) &&
      (g.priceSecure as number) > 0,
  );
  if (!avail.length) return null;
  avail.sort((a, b) => (b.priceSecure as number) - (a.priceSecure as number));
  return { id: avail[0].id, hourlyUsd: avail[0].priceSecure as number };
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
    }
  | { error: ProvisionErrorCode; message?: string };

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
    if (!best) return { error: "no_stock", message: "No RunPod Secure GPU stock right now." };
    const created = await createRunpodPod({
      name: opts.name,
      image: workload.image,
      gpuId: best.id,
      ports: workload.ports,
      env: workload.env,
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
  };
}
