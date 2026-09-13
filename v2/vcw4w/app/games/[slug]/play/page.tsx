import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { games } from "@/content/games";
import { getCachedGameDetail } from "@/lib/games-catalog";
import { PlayGate } from "@/components/games/play-gate";
import { PlayRateBadge } from "@/components/games/play-rate-badge";
import { RatingBadge } from "@/components/games/rating-badge";
import { GameAiBadge } from "@/components/games/game-ai-badge";
import { GameA11yPanel } from "@/components/games/game-a11y-panel";
import { GamePlaybookPanel } from "@/components/games/game-playbook-panel";
import { FullscreenHint } from "@/components/games/fullscreen-hint";
import { GamingBuddy } from "@/components/buddy/gaming-buddy";
import { GraveGainParty } from "@/components/games/gravegain-party";
import { VcwAutoplay } from "@/components/games/vcw-autoplay";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

// Closed catalog (see ../page.tsx): unknown slugs 404 with a real 404 status.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // No 'use cache' here: this reuses the cached catalog helper, which
  // carries the cacheLife/cacheTag lifetime.
  const { slug } = await params;
  const detail = await getCachedGameDetail(slug);
  if (!detail) return {};
  const game = detail.game;
  return {
    title: `Play ${game.title} | 4weird Games`,
    description: `Play ${game.title}: ${game.description}`,
    robots: { index: false, follow: false },
  };
}

// Viewport meta is governed by the TOP-LEVEL document, never by the runtime
// inside the iframe; so the play shell must declare it. resizes-visual keeps
// the mobile keyboard from shrinking the layout viewport (which resized the
// frame + canvas and made typing games jump vertically with every keystroke).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  // Runtime param read + 404 stay OUTSIDE cached scopes: params are request
  // data, so only the resolved slug string crosses into the cached shells
  // below (as a serializable cache key), never the params promise itself.
  const { slug } = await params;
  const detail = await getCachedGameDetail(slug);
  if (!detail) notFound();
  // NOTE: the page stays static (no searchParams read) so the closed catalog
  // above 404s unknown slugs with a real 404 status. Lobby joins land here
  // as /games/<slug>/play?match=<uuid>; PlayGate forwards the match id into
  // the runtime iframe's query string client-side, where the game's own
  // matchmaking code reads it. The runtime iframe is same-origin.
  const game = detail.game;
  const src = game.runtimePath;
  const manifest = detail.manifest;
  return (
    <div className="bg-black text-white" data-theme-lock="dark">
      <CachedPlayHeader slug={slug} />
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-5">
        <div className="mt-4">
          <Suspense fallback={<p className="py-10 text-center text-sm text-white/60">Loading game player…</p>}>
            <PlayGate slug={game.slug} title={game.title} src={src} version={String(manifest.schemaVersion)} emoji={game.emoji} />
          </Suspense>
        </div>
        {["gravegain1d", "gravegain2d", "gravegain3d"].includes(game.slug) && (
          <Suspense fallback={<p className="mt-4 text-sm text-white/60">Loading party…</p>}>
            <GraveGainParty slug={game.slug} />
          </Suspense>
        )}
        <CachedPlayPanels slug={slug} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/games/${game.slug}`}
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            ← Back to {game.title} details
          </Link>
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            Browse all games
          </Link>
          <Link
            href="/my/usage/"
            className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
          >
            My usage
          </Link>
        </div>
        <Suspense fallback={<p className="mt-4 text-sm text-white/60">Loading autoplay…</p>}>
          <VcwAutoplay gameSlug={game.slug} gameTitle={game.title} />
        </Suspense>
        <Suspense fallback={<p className="mt-4 text-sm text-white/60">Loading gaming buddy…</p>}>
          <GamingBuddy gameSlug={game.slug} gameTitle={game.title} />
        </Suspense>
      </div>
    </div>
  );
}

// Static game-info shell (breadcrumb, title, badges, guide link): catalog
// copy only, cached hourly per game. The player/runtime islands above stay
// dynamic (client, uncached) inside <Suspense> so this shell streams first.
async function CachedPlayHeader({ slug }: { slug: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const detail = await getCachedGameDetail(slug);
  if (!detail) return null;
  const game = detail.game;
  const guide = detail.guide;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-5">
      <nav aria-label="Game breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/games" className="font-semibold text-cyan-300 hover:underline">
          ← All games
        </Link>
        <span aria-hidden="true" className="text-white/30">
          /
        </span>
        <Link href={`/games/${game.slug}`} className="font-semibold text-white hover:underline">
          {game.title}
        </Link>
        <span className="ml-auto hidden text-xs text-white/60 sm:inline">
          Touch-ready runtime · rotate for the best view
        </span>
      </nav>
      <h1 className="mt-3 text-2xl font-black sm:text-3xl">
        {game.emoji} Play {game.title}
      </h1>
      <div className="mt-2 flex flex-col gap-2">
        <div>
          <RatingBadge rating={game.rating ?? "kids"} />
        </div>
        <PlayRateBadge slug={game.slug} />
        <GameAiBadge slug={game.slug} />
        {guide && (
          <a href={guide} className="mt-1 text-sm font-semibold text-cyan-300 hover:underline">
            📖 Read the {game.title} guide
          </a>
        )}
        {/* Plain anchor (no searchParams read) so this shell stays fully
            static. Jumps to the frame shell below, whose own controls carry
            the Fullscreen button (F key works there too). */}
        <a
          href="#game-frame"
          className="mt-1 text-sm font-semibold text-cyan-300 hover:underline"
          title="Jump to the game frame — use its Fullscreen button or press F"
        >
          ⛶ Fullscreen (F)
        </a>
        <FullscreenHint />
      </div>
    </div>
  );
}

// Static panels below the player (a11y summary + playbook): same cache.
async function CachedPlayPanels({ slug }: { slug: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const detail = await getCachedGameDetail(slug);
  if (!detail) return null;
  return (
    <>
      <GameA11yPanel slug={detail.game.slug} />
      <GamePlaybookPanel slug={detail.game.slug} compact />
    </>
  );
}
