import type { Metadata } from "next";
import Link from "next/link";
import { FundraiserDetail } from "@/components/fundraisers/fundraiser-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Launch campaign | 4weird Games",
    description: "Back a game launch or tech startup with Vibe Coins. Gifts, not charity, not investment.",
    // Per-campaign canonical so every public campaign page is indexed under its own URL.
    alternates: { canonical: `/fundraisers/${id}` },
  };
}

export const dynamic = "force-dynamic";

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl space-y-8 px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/fundraisers">
          ← All campaigns
        </Link>
        <FundraiserDetail id={id} />
      </section>
    </main>
  );
}
