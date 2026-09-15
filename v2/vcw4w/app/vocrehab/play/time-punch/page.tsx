import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGameTimePunch } from "@/components/vocrehab/vocrehab-game-time-punch";

export const metadata: Metadata = {
  title: "Shift Punch — VocRehab Arcade",
  description: "VocRehab punctuality game: punch 6 shift tasks inside their time windows across a 3-minute shift.",
  alternates: { canonical: "/vocrehab/play/time-punch" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Arcade</Link> → Shift Punch
      </nav>
      <h1 className="text-xl font-bold">Shift Punch</h1>
      <VocrehabGameTimePunch />
    </main>
  );
}
