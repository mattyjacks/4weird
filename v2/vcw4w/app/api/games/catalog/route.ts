import { NextResponse } from "next/server";
import { games } from "@/content/games";

/**
 * GET /api/games/catalog — public, cacheable game catalog for desktop parity.
 * No session, no Supabase. Desktop fetches this with 24h TTL + bundled fallback.
 */
export function GET() {
  const list = games.map((g) => ({
    slug: g.slug,
    title: g.title,
    description: g.description,
    genre: g.genre,
    tags: g.tags,
    emoji: g.emoji,
    featured: Boolean(g.featured),
    recommended: Boolean(g.recommended),
    runtime_path: g.runtimePath,
    rating: g.rating,
  }));
  return NextResponse.json(
    { success: true, count: list.length, games: list },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
