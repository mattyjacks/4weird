import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For counselors — VocRehab",
  description:
    "The VocRehab counselor approval workflow: draft from transcripts, approve by hand, copy-only outreach. No auto-file, no auto-send.",
  alternates: { canonical: "/docs/vocrehab/counselors" },
};

// /docs/vocrehab/counselors — approval workflow + no-auto-file banner.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/docs/vocrehab" className="text-sm underline">
        All guides
      </Link>
      <p className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm font-bold">
        No auto-file, no auto-send. Every draft stays a draft until you approve it, and outreach
        copy never leaves VocRehab on its own.
      </p>
      <h1 className="text-2xl font-bold">For counselors</h1>
      <p className="text-sm text-muted-foreground">
        The pro area is gated by sign-in plus your own counselor/professional attestation — not by a
        new role system. Attestation is recorded as a consent receipt, and it can be revoked.
      </p>
      <ol className="list-decimal space-y-3 pl-6 text-sm">
        <li>
          <strong>Collect consent first.</strong> A session draft needs an unrevoked consent receipt
          for that client. No consent, no draft.
        </li>
        <li>
          <strong>Paste the transcript.</strong> Personal details are redacted automatically, and you
          get a redaction report with the draft set.
        </li>
        <li>
          <strong>Review four boxes.</strong> Each session produces a case-note draft, a measure
          draft, a rationale draft, and an outreach draft — all status draft.
        </li>
        <li>
          <strong>Approve, edit, or discard.</strong> Approval is your signature: the words become
          final only because you said so. Editing keeps the draft open under your words. Discarding
          removes it from your queue.
        </li>
        <li>
          <strong>Copy outreach out by hand.</strong> Employer emails are copy-only. VocRehab has no
          send path; you paste the words into your own email.
        </li>
      </ol>
      <p className="rounded-xl border border-white/15 p-4 text-sm">
        VocRehab never decides eligibility and never files anything with an agency. If a client
        asks about benefits math, point them at{" "}
        <Link href="/docs/vocrehab/ssi-math" className="underline">
          the SSI explainer
        </Link>{" "}
        and a benefits counselor — the sketch is practice, not advice.
      </p>
    </main>
  );
}
