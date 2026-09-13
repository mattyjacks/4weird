import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { CommanderTerminal } from "@/components/commander/commander-terminal";

export const metadata: Metadata = {
  alternates: { canonical: "/commander" },
  title: "CryptArt Commander | Rent Tech | 4weird Games",
  description:
    "CryptArt Commander: a Quake-style in-browser terminal for 4weird Games. Type 50+ style commands to jump to games, rentals, and docs — runs 100% locally in your tab, no signup.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Rent tech · Commander"
      title="CryptArt Commander"
      blurb="Quake-style terminal & CLI engine for the site. Type help to list commands — everything resolves locally in your browser, nothing leaves this tab."
    >
      <Suspense
        fallback={
          <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
            Loading commander terminal…
          </p>
        }
      >
        <CommanderTerminal />
      </Suspense>
    </ToolShell>
  );
}
