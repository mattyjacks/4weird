/**
 * Virtual Desktop catalog; client-safe constants for the /desktop page.
 *
 * A Virtual Desktop is a real RunPod pod you drive in the browser:
 * - CPU desktop: official RunPod Ubuntu 22.04 base (template
 *   `runpod-ubuntu-2204`), JupyterLab + SSH in the browser via the RunPod
 *   default proxy endpoint. Cheapest way to get a remote Linux box.
 * - GPU desktop: official RunPod Desktop template (`runpod-desktop`,
 *   image `runpod/kasm-docker:cuda11`), a full Kasm graphical desktop
 *   streamed over the browser on port 6901 via the RunPod default proxy
 *   endpoint. Real GPUs for Blender, CUDA dev, AI art, and play.
 *
 * Billing honesty (mirrors /api/agents/runpod-sync + /my/usage): RunPod
 * bills the operator's card per second for the pod. Coin figures below are
 * display equivalents only (100 coins = $1.00); no Vibe cut applies to
 * direct RunPod spend, and this page never debits coins itself.
 */

export const DESKTOP_KINDS = ["cpu", "gpu"] as const;
export type DesktopKind = (typeof DESKTOP_KINDS)[number];

export function isDesktopKind(value: unknown): value is DesktopKind {
  return typeof value === "string" && (DESKTOP_KINDS as readonly string[]).includes(value);
}

/**
 * Desktop interface: `gui` (default) boots an Ubuntu graphical desktop
 * (Kasm) streamed in the browser; `jupyter` boots a JupyterLab + SSH box
 * instead. GUI is the default because first-timers expect a computer they
 * can see - Jupyter stays one click away for coders.
 */
export const DESKTOP_INTERFACES = ["gui", "jupyter"] as const;
export type DesktopInterface = (typeof DESKTOP_INTERFACES)[number];

export function isDesktopInterface(value: unknown): value is DesktopInterface {
  return typeof value === "string" && (DESKTOP_INTERFACES as readonly string[]).includes(value);
}

export function parseDesktopInterface(value: unknown): DesktopInterface {
  return isDesktopInterface(value) ? value : "gui";
}

export type DesktopPlan = {
  kind: DesktopKind;
  name: string;
  tagline: string;
  image: string;
  templateId: string;
  port: number;
  ports: string[];
  diskGb: number;
  blurb: string;
  bestFor: string[];
  /** The Jupyter alternative (one click away from the GUI default). */
  jupyter: { image: string; templateId: string; port: number; ports: string[] };
};

export const DESKTOP_IMAGE_GPU = "runpod/kasm-docker:cuda11";
export const DESKTOP_IMAGE_CPU = "runpod/base:1.0.2-ubuntu2204";
export const DESKTOP_TEMPLATE_GPU = "runpod-desktop";
export const DESKTOP_TEMPLATE_CPU = "runpod-ubuntu-2204";
export const DESKTOP_PORT_GPU = 6901;
export const DESKTOP_PORT_CPU = 8888;

/**
 * GUI desktop image (default interface): the community `runpod-desktop`
 * template image (`runpod/kasm-docker:cuda11`, Kasm on port 6901, login with
 * the VNC password). GPU desktops stream with hardware acceleration; CPU
 * desktops run the same image with software rendering (no GPU needed to see
 * a desktop; it is just less fast at 3D). Jupyter images stay per-kind:
 * official `runpod-ubuntu-2204` (CPU) / `runpod-torch-v240` PyTorch (GPU).
 */
export const DESKTOP_IMAGE_GUI = "runpod/kasm-docker:cuda11";
export const DESKTOP_PORT_GUI = 6901;
export const DESKTOP_PORTS_GUI = ["6901/http", "22/tcp"];
export const DESKTOP_IMAGE_GPU_JUPYTER = "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04";
export const DESKTOP_TEMPLATE_GPU_JUPYTER = "runpod-torch-v240";

