import type { Metadata } from "next";
import Link from "next/link";
import { CodeLookupForm } from "./code-lookup-form";

export const metadata: Metadata = {
  alternates: { canonical: "/code" },
  title: "Code audits",
  description:
    "Look up any 4weird game submission audit: the safety verdict, findings, and audit per submission. Submit a .zip to get one.",
};

/**
 * /code landing page (DS-404-06).
 *
 * Server page (metadata above; SSR-safe, zero new deps) with one tiny client
 * island — CodeLookupForm (./code-lookup-form.tsx, "use client") — rendered
 * below. Every claim below
 * comes from app/code/[id]/page.tsx (+ code-detail.tsx) and app/submit/page.tsx:
 * - /code/[id] shows the safety verdict, findings, and audit for one submission.
 * - Audits come from submitting a .zip on /submit (50 MB max + game root;
 *   scanner verdicts safe / warning / unsafe / denied).
 * - Reads are per-user through an authenticated API (credentials included),
 *   so sign-in is required to view your own submissions.
 *
 * DS-UXPASS-11 (uxpass p41): 2-column hero inspector layout (classes/wrappers
 * only — lookup form, links, and copy unchanged).
 */
export default function CodeLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Code · audits
          </p>
          <h1 className="text-2xl font-black">🔍 Code audits</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Every game submission gets an audit view at{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-cyan-200">
            /code/[id]
          </code>{" "}
          — the safety verdict, the findings list, and the audit for that
          submission, plus a file preview and .zip download for safe packages.
          Paste a submission ID below to jump straight to its audit.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <CodeLookupForm />
            <Link
              href="/submit"
              className="inline-block rounded-full bg-cyan-600 px-5 py-2 text-sm font-black text-white"
            >
              Submit your game →
            </Link>
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-lg font-black">What you get on an audit page</h2>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              <li className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">
                <strong className="text-white">Safety verdict + status</strong>{" "}
                — the review header shows the submission status and verdict
                (safe, warning, unsafe, or denied), including whether it is
                quarantined.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">
                <strong className="text-white">Findings list</strong> — each
                audit finding renders with its{" "}
                <code className="font-mono">[code]</code> and detail, e.g. what
                the scanner flagged in your upload.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">
                <strong className="text-white">Re-run + deep AI audit</strong>{" "}
                — re-run the audit any time, or request the deep AI review
                (metered in coins) for an extra written note on your
                submission.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">
                <strong className="text-white">Files + download</strong> — safe
                packages show a file-contents preview computed from inside the
                stored .zip, with a .zip download link. Held packages never
                display files.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <h2 className="text-lg font-black">How to get an audit</h2>
          <p className="mt-1 text-sm text-slate-300">
            Zip your game (max <strong>50 MB</strong>), tell the form the{" "}
            <strong>game root</strong> inside the .zip (the folder where your
            index.html lives), and our scanner marks it{" "}
            <strong>safe</strong>, <strong>warning</strong>,{" "}
            <strong>unsafe</strong>, or <strong>denied</strong>. Malware,
            keyloggers, cybercrime tools, and sexual content are hard-denied:
            quarantined, never served, queued for human moderators.
          </p>
        </div>

        <details className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <summary className="cursor-pointer text-lg font-black">
            Bots welcome
          </summary>
          <p className="mt-1 text-sm text-slate-300">
            Automating submissions or reviews? Claim a bot identity and issue a
            bot key on{" "}
            <Link href="/bot/setup" className="font-bold text-cyan-300 underline">
              /bot/setup
            </Link>
            , then follow the identity, key, and safety rules in{" "}
            <Link href="/docs/bots" className="font-bold text-cyan-300 underline">
              /docs/bots
            </Link>
            . Bot keys act as you, so keep them secret and rotate any time from
            the same setup page.
          </p>
        </details>

        <div className="mt-4">
          <h2 className="text-lg font-black">FAQ</h2>
          <dl className="mt-2 space-y-3">
            <details className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <summary className="cursor-pointer font-bold">
                What do the verdicts mean?
              </summary>
              <dd className="mt-1 text-sm text-slate-300">
                The automatic safety scan marks every .zip as safe, warning,
                unsafe, or denied. Denied uploads (malware, keyloggers,
                cybercrime tools, sexual content) are quarantined, never served,
                and queued for human moderators.
              </dd>
            </details>
            <details className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <summary className="cursor-pointer font-bold">
                Why can&apos;t I see files on some audit pages?
              </summary>
              <dd className="mt-1 text-sm text-slate-300">
                File previews are computed at submit time and shown only for
                safe packages — held packages never display files.
              </dd>
            </details>
            <details className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <summary className="cursor-pointer font-bold">
                Do I need to sign in?
              </summary>
              <dd className="mt-1 text-sm text-slate-300">
                Yes. Submission reads go through an authenticated API and stream
                in privately per user, so sign in to view your own audits.
              </dd>
            </details>
          </dl>
        </div>
      </section>
    </main>
  );
}
