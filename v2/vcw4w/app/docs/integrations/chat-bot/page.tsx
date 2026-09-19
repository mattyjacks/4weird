import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/integrations/chat-bot" },
  title: "Chat Bot Guide — Slash Commands & Token Setup",
  description:
    "Use the official 4weird chat bot (chat SDK v14): /leaderboard and /squad-status slash commands, plus env-only CHAT_BOT_TOKEN setup for hosts.",
};

const theme = {
  bg: "bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950",
  border: "border-indigo-300/20",
  chip: "border-indigo-300/40 bg-indigo-300/10 text-indigo-200",
  title: "bg-gradient-to-r from-indigo-300 via-sky-200 to-violet-300 bg-clip-text text-transparent",
};

export default function ChatBotGuidePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · integrations chat"
        title={<>Raids, leaderboards, <span className={theme.title}>right in chat.</span></>}
        lede={<>The official 4weird community bot (chat SDK v14) brings clan raid coordination, arcade leaderboards, and squad sprint status to your server through slash commands. Members just type; only hosts ever touch a token — and only through environment.</>}
        stats={[
          ["/leaderboard", "top players"],
          ["/squad-status", "sprint progress"],
          ["Env-only", "token setup"],
          ["Guilds", "intent only"],
        ]}
        glyph="💬"
        theme={theme}
        crumb="Chat bot"
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
      <MockWindow title="chat — slash commands" badge="/ commands">
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
export CHAT_BOT_TOKEN="<paste-once-in-host-dashboard>"

# The bot reads it at login and nothing else:
# client.login(process.env.CHAT_BOT_TOKEN);`}
        </pre>
      </MockWindow>
      <Callout tone="rose" title="Tokens never travel">
        CHAT_BOT_TOKEN lives in host environment configuration only. Never paste it into chat, MCP configs, docs, logs, screenshots, or committed files. If a token leaks, rotate it in the chat app portal immediately.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Saturday raid night, start to finish"
        body="A concrete run through both commands so your first raid night needs no improvising. Replace the squad slug with your own."
      />
      <Steps
        items={[
          ["Friday: confirm the board", <>Type /leaderboard game:gravegain3d in your events channel. Pin the reply so late joiners see the baseline scores before raid night.</>],
          ["Saturday: open the sprint", <>Type /squad-status squad:starfall-raiders during warmup. Read out the blocked card first, then assign owners to each active card.</>],
          ["After the raid: close the loop", <>Re-run /leaderboard game:gravegain3d and post the delta (who climbed, who defended). Archive the sprint note in your clan thread.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Commands missing, stale replies, token scares"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🔍 <strong className="text-foreground">Slash commands do not autocomplete:</strong> wait ten minutes after inviting, then check the bot has the Guilds intent and the integration is enabled for your server. Retyping / in a different channel forces a refresh of the command cache.</li>
        <li className="rounded-xl border border-border bg-card p-3">📊 <strong className="text-foreground">Leaderboard shows the wrong game:</strong> the game option is a slug, not a display name. Use gravegain3d style slugs from the game page URL, and confirm the game tracks arcade scores on <Link className="underline" href="/docs/playing-games">Playing games</Link>.</li>
        <li className="rounded-xl border border-border bg-card p-3">👻 <strong className="text-foreground">Squad status looks stale:</strong> the reply reflects the current sprint snapshot at call time. If cards moved seconds ago, re-run the command. Persistent staleness means the squad slug is wrong, so copy it from the squad page instead of typing from memory.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔑 <strong className="text-foreground">Token may have leaked:</strong> rotate it in the chat app portal, update the host dashboard secret, restart the bot process, and verify login with the new value. Treat any pasted token as burned, even in a private channel.</li>
        <li className="rounded-xl border border-border bg-card p-3">🤖 <strong className="text-foreground">Want bot behavior rules too?</strong> Command hosting here covers the community bot only. Posting rules, keys, and clan bot policy live in <Link className="underline" href="/docs/bots">Bots</Link>, and general setup help lives in <Link className="underline" href="/docs/faq">FAQ and support</Link>.</li>
      </ul>

      <Pager current="/docs/integrations/chat-bot" />
    </article>
  );
}
