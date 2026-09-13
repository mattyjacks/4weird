/**
 * DigitalOcean REST client for the 4weird server.
 *
 * SERVER-ONLY: reads DIGITALOCEAN_TOKEN (+ optional DIGITALOCEAN_API_BASE).
 * Never import this module in a client component; the token must never reach
 * a browser.
 *
 * LONG_TERM_NOTE: DigitalOcean = longer-term rentals (entire servers /
 * droplets, volumes, snapshots) vs RunPod short GPU/serverless. Use this
 * client when the renter wants a persistent box that stays up for days or
 * weeks (whole server, attached volumes, point-in-time snapshots). Use the
 * RunPod client (`@/lib/runpod` + `@/lib/compute`) for short bursty GPU work
 * (autoplay remotes, blender renders, serverless jobs billed per second).
 *
 * What it never does: synthesize rows. Every failure returns
 * { ok: false, error } with the upstream status; callers surface that state.
 */

export const DIGITALOCEAN_API_BASE_DEFAULT = "https://api.digitalocean.com/v2";

const DIGITALOCEAN_API_BASE_ALLOW = new Set(["https://api.digitalocean.com/v2"]);

export function doApiBase(): string {
  const raw = (process.env.DIGITALOCEAN_API_BASE ?? "").trim().replace(/\/+$/, "");
  // Allowlist https bases only: an operator typo (or http) must never send
  // the Bearer token off-domain. Unknown values fail closed to the default.
  if (!raw) return DIGITALOCEAN_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return DIGITALOCEAN_API_BASE_DEFAULT;
    if (DIGITALOCEAN_API_BASE_ALLOW.has(`${u.origin}${u.pathname}`.replace(/\/+$/, ""))) return raw;
    return DIGITALOCEAN_API_BASE_DEFAULT;
  } catch {
    return DIGITALOCEAN_API_BASE_DEFAULT;
  }
}

export function doConfigured(): boolean {
  return Boolean((process.env.DIGITALOCEAN_TOKEN ?? "").trim());
}

