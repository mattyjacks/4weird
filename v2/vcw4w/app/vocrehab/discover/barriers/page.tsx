"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  vocrehabBarrierStrategies,
  type VocrehabBarrierId,
} from "@/lib/vocrehab-assessments";

const VOCREHAB_BARRIERS: readonly { id: VocrehabBarrierId; label: string; hint: string }[] = [
  { id: "transport", label: "Getting to work", hint: "bus, rides, distance" },
  { id: "schedule", label: "Schedule conflicts", hint: "family, class, second job" },
  { id: "disclosure", label: "Sharing disability information", hint: "when, how, whether" },
  { id: "at", label: "Tools and technology", hint: "screen reader, magnifier, speech input" },
  { id: "benefits", label: "Benefits and earnings worry", hint: "SSI, hours, pay" },
  { id: "rest", label: "Stamina and rest", hint: "breaks, energy, shift length" },
  { id: "childcare", label: "Childcare and family care", hint: "coverage, pickup, backup" },
];

export default function Page() {
  const [vocrehabPicked, setVocrehabPicked] = useState<VocrehabBarrierId[]>(["transport"]);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");

  const strategies = useMemo(
    () => vocrehabBarrierStrategies.filter((s) => vocrehabPicked.includes(s.barrier)),
    [vocrehabPicked],
  );

  const vocrehabToggle = (id: VocrehabBarrierId) => {
    setVocrehabPicked((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "barrier",
          payload: { barriers: vocrehabPicked },
          profile: { strategies: strategies.map((s) => s.title) },
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
        <Link href="/vocrehab/play/barrier-run">Barrier Run game</Link> → Barrier Buster
      </nav>
      <h1 className="text-xl font-bold">Barrier Buster</h1>
      <p>
        Pick the barriers that fit your life — each one maps to concrete strategies with exit ramps. These are
        suggestions, never prescriptions. Medical, legal, and benefits questions are handoffs to a person, not
        answers from this page.
      </p>

      <fieldset>
        <legend className="font-medium">Which barriers fit? (pick any)</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {VOCREHAB_BARRIERS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => vocrehabToggle(b.id)}
              aria-pressed={vocrehabPicked.includes(b.id)}
              className="rounded border p-3 text-left aria-pressed:border-primary"
            >
              <span className="font-medium">{vocrehabPicked.includes(b.id) ? "✓ " : "○ "}{b.label}</span>
              <span className="block text-sm text-muted-foreground">{b.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-label="Strategies" aria-live="polite" className="space-y-3">
        <h2 className="font-semibold">Your strategy shortlist</h2>
        {strategies.length === 0 && <p className="text-sm text-muted-foreground">Pick at least one barrier above.</p>}
        {strategies.map((s) => (
          <article key={`${s.barrier}-${s.title}`} className="rounded-lg border p-3">
            <h3 className="font-medium">✓ {s.barrierLabel} — {s.title}</h3>
            <ol className="list-decimal pl-5 text-sm">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {s.handoff && <p className="mt-1 text-sm font-medium">→ {s.handoff}</p>}
          </article>
        ))}
      </section>

      {vocrehabSaveState === "guest" && (
        <p role="status" className="text-sm font-medium">Sign in to save this shortlist. It stays on this page until then.</p>
      )}
      {vocrehabSaveState === "error" && (
        <p role="status" className="text-sm font-medium">Could not save right now — your shortlist above is safe. Try again.</p>
      )}
      {vocrehabSaveState === "saved" && (
        <p role="status" className="text-sm font-medium">✓ Shortlist saved to your profile.</p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={vocrehabSave}
          disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
          className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {vocrehabSaveState === "saving" ? "Saving…" : "Save shortlist to profile"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border px-4 py-2 font-medium">
          Print
        </button>
      </div>
    </main>
  );
}
