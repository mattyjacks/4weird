"use client";

import Link from "next/link";
import { InfoTip } from "@/components/ui/info-tip";

/**
 * One nav web so every agent/bot page links to every other one.
 * Drop it on /agents, /bot/setup, /bot/bclans, docs, /swarm-adjacent pages.
 */
const LINKS: { href: string; label: string; hint: string }[] = [
  { href: "/agents", label: "Agents", hint: "Rent NanoClaw serverful/serverless" },
  { href: "/bot/setup", label: "Bot setup", hint: "Username + keys + env code" },
  { href: "/bot/bclans", label: "Clan console", hint: "Try your key live" },
  { href: "/bot/skill.md", label: "Skill", hint: "Agent reads this itself" },
  { href: "/docs/bots", label: "Bots guide", hint: "Keys, scopes, fees" },
  { href: "/docs/agents-compute", label: "Cloud guide", hint: "Escrow, metering" },
  { href: "/swarm", label: "Swarm", hint: "Serverless chat" },
  { href: "/desktop", label: "Desktop", hint: "Full computer" },
  { href: "/runpods", label: "RunPods", hint: "Manage pods" },
  { href: "/my/usage", label: "Usage", hint: "Spend receipts" },
  { href: "/squads", label: "Squads", hint: "Team rooms ([BOT])" },
];

export function AgentBotNav({ current }: { current?: string }) {
  const norm = (s?: string) => (s ?? "").replace(/\/+$/, "") || "/";
  const activeHref = norm(current);
  return (
    <nav
      aria-label="Agent and bot pages"
      className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-3"
    >
      <p className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
        Agent + bot pages
        <InfoTip
          text="One nav web links every agent and bot page together: rent compute on /agents, claim a key on /bot/setup, try it on /bot/bclans, and read the guides. Pills with title text show a hint on hover."
          label="About this nav"
        />
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
      {LINKS.map((l) => {
        const active = norm(l.href) === activeHref;
        const pill = `rounded-full border px-3 py-1.5 min-h-[36px] inline-flex items-center text-xs font-bold transition ${
          active
            ? "border-cyan-300 bg-cyan-300 text-slate-950"
            : "border-white/15 text-slate-200 hover:border-cyan-300/60 hover:text-cyan-200"
        }`;
        // Static public/ files (e.g. /bot/skill.md) have no RSC payload:
        // next/link prefetch fires GET ?_rsc=… → 404 in the console.
        // Plain <a> forces a full document load, no RSC request.
        if (l.href.endsWith(".md")) {
          return (
            <a key={l.href} href={l.href} title={l.hint} className={pill}>
              {l.label}
            </a>
          );
        }
        return (
          <Link
            key={l.href}
            href={l.href}
            title={l.hint}
            aria-current={active ? "page" : undefined}
            className={pill}
          >
            {l.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
