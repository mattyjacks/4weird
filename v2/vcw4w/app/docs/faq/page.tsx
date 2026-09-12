import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";
import { faqJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ & support",
  description:
    "Answers to the most common 4weird questions; coins, play, clans, bots, cloud, privacy; plus how to contact support and what to include.",
  keywords: ["4weird FAQ", "Vibe Coins FAQ", "4weird support", "4weird help"],
  alternates: { canonical: "/docs/faq" },
};

const theme = {
  bg: "bg-gradient-to-br from-indigo-950 via-slate-950 to-sky-950",
  border: "border-indigo-400/20",
  chip: "border-indigo-300/40 bg-indigo-300/10 text-indigo-200",
  title: "bg-gradient-to-r from-indigo-300 via-violet-200 to-sky-300 bg-clip-text text-transparent",
};

const FAQS: [string, string, string][] = [
  ["💰", "Is the 25% added on top?", "Never. Every coin price and every meter is gross; the 25% platform cut is already inside it. $1.00 always buys exactly 100 coins, and 75% credits providers and makers as on-site platform credits (cloud compute, game credits, other on-site services only; never cash-out, never withdrawable)."],
  ["🎁", "Why can't I buy a 100-coin pack?", "100 coins is the free signup trial (once per person). Packs start at 500 so the trial stays special. Need an in-between amount? Use the custom 500-100,000 pack."],
  ["🕹️", "How much does playing cost?", "About $0.01/hour on defaults: a proportional load fee for exact bytes plus per-second play. Same version free 24h; still-playing check every 5h; AI meters separately on top."],
  ["👻", "Do guests pay or need accounts?", "No. 3 free loads/day, then instantly-skippable house ads with a 30-min banner. No saves, multiplayer, AI, or Buddy; sign in to unlock those."],
  ["🚫", "Can I unmark a Cheat Mode save?", "No. cheat_mode:true is permanent; delete/recreate cannot launder it. Use a throwaway slot for experiments. Slot 0 can never be marked, so it is always safe."],
  ["⏳", "My clan post is 'pending'?", "Valley Net wants human review. Wait; don't resubmit duplicates. Check #announcements for norms that trip filters."],
  ["🤖", "Bot key fails on an hclan?", "Expected; hclans are human-only everywhere. Use an sclan/bclan, and keep coins on the linked human for write fees."],
  ["🔒", "Can compute bill above escrow?", "No. Agent bookings escrow gross coins and settle downward only. Desktops take an optional max budget and report honest no-stock states."],
  ["🧾", "Where is my spend?", "On /my/usage/: session + total + 1h/24h, by-kind + by-game, recent turns, rentals, clan fees, workspace cloud, combined 25/75 totals. Screenshot it for support."],
  ["🔑", "Export or delete my data?", "Self-serve at /my/rights: portable JSON export, correction path, guarded 30-minute delete flow. Only your own account; deceased-family cases go by email with proof."],
  ["🚨", "Report abuse or CSAM?", "Report in-product (anonymous OK). CSAM is quarantined instantly, preserved, human-reviewed, referred to NCMEC. Never repost or describe it."],
  ["📦", "How big can my submitted game be?", "50 MB max per .zip into the game-blobs vault; a feature, not a limit: every game on 4weird loads fast. Trim assets, compress audio, and your players will thank you."],
  ["✉️", "Business, DMCA, press?", "MattyJacks LLC via matt@mattyjacks.com. Include URLs, order emails for billing, and /my/usage/ screenshots where relevant."],
  ["📅", "How do I claim the daily bonus?", "One button on /account, once per UTC day: 5 coins + 1 per streak day, capped at 12. A second tap the same day pays 0. Bots can't claim it — not even with a valid key — the bonus is humans-only."],
  ["💸", "I paid but my coins never landed?", "Don't email first: open /account and run the attach-by-email recovery — paid-but-unclaimed grants match on your order email and attach instantly. Double-claims can't double-mint; concurrent claims settle to a single award."],
  ["💾", "How many save slots do I get?", "Four per game: slots 0-3, each a versioned JSON object up to 1 MiB. Slot 0 is the cheat-proof safety slot — any cheat marker is stripped, so it stays clean forever."],
  ["🧹", "Can I delete a cloud save and start over?", "No — the client can't delete saves at all (the API answers 410). That protects the cheat-marker invariant: a branded save can never be laundered by delete/recreate. Experiment on a throwaway slot instead."],
  ["🔞", "What do the age ratings mean?", "Kids (0-12) plays freely, Teens (13-17) gates at 13+ for Kids Mode accounts, Adults (18+) always gates at 18+ — and Kids Mode accounts can never pass it. Your birth date is checked in memory on your own device and is never sent, stored, or remembered."],
  ["🧒", "What is Kids Mode?", "A device + account preference (a single on-device flag, not age data): Adults games hide completely and Teens games ask for a 13+ check. Flip it off and the shelves reopen."],
  ["🚪", "Where do I sign up or log in?", "Sign up at /auth/sign-up (passwords need 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols) and return via /auth/login. The header flipping to Dashboard is your proof of orbit."],
  ["💌", "How do referrals work?", "Share your 8-character code from /account: someone redeems it and you both get 25 coins. One use per invitee, no self-use, no farming extra accounts for trials."],
  ["🗑️", "How does account deletion work?", "Self-serve at /my/rights: export a portable JSON first, then open a 30-minute deletion window to confirm. At most 3 deletion requests per account per 30 days — and only while signed in as that account."],
  ["💛", "How do tips and support memberships work?", "On /support: one-time tips or monthly tiers to makers and clans. Makers keep 75% as on-site credits (cloud, game credits, other on-site services — never cash-out). Gifts are final once sent."],
  ["🤖", "Can my bot claim the daily bonus?", "No — the daily route demands a human even from a valid bot key. Your bot can post in sclans/bclans on its linked human's coins, but the streak button is yours alone."],
  ["📦", "My game zip is over the limit?", "The vault takes 50 MB max per .zip — trim assets, compress audio, name the game root like a Vercel Root Directory. Start at /submit; the scanner marks builds safe, warning, unsafe, or denied."],
  ["🏆", "Do leaderboards affect billing?", "Never. Telemetry powers /leaderboards handles and totals, but only the rental session decides billing. Chase the boards freely — the meter doesn't care."],
];

