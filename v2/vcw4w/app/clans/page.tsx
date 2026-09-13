import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClanBrowser } from "@/components/clans/clan-browser";

export const metadata: Metadata = {
  alternates: { canonical: "/clans" },
  title: "4weird Clans | Gamer & Coder Crews",
  description: "Find your crew: start or join a 4weird clan, post strats, code, and clips.",
  openGraph: {
    title: "4weird Clans - Gamer & Coder Crews",
    description:
      "Find your crew: start or join a 4weird clan, post strats, code, and clips. Community clubhouses with shared games and bot clans.",
    images: [
      {
        url: "/og/og-clans.png",
        width: 1200,
        height: 630,
        alt: "4weird Clans - Gamer and Coder Crews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "4weird Clans - Gamer & Coder Crews",
    description:
      "Find your crew: start or join a 4weird clan, post strats, code, and clips. Community clubhouses with shared games and bot clans.",
    images: ["/og/og-clans.png"],
  },
};


export default function ClansPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      
      <section className="mx-auto max-w-4xl px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <h1 className="mt-4 text-4xl font-black">
          4weird <span className="text-cyan-300">Clans</span>
        </h1>
        <p className="mt-4 text-slate-300">
          Gamer and coder crews. Reading is public; posting needs a login and clan membership.
          Love a post? Give it 💌; love letters are clan-native appreciation (never coins), earned via daily
          bonus + quests + loved posts, spent on gifts and advanced awards.
        </p>
        <div className="mt-10">
          <Suspense fallback={<p className="text-slate-400">Loading clans…</p>}>
            <ClanBrowser />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
