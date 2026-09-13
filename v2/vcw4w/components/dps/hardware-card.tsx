// DPS donor console hardware card — remastery README 3.4 (DonatePersonalSeconds).
// SSR-safe presentational client component: props-only, no data fetching, fail-open defaults.
"use client";

import React from "react";

export interface HardwareCapabilitiesProps {
  cpuCores: number | null;
  memoryGb: number | null;
  gpuRenderer: string | null;
  hasWebGPU: boolean | null;
}

export interface HardwareCardProps {
  hardware: HardwareCapabilitiesProps | null;
}

function fallback<T>(val: T | null): T | string {
  return val === null || val === undefined ? "detecting\u2026" : val;
}

export function HardwareCard({ hardware }: HardwareCardProps) {
  const caps: HardwareCapabilitiesProps = hardware ?? {
    cpuCores: null,
    memoryGb: null,
    gpuRenderer: null,
    hasWebGPU: null,
  };
  return (
    <dl>
      <dt>CPU cores</dt>
      <dd>{String(fallback(caps.cpuCores))}</dd>
      <dt>Memory (GB)</dt>
      <dd>{String(fallback(caps.memoryGb))}</dd>
      <dt>GPU renderer</dt>
      <dd>{String(fallback(caps.gpuRenderer))}</dd>
      <dt>WebGPU</dt>
      <dd>
        {caps.hasWebGPU === null || caps.hasWebGPU === undefined
          ? "detecting\u2026"
          : caps.hasWebGPU
            ? "supported"
            : "not supported"}
      </dd>
    </dl>
  );
}