export default function FaqPage() {
  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            faqJsonLd(FAQS.map(([, q, a]) => [q, a] as [string, string])),
          ),
        }}
      />
      <DocsHero
        eyebrow="Docs · ask us anything"
        title={<>Answers first. <span className={theme.title}>Humans on standby.</span></>}
        lede={<>Fast answers up front, a human when needed. Start here before emailing; most questions dissolve the moment you open a usage line or a status pill.</>}
        stats={[
          ["13", "answers below"],
          ["12", "guides behind them"],
          ["1", "inbox for the rest"],
          ["0", "dumb questions"],
        ]}
        glyph="💬"
        theme={theme}
        crumb="FAQ & support"
      />

      <SectionHead
        index="?"
        kicker="The lightning round"
        title="Questions, answered"
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {FAQS.map(([icon, q, a], i) => (
          <details
            key={q}
            className="group rounded-2xl border border-border bg-card transition open:border-indigo-400/50 open:shadow-xl"
          >
            <summary className="flex cursor-pointer items-start gap-3 p-4 font-bold">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-sky-500/15 text-lg">
                {icon}
              </span>
              <span className="flex-1">
                <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Q{String(i + 1).padStart(2, "0")}</span>
                {q}
              </span>
              <span aria-hidden="true" className="text-muted-foreground transition group-open:rotate-180">▾</span>
            </summary>
            <p className="px-4 pb-4 pl-[4.25rem] text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>

      <SectionHead
        index="✉"
        kicker="Still stuck?"
        title="Contact support like a pro"
        body="Email matt@mattyjacks.com (MattyJacks LLC, NH, USA). Abuse, safety, and billing jump the queue. Make your ticket trivially answerable:"
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        {[
          ["① Account email", "The login the issue belongs to."],
          ["② Page URL", "Exact link + what you clicked."],
          ["③ Expected vs. saw", "Two sentences: what should happen, what did."],
          ["④ Receipts", "/my/usage/ screenshot for billing; order email for grants (after trying attach-by-email recovery)."],
          ["⑤ Safety first", "Report in-product first; faster triage; then email for follow-up."],
        ].map(([t, b], i) => (
          <div key={t} className={`flex gap-3 p-4 text-sm ${i % 2 ? "bg-card" : "bg-background"}`}>
            <p className="font-black">{t}</p>
            <p className="text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {[
          ["/terms", "📜 Terms"],
          ["/privacy", "🔒 Privacy"],
          ["/my/rights", "🛡️ My Rights"],
          ["/my/usage/", "🧾 My Usage"],
          ["/accessibility", "♿ Accessibility"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-border px-5 py-2.5 text-center text-sm font-bold transition hover:border-indigo-400/60 hover:bg-accent"
          >
            {label}
          </Link>
        ))}
      </div>

      <SectionHead
        index="🪜"
        kicker="Zero-email triage"
        title="The 4-step fix-it ladder"
        body="Climb in order. Most tickets die on rung one — which is the point."
      />
      <Steps
        items={[
          [
            "Read the receipt",
            <>
              Open <Link className="font-bold underline" href="/my/usage/">/my/usage/</Link> first:
              session + total + 1h/24h, by-kind + by-game, recent turns, rentals, clan fees,
              workspace cloud, combined 25/75 totals. Screenshot anything odd — support
              will ask for it anyway.
            </>,
          ],
          [
            "Recover grants yourself",
            <>
              Paid but empty? Run the attach-by-email recovery on{" "}
              <Link className="font-bold underline" href="/account">/account</Link> — it matches
              paid-but-unclaimed grants by order email and resolves most cases instantly,
              no human required.
            </>,
          ],
          [
            "Report where it happened",
            <>
              Abuse, safety, or broken content: use the in-product report flow first
              (anonymous OK). It quarantines and routes to humans faster than any email —
              then email for follow-up if you need a paper trail.
            </>,
          ],
          [
            "Email like a pro",
            <>
              Still stuck? Write{" "}
              <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>{" "}
              with the five details in the next section — account email, page URL,
              expected vs. saw, receipts, safety-first. Abuse, safety, and billing
              jump the queue.
            </>,
          ],
        ]}
      />

      <Callout tone="gold" title="The two coin answers, shortest version.">
        Grant missing → <Link className="underline" href="/account">/account</Link> recovery by order
        email. Price confusion → <Link className="underline" href="/my/usage/">/my/usage/</Link> receipt:
        every price already includes the 25% cut, and $1.00 always buys exactly 100 coins.
      </Callout>

      <SectionHead
        index="🗺"
        kicker="Know your doors"
        title="Four pages that answer everything"
        body="Bookmark these and half the FAQ becomes redundant."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">👤 /account</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard: balance (coins + fractional centicentcoins), checkout, daily claim,
            referral code, grant recovery — plus doors to usage and rights.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">💰 /pricing</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The public catalog: packs + custom 500-100,000 at 1¢/coin. The 100-coin
            trial is free — never sold.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🧾 /my/usage/</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every cent itemized: rentals, AI + Buddy turns, clan fees, workspace cloud,
            combined 25/75 totals. Screenshot it for support.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🛡️ /my/rights</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Self-serve export (portable JSON), correction path, and the guarded
            30-minute delete flow. Only your own account, while signed in as it.
          </p>
        </div>
      </div>

      <Callout tone="emerald" title="Kids Mode + age gates never remember you.">
        Birth dates are checked in memory on your own device and are never sent, stored, or
        remembered — every check re-derives from a freshly entered date. Kids Mode itself is
        one on-device flag, not age data.
      </Callout>

      <SectionHead
        index="📝"
        kicker="One-reply tickets"
        title="What a good ticket looks like"
        body="Copy this shape. It carries every rung of the ladder in one screen — nothing to ask back."
      />
      <MockWindow title="support ticket - the good kind" badge="one-reply answer">
        <div className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="font-black text-white">Subject: </span>
            Daily bonus paid 0 two days running
          </p>
          <p>
            <span className="font-black text-white">Body: </span>
            login email is my account email · /account screenshot attached · expected the
            streak rate, saw 0 · already ran attach-by-email recovery · no safety issue.
          </p>
          <p className="text-slate-400">
            Why it works: account email, page URL, expected vs. saw, receipts, safety-first —
            the same five lines support triages on.
          </p>
        </div>
      </MockWindow>

      <Pager current="/docs/faq" />
    </article>
  );
}
