"use client";

/**
 * RegionNotSupported — IP-based "not available in your region" notice.
 *
 * The globe spins by cycling 🌎 → 🌍 → 🌏 in that exact order. Region comes
 * from GET /api/region (CDN geo headers from visitor IP). NH/USA remains the
 * governing law (Terms §17); this notice is a compliance gate, not a ToS fork.
 */

import { useEffect, useState } from "react";
import {
  FEATURE_LABELS,
  isFeatureSupportedInRegion,
  type RemasteryFeature,
} from "@/lib/remastery-region-gates";
import type { RegionInfo } from "@/lib/monetization-policy";

/** Globe frames in exact spinning order: Americas → Europe/Africa → Asia. */
export const SPIN_GLOBES = ["🌎", "🌍", "🌏"] as const;

export function useSpinningGlobe(intervalMs = 600): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SPIN_GLOBES.length), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return SPIN_GLOBES[idx];
}

function GlobeCard({
  country,
  regionClass,
  featureLabel,
  reason,
  variant,
}: {
  country: string;
  regionClass: string;
  featureLabel?: string;
  reason: string;
  variant: "page" | "feature";
}) {
  const globe = useSpinningGlobe();
  return (
    <section
      role="status"
      aria-label="Region not supported for this page"
      style={{
        maxWidth: variant === "page" ? 560 : "100%",
        margin: variant === "page" ? "3rem auto" : "1rem 0",
        padding: "2rem 1.75rem",
        borderRadius: 20,
        textAlign: "center",
        color: "#f1f5f9",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0c4a6e 100%)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        boxShadow: "0 20px 60px rgba(2, 6, 23, 0.55)",
        fontFamily: "sans-serif",
      }}
    >
      <div aria-hidden style={{ fontSize: "3.5rem", lineHeight: 1 }} title="Spinning globe">
        {globe}
      </div>
      <h2 style={{ margin: "0.75rem 0 0.25rem", fontSize: "1.4rem", fontWeight: 900 }}>
        Region not supported for this {variant === "page" ? "page" : "feature"}
      </h2>
      {featureLabel ? (
        <p style={{ margin: "0.25rem 0", color: "#a5f3fc", fontWeight: 700 }}>
          {featureLabel}
        </p>
      ) : null}
      <p style={{ margin: "0.5rem auto", maxWidth: 440, color: "#cbd5e1" }}>{reason}</p>
      <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
        Detected region: {country} ({regionClass}) · Governed by New Hampshire, USA law
      </p>
    </section>
  );
}

/** Full-page takeover: the whole page is unsupported in this region. */
export function RegionNotSupportedPage({
  country,
  regionClass,
  reason,
}: {
  country: string;
  regionClass: string;
  reason: string;
}) {
  return (
    <main style={{ padding: "1rem" }}>
      <GlobeCard
        country={country}
        regionClass={regionClass}
        reason={reason}
        variant="page"
      />
    </main>
  );
}

/** Inline block: page stays up, one feature slot shows the notice. */
export function RegionNotSupportedFeature({
  country,
  regionClass,
  feature,
  reason,
}: {
  country: string;
  regionClass: string;
  feature: RemasteryFeature;
  reason: string;
}) {
  return (
    <GlobeCard
      country={country}
      regionClass={regionClass}
      featureLabel={FEATURE_LABELS[feature]}
      reason={reason}
      variant="feature"
    />
  );
}

type GateState =
  | { phase: "loading" }
  | { phase: "allowed"; region: RegionInfo }
  | { phase: "blocked"; region: RegionInfo; reason: string };

/**
 * RegionGate — client wrapper. Fetches /api/region (IP-derived), checks the
 * feature gate, and renders children or the spinning-globe notice.
 *
 * variant="page" replaces the whole page; variant="feature" renders an inline
 * card so the rest of the page stays usable.
 */
export function RegionGate({
  feature,
  variant = "page",
  children,
}: {
  feature: RemasteryFeature;
  variant?: "page" | "feature";
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GateState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/region", { cache: "no-store" });
        const region = (await res.json()) as RegionInfo;
        if (cancelled) return;
        const verdict = isFeatureSupportedInRegion(feature, region);
        if (verdict.supported) setState({ phase: "allowed", region });
        else setState({ phase: "blocked", region, reason: verdict.reason });
      } catch {
        // Fail closed: no region = EU-strict = blocked for gated features.
        if (!cancelled) {
          const region: RegionInfo = { country: "XX", region: "", class: "UNKNOWN" };
          const verdict = isFeatureSupportedInRegion(feature, region);
          if (verdict.supported) setState({ phase: "allowed", region });
          else
            setState({
              phase: "blocked",
              region,
              reason:
                verdict.supported === false
                  ? verdict.reason
                  : "Region check failed, so this feature is disabled.",
            });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feature]);

  if (state.phase === "loading" || state.phase === "allowed") {
    // Fail-open render while checking so SSR/cached pages never blank; the
    // gate swaps in the notice the moment the region resolves as blocked.
    return <>{children}</>;
  }

  if (variant === "feature") {
    // Feature slot replaced by the notice; the rest of the host page (outside
    // this gate) stays visible and supported.
    return (
      <RegionNotSupportedFeature
        country={state.region.country}
        regionClass={state.region.class}
        feature={feature}
        reason={state.reason}
      />
    );
  }

  return (
    <RegionNotSupportedPage
      country={state.region.country}
      regionClass={state.region.class}
      reason={state.reason}
    />
  );
}
