// DPS donor console status toggle — remastery README 3.4 (DonatePersonalSeconds).
// SSR-safe presentational client component: props-only, no data fetching, fail-open defaults.
"use client";

import React from "react";

export type DpsStatus = "online" | "busy" | "offline";

export interface StatusToggleProps {
  value: DpsStatus;
  onChange: (next: DpsStatus) => void;
}

const OPTIONS: DpsStatus[] = ["online", "busy", "offline"];

export function StatusToggle({ value, onChange }: StatusToggleProps) {
  return (
    <div role="radiogroup" aria-label="Donor status">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
