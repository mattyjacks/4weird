// DPS donor console share slider — remastery README 3.4 (DonatePersonalSeconds).
// SSR-safe presentational client component: props-only, no data fetching, fail-open defaults.
"use client";

import React from "react";

export interface ShareSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

export function ShareSlider({ label, value, min = 0, max = 100, onChange }: ShareSliderProps) {
  const safeValue = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  const sliderId = React.useId();
  return (
    <div>
      <label htmlFor={sliderId}>
        {label}: {safeValue}%
      </label>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        value={safeValue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
