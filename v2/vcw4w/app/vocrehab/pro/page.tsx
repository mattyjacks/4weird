import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pro — VocRehab",
  description:
    "VocRehab Pro: consent-gated ambient session assistant for counselors. Paste once, review four drafts, approve each yourself.",
  alternates: { canonical: "/vocrehab/pro" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Pro: counselor workflow, ambient-assisted</h1>
      <section
        aria-labelledby="vocrehab-gate-heading"
        className="rounded-xl border border-white/15 p-5"
      >
        <h2 id="vocrehab-gate-heading" className="text-lg font-bold">
          Counselor gate — attestation, not surveillance
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            This suite is for counselors doing paperwork with a client&apos;s
            knowledge. Every session needs its own explicit consent checkbox.
          </li>
          <li>
            Access is gated by your signed-in account plus a per-session
            attestation you check yourself. There is no role column and no
            background listening — pasted or dictated notes only, no audio
            upload.
          </li>
          <li>
            Clients are initials or role labels here, never full names. A
            pre-submit warning plus one-tap redact strips SSN, email, phone,
            and DOB shapes before anything is drafted.
          </li>
          <li>
            Nothing auto-files, auto-sends, or decides eligibility. JCTS / SE /
            CE language is a template starting point — you determine need and
            write the final determination.
          </li>
        </ul>
        <form
          action="/vocrehab/pro/sessions"
          method="get"
          className="mt-4 space-y-3 rounded-lg bg-white/5 p-4"
        >
          <label
            htmlFor="vocrehab-pro-attest"
            className="flex cursor-pointer items-start gap-2 text-sm"
          >
            <input
              id="vocrehab-pro-attest"
              name="vocrehab-pro-attest"
              type="checkbox"
              required
              className="mt-1"
            />
            <span>
              I attest I am a counselor (or supervised staff) working with the
              client&apos;s knowledge, and I will get per-session consent
              before drafting. I understand drafts never file or send
              themselves, and I can delete them.
            </span>
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Continue to session inbox
          </button>
        </form>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          <Link href="/vocrehab/library" className="block rounded-xl border border-white/15 p-5 hover:bg-white/5">
            <span className="font-bold">Game templates</span>
            <span className="mt-1 block text-sm text-muted-foreground">Create shareable starting scenarios; clients can keep their own saved states.</span>
          </Link>
        </li>
        <li>
          <Link href="/vocrehab/pro/reports" className="block rounded-xl border border-white/15 p-5 hover:bg-white/5">
            <span className="font-bold">State report worksheet</span>
            <span className="mt-1 block text-sm text-muted-foreground">Prepare a reviewable activity summary for WA, NY, or NH.</span>
          </Link>
        </li>
        <li>
          <Link
            href="/vocrehab/pro/sessions"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Session assistant</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Paste once, get four draft boxes: case note, measure, rationale,
              outreach.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/vocrehab/pro/outreach"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Outreach generator</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Employer emails from templates. Copy-only — you send from your
              own client.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/vocrehab/pro/measures"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Measures library</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Your own approved drafts only, searchable, copy-forward with
              date roll.
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
