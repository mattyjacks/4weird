"use client";

// HostFreeBanner: FREE PLAY cost notice. Either the host covers the
// room (host-pays) or the per-minute coin cost is split across the
// party (split). Pure props, SSR-safe (no browser APIs), fail-open
// (invalid numbers render a generic notice, never throw). ASCII-only.

export type HostCostMode = "host-pays" | "split";

export interface HostFreeBannerProps {
  hostName?: string | null;
  coinsPerMin?: number | null;
  partySize?: number | null;
  mode?: HostCostMode | null;
}

function toFiniteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function HostFreeBanner({ hostName, coinsPerMin, partySize, mode }: HostFreeBannerProps) {
  const host = typeof hostName === "string" && hostName.trim().length > 0 ? hostName.trim() : "The host";
  const rate = toFiniteOrNull(coinsPerMin);
  const sizeRaw = toFiniteOrNull(partySize);
  const size = sizeRaw !== null && sizeRaw > 0 ? Math.floor(sizeRaw) : null;
  const split = mode === "split";
  const rateText = rate !== null && rate >= 0 ? `${Math.floor(rate)} coins/min` : "coin rate TBD";
  const perSeat =
    split && rate !== null && rate >= 0 && size !== null && size > 0
      ? (rate / size).toFixed(2)
      : null;

  return (
    <section
      aria-label="Free play cost notice"
      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-300 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-slate-950">
          Free Play
        </span>
        <h2 className="text-sm font-bold text-white">
          {split ? "Cost split across the party" : `${host} is paying`}
        </h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        {split ? (
          <>
            Room rate {rateText}
            {size !== null ? ` across ${size} ${size === 1 ? "seat" : "seats"}` : ""}
            {perSeat !== null ? ` = about ${perSeat} coins/min each.` : "."} Nobody
            pays extra while the meter runs.
          </>
        ) : (
          <>
            {host} covers the room at {rateText}. Guests play free while the
            host meter runs.
          </>
        )}
      </p>
    </section>
  );
}
