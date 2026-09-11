/**
 * Virtual Desktop catalog — client-safe constants for the /desktop page.
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
 * display equivalents only (100 coins = $1.00) — no Vibe cut applies to
 * direct RunPod spend, and this page never debits coins itself.
 */

export const DESKTOP_KINDS = ["cpu", "gpu"] as const;
export type DesktopKind = (typeof DESKTOP_KINDS)[number];

export function isDesktopKind(value: unknown): value is DesktopKind {
  return typeof value === "string" && (DESKTOP_KINDS as readonly string[]).includes(value);
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
};

export const DESKTOP_IMAGE_GPU = "runpod/kasm-docker:cuda11";
export const DESKTOP_IMAGE_CPU = "runpod/base:1.0.2-ubuntu2204";
export const DESKTOP_TEMPLATE_GPU = "runpod-desktop";
export const DESKTOP_TEMPLATE_CPU = "runpod-ubuntu-2204";
export const DESKTOP_PORT_GPU = 6901;
export const DESKTOP_PORT_CPU = 8888;

export const DESKTOP_PLANS: DesktopPlan[] = [
  {
    kind: "cpu",
    name: "CPU Desktop",
    tagline: "A remote Ubuntu box in your browser — cheapest way to compute.",
    image: DESKTOP_IMAGE_CPU,
    templateId: DESKTOP_TEMPLATE_CPU,
    port: DESKTOP_PORT_CPU,
    ports: ["8888/http", "22/tcp"],
    diskGb: 20,
    blurb:
      "Official RunPod Ubuntu 22.04 with JupyterLab + SSH, opened through the RunPod default proxy endpoint. Code, browse files, run cron jobs — no GPU needed.",
    bestFor: ["Coding + notebooks", "Light browsing + files", "Always-on helper box"],
  },
  {
    kind: "gpu",
    name: "GPU Desktop",
    tagline: "A full graphical desktop on real GPUs — streamed to your browser.",
    image: DESKTOP_IMAGE_GPU,
    templateId: DESKTOP_TEMPLATE_GPU,
    port: DESKTOP_PORT_GPU,
    ports: ["6901/http"],
    diskGb: 60,
    blurb:
      "Official RunPod Desktop (Kasm) on port 6901: XFCE desktop, Chromium, VS Code, Blender-ready GPU acceleration. The pod streams its screen — you just open the link.",
    bestFor: ["Blender + CUDA dev", "AI art + ComfyUI sidecar", "GPU play + testing"],
  },
];

/** USD/hr ceiling accepted from the client ($0.01–$1000, same bounds as agents). */
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
  return String(value ?? "").trim().slice(0, 60);
}
