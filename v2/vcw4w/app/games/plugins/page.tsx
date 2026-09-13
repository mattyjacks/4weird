import type { Metadata } from "next";
import { Suspense } from "react";
import { PluginsBrowser } from "./plugins-browser";

export const metadata: Metadata = {
  title: "Game Plugins — Sandboxed Mod Loader | 4weird",
  description:
    "Browse community game mod manifests, enable them per game, and run them sandboxed. Verified-only gate on by default; bad manifests fail open and never brick the page.",
  alternates: { canonical: "/games/plugins" },
};

export default function PluginsPage() {
  // Fully client-rendered browser (localStorage-backed, no server data):
  // nothing static to cache, so the shell streams the fallback instantly.
  // No 'use cache' here (and never inside the 'use client' browser).
  return (
    <div className="bg-[#070912] text-white">
      <Suspense fallback={<p className="p-10 text-center text-sm text-slate-400">Loading game plugins…</p>}>
        <PluginsBrowser />
      </Suspense>
    </div>
  );
}
