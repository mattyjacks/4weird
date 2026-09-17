"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { vocrehabBandInfo, type VocrehabReadinessBand } from "@/lib/vocrehab-assessments";

const VOCREHAB_DIMENSIONS: readonly { id: string; label: string; support: string }[] = [
  { id: "throughput", label: "Getting through tasks", support: "extra time and a clear starting order" },
  { id: "comprehension", label: "Understanding instructions", support: "written steps alongside any video" },
  { id: "recovery", label: "Bouncing back from mistakes", support: "mistake-friendly practice with undo" },
  { id: "interruption", label: "Handling interruptions", support: "a pause signal and a refocus routine" },
  { id: "communication", label: "Writing short messages", support: "sentence starters and examples" },
  { id: "schedule", label: "Keeping a steady schedule", support: "a visible weekly plan with reminders" },
  { id: "accommodations", label: "Knowing which tools help", support: "one assistive-technology trial at a time" },
];

export default function Page() {
  const [vocrehabSteady, setVocrehabSteady] = useState<string[]>(["throughput"]);
  const [vocrehabGames, setVocrehabGames] = useState<string[]>([]);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");

  const vocrehabToggle = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const band: VocrehabReadinessBand = useMemo(() => {
    const score = vocrehabSteady.length + vocrehabGames.length;
    if (score >= 7) return "ready";
    if (score >= 4) return "supported";
    return "exploring";
  }, [vocrehabSteady, vocrehabGames]);

  const info = vocrehabBandInfo(band);
  const strengths = VOCREHAB_DIMENSIONS.filter((d) => vocrehabSteady.includes(d.id)).map((d) => d.label);
  const supports = VOCREHAB_DIMENSIONS.filter((d) => !vocrehabSteady.includes(d.id)).map(
    (d) => `${d.label}: ${d.support}`,
  );

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "readiness",
          payload: { steady: vocrehabSteady, games: vocrehabGames },
          profile: { band, strengths, supports },
        }),
      });
      if (res.status === 401) {
        setVocrehabSaveState("guest");
        return;
      }
      setVocrehabSaveState(res.ok ? "saved" : "error");
    } catch {
      setVocrehabSaveState("error");
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground print:hidden">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Work readiness
      </nav>
      <h1 className="text-xl font-bold">Work readiness profile</h1>
      <p>
        Mark the areas that feel steady — the rest become supports, not failures. Numbers stay behind an
        explainer; the headline is always human language. Accommodation flags are conversation starters, never
        automated prescriptions.
      </p>

      <fieldset>
        <legend className="font-medium">Which areas feel steady for you?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {VOCREHAB_DIMENSIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => vocrehabToggle(vocrehabSteady, d.id, setVocrehabSteady)}
              aria-pressed={vocrehabSteady.includes(d.id)}
              className="rounded border p-3 text-left aria-pressed:border-primary"
            >
              <span className="font-medium">{vocrehabSteady.includes(d.id) ? "✓ " : "○ "}{d.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-medium">Games completed (adds to the picture)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {["file-sort", "inbox-sprint", "focus-shift", "schedule-juggle"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => vocrehabToggle(vocrehabGames, g, setVocrehabGames)}
              aria-pressed={vocrehabGames.includes(g)}
              className="rounded border px-3 py-1.5 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {vocrehabGames.includes(g) ? "✓ " : "○ "}{g}
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-label="Profile" aria-live="polite" className="space-y-2 rounded-lg border p-3">
        <h2 className="font-semibold">✓ {info.headline}</h2>
        <p className="text-sm">{info.whatItMeans}</p>
        <p className="text-sm"><strong>Strengths:</strong> {strengths.length > 0 ? strengths.join("; ") : "still surfacing — try a practice round"}</p>
        {supports.length > 0 && (
          <p className="text-sm"><strong>Supports that help:</strong> {supports.join("; ")}</p>
        )}
        <ul className="list-disc pl-5 text-sm">
          {info.tryNext.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {vocrehabSaveState === "guest" && (
        <p role="status" className="text-sm font-medium">Sign in to save this profile. It stays on this page until then.</p>
      )}
      {vocrehabSaveState === "error" && (
        <p role="status" className="text-sm font-medium">Could not save right now — your profile above is safe. Try again.</p>
      )}
      {vocrehabSaveState === "saved" && (
        <p role="status" className="text-sm font-medium">✓ Profile saved.</p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={vocrehabSave}
          disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
          className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {vocrehabSaveState === "saving" ? "Saving…" : "Save profile"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border px-4 py-2 font-medium">
          Print
        </button>
      </div>
    </main>
  );
}
