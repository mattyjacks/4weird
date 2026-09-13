"use client";

interface BouncerStatusBadgeProps {
  status?: string | null;
  score?: number | null;
  toxicity?: boolean | null;
  className?: string;
  compact?: boolean;
}

export function BouncerStatusBadge({
  status,
  score,
  toxicity,
  className = "",
  compact = false,
}: BouncerStatusBadgeProps) {
  const normStatus = (status ?? "unknown").toLowerCase();
  const showScore =
    typeof score === "number" && Number.isFinite(score) && !compact;
  const toxic = Boolean(toxicity);
  const extras = `${showScore ? ` · ${Math.max(0, Math.min(100, Math.round(score as number)))}` : ""}${toxic ? " · ☣ toxic" : ""}`;

  if (normStatus === "deliverable") {
    return (
      <span
        title="Bouncer: deliverable — address accepts mail."
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {compact ? "Deliverable" : `✅ Deliverable${extras}`}
      </span>
    );
  }

  if (normStatus === "risky") {
    return (
      <span
        title="Bouncer: risky — catch-all, disposable, or low-engagement address. Suppress or double-opt-in before bulk sends."
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {compact ? "Risky" : `⚠️ Risky${extras}`}
      </span>
    );
  }

  if (normStatus === "undeliverable") {
    return (
      <span
        title="Bouncer: undeliverable — address bounces. Suppress from all sends."
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        {compact ? "Bounces" : `⛔ Undeliverable${extras}`}
      </span>
    );
  }

  return (
    <span
      title="Bouncer: unknown — never verified or verification failed. Verify before sending."
      className={`inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-xs text-slate-400 ${className}`}
    >
      {compact ? "Unknown" : `Unknown${extras || ""}`}
    </span>
  );
}
