"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { vocrehabSignalsFor } from "@/lib/vocrehab-assessments";

const VOCREHAB_CATEGORIES = ["office", "retail", "warehouse", "remote", "food-service", "healthcare-support", "other"] as const;
const VOCREHAB_TAGS = ["sorting", "writing", "refocus", "stamina", "steady"] as const;

export default function Page() {
  const [vocrehabGoal, setVocrehabGoal] = useState("");
  const [vocrehabCategory, setVocrehabCategory] = useState<string>("office");
  const [vocrehabMarket, setVocrehabMarket] = useState("");
  const [vocrehabTags, setVocrehabTags] = useState<string[]>(["sorting"]);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");

  const signals = useMemo(() => vocrehabSignalsFor(vocrehabCategory, vocrehabTags), [vocrehabCategory, vocrehabTags]);

  const vocrehabToggleTag = (tag: string) => {
    setVocrehabTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "goals",
          payload: {
            goal: vocrehabGoal.slice(0, 1000),
            category: vocrehabCategory,
            marketNotes: vocrehabMarket.slice(0, 2000),
            strengthTags: vocrehabTags,
          },
          profile: { signals: signals.map((s) => ({ signal: s.signal, reason: s.reason })) },
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
        <Link href="/vocrehab/play">Arcade</Link> → Goal alignment
      </nav>
      <h1 className="text-xl font-bold">Job goal alignment checker</h1>
      <p>
        Compare a job goal with strengths you observed in the games plus your own local-market notes. There is
        no labor-market database and no hiring prediction here — just reasons tied to what you showed you can
        do, matched against what you know about nearby work.
      </p>

      <div className="space-y-3">
        <div>
          <label htmlFor="vocrehab-goals-text" className="font-medium">Your job goal (your own words)</label>
          <input
            id="vocrehab-goals-text"
            type="text"
            value={vocrehabGoal}
            onChange={(e) => setVocrehabGoal(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="Example: morning stocking at the grocery on Route 9"
          />
        </div>
        <div>
          <label htmlFor="vocrehab-goals-cat" className="font-medium">Closest category</label>
          <select
            id="vocrehab-goals-cat"
            value={vocrehabCategory}
            onChange={(e) => setVocrehabCategory(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          >
            {VOCREHAB_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="font-medium">Strengths the games showed (pick any)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {VOCREHAB_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => vocrehabToggleTag(t)}
                aria-pressed={vocrehabTags.includes(t)}
                className="rounded border px-3 py-1.5 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {vocrehabTags.includes(t) ? "✓ " : "○ "}{t}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="vocrehab-goals-market" className="font-medium">
            Your local-market notes (what is actually hiring near you?)
          </label>
          <textarea
            id="vocrehab-goals-market"
            rows={2}
            value={vocrehabMarket}
            onChange={(e) => setVocrehabMarket(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="Example: warehouse on Route 9 hiring, needs forklift cert"
          />
        </div>
      </div>

      <section aria-label="Alignment" aria-live="polite" className="space-y-2">
        <h2 className="font-semibold">Alignment signals</h2>
        {signals.map((s) => (
          <p key={`${s.goalCategory}-${s.strengthTag}`} className="rounded-lg border p-3 text-sm">
            {s.signal === "strong-fit" ? "✓ Strong fit" : s.signal === "stretch" ? "▲ Stretch (doable with supports)" : "○ Explore with a counselor"} — {s.reason}
          </p>
        ))}
      </section>

      {vocrehabSaveState === "guest" && (
        <p role="status" className="text-sm font-medium">Sign in to save this check. It stays on this page until then.</p>
      )}
      {vocrehabSaveState === "error" && (
        <p role="status" className="text-sm font-medium">Could not save right now — your check above is safe. Try again.</p>
      )}
      {vocrehabSaveState === "saved" && (
        <p role="status" className="text-sm font-medium">✓ Check saved.</p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={vocrehabSave}
          disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
          className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {vocrehabSaveState === "saving" ? "Saving…" : "Save check"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border px-4 py-2 font-medium">
          Print
        </button>
      </div>
    </main>
  );
}
