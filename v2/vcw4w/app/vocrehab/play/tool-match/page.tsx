import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGameToolMatch } from "@/components/vocrehab/vocrehab-game-tool-match";

export const metadata: Metadata = {
  title: "Tool Crib — VocRehab Arcade",
  description: "VocRehab task-knowledge game: match 8 jobs to the right tool and flag safety-gear needs.",
  alternates: { canonical: "/vocrehab/play/tool-match" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Arcade</Link> → Tool Crib
      </nav>
      <h1 className="text-2xl font-bold">Tool Crib</h1>
      <VocrehabGameToolMatch />
    </main>
  );
}
