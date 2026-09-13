import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/integrations" },
  title: "Integrations — MCP Server & Chat Bot",
  description:
    "Connect 4weird to your tools: the official @4weird/mcp Model Context Protocol server and the community chat bot with slash commands.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-indigo-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-indigo-300 bg-clip-text text-transparent",
};

export default function IntegrationsOverviewPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · integrations"
        title={<>4weird, <span className={theme.title}>inside your tools.</span></>}
        lede={<>Two official integration surfaces: the @4weird/mcp Model Context Protocol server for AI coding tools, and the chat bot for clan raids, leaderboards, and squad status. Both read from the same APIs — no risky worker search tools, no secrets in chat.</>}
        stats={[
          ["3", "mcp tools"],
          ["2+", "slash commands"],
          ["API-keyed", "server side only"],
          ["Fail", "open, never bricked"],
        ]}
        glyph="🔌"
        theme={theme}
        crumb="Integrations"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[48, 66, 42, 60, 74, 50, 62].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-violet-200/50 bg-gradient-to-t from-fuchsia-500 to-violet-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Two surfaces"
        title="Pick your integration"
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/docs/integrations/mcp" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-violet-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">MCP guide →</p>
          <p className="mt-1 text-lg font-black"><span aria-hidden="true" className="mr-2">🤖</span>@4weird/mcp server</p>
          <p className="text-sm text-muted-foreground">Point Claude Desktop, Cursor, or Antigravity at 4weird: game tests, game state, squad tasks.</p>
        </Link>
        <Link href="/docs/integrations/chat-bot" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Chat guide →</p>
          <p className="mt-1 text-lg font-black"><span aria-hidden="true" className="mr-2">💬</span>Chat bot</p>
          <p className="text-sm text-muted-foreground">Slash commands for leaderboards and squad status; env-only token setup.</p>
        </Link>
      </div>

      <SectionHead
        index="2"
        kicker="Ground rules"
        title="Same rules as everything else"
        body="Integrations obey the remastery axioms: fail-open behavior when an external service is unreachable, standard events on the interop bus, and secrets only in server-side environment — never in chat, docs, or committed files."
      />
      <Steps
        items={[
          ["Fail open", <>If the 4weird API or chat gateway is unreachable, integrations degrade to graceful error states — they never brick navigation.</>],
          ["Secrets stay server-side", <>Tokens and keys live in environment variables on the host. If a setup step asks for a token, it names the env var — never a value.</>],
          ["Least privilege", <>The MCP server exposes exactly three tools; the bot answers slash commands in-guild. Neither can search workers or touch wallets.</>],
        ]}
      />

      <Callout tone="rose" title="Never paste secrets">
        API keys, bot tokens, and service-role keys go in server environment configuration only. Never paste them into chat, MCP configs you share, docs, logs, or committed files.
      </Callout>

      <Pager current="/docs/integrations" />
    </article>
  );
}
