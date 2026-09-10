import type { MetadataRoute } from "next";
import { games } from "@/content/games";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://4weird.games").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["", "/games", "/academy", "/pricing", "/tech", "/privacy", "/accessibility", "/spaceships", "/web-apps", "/vibecodeworker", "/vibecodeworker/overview", "/vibecodeworker/hub", "/vibecodeworker/run", "/vibecodeworker/full", "/vibecodeworker/phone", "/vibecodeworker/docs", "/vibecodeworker/demo"];
  const entries = fixed.map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" ? "daily" as const : "weekly" as const, priority: path === "" ? 1 : 0.6 }));
  const gameEntries = games.flatMap((game) => [
    { url: `${base}/games/${game.slug}`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/games/${game.slug}/play`, changeFrequency: "weekly" as const, priority: 0.6 },
  ]);
  return [...entries, ...gameEntries];
}
