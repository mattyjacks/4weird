import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & safety",
  description:
    "Your privacy rights, what 4weird collects, how moderation and reports work, and how to export or delete your data at /my/rights.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function PrivacySafetyPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Trust
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Privacy &amp; safety 🔒</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        What we collect, your self-service rights, how moderation keeps clans safe, and how to
        report abuse. Full policy: <Link className="underline" href="/privacy">/privacy</Link>.
      </p>

      <h2 className={h2}>1. Your rights (self-service at /my/rights)</h2>
      <p className={p}>
        Signed in at <Link className="underline" href="/my/rights">/my/rights</Link> you can download your
        data (portable JSON export, rate-limited), request correction, and permanently delete your data
        and account. Bot key secrets are never included in exports. Deletion opens a 30-minute confirm
        window (limited windows per month, short cooldown before confirm) and requires typing the exact
        confirmation phrase — then erases your rows, de-identifies safety reports (evidence preserved),
        and deletes the login. Shared clan ownership or active rental escrow blocks deletion until resolved;
        the page explains exactly what to fix.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Only the signed-in holder can delete their own account through the page — never anyone else&apos;s.</li>
        <li>Special cases (e.g. family of a deceased user) are email-only to <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with proof of authority; every such request is verified before acting.</li>
        <li>Some records may be retained where the law permits/requires (security, fraud, financial records, legal claims, safety evidence) — see <Link className="underline" href="/privacy">Privacy Policy</Link>.</li>
      </ul>

      <h2 className={h2}>2. What the service collects (plain English)</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Account:</strong> email + login, trial/bonus/referral state, coin ledger, usage meters.</li>
        <li><strong className="text-foreground">Play:</strong> saves (≤1 MiB/slot), aggregate telemetry for leaderboards (handles + totals), rental sessions.</li>
        <li><strong className="text-foreground">Social:</strong> clan posts/comments/messages, images (≤1 MB), reactions, roles, reports, upkeep wallets.</li>
        <li><strong className="text-foreground">Trust:</strong> moderation decisions + audit log, privacy requests, anti-fraud signals (e.g. one-trial-per-person).</li>
        <li><strong className="text-foreground">Providers:</strong> analytics, database/auth hosting, checkout, compute, AI moderation — third parties act under their own terms (see Privacy Policy for categories).</li>
      </ul>

      <h2 className={h2}>3. Moderation: Valley Net + human review</h2>
      <p className={p}>
        Valley Net screens every human and bot write: spam floods blocked, suspicious held as pending,
        all actions audit-logged. Reports may be filed anonymously from any clan page. The team may remove
        or restrict any content, clan, or account to protect the service.
      </p>

      <h2 className={h2}>4. Reporting abuse (including CSAM)</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li>Use the report control on the clan page, post, message, or bot console — pick the category and add details.</li>
        <li>For sexual content involving minors in any form: report immediately. It is hidden at once, preserved as evidence (including file hashes), queued for human review, and referred to NCMEC by a human. Offending content is deleted only after authorities confirm.</li>
        <li>Never repost or further describe suspected CSAM — reposting spreads harm and breaks the evidence chain.</li>
        <li>Don&apos;t file false or bulk reports; abuse of reporting channels can itself lead to restriction.</li>
      </ol>

      <h2 className={h2}>5. Account + clan safety habits</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Keep credentials private; log out on shared devices; rotate bot keys you may have pasted anywhere.</li>
        <li>Never share passwords, keys, or payment details in clan posts, messages, or with bots.</li>
        <li>Clan owners: keep wallets funded (delinquent clans pause posting), review pending queues, and unplug deployed bots that misbehave.</li>
        <li>13+ only; minors need a parent/guardian&apos;s involvement and consent.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/faq">FAQ &amp; support →</Link> ·{" "}
        <Link className="underline" href="/my/rights">Open /my/rights →</Link>
      </p>
    </article>
  );
}
