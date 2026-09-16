import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CommanderTerminal } from "@/components/commander/commander-terminal";
import { TelemetryBar } from "./telemetry-bar";
import { CommandTray } from "./command-tray";

export const metadata: Metadata = {
  alternates: { canonical: "/commander" },
  title: "CryptArt Commander | Rent Tech | 4weird Games",
  description:
    "CryptArt Commander: a Quake-style in-browser terminal for 4weird Games. Type 50+ style commands to jump to games, rentals, and docs — runs 100% locally in your tab, no signup.",
};

export default function Page() {
  return (
    <main className="flex h-[calc(100vh-56px)] min-h-[500px] flex-col overflow-hidden bg-slate-950 px-2 pb-2 pt-1.5 text-white sm:px-3">
      {/* Compact inline header (no hero margins) */}
      <div className="flex h-8 shrink-0 items-center gap-2">
        <Link
          href="/tools"
          className="shrink-0 text-[11px] font-semibold text-cyan-300 hover:underline"
        >
          {"<-"} Tools
        </Link>
        <h1 className="truncate text-sm font-black">CryptArt Commander</h1>
        <p className="hidden truncate text-[11px] text-slate-500 md:inline">
          Quake-style terminal - 100% local - type help — Up/Down history - Ctrl+L clear
        </p>
      </div>

      {/* 36px integrated status bar: telemetry rail + cheatsheet drawer */}
      <div className="flex h-9 shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <TelemetryBar />
        </div>
        <details className="group relative shrink-0">
          <summary className="cursor-pointer list-none rounded-md border border-white/10 bg-white/[.03] px-2 py-1 font-mono text-[10px] text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-200 [&::-webkit-details-marker]:hidden">
            [Cheatsheet ⌘/]
          </summary>
          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-white/10 bg-slate-900 p-2.5 shadow-xl">
            <p className="font-mono text-[10px] font-bold text-emerald-300">COMMAND CHEATSHEET</p>
            <ul className="mt-1.5 space-y-1 font-mono text-[10px] text-slate-300">
              <li><span className="text-emerald-200">help</span> — list all commands</li>
              <li><span className="text-emerald-200">games / gpu / coins</span> — jump to hubs</li>
              <li><span className="text-emerald-200">goto /games</span> — open any route</li>
              <li><span className="text-emerald-200">whoami / date / about</span> — session info</li>
              <li><span className="text-emerald-200">history / clear</span> — recall / wipe buffer</li>
            </ul>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Tap a chip above to copy, then paste at the 4weird$ prompt.
            </p>
          </div>
        </details>
      </div>

      {/* Autocomplete tray — always visible above the shell */}
      <CommandTray />

      {/* Viewport-fill shell: internal virtual scroll, pinned bottom prompt */}
      <div className="mt-1.5 min-h-0 flex-1 [&>div]:flex [&>div]:h-full [&>div]:flex-col [&_[role=log]]:min-h-0 [&_[role=log]]:!h-auto [&_[role=log]]:flex-1">
        <Suspense
          fallback={
            <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
              Loading commander terminal…
            </p>
          }
        >
          <CommanderTerminal />
        </Suspense>
      </div>
    </main>
  );
}
