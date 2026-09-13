import type { Metadata } from "next";
import { Suspense } from "react";
import { ModsBrowser } from "./mods-browser";

export const metadata: Metadata = {
  title: "Community Mods & Themes — 4weird Games",
  description:
    "Browse community mods and custom themes for 4weird browser games. Sandboxed mod manifests with offline fallback.",
  alternates: { canonical: "/games/mods" },
};

export default function ModsPage() {
  // Fully client-rendered browser (localStorage-backed, no server data):
  // nothing static to cache, so the shell streams the fallback instantly.
  // No 'use cache' here (and never inside the 'use client' browser).
  return (
    <Suspense fallback={<p className="bg-[#070912] p-10 text-center text-sm text-slate-400">Loading community mods…</p>}>
      <ModsBrowser />
    </Suspense>
  );
}
