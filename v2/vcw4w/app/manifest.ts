import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "4weird Games — Cloud Compute That Funds AI-Built Games",
    short_name: "4weird",
    description:
      "Rent metered cloud compute, AI agents, and team workspaces with Vibe Coins (100 🪙 = $1.00, 25% cut included) — funding 34 AI-built browser games that teach AI by playing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#8b5cf6",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    categories: ["games", "entertainment", "education", "utilities"],
    icons: [
      { src: "/vcw/vcw-logo.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
