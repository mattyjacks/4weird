import type { Metadata } from "next";
import Link from "next/link";
import VocrehabGamePaycheckPlan from "@/components/vocrehab/vocrehab-game-paycheck-plan";

export const metadata: Metadata = {
  title: "Paycheck Planner | VocRehab",
  description: "VocRehab paycheck planning game: plan a paycheck across real-life priorities.",
  alternates: { canonical: "/vocrehab/play/paycheck-plan" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Arcade</Link> → Paycheck Planner
      </nav>
      <h1 className="text-xl font-bold">Paycheck Planner</h1>
      <VocrehabGamePaycheckPlan />
    </main>
  );
}
