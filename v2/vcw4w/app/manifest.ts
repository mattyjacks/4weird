import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "4weird Games", short_name: "4weird", description: "Future Forward Fun", start_url: "/", display: "standalone", background_color: "#020617", theme_color: "#67e8f9", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] }; }
