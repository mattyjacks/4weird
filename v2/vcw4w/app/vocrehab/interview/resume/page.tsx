"use client";

import { useMemo, useState } from "react";
import type {
  VocrehabDocumentSaveInput,
  VocrehabResume,
} from "@/types/vocrehab-documents";

/**
 * VocRehab resume builder (client). Structured sections from goals +
 * user-approved strengths; volunteer, caregiving, gigs, and training all
 * count as experience. Output is clean JSON + print CSS the user downloads
 * or prints. Explicit save only; no parsing, no auto-submission anywhere.
 */
export default function VocrehabInterviewResumePage() {
  const [vocrehabName, setVocrehabName] = useState("");
  const [vocrehabContact, setVocrehabContact] = useState("");
  const [vocrehabGoalLine, setVocrehabGoalLine] = useState("");
  const [vocrehabStrengths, setVocrehabStrengths] = useState("");
  const [vocrehabExperience, setVocrehabExperience] = useState("");
  const [vocrehabSkills, setVocrehabSkills] = useState("");
  const [vocrehabAccommodations, setVocrehabAccommodations] = useState("");
  const [vocrehabStatus, setVocrehabStatus] = useState<string | null>(null);
  const [vocrehabSaving, setVocrehabSaving] = useState(false);

  const vocrehabResume: VocrehabResume = useMemo(() => {
    const vocrehabLines = (value: string) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    return {
      vocrehabName: vocrehabName.trim(),
      vocrehabContact: vocrehabContact.trim(),
      vocrehabGoalLine: vocrehabGoalLine.trim(),
      vocrehabStrengths: vocrehabLines(vocrehabStrengths),
      vocrehabSections: [
        { vocrehabHeading: "Experience", vocrehabLines: vocrehabLines(vocrehabExperience) },
        { vocrehabHeading: "Skills", vocrehabLines: vocrehabLines(vocrehabSkills) },
      ],
      vocrehabAccommodationsOptIn: vocrehabLines(vocrehabAccommodations),
    };
  }, [
    vocrehabName,
    vocrehabContact,
    vocrehabGoalLine,
    vocrehabStrengths,
    vocrehabExperience,
    vocrehabSkills,
    vocrehabAccommodations,
  ]);

  const vocrehabJson = useMemo(
    () => JSON.stringify(vocrehabResume, null, 2),
    [vocrehabResume],
  );

  function vocrehabDownload() {
    const blob = new Blob([vocrehabJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocrehab-resume.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function vocrehabSave() {
    setVocrehabSaving(true);
    setVocrehabStatus(null);
    try {
      const payload: VocrehabDocumentSaveInput = {
        kind: "resume",
        title: vocrehabName.trim()
          ? `Resume — ${vocrehabName.trim()}`
          : "Resume draft",
        body: vocrehabResume as unknown as Record<string, unknown>,
      };
      const res = await fetch("/api/vocrehab/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Could not save. Try again.");
      }
      setVocrehabStatus("Saved. Sign-in required — guests see a sign-in prompt.");
    } catch (err) {
      setVocrehabStatus(
        err instanceof Error ? err.message : "Could not save. Try again.",
      );
    } finally {
      setVocrehabSaving(false);
    }
  }

  const vocrehabField =
    "w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-100";

  return (
    <main className="vocrehab-interview-resume mx-auto w-full max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Resume builder</h1>
      <p className="text-muted-foreground">
        Header is yours to enter; strengths come from what you approve.
        Volunteer work, caregiving, gigs, and training all count. Export as
        JSON or print — nothing here sends your resume anywhere.
      </p>
      <div className="grid gap-3">
        <label className="text-sm">
          Name
          <input
            value={vocrehabName}
            onChange={(event) => setVocrehabName(event.target.value)}
            className={vocrehabField}
            placeholder="Your name"
          />
        </label>
        <label className="text-sm">
          Contact (you enter only what you want shown)
          <input
            value={vocrehabContact}
            onChange={(event) => setVocrehabContact(event.target.value)}
            className={vocrehabField}
            placeholder="Phone or email"
          />
        </label>
        <label className="text-sm">
          Goal line
          <input
            value={vocrehabGoalLine}
            onChange={(event) => setVocrehabGoalLine(event.target.value)}
            className={vocrehabField}
            placeholder="Reliable team member seeking…"
          />
        </label>
        <label className="text-sm">
          Strengths (one per line)
          <textarea
            value={vocrehabStrengths}
            onChange={(event) => setVocrehabStrengths(event.target.value)}
            rows={3}
            className={vocrehabField}
          />
        </label>
        <label className="text-sm">
          Experience — jobs, volunteer, caregiving, gigs, training (one per line)
          <textarea
            value={vocrehabExperience}
            onChange={(event) => setVocrehabExperience(event.target.value)}
            rows={4}
            className={vocrehabField}
          />
        </label>
        <label className="text-sm">
          Skills (one per line)
          <textarea
            value={vocrehabSkills}
            onChange={(event) => setVocrehabSkills(event.target.value)}
            rows={3}
            className={vocrehabField}
          />
        </label>
        <label className="text-sm">
          Accommodations to list (optional — only if you opt in)
          <textarea
            value={vocrehabAccommodations}
            onChange={(event) => setVocrehabAccommodations(event.target.value)}
            rows={2}
            className={vocrehabField}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={vocrehabDownload}
          className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border px-4 py-1.5 text-sm"
        >
          Print
        </button>
        <button
          type="button"
          onClick={() => void vocrehabSave()}
          disabled={vocrehabSaving}
          className="rounded-md border px-4 py-1.5 text-sm disabled:opacity-50"
        >
          {vocrehabSaving ? "Saving…" : "Save (signed in only)"}
        </button>
      </div>
      {vocrehabStatus && (
        <p role="status" className="text-sm">
          {vocrehabStatus}
        </p>
      )}
      <pre
        aria-label="Resume JSON preview"
        className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-200"
      >
        {vocrehabJson}
      </pre>
    </main>
  );
}
