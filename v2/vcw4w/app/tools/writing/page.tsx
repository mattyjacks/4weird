import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { WritingTools } from "@/components/tools/writing-tools";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/writing" },
  title: "Writing Tools | Free Tools | 4weird Games",
  description:
    "Free game writing tools: heuristic title generator and marketing pitch copywriter for your next launch. Offline, no signup, runs in your browser.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Free tool · Writing"
      title="Writing Tools"
      blurb="Name your game and sell it: a rerollable title generator plus a pitch builder that turns your hook into store-ready copy."
    >
      <WritingTools />
    </ToolShell>
  );
}
