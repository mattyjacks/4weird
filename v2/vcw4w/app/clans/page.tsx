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
      {/* Compact command bar: title + directory context + creation trigger inline */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-6xl items-center gap-3 px-4">
          <Link className="shrink-0 text-sm text-cyan-300 hover:underline" href="/">
            ← Home
          </Link>
          <h1 className="truncate text-base font-black">
            4weird <span className="text-cyan-300">Clans</span>
          </h1>
          <p className="hidden truncate text-xs text-slate-400 lg:block">
            Gamer and coder crews · reading is public; posting needs login + membership
          </p>
          <a
            href="#clan-create"
            className="ml-auto shrink-0 rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-200"
          >
            + Create Clan
          </a>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-xs text-slate-400 lg:hidden">
          Gamer and coder crews. Reading is public; posting needs a login and clan membership.
        </p>
        <p className="mt-1 hidden text-xs text-slate-500 lg:block">
          Love a post? Give it 💌; love letters are clan-native appreciation (never coins), earned via
          daily bonus + quests + loved posts, spent on gifts and advanced awards.
        </p>
        <div id="clan-create" className="mt-4 scroll-mt-16">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading clans…</p>}>
            <ClanBrowser />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
