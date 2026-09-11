"use client";

import { useEffect, useMemo, useState } from "react";
import { HOUSE_ADS, pickHouseAd, type HouseAd } from "@/lib/ads";

const PROVIDER_URL = process.env.NEXT_PUBLIC_AD_PROVIDER_URL ?? "";
const PROVIDER_TIMEOUT_MS = 4000;

type AdSlotProps = {
  slot: string;
  /** Seed for deterministic house-ad rotation (defaults to today). */
  seed?: string;
  /** Force a specific house ad (used for the guest interstitial pick). */
  forceAd?: HouseAd | null;
  /** "Skip" is always instant — this fires after it. */
  onSkipped?: () => void;
  /** Fires when any ad (primary or house) is shown. */
  onViewed?: (ad: HouseAd | null) => void;
  compact?: boolean;
};

/**
 * AdSlot — primary provider first, house fallback always.
 *
 * When NEXT_PUBLIC_AD_PROVIDER_URL is set, the slot tries the provider in an
 * iframe and falls back to one of the 10 house ads on error, timeout, or
 * adblock. When unset (today), it renders the house ad directly and says so.
 * Guests get an instant "Skip" button; signed-in players only see these in
 * explicit preview spots because they pay coins instead of watching ads.
 */
export function AdSlot({ slot, seed, forceAd, onSkipped, onViewed, compact }: AdSlotProps) {
  const day = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const house: HouseAd = useMemo(
    () => forceAd ?? pickHouseAd(seed ?? day, slot),
    [forceAd, seed, day, slot],
  );
  const [mode, setMode] = useState<"provider" | "house">(PROVIDER_URL ? "provider" : "house");
  const [skipped, setSkipped] = useState(false);

  // Single effect: report exactly one view (house immediately, provider on
  // iframe load), and fall back to house if the provider stalls (timeout),
  // errors, or is adblocked into silence.
  useEffect(() => {
    if (mode === "house") {
      onViewed?.(house);
      return;
    }
    const timer = setTimeout(() => setMode("house"), PROVIDER_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const skip = () => {
    setSkipped(true);
    onSkipped?.();
  };

  if (skipped) return null;

  return (
    <div
      role="complementary"
      aria-label={mode === "house" ? "House advertisement" : "Advertisement"}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-black to-cyan-500/10 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {mode === "house" ? "House ad · supports 4weird" : "Sponsored"}
        </p>
        <button
          type="button"
          onClick={skip}
          className="shrink-0 rounded-full border border-white/25 bg-black/60 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
        >
          Skip
        </button>
      </div>

      {mode === "provider" ? (
        <iframe
          title="Sponsored ad"
          src={`${PROVIDER_URL}?slot=${encodeURIComponent(slot)}`}
          className={`mt-2 w-full border-0 ${compact ? "h-24" : "h-56"}`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => onViewed?.(null)}
          onError={() => setMode("house")}
        />
      ) : (
        <HouseAdCard ad={house} compact={compact} />
      )}
    </div>
  );
}

export function HouseAdCard({ ad, compact }: { ad: HouseAd; compact?: boolean }) {
  const external = ad.href.startsWith("http");
  return (
    <div className={`flex items-center gap-4 ${compact ? "mt-1" : "mt-3"}`}>
      <span aria-hidden="true" className={`${compact ? "text-3xl" : "text-5xl"}`}>
        {ad.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">{ad.tag}</p>
        <p className={`font-black text-white ${compact ? "text-base" : "text-xl"}`}>{ad.title}</p>
        {!compact && <p className="mt-1 text-sm text-slate-300">{ad.blurb}</p>}
        <a
          href={ad.href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="mt-2 inline-block rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          {ad.cta} →
        </a>
      </div>
    </div>
  );
}

/** Preview grid of all 10 fallback creatives (used on /games while browsing). */
export function HouseAdGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {HOUSE_ADS.map((ad) => (
        <div key={ad.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <HouseAdCard ad={ad} compact />
        </div>
      ))}
    </div>
  );
}
