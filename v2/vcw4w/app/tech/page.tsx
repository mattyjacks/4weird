import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "Technology - How 4weird Works",
  description:
    "How 4weird Games works: Next.js platform, preserved original game runtimes, Supabase identity, RunPod cloud compute, and automated parity checks that protect every legacy experience.",
  keywords: ["Next.js game platform", "RunPod cloud gaming", "browser game runtime", "game preservation"],
  alternates: { canonical: "/tech" },
  openGraph: {
    title: "4weird Technology - How 4weird Works",
    description:
      "Next.js platform, preserved game runtimes, Supabase identity, RunPod cloud, and automated parity checks.",
  },
};
// Fully static marketing grid: no cookies/headers/searchParams ('days').
async function CachedTechGrid() {
  'use cache';
  cacheLife('days');
  return <div className="space-y-2.5"><svg viewBox="0 0 560 96" role="img" aria-label="Platform topology: Next.js Edge to Supabase Auth and DB to RunPod GPU workers to Cloudflare CDN" className="w-full rounded-2xl border border-white/10 bg-white/[.04] p-3"><title>Next.js Edge → Supabase Auth/DB → RunPod GPU Workers → Cloudflare CDN</title><g fontSize="11" fontWeight="700" textAnchor="middle"><rect x="8" y="28" width="120" height="40" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.25" /><text x="68" y="45" fill="currentColor">Next.js Edge</text><text x="68" y="59" fill="currentColor" opacity="0.6" fontSize="9">App Router</text><rect x="150" y="28" width="120" height="40" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.25" /><text x="210" y="45" fill="currentColor">Supabase</text><text x="210" y="59" fill="currentColor" opacity="0.6" fontSize="9">Auth / DB</text><rect x="292" y="28" width="120" height="40" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.25" /><text x="352" y="45" fill="currentColor">RunPod GPU</text><text x="352" y="59" fill="currentColor" opacity="0.6" fontSize="9">Workers</text><rect x="434" y="28" width="118" height="40" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.25" /><text x="493" y="45" fill="currentColor">Cloudflare</text><text x="493" y="59" fill="currentColor" opacity="0.6" fontSize="9">CDN</text></g><g stroke="currentColor" strokeOpacity="0.4"><line x1="128" y1="48" x2="150" y2="48" /><line x1="270" y1="48" x2="292" y2="48" /><line x1="412" y1="48" x2="434" y2="48" /></g></svg><div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5"><h2 className="text-base font-bold">Next.js platform</h2><p className="mt-1.5 text-sm">Routing, metadata, account boundaries, APIs, and the site shell live in the v2 App Router.</p></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5"><h2 className="text-base font-bold">Original game runtimes</h2><p className="mt-1.5 text-sm">Games remain static HTML, CSS, JavaScript, workers, audio, and assets inside isolated runtime frames.</p><Link href="/games" className="mt-2 inline-block text-cyan-300">Browse games →</Link></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5"><h2 className="text-base font-bold">Service boundaries</h2><p className="mt-1.5 text-sm">Supabase handles identity and persistence; Shopify handles purchases; VibeCodeWorker is an optional protected service.</p><Link href="/web-apps" className="mt-2 inline-block text-cyan-300">View worker status →</Link></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5"><h2 className="text-base font-bold">Preservation first</h2><p className="mt-1.5 text-sm">Automated parity checks prevent the migration from silently changing legacy experiences.</p><Link href="/vibecodeworker/docs" className="mt-2 inline-block text-cyan-300">Read documentation →</Link></article></div></div>;
}
export default function Page(){return <MarketingPage title="4weird Technology" intro="Next-generation experiments, autonomous game development, and playful tools for making the impossible feel buildable."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}><CachedTechGrid /></Suspense></MarketingPage>}
