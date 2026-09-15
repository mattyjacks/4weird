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
    <main className="flex h-[calc(100vh-72px)] min-h-[500px] flex-col bg-slate-950 px-2 pb-2 pt-1.5 text-white sm:px-3">
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

      {/* 24px retro telemetry header */}
      <TelemetryBar />

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