/** SERVER-ONLY auth headers. Callers must never forward these to a browser. */
export function doHeaders(): Record<string, string> {
  const token = (process.env.DIGITALOCEAN_TOKEN ?? "").trim();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type DoResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type DoDroplet = {
  id: number;
  name: string;
  status: string;
  region: { slug?: string; name?: string } & Record<string, unknown>;
  size_slug?: string;
  size?: Record<string, unknown>;
  image?: Record<string, unknown>;
  networks?: Record<string, unknown>;
  tags?: string[];
  created_at?: string;
  [key: string]: unknown;
};

export type DoSize = {
  slug: string;
  price_monthly?: number;
  price_hourly?: number;
  [key: string]: unknown;
};

export type DoRegion = {
  slug: string;
  name?: string;
  available?: boolean;
  [key: string]: unknown;
};

export type DoSnapshot = {
  id: string;
  name?: string;
  resource_type?: string;
  size_gigabytes?: number;
  created_at?: string;
  [key: string]: unknown;
};

export type DoVolume = {
  id: string;
  name?: string;
  size_gigabytes?: number;
  region?: Record<string, unknown>;
  droplet_ids?: number[];
  [key: string]: unknown;
};

export type DoAction = {
  id?: number;
  status?: string;
  type?: string;
  [key: string]: unknown;
};

export type DoDropletActionType =
  | "shutdown"
  | "power_off"
  | "power_on"
  | "reboot"
  | "snapshot"
  | "password_reset"
  | "enable_backups"
  | "disable_backups"
  | "enable_ipv6"
  | "resize"
  | "restore"
  | "rebuild"
  | "rename";

const DO_ACTION_ALLOW = new Set<string>([
  "shutdown",
  "power_off",
  "power_on",
  "reboot",
  "snapshot",
  "password_reset",
  "enable_backups",
  "disable_backups",
  "enable_ipv6",
  "resize",
  "restore",
  "rebuild",
  "rename",
]);

function doToken(): string {
  return (process.env.DIGITALOCEAN_TOKEN ?? "").trim();
}

/** Truncate text and redact the token so errors never leak it. */
function scrubDoText(text: string): string {
  let out = String(text ?? "");
  const token = doToken();
  if (token && out.includes(token)) out = out.split(token).join("[redacted]");
  return out.slice(0, 160);
}

function errMsg(err: unknown): string {
  const msg = err instanceof Error ? err.message : "fetch failed";
  return `DigitalOcean request failed: ${scrubDoText(msg).slice(0, 140)}`;
}

async function doGet<T>(path: string, timeoutMs = 15_000): Promise<DoResult<T>> {
  const token = doToken();
  if (!token) return { ok: false, error: "DIGITALOCEAN_TOKEN is not set." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${doApiBase()}${path}`, {
      signal: controller.signal,
      headers: doHeaders(),
    });
    if (!res.ok) return { ok: false, error: `DigitalOcean GET ${path} HTTP ${res.status}.` };
    const data = (await res.json().catch(() => null)) as T;
    if (data == null) return { ok: false, error: `DigitalOcean GET ${path} returned an unexpected shape.` };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  } finally {
    clearTimeout(timer);
  }
}

function cleanId(value: string | number): string {
  return String(value ?? "").trim().slice(0, 128);
}

/** List droplets on the account (paginated server-side to 200 per page). */
export async function listDroplets(): Promise<DoResult<DoDroplet[]>> {
  const r = await doGet<{ droplets?: DoDroplet[] } | DoDroplet[]>(
    "/droplets?per_page=200",
    15_000,
  );
  if (r.ok === false) return { ok: false, error: r.error };
  const arr = Array.isArray(r.data) ? r.data : (r.data.droplets ?? []);
  if (!Array.isArray(arr)) return { ok: false, error: "DigitalOcean droplets returned an unexpected shape." };
  return { ok: true, data: arr };
}

/** Get one droplet by id. */
export async function getDroplet(id: string | number): Promise<DoResult<DoDroplet>> {
  const clean = cleanId(id);
  if (!clean) return { ok: false, error: "Missing droplet id." };
  if (!doToken()) return { ok: false, error: "DIGITALOCEAN_TOKEN is not set." };
  const r = await doGet<{ droplet?: DoDroplet } | DoDroplet>(
    `/droplets/${encodeURIComponent(clean)}`,
    15_000,
  );
  if (r.ok === false) return { ok: false, error: r.error };
  const droplet = Array.isArray(r.data)
    ? null
    : ((r.data as { droplet?: DoDroplet }).droplet ?? (r.data as DoDroplet));
  if (!droplet || typeof (droplet as DoDroplet).id === "undefined") {
    return { ok: false, error: "DigitalOcean droplet returned an unexpected shape." };
  }
  return { ok: true, data: droplet as DoDroplet };
}

export type CreateDropletOpts = {
  name: string;
  region: string;
  size: string;
  image: string;
  sshKeys?: string[];
  tags?: string[];
  userData?: string;
};

/** Create a droplet (longer-term rental: whole server, billed hourly). */
export async function createDroplet(opts: CreateDropletOpts): Promise<DoResult<DoDroplet>> {
  const token = doToken();
  if (!token) return { ok: false, error: "DIGITALOCEAN_TOKEN is not set." };
  const name = String(opts.name ?? "").trim().slice(0, 64);
  const region = String(opts.region ?? "").trim().slice(0, 64);
  const size = String(opts.size ?? "").trim().slice(0, 64);
  const image = String(opts.image ?? "").trim().slice(0, 128);
  if (!name || !region || !size || !image) {
    return { ok: false, error: "Missing droplet name, region, size, or image." };
  }
  // userData runs as root via cloud-init: length-cap it, keep it a string.
  const userData = opts.userData == null ? "" : String(opts.userData);
  if (userData.length > 16384) {
    return { ok: false, error: "Droplet userData is too large (max 16384 chars)." };
  }
  // sshKeys/tags cross into the provider request: cap count + length each.
  const sshKeys = Array.isArray(opts.sshKeys)
    ? opts.sshKeys.map((k) => String(k ?? "").trim()).filter(Boolean).slice(0, 20).map((k) => k.slice(0, 1024))
    : [];
  const tags = Array.isArray(opts.tags)
    ? opts.tags.map((t) => String(t ?? "").trim()).filter(Boolean).slice(0, 20).map((t) => t.slice(0, 64))
    : [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${doApiBase()}/droplets`, {
      method: "POST",
      signal: controller.signal,
      headers: doHeaders(),
      body: JSON.stringify({
        name,
        region,
        size,
        image,
        ...(sshKeys.length > 0 ? { ssh_keys: sshKeys } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        ...(userData ? { user_data: userData } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `DigitalOcean droplet create HTTP ${res.status}: ${scrubDoText(text)}` };
    }
    const data = (await res.json()) as { droplet?: DoDroplet } | DoDroplet;
    const droplet = (data as { droplet?: DoDroplet }).droplet ?? (data as DoDroplet);
    if (!droplet || typeof droplet.id === "undefined") {
      return { ok: false, error: "DigitalOcean returned no droplet id." };
    }
    return { ok: true, data: droplet };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a lifecycle action on a droplet: shutdown | power_on | reboot |
 * snapshot (pass opts.name for snapshot / resize / rebuild targets).
 */
export async function dropletAction(
  id: string | number,
  type: DoDropletActionType | string,
  opts?: { name?: string },
): Promise<DoResult<DoAction>> {
  const token = doToken();
  if (!token) return { ok: false, error: "DIGITALOCEAN_TOKEN is not set." };
  const clean = cleanId(id);
  if (!clean) return { ok: false, error: "Missing droplet id." };
  const t = String(type ?? "").trim().toLowerCase().slice(0, 32);
  if (!DO_ACTION_ALLOW.has(t)) {
    return { ok: false, error: "Invalid droplet action. Use shutdown, power_on, reboot, or snapshot (see DoDropletActionType)." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${doApiBase()}/droplets/${encodeURIComponent(clean)}/actions`, {
      method: "POST",
      signal: controller.signal,
      headers: doHeaders(),
      body: JSON.stringify({
        type: t,
        ...(opts?.name ? { name: String(opts.name).slice(0, 128) } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `DigitalOcean droplet ${t} HTTP ${res.status}: ${scrubDoText(text)}` };
    }
    const data = (await res.json()) as { action?: DoAction } | DoAction;
    const action = (data as { action?: DoAction }).action ?? (data as DoAction);
    return { ok: true, data: action };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Permanently delete a droplet (DELETE returns 204 with no body). */
export async function deleteDroplet(id: string | number): Promise<DoResult<{ deleted: true }>> {
  const token = doToken();
  if (!token) return { ok: false, error: "DIGITALOCEAN_TOKEN is not set." };
  const clean = cleanId(id);
  if (!clean) return { ok: false, error: "Missing droplet id." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${doApiBase()}/droplets/${encodeURIComponent(clean)}`, {
      method: "DELETE",
      signal: controller.signal,
      headers: doHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `DigitalOcean droplet delete HTTP ${res.status}: ${scrubDoText(text)}` };
    }
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** List available droplet sizes (hourly/monthly pricing per slug). */
export async function listSizes(): Promise<DoResult<DoSize[]>> {
  const r = await doGet<{ sizes?: DoSize[] } | DoSize[]>("/sizes?per_page=200", 15_000);
  if (r.ok === false) return { ok: false, error: r.error };
  const arr = Array.isArray(r.data) ? r.data : (r.data.sizes ?? []);
  if (!Array.isArray(arr)) return { ok: false, error: "DigitalOcean sizes returned an unexpected shape." };
  return { ok: true, data: arr };
}

/** List available regions. */
export async function listRegions(): Promise<DoResult<DoRegion[]>> {
  const r = await doGet<{ regions?: DoRegion[] } | DoRegion[]>("/regions?per_page=200", 15_000);
  if (r.ok === false) return { ok: false, error: r.error };
  const arr = Array.isArray(r.data) ? r.data : (r.data.regions ?? []);
  if (!Array.isArray(arr)) return { ok: false, error: "DigitalOcean regions returned an unexpected shape." };
  return { ok: true, data: arr };
}

/** List snapshots (droplet + volume point-in-time copies for long-term keeps). */
export async function listSnapshots(): Promise<DoResult<DoSnapshot[]>> {
  const r = await doGet<{ snapshots?: DoSnapshot[] } | DoSnapshot[]>(
    "/snapshots?per_page=200",
    15_000,
  );
  if (r.ok === false) return { ok: false, error: r.error };
  const arr = Array.isArray(r.data) ? r.data : (r.data.snapshots ?? []);
  if (!Array.isArray(arr)) return { ok: false, error: "DigitalOcean snapshots returned an unexpected shape." };
  return { ok: true, data: arr };
}

/** List block-storage volumes (persistent disks that outlive a droplet). */
export async function listVolumes(): Promise<DoResult<DoVolume[]>> {
  const r = await doGet<{ volumes?: DoVolume[] } | DoVolume[]>(
    "/volumes?per_page=200",
    15_000,
  );
  if (r.ok === false) return { ok: false, error: r.error };
  const arr = Array.isArray(r.data) ? r.data : (r.data.volumes ?? []);
  if (!Array.isArray(arr)) return { ok: false, error: "DigitalOcean volumes returned an unexpected shape." };
  return { ok: true, data: arr };
}

/** USD → Vibe Coin display equivalent (100 coins = $1.00). Informational. */
export function doUsdToCoins(usd: number): number {
  return Math.round(Number(usd) * 100 * 100) / 100;
}
