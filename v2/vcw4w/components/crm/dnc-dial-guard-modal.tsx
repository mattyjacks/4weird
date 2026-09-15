"use client";

import { useState } from "react";
import {
  FTC_TSR_MAX_FINE_PER_CALL,
  TCPA_STATUTORY_FINE_MIN,
  TCPA_STATUTORY_FINE_MAX,
  SAFE_HARBOR_DAYS,
} from "@/lib/easydnc";

interface DncDialGuardModalProps {
  contactName: string;
  phone: string;
  dncStatus: string;
  dncCheckedAt?: string | null;
  onClose: () => void;
  onScrubNow?: () => Promise<void>;
  onProceedAnyway?: () => void;
}

export function DncDialGuardModal({
  contactName,
  phone,
  dncStatus,
  dncCheckedAt,
  onClose,
  onScrubNow,
  onProceedAnyway,
}: DncDialGuardModalProps) {
  const [scrubbing, setScrubbing] = useState(false);
  const isRegisteredDnc = String(dncStatus ?? "").toLowerCase() === "dnc";

  async function handleScrub() {
    if (!onScrubNow) return;
    setScrubbing(true);
    try {
      await onScrubNow();
      onClose();
    } catch {
      setScrubbing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-red-500/40 bg-slate-950 p-6 text-white shadow-2xl shadow-red-950/50 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/50 bg-red-950/80 text-2xl">
            {isRegisteredDnc ? "⛔" : "⚠️"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-300">
              {isRegisteredDnc
                ? "DIAL BLOCKED: Registered on Do Not Call Registry"
                : "COMPLIANCE WARNING: DNC Scrub Expired or Unverified"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Target: <strong className="text-white">{contactName}</strong> ({phone})
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs text-slate-300">
          <p className="font-semibold text-white">Legal Penalties for Calling Non-Compliant Numbers:</p>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-400">
            <li>
              <strong className="text-red-300">FTC TSR Civil Penalty:</strong> Up to{" "}
              <strong className="text-white">${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()}</strong> per violation (per call).
            </li>
            <li>
              <strong className="text-red-300">TCPA Statutory Damages:</strong>{" "}
              <strong className="text-white">${TCPA_STATUTORY_FINE_MIN}</strong> up to{" "}
              <strong className="text-white">${TCPA_STATUTORY_FINE_MAX.toLocaleString()}</strong> per call (if willful).
            </li>
            <li>
              <strong className="text-cyan-300">FTC 31-Day Rule:</strong> Under 16 CFR § 310.4(b)(3)(iv), you must scrub numbers every{" "}
              <strong>{SAFE_HARBOR_DAYS} days</strong> at minimum to maintain Safe Harbor defense.
            </li>
          </ul>
        </div>

        {isRegisteredDnc ? (
          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-200">
            <strong>Action Prohibited:</strong> This number is flagged on the National DNC Registry. 4weird CRM blocks direct dialing to shield your organization from legal liability.
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            This contact has either never been scrubbed or its {SAFE_HARBOR_DAYS}-day safe harbor has lapsed. Run an instant scrub (2.5 🪙 / $0.025) before placing your outreach call.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[.05] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[.10]"
          >
            Cancel
          </button>

          {!isRegisteredDnc && onScrubNow && (
            <button
              type="button"
              disabled={scrubbing}
              onClick={handleScrub}
              className="rounded-xl border border-cyan-400/40 bg-cyan-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {scrubbing ? "Scrubbing..." : "⚡ Scrub with EasyDNC (2.5 🪙)"}
            </button>
          )}

          {!isRegisteredDnc && onProceedAnyway && (
            <button
              type="button"
              onClick={onProceedAnyway}
              className="text-xs text-slate-500 underline transition hover:text-slate-300"
            >
              I have written consent / proceed at own risk
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
