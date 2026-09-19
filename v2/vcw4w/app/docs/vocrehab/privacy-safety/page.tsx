import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy and safety — VocRehab",
  description:
    "How VocRehab protects you: consent first, redaction by default, own-data-only access, export and deletion rights.",
  alternates: { canonical: "/docs/vocrehab/privacy-safety" },
};

// /docs/vocrehab/privacy-safety — consent / export / deletion (plan §13).
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/docs/vocrehab" className="text-sm underline">
        All guides
      </Link>
      <h1 className="text-2xl font-bold">Privacy and safety</h1>
      <p className="text-sm text-muted-foreground">
        Your practice data is yours. These are the rules VocRehab follows, in plain words.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Consent first</h2>
        <p className="text-sm">
          Saving turns, drafting session notes, exporting data, and syncing course progress each
          need their own consent receipt. Counselors cannot draft from your words without an
          unrevoked consent, and you can revoke at any time — revocation stops future drafting.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Redaction by default</h2>
        <p className="text-sm">
          Pasted transcripts are scrubbed for personal details (contact info, ID-like numbers,
          dates of birth) before drafts are built, and the counselor sees a redaction report. Paste
          only what the session needs.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Only your own data</h2>
        <p className="text-sm">
          Every page and API returns only the signed-in account&apos;s rows. Counselors see only
          their own drafts; there is no cross-account client access in v1.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Export and deletion</h2>
        <p className="text-sm">
          You can download your own data as JSON or CSV from the export page; each download is
          logged so you can see what left. Deletion goes through the platform&apos;s data-rights
          page — VocRehab adds no parallel path, and its tables are removed with your account.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">What a consent receipt records</h2>
        <p className="text-sm">
          Each receipt is small and specific: what you agreed to, when, and for which purpose.
          Saving practice turns, drafting session notes, exporting data, and syncing course
          progress each create their own receipt. A counselor drafting receipt covers one
          client relationship at a time and can be revoked from the privacy page. Revocation
          stops future drafting immediately. It does not rewrite words that were already
          approved by hand.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Worked example: a safe session share</h2>
        <p className="text-sm">
          You want help with a shift swap conversation. First, you grant session consent for
          your counselor. Next, you paste only the twelve lines about the swap, leaving out
          addresses, account numbers, and birth dates. Redaction scrubs anything that looks
          like contact info or ID numbers and shows the counselor a report of what was
          removed. The counselor reviews four drafts, approves two, edits one, and discards
          one. Later, you revoke the consent. Future drafting stops, past finals stay, and
          your game runs and course lessons are untouched, because those carry separate
          receipts.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Export walkthrough</h2>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            <strong>Open the export page.</strong> Go to{" "}
            <Link href="/vocrehab/export" className="underline">
              the export page
            </Link>{" "}
            while signed in. Only your own rows are listed.
          </li>
          <li>
            <strong>Pick a format.</strong> Choose JSON for a full portable copy or CSV for
            spreadsheets. Both contain only your account data.
          </li>
          <li>
            <strong>Check the log.</strong> Each download is recorded with a timestamp so you
            can confirm what left and when.
          </li>
        </ol>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Deletion walkthrough</h2>
        <p className="text-sm">
          Deletion runs through the platform data-rights page, not through a VocRehab side
          door. Export first if you want a keepsake, then follow the platform flow. VocRehab
          tables tied to your account are removed with it. If you only want drafting to stop,
          revoke consent instead: it is instant and keeps your practice history.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Drafting is blocked.</strong> The consent receipt is missing or revoked.
            Grant fresh consent for that client, then retry the draft.
          </li>
          <li>
            <strong>Too much was redacted.</strong> Paste a shorter excerpt with only the
            session-relevant lines. Full inboxes always over-trigger the scrubber.
          </li>
          <li>
            <strong>An export looks empty.</strong> You may be signed into a different account
            or looking at a guest session. Sign in to the account that did the practice.
          </li>
          <li>
            <strong>Shared device worries.</strong> Sign out when finished, and prefer export
            to screenshots: exports are logged, screenshots are not.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Can a counselor see my games.</strong> No. Counselors see only their own
            drafts. Your runs are yours until you sit down and review them together.
          </li>
          <li>
            <strong>Do addresses leave my device.</strong> Planning addresses typed into
            Schedule Juggle stay on the device. Shared usage details are anonymized first.
            Details live in{" "}
            <Link href="/docs/vocrehab/schedule-juggle" className="underline">
              Schedule Juggle docs
            </Link>
            .
          </li>
          <li>
            <strong>Who do I ask about counselor workflow.</strong> Send them{" "}
            <Link href="/docs/vocrehab/counselors" className="underline">
              the counselor guide
            </Link>
            . It explains approval, copy-only outreach, and why nothing auto-files.
          </li>
          <li>
            <strong>Do practice seeds identify me.</strong> No. A seed fixes item order only.
            How{" "}
            <Link href="/docs/vocrehab/seeds" className="underline">
              practice seeds
            </Link>{" "}
            work is public, and the seed log records seeds and dates, never personal details
            beyond what your program already keeps.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Guests and signed-in learners</h2>
        <p className="text-sm">
          Guests may read guides, play games, and try rehearsals without receipts, because
          nothing is stored to an account. The tradeoff is that guest progress cannot follow
          you across devices and cannot be reviewed by a counselor later. Signed-in learners
          get saved runs, synced lessons, and consent-gated drafting and exports. If you
          start as a guest and later sign in, replay one lesson and one game so the new
          account has anchor rows, then continue from there.
        </p>
      </section>
    </main>
  );
}
