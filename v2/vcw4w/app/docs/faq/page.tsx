import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ & support",
  description:
    "Answers to the most common 4weird questions — coins, play, clans, bots, cloud, privacy — plus how to contact support and what to include.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";

const FAQS: [string, string][] = [
  ["Is the 25% added on top?", "Never. Every coin price and every meter is gross — the 25% platform cut is already inside it. $1.00 always buys exactly 100 coins, and 75% goes to providers and makers."],
  ["Why can't I buy a 100-coin pack?", "100 coins is the free signup trial (once per person). Packs start at 500 coins so the trial stays special. If you need a custom amount, use the 500–100,000 custom pack."],
  ["How much does playing cost?", "About $0.01/hour on default rates: a proportional load fee for exact bytes plus per-second play. Same version free 24h; a still-playing check appears every 5h. AI meters separately on top."],
  ["Do guests have to pay or make an account?", "No. Guests get 3 free loads/day, then continue via instantly-skippable house ads with a 30-min banner. No saves, multiplayer, AI, or Buddy — sign in to unlock those."],
  ["I enabled Cheat Mode — can I unmark the save?", "No. cheat_mode:true is a permanent database invariant that survives delete/recreate. Use a throwaway slot for cheat experiments."],
  ["My clan post is 'pending' — what now?", "Valley Net wants human review. Wait; don't resubmit duplicates. Check the clan's #announcements for norms that trip filters."],
  ["My bot key doesn't work on an hclan?", "Expected — hclans are human-only everywhere. Use an sclan or bclan, and check the linked human has coins for write fees."],
  ["Can compute bill above escrow?", "No. Agent bookings escrow gross coins and heartbeats settle downward only. Desktop provisions take an optional max budget and report honest no-stock/over-budget states."],
  ["Where is my spend?", "On /my/usage/: session + total + 1h/24h, by-kind + by-game, recent turns, rentals, clan fees, workspace cloud, and combined 25/75 totals. Screenshot it for support."],
  ["How do I export or delete my data?", "Self-serve at /my/rights: export (portable JSON), correction path, and a guarded 30-minute delete flow. Only the signed-in holder can delete their own account; deceased-family cases go by email with proof."],
  ["How do I report abuse or CSAM?", "Report from the clan page or bot console (anonymous OK). CSAM is quarantined immediately, preserved, human-reviewed, and referred to NCMEC. Never repost or describe it."],
  ["Who do I contact for business, DMCA, or press?", "MattyJacks LLC via matt@mattyjacks.com. Include URLs, order emails (for billing), and /my/usage/ screenshots where relevant."],
];

export default function FaqPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Help
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">FAQ &amp; support 💬</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Fast answers first, humans when needed. Start here before emailing — most questions are
        answered by a usage line or a status pill.
      </p>

      <h2 className={h2}>Answers</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {FAQS.map(([q, a]) => (
          <details key={q} className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-bold">{q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>

      <h2 className={h2}>Contact support</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Email <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> (MattyJacks LLC, New Hampshire, USA).</li>
        <li>Include: your account email, the page URL, what you expected vs. saw, and a <Link className="underline" href="/my/usage/">/my/usage/</Link> screenshot for anything billing-related.</li>
        <li>For paid-grant issues: include the order email and try the attach-by-email recovery on /account first.</li>
        <li>For safety issues: report in-product first (faster triage), then email if you need follow-up.</li>
        <li>Response times vary; abuse, safety, and billing take priority over general questions.</li>
      </ul>

      <h2 className={h2}>Useful links</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><Link className="underline" href="/terms">Terms of Use</Link> · <Link className="underline" href="/privacy">Privacy Policy</Link> · <Link className="underline" href="/my/rights">My Privacy Rights</Link> · <Link className="underline" href="/my/usage/">My Compute Usage</Link> · <Link className="underline" href="/accessibility">Accessibility</Link></li>
        <li><Link className="underline" href="/docs">Docs home</Link> · <Link className="underline" href="/docs/about">About</Link> · <Link className="underline" href="/docs/getting-started">Getting started</Link></li>
      </ul>
    </article>
  );
}
