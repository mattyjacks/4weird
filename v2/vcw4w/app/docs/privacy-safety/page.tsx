import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Steps, Callout, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/privacy-safety" },
  title: "Privacy & safety",
  description:
    "Your privacy rights, what 4weird collects, how moderation and reports work, and how to export or delete your data at /my/rights.",
};

const theme = {
  bg: "bg-gradient-to-br from-teal-950 via-slate-950 to-cyan-950",
  border: "border-teal-300/20",
  chip: "border-teal-300/40 bg-teal-300/10 text-teal-200",
  title: "bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function PrivacySafetyPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · the vault door"
        title={<>Your data. <span className={theme.title}>Your call.</span></>}
        lede={<>What we collect, your self-service rights, how moderation keeps clans safe, and how to report abuse. Full policy at /privacy — this guide is the plain-language tour.</>}
        stats={[
          ["13+", "age minimum"],
          ["30 min", "delete window"],
          ["5/hr", "export limit"],
          ["100%", "reports triaged"],
        ]}
        glyph="🛡️"
        theme={theme}
        crumb="Privacy & safety"
      />

      <SectionHead
        index="1"
        kicker="The control room"
        title="Your rights at /my/rights"
        body="Signed in, you can download your data (portable JSON, rate-limited), request correction, and permanently delete your data and account. Bot key secrets are never exported."
      />
      <Steps
        items={[
          ["Export", <>Pull your portable JSON dump (limited per hour). Check what&apos;s there before deciding anything.</>],
          ["Request deletion", <>Opens a 30-minute confirm window (limited windows per month, short cooldown before confirm).</>],
          ["Confirm with the magic words", <>Type the exact confirmation phrase. Then your rows are erased, safety reports de-identified (evidence preserved), and the login deleted.</>],
          ["Blocked? Fix this", <>Shared clan ownership or active rental escrow blocks deletion with 409 — the page names exactly what to resolve.</>],
        ]}
      />
      <Callout tone="emerald" title="Only you can delete you.">
        Self-service deletion is strictly the signed-in holder deleting their own account — never anyone else&apos;s. Family
        of a deceased user? Email <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with
        proof of authority; every such request is verified. Some records may be retained where law permits/requires
        (security, fraud, financials, legal claims, safety evidence).
      </Callout>

      <SectionHead
        index="2"
        kicker="The inventory"
        title="What the service collects"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["👤 Account", "Email + login, trial/bonus/referral state, coin ledger, usage meters."],
          ["🕹️ Play", "Saves (≤1 MiB/slot), aggregate telemetry for leaderboards, rental sessions."],
          ["👾 Social", "Posts, comments, messages, images (≤1 MB), reactions, roles, reports, wallets."],
          ["🛡️ Trust", "Moderation decisions + audit log, privacy requests, anti-fraud signals."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Plus third-party providers (analytics, database/auth hosting, checkout, compute, AI moderation) acting under
        their own terms — see <Link className="underline" href="/privacy">Privacy Policy</Link> for categories.
      </p>

      <SectionHead
        index="3"
        kicker="The bouncer, extended cut"
        title="Valley Net + human review"
        body="Valley Net screens every human and bot write: spam floods blocked, suspicious held as pending, all actions audit-logged. Reports may be filed anonymously from any clan page. The team may remove or restrict any content, clan, or account to protect the service."
      />
      <div className="mt-5 rounded-3xl border border-rose-400/40 bg-gradient-to-br from-rose-500/15 via-transparent to-transparent p-6">
        <p className="text-lg font-black">🚨 Reporting abuse — including CSAM</p>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
          <li>Use the report control on the clan page, post, message, or bot console — category + details.</li>
          <li>Sexual content involving minors in any form: <strong className="text-foreground">report immediately.</strong> Hidden at once, preserved as evidence (file hashes), human-reviewed, referred to NCMEC by a human. Deleted only after authorities confirm.</li>
          <li><strong className="text-foreground">Never repost or describe it</strong> — reposting spreads harm and breaks the evidence chain.</li>
          <li>Don&apos;t file false or bulk reports; abusing the channel can itself lead to restriction.</li>
        </ol>
      </div>

      <SectionHead
        index="4"
        kicker="Lock your doors"
        title="Safety habits"
      />
      <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
        {["🔑 Keys stay secret", "🚪 Log out on shared PCs", "🤫 No passwords in chat", "💰 Keep clan wallets funded", "🧹 Review pending queues", "👶 13+ only"].map((t) => (
          <span key={t} className="rounded-full border border-border bg-card px-3 py-1.5">{t}</span>
        ))}
      </div>

      <Pager current="/docs/privacy-safety" />
    </article>
  );
}
