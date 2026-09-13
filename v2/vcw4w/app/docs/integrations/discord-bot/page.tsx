import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/integrations/discord-bot" },
  title: "Discord Bot Guide — Slash Commands & Token Setup",
  description:
    "Use the official 4weird Discord bot (discord.js v14): /leaderboard and /squad-status slash commands, plus env-only DISCORD_BOT_TOKEN setup for hosts.",
};

const theme = {
  bg: "bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950",
  border: "border-indigo-300/20",
  chip: "border-indigo-300/40 bg-indigo-300/10 text-indigo-200",
  title: "bg-gradient-to-r from-indigo-300 via-sky-200 to-violet-300 bg-clip-text text-transparent",
};

export default function DiscordBotGuidePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · integrations discord"
        title={<>Raids, leaderboards, <span className={theme.title}>right in Discord.</span></>}
        lede={<>The official 4weird community bot (discord.js v14) brings clan raid coordination, arcade leaderboards, and squad sprint status to your server through slash commands. Members just type; only hosts ever touch a token — and only through environment.</>}
        stats={[
          ["/leaderboard", "top players"],
          ["/squad-status", "sprint progress"],
          ["Env-only", "token setup"],
          ["Guilds", "intent only"],
        ]}
        glyph="💬"
        theme={theme}
        crumb="Discord bot"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[44, 60, 38, 66, 52, 58, 70].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-indigo-200/50 bg-gradient-to-t from-sky-500 to-indigo-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Invite"
        title="Add the bot to your server"
        body="Invite the official bot with the Guilds intent — that is the only privileged scope it needs. No member or message-content access, no DMs, no admin required."
      />
      <Steps
        items={[
          ["Open the invite link", <>Use the official invite from the 4weird community page so you get the verified bot application, not a clone.</>],
          ["Pick your guild", <>Authorize for the clan or community server where raids and leaderboards live.</>],
          ["Confirm slash commands", <>Type / in any channel — /leaderboard and /squad-status should autocomplete within minutes of joining.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Command reference"
        title="Two slash commands to learn"
        body="Every command is a guild slash command with typed options. Results render as a single reply — nothing is ever DM'd, nothing needs a follow-up command."
      />
      <MockWindow title="discord — slash commands" badge="/ commands">
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="font-mono font-black text-indigo-300">/leaderboard game:&lt;slug&gt;</p>
            <p className="mt-1 text-slate-400">View top players for a 4weird game. The game option is required (e.g. gravegain3d).</p>
            <p className="mt-1 rounded bg-black/30 px-2 py-1 font-mono text-slate-500">🏆 Top Players for gravegain3d — 1. NovaRacer (12,400 pts)</p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className="font-mono font-black text-indigo-300">/squad-status squad:&lt;slug-or-id&gt;</p>
            <p className="mt-1 text-slate-400">Check active sprint progress for your squad: open cards, in-progress work, blockers.</p>
            <p className="mt-1 rounded bg-black/30 px-2 py-1 font-mono text-slate-500">Sprint 12 — 8 done · 3 active · 1 blocked</p>
          </div>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Self-hosting"
        title="Env-only token setup for hosts"
        body="Running your own instance of the bot? The login token comes from server-side environment and nowhere else. Name the variable, never the value."
      />
      <MockWindow title="host shell — token via environment" badge="server only">
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
{`# Set once in your host's secret / env management — never in code.
export DISCORD_BOT_TOKEN="<paste-once-in-host-dashboard>"

# The bot reads it at login and nothing else:
# client.login(process.env.DISCORD_BOT_TOKEN);`}
        </pre>
      </MockWindow>
      <Callout tone="rose" title="Tokens never travel">
        DISCORD_BOT_TOKEN lives in host environment configuration only. Never paste it into Discord chat, MCP configs, docs, logs, screenshots, or committed files. If a token leaks, rotate it in the Discord developer portal immediately.
      </Callout>

      <Pager current="/docs/integrations/discord-bot" />
    </article>
  );
}
