import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGameToolMatch } from "@/components/vocrehab/vocrehab-game-tool-match";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Tool Crib — VocRehab Arcade",
  description: "VocRehab task-knowledge game: match 8 jobs to the right tool and flag safety-gear needs.",
  alternates: { canonical: "/vocrehab/play/tool-match" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Arcade</Link> → Tool Crib
      </nav>
      <h1 className="text-xl font-bold">Tool Crib</h1>
      <VocrehabGameToolMatch vocrehabSeed={seed} />
    </main>
  );
}
