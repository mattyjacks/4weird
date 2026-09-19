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
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Link href="/docs/integrations/mcp" className="group rounded-xl border border-border bg-card p-3.5 transition hover:border-violet-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">MCP guide →</p>
          <p className="mt-0.5 text-base font-black"><span aria-hidden="true" className="mr-2">🤖</span>@4weird/mcp server</p>
          <p className="text-[13px] text-muted-foreground">Point Claude Desktop, Cursor, or Antigravity at 4weird: game tests, game state, squad tasks.</p>
        </Link>
        <Link href="/docs/integrations/chat-bot" className="group rounded-xl border border-border bg-card p-3.5 transition hover:border-indigo-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Chat guide →</p>
          <p className="mt-0.5 text-base font-black"><span aria-hidden="true" className="mr-2">💬</span>Chat bot</p>
          <p className="text-[13px] text-muted-foreground">Slash commands for leaderboards and squad status; env-only token setup.</p>
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

      <SectionHead
        index="3"
        kicker="AI tools"
        title="MCP server: three tools, one config entry"
        body="The @4weird/mcp server connects Claude Desktop, Cursor, or Antigravity to 4weird through the Model Context Protocol. It exposes exactly three read and test scoped tools, so coding assistants can inspect games and squads without touching wallets or workers."
      />
      <Steps
        items={[
          ["Install the package", <>Add <code>@4weird/mcp</code> to your MCP client config with your 4weird base URL. No daemon, no port forwarding, no background service to babysit.</>],
          ["Run a game test first", <>Call the game test tool against a published title to confirm the round trip. A passing test proves auth, networking, and schema parsing in one move.</>],
          ["Read game state, then squad tasks", <>Pull structured game state for debugging, then list squad tasks to ground planning in live backlog data. Full schemas live in <Link className="underline" href="/docs/integrations/mcp">the MCP guide</Link>.</>],
        ]}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🧪 Game test runner", "Execute scripted QA runs against arcade titles and read pass or fail verdicts with logs."],
          ["🎮 Game state reader", "Fetch typed level, score, and inventory snapshots for the title under test."],
          ["📋 Squad task list", "List live squad backlog items so plans reference real tickets, not guesses."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="4"
        kicker="Community servers"
        title="Chat bot: leaderboards and sprint status in channel"
        body="The community chat bot answers slash commands inside your guild: arcade standings plus squad sprint summaries. Members type commands, hosts configure the token once through server environment, and nothing sensitive ever appears in chat."
      />
      <Steps
        items={[
          ["Invite with the Guilds intent only", <>That single privileged scope lets slash commands register. No message content access, no direct messages, no admin role required.</>],
          ["Confirm autocomplete", <>Type a slash in any channel. The leaderboard and squad status commands should suggest themselves within minutes of the bot joining.</>],
          ["Post standings after events", <>After a clan raid or tournament night, run the leaderboard command so results land as one reply the whole channel can see. Command options live in <Link className="underline" href="/docs/integrations/chat-bot">the chat bot guide</Link>.</>],
        ]}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black">🏆 Leaderboard command</p>
          <p className="mt-1 text-sm text-muted-foreground">Top players for one game title with points and rank, rendered as a single channel reply. Ideal for weekly ladders and raid recaps in <Link className="underline" href="/docs/clans">clans</Link>.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black">📊 Squad status command</p>
          <p className="mt-1 text-sm text-muted-foreground">Done, active, and blocked counts for the current sprint, pulled from the same backlog the MCP tools read. Standup notes write themselves.</p>
        </div>
      </div>

      <SectionHead
        index="5"
        kicker="Choose well"
        title="Which surface fits your job"
        body="Coding assistants take the MCP road, communities take the chat road, and agent builders start with bot keys before wiring either surface."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🤖 Automating QA or debugging", "Pick MCP. Typed game state plus repeatable test runs beats screenshots pasted into prompts."],
          ["💬 Running events or standups", "Pick the chat bot. One slash command updates the whole channel without screen sharing."],
          ["🔑 Giving an agent its own identity", "Start at bot keys in the bots guide, then connect that key through MCP or chat flows. See the agent passport in docs bots."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Agent identities live in <Link className="underline" href="/docs/bots">Bots</Link> · clan event homes live in{" "}
        <Link className="underline" href="/docs/clans">Clans</Link> · coin costs for metered calls live in{" "}
        <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.
      </p>

      <SectionHead
        index="6"
        kicker="When it fails"
        title="Troubleshooting and FAQ"
        body="Integration failures cluster into three buckets: unreachable API, misconfigured secrets, and stale registrations."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">📡 <strong className="text-foreground">Tool call returns a graceful error.</strong> The API or gateway is unreachable. Keep working locally and retry later. Editors never brick on this path by design.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔐 <strong className="text-foreground">Auth rejected.</strong> The host env var is missing or stale. Reissue the key, update server environment, restart the MCP server or bot host, and never paste the value into chat to compare.</li>
        <li className="rounded-xl border border-border bg-card p-3">💬 <strong className="text-foreground">Slash commands missing.</strong> Reinvite with the Guilds intent, wait several minutes for registration to propagate, then type a slash to check autocomplete again.</li>
        <li className="rounded-xl border border-border bg-card p-3">❓ <strong className="text-foreground">Can integrations move coins?</strong> No. Neither surface exposes wallet, payout, or worker search tools. Spending happens in the priced product flows, not through chat.</li>
        <li className="rounded-xl border border-border bg-card p-3">❓ <strong className="text-foreground">Where are the full references?</strong> Tool schemas and config samples live in the MCP guide, token setup and command options live in the chat bot guide. This page stays the map, those pages are the territory.</li>
      </ul>

      <Callout tone="rose" title="Never paste secrets">
        API keys, bot tokens, and service-role keys go in server environment configuration only. Never paste them into chat, MCP configs you share, docs, logs, or committed files.
      </Callout>

      <Pager current="/docs/integrations" />
    </article>
  );
}
