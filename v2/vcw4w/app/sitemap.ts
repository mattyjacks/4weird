import type { MetadataRoute } from "next";
import { games } from "@/content/games";
export default function sitemap(): MetadataRoute.Sitemap { const host = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""); const pages = ["", "/games", "/academy", "/accessibility", "/pricing", "/privacy", "/spaceships", "/tech", "/vibecodeworker", "/web-apps"]; return [...pages.map((path) => ({ url: `${host}${path}`, lastModified: new Date() })), ...games.map((game) => ({ url: `${host}/games/${game.slug}`, lastModified: new Date() }))]; }
