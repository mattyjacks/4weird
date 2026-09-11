import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Crawler policy: humans + search engines + AI engines are all welcome on
 * public content; gated, ephemeral, and legacy-mirror paths are closed.
 *
 * GEO/AIEO: AI answer engines (GPTBot, ClaudeBot, PerplexityBot, …) are
 * explicitly allowed on the same public paths as search crawlers, because
 * citations in AI answers are a first-class discovery channel for us.
 * Training-data use is a separate question from crawl access; this file
 * governs access, not licensing (see /terms and /privacy).
 */

// Login-gated, API, or duplicate-mirror paths; never crawlable.
const DISALLOW = [
  "/account",
  "/account.html",
  "/api/",
  "/auth/",
  "/protected",
  "/v1-legacy/",
  "/vibecodeworker-legacy/",
  "/games/html/",
  "/ai/",
  "/temp/",
];

// AI answer/research crawlers we explicitly welcome on public content.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Grok",
  "Meta-WebIndexer",
  "Amazonbot",
  "Applebot",
  "DuckAssistBot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
