import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "4weird Games",
    short_name: "4weird",
    description: "Future Forward Fun. AI-powered game development studio.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#8b5cf6",
    orientation: "any",
    icons: [{ src: "/vcw/vcw-logo.png", sizes: "any", type: "image/png", purpose: "any" }],
  };
}
