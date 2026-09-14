"use client";

import { useMemo, useState } from "react";
import {
  vocrehabCalculateSsiEstimate,
  vocrehabFormatWholeDollars,
  vocrehabSsiDisclaimer,
  vocrehabSsiParams2026,
} from "@/lib/vocrehab-ssi";

const WAGE_PRESETS = [12, 16, 20];
const HOURS_PRESETS = [10, 15, 20];

type GaugeZone = "lower" | "middle" | "higher";

function zoneFor(shift: number, earnings: number): GaugeZone {
  if (earnings <= 0) return "lower";
  const ratio = shift / earnings;
  if (ratio < 0.25) return "lower";
  if (ratio < 0.45) return "middle";
  return "higher";
}

const ZONE_META: Record<GaugeZone, { label: string; bar: string; pattern: string }> = {
  lower: { label: "Lower shift", bar: "bg-emerald-400", pattern: "solid fill" },
  middle: { label: "Middle shift", bar: "bg-amber-400", pattern: "dotted fill" },
  higher: { label: "Higher shift", bar: "bg-rose-400", pattern: "striped fill" },
};

export default function VocrehabSsiSlider() {
  const [wage, setWage] = useState(16);
  const [hours, setHours] = useState(15);
  const [saveRun, setSaveRun] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const estimate = useMemo(
    () => vocrehabCalculateSsiEstimate({ hourlyWage: wage, hoursPerWeek: hours }),
    [wage, hours],
  );
  const zone = zoneFor(estimate.estimatedSsiShift, estimate.monthlyEarnings);
  const zoneMeta = ZONE_META[zone];
  const gaugePct = useMemo(() => {
    if (estimate.monthlyEarnings <= 0) return 0;
    return Math.min(100, Math.round((estimate.estimatedSsiShift / estimate.monthlyEarnings) * 100));
  }, [estimate]);

  async function handleSaveToggle(next: boolean) {
    setSaveRun(next);
    setSaveNote(null);
    if (!next) return;
    try {
      const res = await fetch("/api/vocrehab/ssi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hourlyWage: wage, hoursPerWeek: hours, save: true }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      setSaveNote(
        body.success ? "Estimate sketch saved to your runs." : `Save skipped: ${body.error ?? "sign in to save."}`,
      );
    } catch {
      setSaveNote("Save skipped: network hiccup — your on-screen estimate sketch is unchanged.");
    }
  }

  return (
    <section aria-labelledby="vocrehab-ssi-heading" className="space-y-6">
      <h2 id="vocrehab-ssi-heading" className="text-xl font-bold">
        SSI work sketch slider
      </h2>

      <div className="space-y-4">
        <label className="block">
          <span className="font-medium">
            Hourly wage: about {vocrehabFormatWholeDollars(wage)}/hr
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={0.25}
            value={wage}
            onChange={(e) => setWage(Number(e.target.value))}
            aria-label="Hourly wage in dollars"
            aria-valuetext={`about ${vocrehabFormatWholeDollars(wage)} per hour`}
            className="w-full"
          />
        </label>
        <label className="block">
          <span className="font-medium">Hours per week: about {hours} hours</span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-label="Hours worked per week"
            aria-valuetext={`about ${hours} hours per week`}
            className="w-full"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Tip: sliders support arrow keys, Page Up / Page Down, Home, and End.
        </p>
      </div>

      <div className="space-y-2" aria-label="Preset work sketches">
        <p className="text-sm font-medium">Presets (hours × wage):</p>
        <div className="flex flex-wrap gap-2">
          {HOURS_PRESETS.flatMap((h) =>
            WAGE_PRESETS.map((w) => (
              <button
                key={`${h}x${w}`}
                type="button"
                onClick={() => {
                  setHours(h);
                  setWage(w);
                }}
                className="rounded-full border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
                aria-label={`Preset sketch: about ${h} hours at about ${vocrehabFormatWholeDollars(w)} per hour`}
              >
                {h}h × ${w}
              </button>
            )),
          )}
        </div>
      </div>

      <div
        role="img"
        aria-label={`Estimated SSI shift gauge: ${zoneMeta.label}, about ${gaugePct} percent of monthly earnings.`}
        className="rounded-xl border border-white/15 p-4"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{zoneMeta.label}</span>
          <span className="text-muted-foreground">pattern: {zoneMeta.pattern}</span>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full ${zoneMeta.bar} ${zone === "higher" ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.35)_4px,rgba(0,0,0,0.35)_8px)]" : zone === "middle" ? "bg-[radial-gradient(rgba(0,0,0,0.4)_1px,transparent_1px)] bg-[size:6px_6px]" : ""}`}
            style={{ width: `${gaugePct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Gauge zones: lower / middle / higher shift — color plus label plus pattern, never color alone.
        </p>
      </div>

      <dl className="grid gap-2 rounded-xl border border-white/15 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Monthly earnings (about)</dt>
          <dd className="text-lg font-bold">{vocrehabFormatWholeDollars(estimate.monthlyEarnings)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Countable sketch (about)</dt>
          <dd className="text-lg font-bold">{vocrehabFormatWholeDollars(estimate.countableSketch)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Estimated SSI shift (about)</dt>
          <dd className="text-lg font-bold">{vocrehabFormatWholeDollars(estimate.estimatedSsiShift)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Combined sketch (about)</dt>
          <dd className="text-lg font-bold">{vocrehabFormatWholeDollars(estimate.combinedSketch)}</dd>
        </div>
      </dl>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saveRun}
          onChange={(e) => void handleSaveToggle(e.target.checked)}
        />
        Save this run to my account (optional, sign-in required)
      </label>
      {saveNote ? (
        <p role="status" className="text-sm text-muted-foreground">
          {saveNote}
        </p>
      ) : null}

      <p className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">
        {vocrehabSsiDisclaimer} Params {vocrehabSsiParams2026.paramsVersion}, effective{" "}
        {vocrehabSsiParams2026.effectiveDate}.
      </p>
    </section>
  );
}
