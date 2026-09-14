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
