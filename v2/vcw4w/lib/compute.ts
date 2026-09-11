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
