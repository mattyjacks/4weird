"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { vocrehabBandInfo, vocrehabRemoteReadiness } from "@/lib/vocrehab-assessments";

export default function Page() {
  const [vocrehabQuiet, setVocrehabQuiet] = useState(false);
  const [vocrehabInternet, setVocrehabInternet] = useState(false);
  const [vocrehabDevice, setVocrehabDevice] = useState(false);
  const [vocrehabBackup, setVocrehabBackup] = useState(false);
  const [vocrehabFileSort, setVocrehabFileSort] = useState(false);
  const [vocrehabInbox, setVocrehabInbox] = useState(false);
  const [vocrehabFocus, setVocrehabFocus] = useState(false);
  const [vocrehabKeyboard, setVocrehabKeyboard] = useState(false);
  const [vocrehabSaveState, setVocrehabSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");

  const result = useMemo(
    () =>
      vocrehabRemoteReadiness({
        quietSpace: vocrehabQuiet,
        reliableInternet: vocrehabInternet,
        device: vocrehabDevice,
        backupPlan: vocrehabBackup,
        fileSortCompleted: vocrehabFileSort,
        inboxCompleted: vocrehabInbox,
        focusCompleted: vocrehabFocus,
        keyboardOnly: vocrehabKeyboard,
      }),
    [vocrehabQuiet, vocrehabInternet, vocrehabDevice, vocrehabBackup, vocrehabFileSort, vocrehabInbox, vocrehabFocus, vocrehabKeyboard],
  );
  const info = vocrehabBandInfo(result.band);

  const vocrehabChecks: { label: string; value: boolean; set: (v: boolean) => void }[] = [
    { label: "A quiet space for work blocks", value: vocrehabQuiet, set: setVocrehabQuiet },
    { label: "Reliable internet", value: vocrehabInternet, set: setVocrehabInternet },
    { label: "A device that works well", value: vocrehabDevice, set: setVocrehabDevice },
    { label: "A backup plan for outages", value: vocrehabBackup, set: setVocrehabBackup },
    { label: "Completed File Sort", value: vocrehabFileSort, set: setVocrehabFileSort },
    { label: "Completed Inbox Sprint", value: vocrehabInbox, set: setVocrehabInbox },
    { label: "Completed Focus Shift", value: vocrehabFocus, set: setVocrehabFocus },
    { label: "Finished a run keyboard-only", value: vocrehabKeyboard, set: setVocrehabKeyboard },
  ];

  const vocrehabSave = async () => {
    setVocrehabSaveState("saving");
    try {
      const res = await fetch("/api/vocrehab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "remote",
          payload: {
            quiet: vocrehabQuiet,
            internet: vocrehabInternet,
            device: vocrehabDevice,
            backup: vocrehabBackup,
            games: { fileSort: vocrehabFileSort, inbox: vocrehabInbox, focus: vocrehabFocus },
            keyboardOnly: vocrehabKeyboard,
          },
          profile: { band: result.band, supports: result.supports, accommodations: result.accommodations },
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
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Remote feasibility
      </nav>
      <h1 className="text-xl font-bold">Remote work feasibility analyzer</h1>
      <p>
        The verdict comes from the remote-task game triple plus an environment checklist you fill in with plain
        yes/no answers — no jargon. Many people land on hybrid with supports rather than remote-or-nothing, and
        that counts as a win.
      </p>

      <fieldset>
        <legend className="font-medium">Check what is true for you</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {vocrehabChecks.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => c.set(!c.value)}
              aria-pressed={c.value}
              className="rounded border p-3 text-left aria-pressed:border-primary"
            >
              <span className="font-medium">{c.value ? "✓ " : "○ "}{c.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-label="Verdict" aria-live="polite" className="space-y-2 rounded-lg border p-3">
        <h2 className="font-semibold">✓ {info.headline}</h2>
        <p className="text-sm">{result.summary}</p>
        <p className="text-sm"><strong>Supports that help:</strong></p>
        <ul className="list-disc pl-5 text-sm">
          {result.supports.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="text-sm"><strong>Worth discussing:</strong></p>
        <ul className="list-disc pl-5 text-sm">
          {result.accommodations.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      {vocrehabSaveState === "guest" && (
        <p role="status" className="text-sm font-medium">Sign in to save this analysis. It stays on this page until then.</p>
      )}
      {vocrehabSaveState === "error" && (
        <p role="status" className="text-sm font-medium">Could not save right now — your analysis above is safe. Try again.</p>
      )}
      {vocrehabSaveState === "saved" && (
        <p role="status" className="text-sm font-medium">✓ Analysis saved.</p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={vocrehabSave}
          disabled={vocrehabSaveState === "saving" || vocrehabSaveState === "saved"}
          className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
        >
          {vocrehabSaveState === "saving" ? "Saving…" : "Save analysis"}
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border px-4 py-2 font-medium">
          Print
        </button>
      </div>
    </main>
  );
}
