import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/integrations/mcp" },
  title: "MCP Integration Guide — @4weird/mcp Server Tools",
  description:
    "Point an MCP client (Claude Desktop, Cursor, Antigravity) at the official @4weird/mcp server: run_vcw_game_test, get_game_state, query_squad_tasks.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function McpGuidePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · integrations mcp"
        title={<>Your AI tools, <span className={theme.title}>plugged into 4weird.</span></>}
        lede={<>The official @4weird/mcp Model Context Protocol server exposes 4weird capabilities — game QA runs, game state, squad tasks — to Claude Desktop, Cursor, and Antigravity. Three tools, typed schemas, zero risky worker search.</>}
        stats={[
          ["3", "tools total"],
          ["stdio", "transport"],
          ["Typed", "input schemas"],
          ["0", "marketplace risk"],
        ]}
        glyph="🤖"
        theme={theme}
        crumb="MCP server"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[56, 42, 68, 48, 62, 74, 52].map((h, i) => (
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
        kicker="Connect"
        title="Point your MCP client at the server"
        body="Install the @4weird/mcp package and register it as a stdio MCP server in your client. The server reads the API base URL from server-side environment only."
      />
      <MockWindow title="claude_desktop_config.json — server entry" badge="your machine">
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
{`{
  "mcpServers": {
    "4weird": {
      "command": "npx",
      "args": ["-y", "@4weird/mcp"],
      "env": {
        "FOURWEIRD_API_URL": "https://4weird.com"
      }
    }
  }
}`}
        </pre>
      </MockWindow>
      <Callout tone="cyan" title="Env, not secrets">
        FOURWEIRD_API_URL is a plain base URL, safe to share. If your deployment needs an API key, keep it in server-side environment on the host — never in a config file you paste or commit.
      </Callout>

      <SectionHead
        index="2"
        kicker="Tools reference"
        title="Three tools, typed inputs"
        body="ListTools advertises exactly these three tools. Every argument is validated against its input schema before any fetch runs."
      />
      <MockWindow title="@4weird/mcp — tool catalog" badge="3 tools">
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="font-mono font-black text-violet-300">run_vcw_game_test</p>
            <p className="mt-1 text-slate-400">Trigger an automated VibeCodeWorker game QA run and return detected bugs.</p>
            <p className="mt-1 font-mono text-slate-500">gameSlug* · captureMode: screenshot | state_data | full_state · durationSeconds (default 30)</p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="font-mono font-black text-violet-300">get_game_state</p>
            <p className="mt-1 text-slate-400">Fetch live leaderboards, save state, and catalog metadata for a game.</p>
            <p className="mt-1 font-mono text-slate-500">gameSlug* (e.g. gravegain3d, xonotic)</p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="font-mono font-black text-violet-300">query_squad_tasks</p>
            <p className="mt-1 text-slate-400">Retrieve active Kanban sprint cards and tasks for a squad.</p>
            <p className="mt-1 font-mono text-slate-500">squadId* (UUID)</p>
          </div>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Try it"
        title="First calls in three steps"
      />
      <Steps
        items={[
          ["Ask for game state", <>Prompt: “Using the 4weird MCP server, fetch the live state for gravegain3d.” The client calls get_game_state with your slug.</>],
          ["Trigger a QA run", <>Prompt: “Run a 30-second screenshot QA pass on xonotic.” The client calls run_vcw_game_test and returns detected bugs.</>],
          ["Check squad work", <>Prompt: “What is active on my squad sprint?” The client calls query_squad_tasks with the squad UUID.</>],
        ]}
      />
      <Callout tone="rose" title="Fail-open by design">
        If the 4weird API is unreachable, tool calls return a graceful error payload — your editor keeps working. Retry later; nothing bricks.
      </Callout>

      <SectionHead
        index="4"
        kicker="Prompt recipes"
        title="Copy these prompts to get value fast"
        body="Each recipe maps to exactly one tool call. Paste them as written, swapping in your own game slug or squad UUID."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🎮 <strong className="text-foreground">Nightly regression:</strong> quote “Using the 4weird MCP server, run a 60 second full_state QA pass on gravegain3d and list new bugs with repro steps.” Expect a bug list with chunk references you can file straight into <Link className="underline" href="/docs/vibecodeworker">VibeCodeWorker</Link>.</li>
        <li className="rounded-xl border border-border bg-card p-3">📊 <strong className="text-foreground">Launch readiness:</strong> quote “Fetch the live state for xonotic, then summarize leaderboard movement and save health in five bullets.” Use it before events to confirm scoring works.</li>
        <li className="rounded-xl border border-border bg-card p-3">🗂️ <strong className="text-foreground">Sprint standup:</strong> quote “Query squad tasks for squad UUID 123e4567-e89b-12d3-a456-426614174000 and group cards by status with owners.” Paste the result into your clan thread.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔁 <strong className="text-foreground">Compare builds:</strong> quote “Fetch game state for gravegain3d twice, once per build, and tabulate what changed.” Catches leaderboard or metadata regressions between deploys.</li>
      </ul>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Server missing, stale schemas, slow calls"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🧩 <strong className="text-foreground">Client does not list the server:</strong> restart the client after editing the JSON config, then check the command resolves (npx must reach the network on first run). A JSON trailing comma is the most common cause, so validate the file before anything else.</li>
        <li className="rounded-xl border border-border bg-card p-3">📐 <strong className="text-foreground">Tool rejects your arguments:</strong> gameSlug is required for game tools and squadId must be a UUID for squad queries. Copy the slug from the game page URL and the UUID from the squad page, never from chat memory.</li>
        <li className="rounded-xl border border-border bg-card p-3">⏳ <strong className="text-foreground">QA runs feel slow:</strong> durationSeconds controls capture length, and screenshot mode is heavier than state_data. Start with 30 second screenshot passes, then escalate to full_state only when you need deep repro data.</li>
        <li className="rounded-xl border border-border bg-card p-3">☁️ <strong className="text-foreground">Need hosted compute instead?</strong> MCP exposes QA and state, not provisioning. Renting agents, desktops, and squad cloud lives in <Link className="underline" href="/docs/agents-compute">Agents and cloud</Link>, and setup questions belong in <Link className="underline" href="/docs/faq">FAQ and support</Link>.</li>
      </ul>

      <Pager current="/docs/integrations/mcp" />
    </article>
  );
}
