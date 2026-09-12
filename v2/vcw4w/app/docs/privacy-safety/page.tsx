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
        lede={<>What we collect, your self-service rights, how moderation keeps clans safe, and how to report abuse. Full policy at /privacy - this guide is the plain-language tour.</>}
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
          ["Blocked? Fix this", <>Shared clan ownership or active rental escrow blocks deletion with 409 - the page names exactly what to resolve.</>],
        ]}
      />
      <Callout tone="emerald" title="Only you can delete you.">
        Self-service deletion is strictly the signed-in holder deleting their own account - never anyone else&apos;s. Family
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
        their own terms - see <Link className="underline" href="/privacy">Privacy Policy</Link> for categories.
      </p>

      <SectionHead
        index="3"
        kicker="The bouncer, extended cut"
        title="Valley Net + human review"
        body="Valley Net screens every human and bot write: spam floods blocked, suspicious held as pending, all actions audit-logged. Reports may be filed anonymously from any clan page. The team may remove or restrict any content, clan, or account to protect the service."
      />
      <div className="mt-5 rounded-3xl border border-rose-400/40 bg-gradient-to-br from-rose-500/15 via-transparent to-transparent p-6">
        <p className="text-lg font-black">🚨 Reporting abuse - including CSAM</p>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
          <li>Use the report control on the clan page, post, message, or bot console - category + details.</li>
          <li>Sexual content involving minors in any form: <strong className="text-foreground">report immediately.</strong> Hidden at once, preserved as evidence (file hashes), human-reviewed, referred to NCMEC by a human. Deleted only after authorities confirm.</li>
          <li><strong className="text-foreground">Never repost or describe it</strong> - reposting spreads harm and breaks the evidence chain.</li>
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

      <SectionHead
        index="5"
        kicker="The fine print, plainly"
        title="Exports, windows, and cooldowns"
        body="Self-service rights are guarded like money moves: sign-in plus same-origin checks, per-account and per-network rate limits, and a typed confirmation. Confirmed deletions are final and sign you out immediately."
      />
      <Steps
        items={[
          ["Exports: 5 per hour", <>Your portable JSON dump is limited to 5 per hour per account (20 per hour per network). Secrets never ride along: bot key secrets, clan join codes, escrow internals, child passwords, and session tokens are metadata-only or excluded outright.</>],
          ["Deletion opens a 30-minute window", <>Requesting deletion opens a short review window (3 requests per hour per account, 10 per network). Inside it you can still back out; confirmation needs a short cooldown first plus the exact confirmation phrase, typed perfectly.</>],
          ["Confirmation tries are limited too", <>Confirm attempts are capped at 5 per hour - too many wrong phrases and you wait before trying again. Human bot-tester sessions and bot keys can never open or confirm a delete window at all.</>],
          ["Blocked? The page names it", <>Shared clan ownership, an org you solely own with other members, agent listings with other users&apos; bookings, or active rental escrow block deletion with a 409 - resolve exactly what the page lists, then confirm again.</>],
        ]}
      />
      <Callout tone="cyan" title="🕰️ Backups age out; the law keeps its copies.">
        Deletion erases your rows across our systems, but backups finish on their normal cycle and records the law
        requires - security, fraud prevention, completed transactions and tax records, safety evidence under legal
        hold, legal claims - are retained or declined as the Privacy Policy explains, with the reason given.
      </Callout>

      <SectionHead
        index="6"
        kicker="Kids + family"
        title="13+ accounts, parent-made kids"
        body="Direct accounts are Teen (13-17) or Adult (18+) only - under-13s ride on a parent-created Child sub-account, never a signup form. Nobody&apos;s birth date is ever collected: bands only, enforced server-side."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["👶 Child login: username#1234", "Kids sign in with a parent-chosen handle plus password - no email, no checkout, no payouts. Up to 10 children per parent; sessions last 7 days and refresh while active."],
          ["🎛️ Parents set the rails", "Monthly coin budget with optional hard stop, daily play-time limit, and allowed play hours in your timezone - all enforced server-side, including mid-play. Funded only from your own balance; suspending stops play at once."],
          ["🚪 Age gates remember nothing", "A date of birth typed into a game gate is checked on your own device, in memory, for that check only - never sent, never stored, nothing to export. The Kids Mode flag is an ordinary preference, not age data."],
          ["🎮 Ratings are about intensity", "Kids (0-12), Teens (13-17), Adults (18+) reflect intense violence or horror themes only. Expect louder titles gated at 18+ and cartoon combat at 13+; sexual content is removed everywhere, never rated."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="🔐 Kid logins are throttled like vault doors.">
        Child sign-in allows a handful of tries per minute per network and per handle, with a shared hourly backstop
        behind it - wrong handles cost as much as a real password check, so guessing handles buys nothing.
        Resetting a child&apos;s password logs them out everywhere. Parents export and erase children&apos;s
        non-secret records together with their own at <Link className="underline" href="/my/rights">/my/rights</Link>.
      </Callout>

      <SectionHead
        index="7"
        kicker="The machinery"
        title="Moderation + throttles that protect everyone"
        body="Posting takes an account; reading is public. Every write passes automated screening plus human review, and every anonymous door has two locks: a fast per-instance bucket and a shared Postgres backstop that counts bursts across all instances as one window."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🌙 Luna screens, humans decide", "Text is checked leniently on purpose: heated debate, trash-talk, caps, and ordinary links pass. Clear violations fail; suspicious posts wait as pending for a human. If screening is down, ordinary posts flow and the report button is the safety net."],
          ["📎 Narrow tripwires, not vibes", "Without screening configured, only obvious spam shapes pause a post: 5+ links in one post, 50+ repeated characters, scam-bait next to a link, or text past 8,000 characters. Images are report-driven plus a 1 MB cap - never auto-approved."],
          ["⏱️ Two-layer throttles", "Anonymous doors (signup, login, kid login, guest passes) and high-value signed-in actions (claims, referrals, uploads) check both the memory bucket and the shared bucket. Either one can say slow down; money-minting paths fail closed instead."],
          ["↩️ Retry-After is a promise", "Throttled answers carry a Retry-After header - wait the seconds named, then retry. Filing false or bulk reports to dodge the queue can itself lead to restriction."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="rose" title="Automated systems assist; humans decide what matters.">
        Spam triage, cheat detection, AI-assisted moderation, and fraud guards support review - account termination,
        safety referrals, and rights decisions involve human judgment. You may ask for human review of any such
        decision via <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>.
      </Callout>

      <SectionHead
        index="8"
        kicker="What goes where"
        title="What leaves your device, what never does"
        body="The Privacy Policy names every category; the short version is direction: most of what you type stays yours to export or delete, while a few things never reach our servers at all."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🎙️ Buddy turns stay turns", "Gaming Buddy messages, transcripts, and one downscaled image per shared screen or camera frame are processed for that turn only - never stored, never logged. Microphone audio for interruption detection never leaves your device; only transcripts are sent."],
          ["🍪 Cookies ask every 7 days", "A banner on every page offers Accept all, Reject non-essential, or Customize (essential always on, analytics / functional / marketing opt-in). It asks again every 7 days; clearing site data brings it back sooner."],
          ["🤝 Providers under their terms", "Hosting and delivery (Vercel, Cloudflare), accounts and data (Supabase), checkout (Shopify), AI chat and reasoning (OpenAI, OpenRouter, DeepSeek, Gemini, Claude, Meta), voice and media (ElevenLabs, fal.ai), compute (RunPod, DigitalOcean), and human-reviewed NCMEC referrals for suspected exploitation."],
          ["🌍 Your rights travel with you", "Access, portability, correction, deletion, restriction, objection, consent withdrawal, and complaint - honored as your jurisdiction requires, with self-service for all signed-in users. Personal information is never sold for money or shared for cross-context behavioral advertising."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="📜 New Hampshire law, plus your local rights.">
        New Hampshire law governs the agreement, and where your jurisdiction grants non-waivable rights those apply
        on top - nothing in the policy limits them. Read the full text at{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link> and{" "}
        <Link className="underline" href="/terms">Terms of Use</Link>; this guide is the plain-language tour.
      </Callout>

      <SectionHead
        index="9"
        kicker="If something goes wrong"
        title="Report, appeal, complain"
        body="Three doors, in order: report it where it happened, appeal if we ruled against you, complain to your regulator if that fails. Every step involves a human where it counts."
      />
      <Steps
        items={[
          ["Report where it happened", <>Use the report control on the clan page, post, message, or bot console with a category and details - anonymous reports allowed. Suspected exploitation of minors is hidden at once, preserved as hash evidence, and referred to NCMEC by a human.</>],
          ["Appeal our decisions", <>Denied a rights request or restricted after a report? Reply to the decision email to appeal, or write to <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with the account and what happened. Significant actions always offer human review.</>],
          ["Complain to your authority", <>Still unsatisfied? Lodge a complaint with your supervisory authority (your EU/EEA data protection authority, the UK ICO) or Attorney General - without giving up the right to contact us first.</>],
        ]}
      />

      <Pager current="/docs/privacy-safety" />
    </article>
  );
}
