import type { Metadata } from "next";
import Link from "next/link";
import VocrehabGameEnergyBudget from "@/components/vocrehab/vocrehab-game-energy-budget";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Energy Budget — VocRehab Practice Arcade",
  description:
    "Plan a work week inside 12 energy tokens: place shifts, appointments, and protected rest. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/energy-budget" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[]; savedStateId?: string | string[]; kid_id?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  const savedStateId = typeof params.savedStateId === "string" ? params.savedStateId : undefined;
  const kidId = typeof params.kid_id === "string" ? params.kid_id : undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Energy Budget
      </nav>
      <p className="text-sm text-muted-foreground">
        No timer — plan at your own pace. Practice, not a test — nothing here
        grades you.
      </p>
      <VocrehabGameEnergyBudget vocrehabSeed={seed} vocrehabSavedStateId={savedStateId} vocrehabKidId={kidId} />
    </main>
  );
}
