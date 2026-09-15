import type { Metadata } from "next";
import Link from "next/link";
import VocrehabGameEnergyBudget from "@/components/vocrehab/vocrehab-game-energy-budget";

export const metadata: Metadata = {
  title: "Energy Budget — VocRehab Practice Arcade",
  description:
    "Plan a work week inside 12 energy tokens: place shifts, appointments, and protected rest. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/energy-budget" },
};

export default async function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Energy Budget
      </nav>
      <p className="text-sm text-muted-foreground">
        No timer — plan at your own pace. Practice, not a test — nothing here
        grades you.
      </p>
      <VocrehabGameEnergyBudget />
    </main>
  );
}
