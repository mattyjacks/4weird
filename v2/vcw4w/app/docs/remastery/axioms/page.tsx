import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/axioms" },
  title: "Remastery Axiom Sheet",
  description:
    "The non-negotiable remastery rules: 100 coins = $1.00, the 75/25 split, fail-open safety, and zero public marketplace risk.",
};

const theme = {
  bg: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950",
  border: "border-amber-300/20",
  chip: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  title: "bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-300 bg-clip-text text-transparent",
};

export default function RemasteryAxiomsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery axioms"
        title={<>Five rules. <span className={theme.title}>No exceptions.</span></>}
        lede={<>Every remastery feature — squads, kanban, timers, invoices — must obey these axioms. If a design breaks one, the design changes, not the axiom.</>}
        stats={[
          ["100 🪙", "= $1.00 exactly"],
          ["75 / 25", "provider / platform"],
          ["Fail", "open, never bricked"],
          ["0", "marketplace risk"],
        ]}
        glyph="📜"
        theme={theme}
        crumb="Axioms"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[56, 40, 64, 46, 70, 52, 76].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-amber-200/50 bg-gradient-to-t from-rose-500 to-amber-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Axiom one"
        title="The Vibe Coin parity standard"
        body="100 🪙 = exactly $1.00 USD. One coin is one cent, everywhere: compute rentals, studio tools, squad budgets, invoice totals. Never deviate, never invent a second exchange rate."
      />
      <MockWindow title="parity — one rate, every surface" badge="100 = $1">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>Compute job escrow</span>
            <span className="font-black text-amber-300">400 🪙 = $4.00</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span>Invoice line: 2h × $50/h</span>
            <span className="font-black text-amber-300">10,000 🪙 = $100.00</span>
          </div>
          <div className="flex justify-between gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2">
            <span className="font-bold text-amber-200">Custom amounts</span>
            <span className="font-black text-amber-200">1¢/coin, 500–100k</span>
          </div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Axiom two"
        title="The 75/25 monetization split"
        body="Every commercial hosted service or creator payout splits automatically: 75% to the creator/provider as on-site credits (games, cloud compute, AI services; non-withdrawable) and 25% retained by the platform for infrastructure. The gross is the price — the split is never added on top, and routing around metering violates terms."
      />
      <SplitBar leftLabel="75% provider credits" rightLabel="25% platform" />

      <SectionHead
        index="3"
        kicker="Axiom three"
        title="Fail-open safety"
        body="External AI or auxiliary services failing must never brick user navigation. If an AI service is unreachable, fall back to heuristic patterns or graceful error states: cached boards still render, timers keep ticking locally, invoices still draft."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🤖 AI down → heuristics", "Visual QA, title generators, and chat summaries degrade to local fallbacks with a visible notice — never a blank page."],
          ["📡 Realtime down → polling", "Notifications and chat fall back to periodic refresh; nothing the user typed is lost."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="4"
        kicker="Axiom four"
        title="Idempotency and zero hydration errors"
        body="All client components sanitize localStorage and DOM state to prevent Next.js SSR/CSR mismatch errors. Stateful browser APIs mount inside useEffect or client guards. Coin-moving buttons disable on first click — double-spending via double-click is a bug, not a feature."
      />
      <Callout tone="gold" title="Coin buttons are one-shot.">
        Every button that deducts coins, transfers squad balances, or issues an invoice disables itself immediately on
        click with pointer-capture and state guards. Retries converge; they never mint or spend twice.
      </Callout>

      <SectionHead
        index="5"
        kicker="Axiom five"
        title="Zero public marketplace risk"
        body="An open, public freelancer directory and public labor marketplace was explicitly evaluated and rejected. Public labor marketplaces bring labor-law liability (worker misclassification, tax withholding), privacy and harassment exposure (scraping, doxxing, spam), money-transmitter licensing for escrow, and off-platform disintermediation."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/5 p-5">
          <p className="font-black">🚫 Rejected: public labor marketplace</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Labor-law liability and misclassification risk</li>
            <li>Phone/email scraping, doxxing, spam solicitation</li>
            <li>Escrow triggers money-transmitter licensing</li>
            <li>Uncontrollable off-platform leakage</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-5">
          <p className="font-black">✅ Adopted: private squads (UnitUnite)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Invite-only, permissioned team workspaces</li>
            <li>Trusted collaborators coordinate game work</li>
            <li>Sprint boards, tracked hours, pooled coin balances</li>
            <li>All tooling, none of the marketplace exposure</li>
          </ul>
        </div>
      </div>

      <SectionHead
        index="6"
        kicker="The companion rule"
        title="Universal event and clipboard interop"
        body="Every tool publishes standard events to the interop bus and reads/writes the cross-clipboard, so assets flow across tools: a kanban estimate feeds the timer, timer entries feed invoices, invoice events feed notifications."
      />
      <SectionHead
        index="7"
        kicker="Worked examples"
        title="Parity math you can check"
        body="One cent per coin, no exceptions. Three conversions that cover every Wave 1 surface: compute, invoices, and custom amounts."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Surface</th>
              <th className="px-4 py-2 font-black">Input</th>
              <th className="px-4 py-2 font-black">Coins</th>
              <th className="px-4 py-2 font-black">Split</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 text-muted-foreground">Cloud compute escrow</td>
              <td className="px-4 py-2 text-muted-foreground">$4.00 job</td>
              <td className="px-4 py-2 font-bold">400</td>
              <td className="px-4 py-2 text-muted-foreground">300 provider, 100 platform</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 text-muted-foreground">Invoice line</td>
              <td className="px-4 py-2 text-muted-foreground">2 hours at $50 per hour</td>
              <td className="px-4 py-2 font-bold">10,000</td>
              <td className="px-4 py-2 text-muted-foreground">7,500 provider, 2,500 platform</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 text-muted-foreground">Custom tip jar</td>
              <td className="px-4 py-2 text-muted-foreground">$7.50 thank you</td>
              <td className="px-4 py-2 font-bold">750</td>
              <td className="px-4 py-2 text-muted-foreground">563 provider, 187 platform, rounded to whole coins</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="gold" title="Rounding stays in whole coins.">
        Coins are integers: one coin is the smallest unit. Split math rounds to whole coins with the remainder
        documented on the receipt, so ledgers never carry fractional coins. See the{" "}
        <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link> for how receipts render
        the rounded split.
      </Callout>

      <SectionHead
        index="8"
        kicker="Design checklist"
        title="Apply the axioms to a new feature"
        body="Run every proposal through these five gates before writing schema. A miss at any gate sends the design back, not the axiom."
      />
      <Steps
        items={[
          ["Price it in coins first", <>Convert every dollar figure at 100 to 1 and confirm the UI shows coins with the dollar equivalent beside it. If a second rate appears anywhere, remove it.</>],
          ["Split the gross on paper", <>Show provider 75 and platform 25 on the receipt mock before building. The gross stays the price; the split is never added on top or hidden in a fee line.</>],
          ["Kill the network, then click around", <>Block AI and realtime endpoints and verify boards render, timers tick locally, and drafts save. Any blank page or lost keystroke fails the fail-open gate.</>],
          ["Double-click every money button", <>Click each coin control twice fast in the prototype. One-shot guards must converge on a single charge; a second ledger row fails the idempotency gate.</>],
          ["Prove strangers cannot reach it", <>Confirm the feature needs a squad invite or an explicit share. Anything browsable by the public fails the zero marketplace gate no matter how useful it looks.</>],
        ]}
      />

      <SectionHead
        index="9"
        kicker="FAQ"
        title="Axiom edge cases"
        body="The questions reviewers ask most, with the ruling for each."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Can a squad set its own coin rate?</p>
          <p className="mt-1 text-sm text-muted-foreground">No. Parity is global: 100 coins equal one dollar in every squad, invoice, and compute job. Local discounts happen in dollars before conversion, never as a competing rate.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Are provider credits withdrawable?</p>
          <p className="mt-1 text-sm text-muted-foreground">No. The 75 percent lands as on-site credits for games, cloud compute, and AI services. Cash-out paths would trigger licensing the platform deliberately avoids.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">What breaks when the timer disagrees with the server?</p>
          <p className="mt-1 text-sm text-muted-foreground">The local clock keeps ticking and reconciles on reconnect. Fail-open means the worker is never blocked by a stalled sync; the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link> documents the drift-proof design.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Where do I start implementing?</p>
          <p className="mt-1 text-sm text-muted-foreground">          Run the <Link className="underline" href="/docs/remastery/migration">SQL migration runbook</Link> first, then open the <Link className="underline" href="/docs/remastery">Wave 1 overview</Link> rollout order for the squad to invoice path.</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Next: run the <Link className="underline" href="/docs/remastery/migration">SQL migration runbook</Link> or
        return to the <Link className="underline" href="/docs/remastery">Wave 1 overview</Link>.
      </p>

      <Pager current="/docs/remastery/axioms" />
    </article>
  );
}
