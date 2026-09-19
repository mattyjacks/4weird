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
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Before your first session</h2>
        <p className="text-sm">
          Three things have to be true before a draft can exist. You are signed in and have
          completed the counselor attestation. Your client has given consent for session
          drafting, and that receipt is still unrevoked. You have a transcript or notes the
          client agreed to share. If any one is missing, stop and fix that first: the draft
          route refuses without consent, and that refusal is the privacy design working.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Worked example: one transcript, four drafts</h2>
        <p className="text-sm">
          A client pastes twelve lines about a difficult shift swap. Redaction scrubs a phone
          number and a birth date, and the redaction report lists both. The draft set comes
          back as four boxes. The case note summarizes the swap request and the agreed next
          step. The measure draft suggests one observable goal, such as confirming the swap in
          writing. The rationale draft connects the goal to the client stated preference for
          predictable evenings. The outreach draft offers two short sentences the client could
          send a supervisor. You edit the measure to match the client actual shift, approve
          the case note and rationale, discard the outreach draft because the client prefers
          to call, and copy nothing out. The queue now shows two finals, one edited draft, and
          one discard.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Review checklist</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Names and facts.</strong> Does every name, date, and shift detail match
            what the client actually said. Fix quotes before approving.
          </li>
          <li>
            <strong>Tone.</strong> Is the language strengths-first and plain. Rewrite jargon
            into words the client would recognize.
          </li>
          <li>
            <strong>Scope.</strong> Does each draft stay inside one session. Move extra topics
            into a new draft instead of stuffing them in.
          </li>
          <li>
            <strong>Outreach.</strong> Is the outreach short enough to paste into email. If it
            assumes a send button, rewrite it, because VocRehab has no send path.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>No consent, no draft.</strong> The route answers with a consent error.
            Ask the client to grant session consent, then retry. Revoked consent stops future
            drafts but keeps already approved words intact.
          </li>
          <li>
            <strong>Redaction surprises.</strong> If the report flags more than you expected,
            paste less next time. Only the session needs go in, never a full inbox.
          </li>
          <li>
            <strong>Draft looks generic.</strong> Add one concrete detail from the transcript
            and regenerate or edit by hand. Short, specific input beats long, vague input.
          </li>
          <li>
            <strong>Client wants a copy.</strong> Export from{" "}
            <Link href="/vocrehab/export" className="underline">
              the export page
            </Link>
            . Downloads are JSON or CSV and each one is logged.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Can drafts file themselves.</strong> No. Draft status never advances on
            its own, and outreach is copy-only. Your approval signature is the only thing
            that finalizes words.
          </li>
          <li>
            <strong>Can I see other counselors clients.</strong> No. Every pro page returns
            only your own drafts. There is no cross-account client access in v1.
          </li>
          <li>
            <strong>How do I show practice progress.</strong> Ask the client to sign in so
            game runs save, then review supports together. For exact repeats, share a{" "}
            <Link href="/docs/vocrehab/seeds" className="underline">
              practice seed
            </Link>
            .
          </li>
          <li>
            <strong>Where do privacy rules live.</strong> In{" "}
            <Link href="/docs/vocrehab/privacy-safety" className="underline">
              privacy and safety
            </Link>
            : consent receipts, redaction reports, own-data-only access, export, and deletion
            through the platform data-rights page.
          </li>
        </ul>
      </section>
    </main>
  );
}
