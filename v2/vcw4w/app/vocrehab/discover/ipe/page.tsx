"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  vocrehabBarrierStrategies,
  vocrehabSynthesizeProfile,
  type VocrehabBarrierId,
} from "@/lib/vocrehab-assessments";

const VOCREHAB_BARRIERS: readonly { id: VocrehabBarrierId; label: string }[] = [
  { id: "transport", label: "Getting to work" },
  { id: "schedule", label: "Schedule conflicts" },
  { id: "disclosure", label: "Whether to share disability information" },
  { id: "at", label: "Tools and technology access" },
  { id: "benefits", label: "Worry about benefits and earnings" },
  { id: "rest", label: "Stamina and rest needs" },
  { id: "childcare", label: "Childcare and family care" },
];

function vocrehabSplitLines(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 20);
}

export default function Page() {
  const [vocrehabInterests, setVocrehabInterests] = useState("");
  const [vocrehabStrengthsText, setVocrehabStrengthsText] = useState("");
  const [vocrehabBarriers, setVocrehabBarriers] = useState<VocrehabBarrierId[]>([]);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");

  const strengths = useMemo(() => vocrehabSplitLines(vocrehabStrengthsText), [vocrehabStrengthsText]);
  const profile = useMemo(
    () =>
      vocrehabSynthesizeProfile({
        strengths,
        barriers: vocrehabBarriers,
        readinessBand: "supported",
        goalText: vocrehabInterests.split("\n")[0] ?? "",
        remoteBand: null,
      }),
    [strengths, vocrehabBarriers, vocrehabInterests],
  );

  const vocrehabToggleBarrier = (id: VocrehabBarrierId) => {
    setVocrehabBarriers((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    const payload = {
      kind: "ipe",
      payload: { interests: vocrehabInterests.slice(0, 4000), barriers: vocrehabBarriers },
      profile: { strengths: profile.strengths, supports: profile.supports, goals: profile.goals },
    };
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Vocational assessment
      </nav>
      <h1 className="text-xl font-bold">Vocational assessment (IPE builder)</h1>
      <p>
        Answer in plain language — game results can prefill the strengths box, and you edit everything. This
        draft helps your counselor write your employment plan. Nothing here is a verdict; you approve every word.
      </p>

      <div className="space-y-3">
        <div>
          <label htmlFor="vocrehab-ipe-interests" className="font-medium">
            What kind of work sounds good? What gets in the way?
          </label>
          <textarea
            id="vocrehab-ipe-interests"
            rows={3}
            value={vocrehabInterests}
            onChange={(e) => setVocrehabInterests(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="Example: stocking shelves mornings; the bus is the hard part"
          />
        </div>
        <div>
          <label htmlFor="vocrehab-ipe-strengths" className="font-medium">
            Strengths (one per line — copy from a game result, or write your own)
          </label>
          <textarea
            id="vocrehab-ipe-strengths"
            rows={3}
            value={vocrehabStrengthsText}
            onChange={(e) => setVocrehabStrengthsText(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder={"Example:\nkept a steady pace\nbounced back after snags"}
          />
        </div>
        <fieldset>
          <legend className="font-medium">What gets in the way? (pick any)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {VOCREHAB_BARRIERS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => vocrehabToggleBarrier(b.id)}
                aria-pressed={vocrehabBarriers.includes(b.id)}
                className="rounded border px-3 py-1.5 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {vocrehabBarriers.includes(b.id) ? "✓ " : "○ "}{b.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <section aria-label="Draft profile" aria-live="polite" className="space-y-2 rounded-lg border p-3">
        <h2 className="font-semibold">✓ Your draft (strengths first)</h2>
        <p className="text-sm"><strong>Strengths:</strong> {profile.strengths.join("; ")}</p>
        <p className="text-sm"><strong>Supports:</strong> {profile.supports.join(" ")}</p>
        <p className="text-sm"><strong>Suggested goals:</strong> {profile.goals.join(" ")}</p>
        {vocrehabBarriers.length > 0 && (
          <ul className="list-disc pl-5 text-sm">
            {vocrehabBarrierStrategies
              .filter((s) => vocrehabBarriers.includes(s.barrier))
              .slice(0, 6)
              .map((s) => (
                <li key={`${s.barrier}-${s.title}`}>
                  <strong>{s.barrierLabel} — {s.title}:</strong> {s.steps[0]}
                </li>
              ))}
          </ul>
        )}
      </section>

      {vocrehabSaveState === "guest" && (
        <p role="status" className="text-sm font-medium">Sign in to save this draft. It stays on this page until then.</p>
      )}
      {vocrehabSaveState === "error" && (
        <p role="status" className="text-sm font-medium">Could not save right now — your draft above is safe. Try again.</p>
      )}
      {vocrehabSaveState === "saved" && (
        <p role="status" className="text-sm font-medium">✓ Draft saved to your profile.</p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={vocrehabSave}
          disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
          className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {vocrehabSaveState === "saving" ? "Saving…" : "Save draft to profile"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border px-4 py-2 font-medium">
          Print
        </button>
      </div>
    </main>
  );
}
