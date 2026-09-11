/**
 * Shared SEO / GEO / AIEO core for 4weird Games.
 *
 * One source of truth for the site URL, brand facts, keyword set, and
 * JSON-LD builders so every page, the sitemap, robots, and llms.txt agree.
 *
 * GEO (generative-engine optimization) and AIEO (AI-engine optimization)
 * notes:
 * - Keep factual claims (prices, counts, splits) identical everywhere so
 *   AI engines that cite us quote one consistent story.
 * - Prefer plain-language definitions ("X is ...") in descriptions: answer
 *   engines extract those verbatim.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://4weird.games"
).replace(/\/$/, "");

export const SITE_NAME = "4weird Games";
export const OPERATOR = "MattyJacks LLC";
export const SITE_LOCALE = "en_US";
export const SITE_LANGUAGE = "en";

/** Canonical facts — repeat verbatim wherever prices are stated. */
export const FACTS = {
  coinPeg: "100 Vibe Coins (🪙) = exactly $1.00",
  platformCut: "25% platform cut, always included in the price — never added on top",
  providerShare: "75% goes to the providers and game makers doing the work",
  trial: "free 100-coin ($1.00) trial for new accounts",
  gameCount: "34 playable browser games",
} as const;

export const DEFAULT_TITLE =
  "4weird Games — Cloud Compute That Funds AI-Built Games";
export const DEFAULT_DESCRIPTION =
  "Rent metered cloud compute, AI agents, and team workspaces with Vibe Coins (100 🪙 = $1.00, 25% cut included) — funding 34 AI-built browser games that teach AI by playing.";

/** Core keyword set shared by the homepage and section hubs. */
export const CORE_KEYWORDS = [
  "browser games",
  "play free online games",
  "AI-built games",
  "cloud gaming",
  "rent GPU cloud",
  "RunPod GPU rental",
  "AI agents for hire",
  "virtual desktop cloud",
  "game QA automation",
  "Vibe Coins",
  "indie game arcade",
  "learn AI by playing",
  "VibeCodeWorker",
  "UnitUnite workspaces",
  "Blender render farm",
  "fal.ai media studio",
] as const;

export function canonical(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/** BreadcrumbList JSON-LD for any page. Items: [label, path] pairs. */
export function breadcrumbJsonLd(items: Array<[string, string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: canonical(path),
    })),
  };
}

/** Organization + WebSite JSON-LD for the root layout. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/vcw/vcw-logo.png`,
        foundingDate: "2026",
        address: {
          "@type": "PostalAddress",
          addressRegion: "New Hampshire",
          addressCountry: "US",
        },
        sameAs: [SITE_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        inLanguage: SITE_LANGUAGE,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/games?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** VideoGame JSON-LD for per-game detail pages. */
export function videoGameJsonLd(game: {
  slug: string;
  title: string;
  description: string;
  genre: string;
  emoji: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url: canonical(`/games/${game.slug}`),
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    gamePlatform: "Web Browser",
    genre: game.genre,
    inLanguage: SITE_LANGUAGE,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: `Free to try; extended play metered in Vibe Coins (${FACTS.coinPeg}, ${FACTS.platformCut}).`,
    },
  };
}

/** FAQPage JSON-LD. Pairs of [question, answer]. */
export function faqJsonLd(faqs: Array<[string, string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
