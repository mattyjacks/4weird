import type { Metadata } from "next";
import Link from "next/link";
import { ServerRentForm, type RentGameOption } from "@/components/games/server-rent-form";
import { getCachedGames } from "@/lib/games-catalog";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Rent a Multiplayer Room - 4weird Game Servers",
  description:
    "Rent a 4weird multiplayer room in five steps: pick a game, size, and age band, choose who pays, then confirm a live per-minute quote.",
  keywords: ["rent game server", "host multiplayer room", "game server quote", "free play host"],
  alternates: { canonical: "/games/servers/rent" },
  openGraph: {
    title: "Rent a Multiplayer Room | 4weird Servers",
    description: "Five steps to your own room: game, size, age band, subsidy, quote + confirm.",
    url: "/games/servers/rent",
  },
};

export default async function RentServerPage() {
  // Catalog read (lib/games-catalog.ts): the rent form hydrates on top with
  // this static picker; live quotes stay client-side and uncached.
  let options: RentGameOption[] = [];
  try {
    const games = await getCachedGames();
    options = games.map((g) => ({ slug: g.slug, title: g.title, genre: g.genre }));
  } catch {
    // Fail-open: the form falls back to a manual slug input when the
    // catalog read fails.
    options = [];
  }
  return (
    <div className="bg-[#070912] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              ["Games", "/games"],
              ["Servers", "/games/servers"],
              ["Rent", "/games/servers/rent"],
            ]),
          ),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/games/servers" className="text-sm font-semibold text-cyan-300 hover:underline">
          ← All servers
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-10 sm:text-5xl">
          Rent a room
        </h1>
        <p className="mt-4 text-lg text-slate-300 sm:mt-5 sm:text-xl">
          Five steps, one quote, zero surprises: game, size, age band, who pays — then confirm.
        </p>
        <div className="mt-10">
          <ServerRentForm games={options} />
        </div>
      </main>
    </div>
  );
}
