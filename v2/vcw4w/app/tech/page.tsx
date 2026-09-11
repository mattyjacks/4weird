import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "Technology — How 4weird Works",
  description:
    "How 4weird Games works: Next.js platform, preserved original game runtimes, Supabase identity, RunPod cloud compute, and automated parity checks that protect every legacy experience.",
  keywords: ["Next.js game platform", "RunPod cloud gaming", "browser game runtime", "game preservation"],
  alternates: { canonical: "/tech" },
  openGraph: {
    title: "4weird Technology — How 4weird Works",
    description:
      "Next.js platform, preserved game runtimes, Supabase identity, RunPod cloud, and automated parity checks.",
  },
};
export default function Page(){return <MarketingPage title="4weird Technology" intro="Next-generation experiments, autonomous game development, and playful tools for making the impossible feel buildable."><div className="grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Next.js platform</h2><p className="mt-2">Routing, metadata, account boundaries, APIs, and the site shell live in the v2 App Router.</p></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Original game runtimes</h2><p className="mt-2">Games remain static HTML, CSS, JavaScript, workers, audio, and assets inside isolated runtime frames.</p><Link href="/games" className="mt-3 inline-block text-cyan-300">Browse games →</Link></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Service boundaries</h2><p className="mt-2">Supabase handles identity and persistence; Shopify handles purchases; VibeCodeWorker is an optional protected service.</p><Link href="/web-apps" className="mt-3 inline-block text-cyan-300">View worker status →</Link></article><article className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Preservation first</h2><p className="mt-2">Automated parity checks prevent the migration from silently changing legacy experiences.</p><Link href="/vibecodeworker/docs" className="mt-3 inline-block text-cyan-300">Read documentation →</Link></article></div></MarketingPage>}
