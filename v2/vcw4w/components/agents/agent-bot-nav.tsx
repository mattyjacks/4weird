"use client";

import Link from "next/link";

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
  return (
    <nav
      aria-label="Agent and bot pages"
      className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-3"
    >
      {LINKS.map((l) => {
        const active = current === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            title={l.hint}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "border-cyan-300 bg-cyan-300 text-slate-950"
                : "border-white/15 text-slate-200 hover:border-cyan-300/60 hover:text-cyan-200"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
