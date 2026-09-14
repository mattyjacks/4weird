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
    </main>
  );
}
