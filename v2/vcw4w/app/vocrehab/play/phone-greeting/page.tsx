import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGamePhoneGreeting } from "@/components/vocrehab/vocrehab-game-phone-greeting";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Front-Desk Hello — VocRehab Arcade",
  description: "VocRehab listening game: greet 6 callers warmly and remember one detail from each call.",
  alternates: { canonical: "/vocrehab/play/phone-greeting" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Arcade</Link> → Front-Desk Hello
      </nav>
      <h1 className="text-xl font-bold">Front-Desk Hello</h1>
      <VocrehabGamePhoneGreeting vocrehabSeed={seed} />
    </main>
  );
}
