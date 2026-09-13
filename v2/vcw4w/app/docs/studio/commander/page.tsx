import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, MockWindow, Pager } from "@/components/docs/docs-bits";

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

      <Pager current="/docs/studio/commander" />
    </article>
  );
}
