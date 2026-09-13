import type { Metadata } from "next";
import { PluginsBrowser } from "./plugins-browser";

export const metadata: Metadata = {
  title: "Game Plugins — Sandboxed Mod Loader | 4weird",
  description:
    "Browse community game mod manifests, enable them per game, and run them sandboxed. Verified-only gate on by default; bad manifests fail open and never brick the page.",
  alternates: { canonical: "/games/plugins" },
};

export default function PluginsPage() {
  return (
    <div className="bg-[#070912] text-white">
      <PluginsBrowser />
    </div>
  );
}
