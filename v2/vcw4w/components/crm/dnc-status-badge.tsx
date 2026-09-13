"use client";

import { evaluateSafeHarborStatus } from "@/lib/easydnc";

interface DncStatusBadgeProps {
  status?: string | null;
  checkedAt?: string | null;
  className?: string;
  compact?: boolean;
}

export function DncStatusBadge({
  status,
  checkedAt,
  className = "",
  compact = false,
}: DncStatusBadgeProps) {
  const normStatus = (status ?? "unverified").toLowerCase();

  // If flagged on DNC, it's an immediate severe warning
  if (normStatus === "dnc") {
    return (
      <span
        title="REGISTERED ON NATIONAL DO NOT CALL REGISTRY. Telemarketing calls strictly prohibited ($51,744/call fine risk)."
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-300 shadow-sm shadow-red-900/30 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
        {compact ? "ON DNC" : "⛔ DO NOT CALL (On DNC)"}
      </span>
    );
  }

  if (normStatus === "clean") {
    const safeHarbor = evaluateSafeHarborStatus(checkedAt);

    if (!safeHarbor.active) {
      return (
        <span
          title="Safe Harbor Lapsed (>31 Days). FTC TSR requires scrubbing every 31 days. Calling without re-scrub exposes you to statutory fines."
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {compact ? "Expired" : `⚠️ Expired (Day ${safeHarbor.daysElapsed}/31)`}
        </span>
      );
    }

    if (safeHarbor.isExpiringSoon) {
      return (
        <span
          title="Scrub nearing 31-day expiration. Weekly scrubbing strongly recommended."
          className={`inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-950/60 px-2.5 py-0.5 text-xs font-medium text-yellow-300 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          {compact ? "Expiring" : `Clean · Expires in ${safeHarbor.daysRemaining}d`}
        </span>
      );
    }

    return (
      <span
        title="Scrubbed clean against National DNC Registry. FTC Safe Harbor Active (valid for 31 days)."
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {compact ? "Clean" : `🛡️ Clean (${safeHarbor.daysRemaining}d safe)`}
      </span>
    );
  }

  if (normStatus === "error") {
    return (
      <span
        title="Invalid phone number format or lookup error."
        className={`inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-400 ${className}`}
      >
        Format Error
      </span>
    );
  }

  return (
    <span
      title="Never scrubbed against National DNC Registry. Scrub before calling to maintain Safe Harbor defense."
      className={`inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-xs text-slate-400 ${className}`}
    >
      Unverified
    </span>
  );
}
