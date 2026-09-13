import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { CounterTools } from "@/components/tools/counter-tools";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/counter" },
  title: "Counter Tools | Free Tools | 4weird Games",
  description:
    "Free counter tools: live word, character, sentence, and paragraph counts plus reading and speaking time. Runs in your browser, no signup.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Free tool · Counter"
      title="Counter Tools"
      blurb="Paste quest text, lore, patch notes, or essays — counts, reading time, and speaking time update live as you type."
    >
      <CounterTools />
    </ToolShell>
  );
}
