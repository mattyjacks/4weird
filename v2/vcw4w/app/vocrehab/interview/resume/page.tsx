"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
    <main className="vocrehab-interview-resume mx-auto w-full max-w-3xl space-y-3 p-4">
      <h1 className="text-xl font-bold">Resume builder</h1>
      <p className="text-muted-foreground">
        Header is yours to enter; strengths come from what you approve.
        Volunteer work, caregiving, gigs, and training all count. Export as
        JSON or print — nothing here sends your resume anywhere.
      </p>
      <section aria-label="How to fill each field" className="space-y-2">
        <h2 className="text-lg font-semibold">How to fill each field</h2>
        <p className="text-sm text-muted-foreground">
          Work top to bottom and keep every line short enough to scan. The
          preview below updates as you type, so you can watch the page take
          shape. If a field feels hard, skip it, finish the easy ones, and
          return with fresh eyes. A finished short resume beats a perfect
          unfinished one every time.
        </p>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8 text-sm">
          <li>
            <p className="font-medium">Name and contact: only what you want shown.</p>
            <p className="text-muted-foreground">
              Use the name you introduce yourself with and one contact
              method you actually answer. No address is needed at this
              stage, and you may omit anything you prefer to share later in
              person.
            </p>
          </li>
          <li>
            <p className="font-medium">Goal line: one line naming the work you want.</p>
            <p className="text-muted-foreground">
              Example: Reliable team member seeking part time stockroom
              work. Match the words to the jobs you will pursue so the
              reader instantly files you correctly.
            </p>
          </li>
          <li>
            <p className="font-medium">Strengths: one per line, with proof nearby.</p>
            <p className="text-muted-foreground">
              Borrow words from your earlier game feedback, such as steady
              accuracy or calm recovery. Plain adjectives alone are weak;
              pair each with experience lines below that prove it.
            </p>
          </li>
          <li>
            <p className="font-medium">Experience: paid plus unpaid, one per line.</p>
            <p className="text-muted-foreground">
              Pantry volunteer shifts, school pickup routines, gig
              deliveries, and completed training each earn a line. Start
              each line with a verb: stocked, counted, drove, completed,
              assisted.
            </p>
          </li>
          <li>
            <p className="font-medium">Skills: short phrases an employer can scan.</p>
            <p className="text-muted-foreground">
              Think tools and habits: hand truck, register counts, written
              lists, opening routines. Six to ten tight phrases is plenty.
            </p>
          </li>
          <li>
            <p className="font-medium">Accommodations: optional, opt in only.</p>
            <p className="text-muted-foreground">
              Leave this blank unless you have decided to list a need on
              paper. Most seekers raise needs later with a short script
              from the{" "}
              <Link href="/vocrehab/interview/disclosure" className="underline">
                disclosure builder
              </Link>
              . Nothing appears here unless you type it.
            </p>
          </li>
        </ol>
      </section>
      <div className="grid gap-2">
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
      <section aria-label="Lines that work" className="space-y-2">
        <h2 className="text-lg font-semibold">Experience lines that work</h2>
        <p className="text-sm text-muted-foreground">
          Strong lines name what you did plus what it shows. Compare weak
          and strong versions of the same history and copy the pattern, not
          the words.
        </p>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Weak: helped at pantry. Strong: stocked three pantry aisles
            weekly and logged donations accurately.
          </li>
          <li>
            Weak: took care of kids. Strong: managed school pickup and meals
            daily for two children, keeping a steady routine.
          </li>
          <li>
            Weak: did gigs. Strong: completed rideshare and delivery shifts
            with high ratings across one year.
          </li>
          <li>
            Weak: took a course. Strong: finished warehouse skills training,
            including inventory counts and safety routines.
          </li>
        </ul>
      </section>
      <section aria-label="Resume mistakes" className="space-y-2">
        <h2 className="text-lg font-semibold">Mistakes that shrink your page</h2>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Leaving unpaid work off entirely, which erases years of
            reliability a manager would value.
          </li>
          <li>
            Writing dense paragraphs instead of short verb led lines that a
            busy reader can scan in seconds.
          </li>
          <li>
            Listing a dozen vague strengths with no experience lines to
            prove any of them.
          </li>
          <li>
            Adding personal details you are not ready to share, such as
            health facts or a full address, before anyone asked.
          </li>
        </ul>
      </section>
      <section aria-label="Resume questions" className="space-y-2">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="font-medium">Where does this resume go when I save?</p>
            <p className="mt-1 text-muted-foreground">
              Download and Print stay entirely on your device. The Save
              button stores a copy to your account for your counselor, and
              it asks for sign-in first if you are a guest. Nothing here
              ever sends your draft to an employer or an outside system on
              its own.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What should I do with the finished page?</p>
            <p className="mt-1 text-muted-foreground">
              Print it or download the JSON, then bring it to your next
              counselor session alongside your answers from the{" "}
              <Link href="/vocrehab/interview/prep" className="underline">
                prep generator
              </Link>{" "}
              and your timing choice from the{" "}
              <Link href="/vocrehab/course" className="underline">
                course lessons
              </Link>
              . One reviewed page, carried in hand, changes how the meeting
              goes. Gather everything on the{" "}
              <Link href="/vocrehab/export" className="underline">
                export page
              </Link>{" "}
              when you are ready.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">How long should my resume be?</p>
            <p className="mt-1 text-muted-foreground">
              One page is the goal for most applicants here. If your draft
              runs long, cut the oldest or least relevant lines first and
              keep what matches the job you want next. Your counselor can
              help you trim kindly, keeping proof and dropping filler.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
