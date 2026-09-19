import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio/commander" },
  title: "Commander Command Reference — Local Terminal, Allow-Listed Commands",
  description:
    "Every CryptArt Commander command at /terminal: help, echo, status, coins, luck, clear, whoami — exact syntax, local-only sandbox guarantees, and interop behavior.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

const COMMANDS: [string, string, string][] = [
  ["help", "help", "Prints the available command list. Start here — it is the source of truth if this page ever drifts."],
  ["echo <text>", "echo hello studio", "Prints text back. No expansion, no execution — what you type is what you get."],
  ["status", "status", "Shows local session status: sandbox mode, online/offline (fail-open), timestamp, and the 500-line history cap."],
  ["coins <n>", "coins 250", "Quotes n Vibe Coins in USD at 100 coins = $1 with the 75/25 creator/platform split. Quote only — no ledger writes. n must be a non-negative integer."],
  ["luck <intention>", "luck ship the demo", "Shows the deterministic FNV-1a hex seed preview for an intention. Display only — no draw is recorded."],
  ["clear", "clear", "Clears the scrollback buffer. History starts fresh; nothing is persisted anywhere."],
  ["whoami", "whoami", "Prints the local identity: commander, unauthenticated, no session, no server."],
];

export default function CommanderPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio · commander"
        title={<>Type it. <span className={theme.title}>It stays in the tab.</span></>}
        lede={<>Commander at /terminal is a Quake-style power-user terminal with exactly seven allow-listed local commands. No server execution, no fetch, no eval — every input maps to a TypeScript handler in the page, and unknown input gets “command not found”, not a shell.</>}
        stats={[
          ["7", "commands total"],
          ["500", "line history cap"],
          ["500", "char input limit"],
          ["0", "network calls"],
        ]}
        glyph="⚡"
        theme={theme}
        crumb="Commander"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[48, 70, 42, 64, 52, 74, 58].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-violet-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Reference"
        title="All seven commands"
        body="Commands are case-insensitive on the first word; arguments are split on whitespace. Anything outside this table is rejected — the allow-list is the whole language."
      />
      <MockWindow title="commander — help output" badge="local sandbox">
        <div className="space-y-2 font-mono text-xs">
          {COMMANDS.map(([cmd, example, blurb]) => (
            <div key={cmd} className="rounded-lg bg-white/5 px-3 py-2">
              <div className="flex flex-wrap justify-between gap-3">
                <span className="font-black text-emerald-300">{cmd}</span>
                <span className="text-slate-400">e.g. {example}</span>
              </div>
              <p className="mt-1 text-slate-300">{blurb}</p>
            </div>
          ))}
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Guarantees"
        title="What local-only means"
        body="The sandbox boundary is structural, not a promise: there is no code path from input to network. Coins quotes and luck previews are pure display — they read no wallet, write no ledger, and record no draw."
      />
      <Callout tone="emerald" title="Offline-safe and fail-open">
        Commander works with no connection: <code>status</code> reports offline (fail-open) instead of failing, and every command still runs. History is capped at 500 lines and input at 500 characters, so a paste bomb can&apos;t wedge the tab.
      </Callout>
      <Callout tone="violet" title="Every command emits an interop event">
        Each run publishes <code>tools:used</code> with <code>{`{ tool: "commander-terminal", action: <command> }`}</code> on the shared <code>4weird_interop_bus</code> — best-effort, never blocking. Other studio tools can react to terminal usage without any coupling.
      </Callout>

      <SectionHead
        index="3"
        kicker="Worked session"
        title="Quote coins, preview luck, check status"
        body="A typical first session takes under a minute: open the terminal, list commands, quote a coin amount, preview a luck seed, then confirm the sandbox status. Everything below runs locally with zero network calls."
      />
      <MockWindow title="commander — first session" badge="try this order">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> help <span className="text-slate-500">{"// lists all seven commands"}</span></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> coins 250 <span className="text-slate-500">{"// quote only: $2.50, 75/25 split shown"}</span></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> luck ship the demo <span className="text-slate-500">{"// hex seed preview, no draw recorded"}</span></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> status <span className="text-slate-500">{"// sandbox mode, online or offline, timestamp"}</span></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> echo hello studio <span className="text-slate-500">{"// prints back exactly what you typed"}</span></div>
          <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-emerald-200">commander-terminal event published on every run (best effort, never blocking)</div>
        </div>
      </MockWindow>

      <SectionHead
        index="4"
        kicker="Troubleshooting"
        title="When input does not do what you expected"
        body="Commander rejects anything outside the allow list by design. Most surprises below are the sandbox doing its job: no execution, no fetching, no persistence."
      />
      <Steps
        items={[
          ["command not found keeps appearing", <>You typed something outside the seven commands. Run <code>help</code> and copy the first word exactly. Extra words after <code>echo</code> are fine (they print back), but extra words never turn an unknown command into a known one.</>],
          ["coins rejects your number", <>The amount must be a non negative integer with no decimals, commas, or currency symbols. Try <code>coins 250</code> instead of <code>coins 2.50</code> or <code>coins $250</code>. The result is a quote in USD at 100 coins to $1, plus the 75/25 creator and platform split. Nothing is written to any ledger.</>],
          ["luck output looks cryptic", <>That hex string is the FNV-1a seed preview for your intention text, not a result. Change one word and the hex changes completely. Nothing is recorded, so retype the same intention anytime to see the identical preview again.</>],
          ["status says offline but commands still work", <>That is the fail open design. Commander never needs a connection, so offline only changes the status label, never the behavior. History still caps at 500 lines and input still caps at 500 characters.</>],
          ["clear wiped your scrollback", <>Expected. Clear resets the visible buffer and starts history fresh. There is no undo because nothing was ever saved anywhere, so treat scrollback as scratch paper.</>],
        ]}
      />
      <Callout tone="cyan" title="Pair Commander with the Luck Factory guide">
        The <code>luck</code> preview here shows one seed hash. The full draw math (D100 mapping, counter, meditation streak bonus capped at +10, clamped to 1..100) lives in the Luck Factory odds guide. Use Commander for quick previews and the Luck Factory page for the published probabilities.
      </Callout>

      <Pager current="/docs/studio/commander" />
    </article>
  );
}
