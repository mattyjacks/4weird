import type { Metadata } from "next";
import Link from "next/link";
import { ClanPage } from "@/components/clans/clan-page";
import { ModerationNote } from "@/components/clans/moderation-note";

export const metadata: Metadata = {
  title: "Clan | 4weird Clans",
  description: "Clan posts, strats, and clips. Reading is public; posting needs login.",
};

export const dynamic = "force-dynamic";

export default async function ClanSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      
      <section className="mx-auto max-w-4xl space-y-8 px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/clans">
          ← All clans
        </Link>
        <ClanPage slug={slug} />
        <ModerationNote />
      </section>
    </main>
  );
}
