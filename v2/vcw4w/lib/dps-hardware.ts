/**
 * DPS hardware detector — Remastery Feature 04 DonatePersonalSeconds.
 * README §3.4 (DonatePersonalSeconds P2P Compute & WebGPU Sharing).
 *
 * Axioms honored (README §1.2): fail-open (every probe try/caught with sane
 * defaults — detection never throws, never bricks the donor console) and
 * SSR-safe (no window/navigator/document access at module top level; all
 * browser probes run inside detectHardwareCapabilities() behind typeof
 * guards so server-side rendering returns defaults).
 *
 * Money math is NOT defined here — coin parity (100 coins = exactly $1.00)
 * and the 75/25 split live canonically in ./remastery-pricing.ts (see also
 * README §1.2); this module only describes donor hardware capability.
 *
 * SELF-CONTAINED: zero imports, pure module, no side effects on load.
 */

export interface HardwareCapabilities {
  cpuCores: number;
  memoryGb: number;
  gpuRenderer: string;
  hasWebGPU: boolean;
  networkDownlinkMbps: number;
  batterySaver?: boolean;
}

export type ComputeClass = "light" | "standard" | "heavy";

export interface DonationViability {
  viable: boolean;
  reason: string;
}

const DEFAULT_CAPS: HardwareCapabilities = {
  cpuCores: 4,
  memoryGb: 4,
  gpuRenderer: "Unknown",
  hasWebGPU: false,
  networkDownlinkMbps: 10,
};

function probeCpuCores(): number {
  try {
    const n =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { hardwareConcurrency?: unknown }).hardwareConcurrency
        : undefined;
    const cores = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : NaN;
    return cores >= 1 ? Math.min(cores, 1024) : DEFAULT_CAPS.cpuCores;
  } catch {
    return DEFAULT_CAPS.cpuCores;
  }
}

function probeMemoryGb(): number {
  try {
    const n =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { deviceMemory?: unknown }).deviceMemory
        : undefined;
    const mem = typeof n === "number" && Number.isFinite(n) ? n : NaN;
    return mem > 0 ? mem : DEFAULT_CAPS.memoryGb;
  } catch {
    return DEFAULT_CAPS.memoryGb;
  }
}

function probeNetworkDownlinkMbps(): number {
  try {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
      return DEFAULT_CAPS.networkDownlinkMbps;
    }
    const conn = (navigator as Navigator & { connection?: { downlink?: unknown } }).connection;
    const downlink = conn?.downlink;
    return typeof downlink === "number" && Number.isFinite(downlink) && downlink > 0
      ? downlink
      : DEFAULT_CAPS.networkDownlinkMbps;
  } catch {
    return DEFAULT_CAPS.networkDownlinkMbps;
  }
}

function probeHasWebGPU(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    return (
      "gpu" in navigator &&
      (navigator as Navigator & { gpu?: unknown }).gpu !== undefined &&
      (navigator as Navigator & { gpu?: unknown }).gpu !== null
    );
  } catch {
    return false;
  }
}

function probeGpuRenderer(): string {
  try {
    if (typeof document === "undefined") return DEFAULT_CAPS.gpuRenderer;
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return DEFAULT_CAPS.gpuRenderer;
    try {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (typeof renderer === "string" && renderer.length > 0) return renderer;
      }
    } catch {
      // Fall through to masked renderer below (fail-open).
    }
    try {
      const masked = gl.getParameter(gl.RENDERER);
      if (typeof masked === "string" && masked.length > 0) return masked;
    } catch {
      // Fall through to default (fail-open).
    }
    return DEFAULT_CAPS.gpuRenderer;
  } catch {
    return DEFAULT_CAPS.gpuRenderer;
  }
}

/**
 * Detect donor hardware. Fail-open + SSR-safe: never throws; on the server
 * (or when every probe fails) returns sane defaults.
 */
export function detectHardwareCapabilities(): HardwareCapabilities {
  try {
    return {
      cpuCores: probeCpuCores(),
      memoryGb: probeMemoryGb(),
      gpuRenderer: probeGpuRenderer(),
      hasWebGPU: probeHasWebGPU(),
      networkDownlinkMbps: probeNetworkDownlinkMbps(),
    };
  } catch {
    return { ...DEFAULT_CAPS };
  }
}

/**
 * Guard: is this device viable as a compute donor? Fail-open on malformed
 * input (returns viable:false with a reason, never throws). Battery-saver
 * and low-memory devices are declined per README §3.4 thermal/battery tips.
 */
export function isDonationViable(caps: HardwareCapabilities): DonationViability {
  try {
    if (!caps || typeof caps !== "object") {
      return { viable: false, reason: "unreadable hardware profile" };
    }
    if (caps.batterySaver === true) {
      return { viable: false, reason: "battery saver is on" };
    }
    if (!(typeof caps.memoryGb === "number" && Number.isFinite(caps.memoryGb))) {
      return { viable: false, reason: "unreadable memory profile" };
    }
    if (caps.memoryGb < 2) {
      return { viable: false, reason: "low memory (< 2 GB)" };
    }
    if (typeof caps.cpuCores === "number" && Number.isFinite(caps.cpuCores) && caps.cpuCores < 2) {
      return { viable: false, reason: "single-core device" };
    }
    return { viable: true, reason: "ready" };
  } catch {
    return { viable: false, reason: "detection failed" };
  }
}

/**
 * Estimate the donor compute class. Fail-open: any malformed input maps to
 * "light" (safest scheduling tier), never throws.
 */
export function estimateComputeClass(caps: HardwareCapabilities): ComputeClass {
  try {
    if (!caps || typeof caps !== "object") return "light";
    const cores =
      typeof caps.cpuCores === "number" && Number.isFinite(caps.cpuCores) ? caps.cpuCores : 0;
    const mem =
      typeof caps.memoryGb === "number" && Number.isFinite(caps.memoryGb) ? caps.memoryGb : 0;
    if (cores >= 8 && mem >= 8 && caps.hasWebGPU === true) return "heavy";
    if (cores <= 2 || mem < 2) return "light";
    return "standard";
  } catch {
    return "light";
  }
}

/** Alias honoring the envelope's ESTIMATED_COMPUTE_CLASS helper name. */
export const ESTIMATED_COMPUTE_CLASS = estimateComputeClass;
