import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingPage } from "@/components/site/marketing-page";
import { FavoritesPage } from "@/components/site/favorites-page";

export const metadata: Metadata = {
  title: "Favorites - Your Starred Pages",
  description:
    "Your favorite 4weird pages in one place. Star any page with ☆ and jump back in one click — saved on this device, no account needed.",
  alternates: { canonical: "/favorites" },
};

export default function Page() {
  // Per-user page (localStorage-backed, no account): NEVER cached — the
  // dynamic list streams behind the fallback while the static shell ships.
  return (
    <MarketingPage
      title={<><span aria-hidden="true">★</span> Favorites</>}
      titleLabel="Favorites"
      intro={<>Too many pages? Star the ones you love with <span aria-hidden="true">☆</span> and they stay pinned here and at the top of the Menu sidebar. Saved on this device — no account needed.</>}
      hint="Favorites are stored in this browser (localStorage), so guests keep them too. Clearing site data removes them. External links like GitHub can't be starred."
    >
      <Suspense fallback={<p className="text-sm text-slate-400">Loading your favorites…</p>}>
        <FavoritesPage />
      </Suspense>
    </MarketingPage>
  );
}