export const DESKTOP_PLANS: DesktopPlan[] = [
  {
    kind: "cpu",
    name: "CPU Desktop",
    tagline: "A remote Ubuntu desktop in your browser; cheapest way to compute.",
    image: DESKTOP_IMAGE_GUI,
    templateId: DESKTOP_TEMPLATE_GPU,
    port: DESKTOP_PORT_GUI,
    ports: [...DESKTOP_PORTS_GUI],
    // RunPod caps CPU pod container disks at 20 GB - GUI image must fit.
    diskGb: 20,
    blurb:
      "Ubuntu graphical desktop (Kasm) on port 6901, opened through the RunPod default proxy endpoint: XFCE desktop, Chromium, VS Code, terminal. JupyterLab + SSH is one click away (pick Jupyter below).",
    bestFor: ["Browsing + files", "Coding + notebooks", "Always-on helper box"],
    jupyter: {
      image: DESKTOP_IMAGE_CPU,
      templateId: DESKTOP_TEMPLATE_CPU,
      port: DESKTOP_PORT_CPU,
      ports: ["8888/http", "22/tcp"],
    },
  },
  {
    kind: "gpu",
    name: "GPU Desktop",
    tagline: "A full graphical desktop on real GPUs; streamed to your browser.",
    image: DESKTOP_IMAGE_GPU,
    templateId: DESKTOP_TEMPLATE_GPU,
    port: DESKTOP_PORT_GPU,
    ports: [...DESKTOP_PORTS_GUI],
    diskGb: 60,
    blurb:
      "Official RunPod Desktop (Kasm) on port 6901: XFCE desktop, Chromium, VS Code, Blender-ready GPU acceleration. The pod streams its screen; you just open the link. JupyterLab on a CUDA box is one click away (pick Jupyter below).",
    bestFor: ["Blender + CUDA dev", "AI art + ComfyUI sidecar", "GPU play + testing"],
    jupyter: {
      image: DESKTOP_IMAGE_GPU_JUPYTER,
      templateId: DESKTOP_TEMPLATE_GPU_JUPYTER,
      port: 8888,
      ports: ["8888/http", "22/tcp"],
    },
  },
];

/** USD/hr ceiling accepted from the client ($0.01-$1000, same bounds as agents). */
export const DESKTOP_PRICE_USD_MIN = 0.01;
export const DESKTOP_PRICE_USD_MAX = 1000;

export function parseDesktopMaxUsd(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v < DESKTOP_PRICE_USD_MIN || v > DESKTOP_PRICE_USD_MAX) return 0;
  return Math.round(v * 100) / 100;
}

/** Display equivalent: USD → Vibe Coins (100 coins = $1.00). Informational only. */
export function desktopUsdToCoins(usd: number): number {
  return Math.round(Number(usd) * 100 * 100) / 100;
}

export function planForKind(kind: DesktopKind): DesktopPlan {
  const found = DESKTOP_PLANS.find((p) => p.kind === kind);
  if (!found) throw new Error(`Unknown desktop kind: ${kind}.`);
  return found;
}

export function cleanDesktopName(value: unknown): string {
  // Strip control chars (log-injection / terminal-escape hygiene), collapse
  // internal whitespace, then cap length. Pod names flow into the RunPod
  // create call and server logs; printable single-line text only.
  return String(value ?? "")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return (code >= 32 && code <= 126) || code >= 160;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/**
 * Registry allowlist for advanced custom container images — byte-identical
 * membership to `CUSTOM_IMAGE_REGISTRY_ALLOWLIST` in lib/compute.ts (which
 * is SERVER-ONLY, so the list is duplicated here rather than imported; this
 * file stays client-safe). Keep the two in sync: any host added/removed
 * there must be added/removed here, or the provision route and provisioning
 * will split (route-accept/compute-reject or vice versa).
 */
export const DESKTOP_IMAGE_REGISTRY_ALLOWLIST = [
  "docker.io",
  "registry.hub.docker.com",
  "ghcr.io",
  "gcr.io",
  "public.ecr.aws",
  "quay.io",
] as const;

/**
 * Validate an advanced custom container image (Docker ref) at the desktop
 * lane boundary. Predicate mirrors `cleanCustomImage` in lib/compute.ts
 * branch-for-branch (same trim, same 256-char cap, same shape rejects, same
 * registry gate: bare Docker Hub refs stay allowed, an explicit registry
 * host must be allowlisted, `localhost`/IP hosts refused) so the provision
 * route 400s early on exactly the refs provisioning would refuse — never a
 * route-accept/compute-reject split. `evil.io/anything` is refused at both
 * layers. Empty/blank means "plan default" and is handled by the caller.
 */
export function isValidDesktopImageRef(value: unknown): boolean {
  const v = String(value ?? "").trim().slice(0, 256);
  if (!v) return false;
  // No URLs, no embedded credentials, no shell metachars.
  if (v.includes("://") || v.includes("@")) return false;
  if (/[\s"'`$\\;|&<>]/.test(v)) return false;
  if (!/^[a-z0-9][a-z0-9._/-]*[a-z0-9](:[a-z0-9._-]+)?$/i.test(v)) return false;
  if (!v.includes("/") && !v.includes(":")) return false;
  // Registry gate (mirrors cleanCustomImage): a first path component
  // containing '.' or ':' (or 'localhost') names an explicit host — refuse
  // unless allowlisted. Single-component refs (`nginx:latest`, no '/') are
  // Docker Hub and skip; bare Hub refs (`runpod/img:tag`) stay allowed.
  if (v.includes("/")) {
    const first = (v.split("/")[0] ?? "").toLowerCase();
    const namesHost = first.includes(".") || first.includes(":") || first === "localhost";
    if (namesHost) {
      const host = (first.split(":")[0] ?? "");
      if (!(DESKTOP_IMAGE_REGISTRY_ALLOWLIST as readonly string[]).includes(host)) return false;
    }
  }
  return true;
}
