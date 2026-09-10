/**
 * Compute-provider adapters for the agent-rental marketplace.
 *
 * SERVER-ONLY: reads RUNPOD_API_KEY / DIGITALOCEAN_TOKEN. Never import this
 * module in a client component.
 *
 * Real VM provisioning happens provider-side (RunPod / DigitalOcean APIs).
 * v2 tracks booking + metering + coin settlement only: when credentials are
 * missing the adapter reports `{ error: "unconfigured" }` and the caller
 * must surface that state — provisions are NEVER faked.
 */

export type ProviderCode = "runpod" | "digitalocean" | "custom";

export type ProvisionSpec = {
  /** Listing name (used as the remote workload label). */
  name: string;
  /** Agent runtime the VM must run. */
  runtime: "openclaw" | "nanoclaw" | "custom";
  /** Only used by the custom adapter: renter/owner-supplied endpoint. */
  endpointUrl?: string;
};

export type ProvisionResult =
  | { endpointUrl: string }
  | { error: "unconfigured" | "invalid_endpoint" };

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

export const runpodProvider: ComputeProvider = {
  code: "runpod",
  name: "RunPod",
  configured() {
    return Boolean(process.env.RUNPOD_API_KEY);
  },
  async provision() {
    // Credentials present, but endpoint creation is operator-wired (call the
    // RunPod pod-create API here and return its real endpoint). Until then
    // listings use owner-supplied https endpoints and this hook declines
    // rather than synthesizing a URL that points at nothing.
    return { error: "unconfigured" };
  },
};

export const digitaloceanProvider: ComputeProvider = {
  code: "digitalocean",
  name: "DigitalOcean",
  configured() {
    return Boolean(process.env.DIGITALOCEAN_TOKEN);
  },
  async provision() {
    // Same contract as RunPod: wire the Droplet-create API call here and
    // return its real endpoint; until then decline instead of faking one.
    return { error: "unconfigured" };
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
    return { endpointUrl: String(spec.endpointUrl) };
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
