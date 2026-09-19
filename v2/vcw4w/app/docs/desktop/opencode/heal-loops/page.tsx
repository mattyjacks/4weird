import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/desktop/opencode/heal-loops" },
  title: "Heal loops: bugtest → fix → retest",
  description:
    "How Heal loops test, fix, and re-test until clean or the budget is spent — token budgets, coin quotes, and MCP pay as a queued future.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent",
};

export default function DesktopOpencodeHealLoopsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · desktop · opencode"
        title={<>Heal until clean, <span className={theme.title}>or until budget.</span></>}
        lede={<>Heal loops bugtest → fix → re-test until the suite is clean or a budget trips — iteration count, token cap, or spend cap, whichever hits first. Coin quotes follow the house rule (100 coins = $1, 75/25 split); MCP-mediated payment is a queued future where only stubs exist today.</>}
        stats={[
          ["loop", "test → fix → re-test"],
          ["100 🪙", "= $1.00 always"],
          ["75 / 25", "provider / platform"],
          ["MCP pay", "queued future"],
        ]}
        glyph="🔁"
        theme={theme}
        crumb="Heal loops"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[64, 48, 76, 56, 84, 62, 80].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-cyan-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The loop"
        title="Bugtest → fix → retest"
        body="Export writes the BUGFIX-<game>-<stamp>.md/json report; Fix hands it to OpenCode so it edits code itself and shows the diff; Heal repeats test → fix → re-test until clean or the iteration budget is spent. Swarm agents reach the same loop via the opencode.export / opencode.heal tools."
      />
      <Steps
        items={[
          ["Bugtest", <>Run the game tools / test suite and collect failures into a BUGFIX report. A stubbed run that fails twice then passes must heal and stop.</>],
          ["Fix", <>Hand the report to OpenCode (<code>opencode run -f file</code>, the desktop Fix button, or the <code>opencode.heal</code> tool) so it edits code and shows the git diff.</>],
          ["Retest", <>Re-run the same suite. Clean → done with a verdict. Still failing → next round, until the loop terminates on clean, on max rounds, or on budget.</>],
          ["Always-fail stops on budget", <>A stubbed always-fail run must stop on the token/spend budget with a verdict — never spin forever. The loop always terminates.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Budgets"
        title="Token budgets beat iteration counts"
        body="Iteration caps alone cannot price a loop — one round can burn far more tokens than the next. The heal budget tracks input/output tokens, prices them, and stops on max tokens or max spend (USD), with per-iteration ledger lines. Integer-token accounting, fail-open clamps, never exceeds budget."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🔢</p>
          <p className="font-black">maxTokens</p>
          <p className="mt-1 text-sm text-muted-foreground">Hard cap on input + output tokens across all rounds. Trips before max iterations in a heavy run.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">💵</p>
          <p className="font-black">maxSpendUSD</p>
          <p className="mt-1 text-sm text-muted-foreground">Hard cap on priced spend. A run with maxSpendUSD set tiny stops on spend, not on round count.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🧾</p>
          <p className="font-black">Per-iteration ledger</p>
          <p className="mt-1 text-sm text-muted-foreground">Every round logs its token usage so the stop reason is auditable after the verdict.</p>
        </div>
      </div>

      <SectionHead
        index="3"
        kicker="Coin quotes"
        title="Every quote splits 75/25"
        body="Heal-loop cost estimates are read-only quotes in integer coins: 100 coins = $1.00, provider keeps 75% as on-site credits, platform keeps 25% for infrastructure. Quotes never write to any ledger — settlement stays a later lane."
      />
      <SplitBar leftLabel="75% provider credits" rightLabel="25% platform" />
      <Callout tone="emerald" title="Quote only — no ledger writes.">
        A heal coin quote answers &ldquo;what would this run cost&rdquo; with clamped, fail-open math. It touches no
        ledger tables and settles nothing; any future debit/credit needs its own guarded lane. If a quote endpoint
        is advertised, treat it as a sibling-lane scope until it ships — this page promises no live route.
      </Callout>

      <SectionHead
        index="4"
        kicker="MCP pay"
        title="MCP-mediated payment is queued-future"
        body="Driving bugtest + fix remotely (terminal exec, heal start/status, opencode fix tools over MCP) and paying for it in coins is the queued future: where only stubs exist today, this page describes intent, not a live payment path. Nothing here debits a wallet."
      />
      <Steps
        items={[
          ["Remote tools first", <>Terminal exec (allow-listed, token-authed), heal start/status, and opencode fix arrive as MCP tools before any money moves.</>],
          ["Quotes before charges", <>Every paid action gets a read-only coin quote first — same 100 = $1, same 75/25 split, same zero-write rule.</>],
          ["Settlement last, guarded", <>Actual ledger movement needs its own guarded lane (auth, rate limits, audit log). Until that ships, MCP pay stays described, not billed.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Worked example"
        title="A three round heal with real numbers"
        body="Follow one stubbed suite through the loop: it fails twice on the same assertion, then passes. Every round logs tokens so the stop reason is auditable."
      />
      <Steps
        items={[
          ["Round 1: bugtest fails, fix lands", <>The suite reports 2 failures in 40 tests. OpenCode edits the collision handler and the ledger logs 18,400 input tokens plus 3,100 output tokens for the round.</>],
          ["Round 2: retest fails, fix narrows", <>One failure remains. The second fix touches a single branch and logs 12,050 input tokens plus 1,800 output tokens. Running total: about 35,350 tokens.</>],
          ["Round 3: retest clean, verdict done", <>All 40 tests pass. The loop stops on clean with a verdict summarizing rounds, totals, and the diff. No budget tripped, so nothing was cut short.</>],
          ["Contrast: always-fail stops on budget", <>Swap in a suite that can never pass and set maxSpendUSD tiny. The loop now stops on spend after a few rounds with a budget verdict, never spinning forever.</>],
        ]}
      />

      <SectionHead
        index="6"
        kicker="Stop reasons"
        title="Every loop ends one of four ways"
        body="The verdict names exactly one stop reason. Learn the four so a Heal result never surprises you."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Stop reason</th>
              <th className="px-4 py-2 font-black">What it means</th>
              <th className="px-4 py-2 font-black">What to do next</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Clean</td>
              <td className="px-4 py-2 text-muted-foreground">Suite passed fully on a retest round.</td>
              <td className="px-4 py-2 text-muted-foreground">Review the diff, keep the fix, ship the game.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Max rounds</td>
              <td className="px-4 py-2 text-muted-foreground">Iteration cap hit while failures remain.</td>
              <td className="px-4 py-2 text-muted-foreground">Shrink the repro, raise the cap deliberately, re-heal.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Max tokens</td>
              <td className="px-4 py-2 text-muted-foreground">Cumulative input plus output tokens hit maxTokens.</td>
              <td className="px-4 py-2 text-muted-foreground">Trim context in the report or raise maxTokens, then resume.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-bold">Max spend</td>
              <td className="px-4 py-2 text-muted-foreground">Priced spend hit maxSpendUSD first.</td>
              <td className="px-4 py-2 text-muted-foreground">Check the per-iteration ledger, price the next attempt with a coin quote, re-run funded.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHead
        index="7"
        kicker="FAQ"
        title="Heal loop questions, answered"
        body="Pricing, quoting, and payment futures in one place. Start on the setup page if the binary itself is missing."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">How do I price a loop before starting it?</p>
          <p className="mt-1 text-sm text-muted-foreground">Take the last similar verdict, sum its ledger tokens, price them at your provider rate, then convert dollars to coins at 100 to 1. That quote is read-only: it predicts, it never debits.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Why did my loop stop on round 2 with failures left?</p>
          <p className="mt-1 text-sm text-muted-foreground">A token or spend budget tripped before the round cap. Open the verdict ledger: the stop reason names the exact cap and the round totals that crossed it.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Can Heal pay the provider in coins today?</p>
          <p className="mt-1 text-sm text-muted-foreground">No. MCP-mediated coin payment is queued future with stubs only. Quotes today are estimates; any future settlement needs its own guarded lane with auth and audit.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Where does Export fit in?</p>
          <p className="mt-1 text-sm text-muted-foreground">Export writes the BUGFIX report that round 1 consumes. Revisit <Link className="underline" href="/docs/desktop/opencode">Desktop OpenCode setup</Link> for the report format and the cli versus server choice.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/docs/desktop/opencode/terminal"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← Terminal</p>
          <p className="mt-1 text-sm text-muted-foreground">Web /terminal vs the desktop panel.</p>
        </Link>
        <Link
          href="/docs/desktop/opencode"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← Setup</p>
          <p className="mt-1 text-sm text-muted-foreground">CLI requirements and run vs serve modes.</p>
        </Link>
      </div>

      <Pager current="/docs/desktop/opencode/heal-loops" />
    </article>
  );
}
