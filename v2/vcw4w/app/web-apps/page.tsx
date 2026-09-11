import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";
import { ServiceStatus } from "@/components/vcw/service-status";

export const metadata: Metadata = {
  title: "Web Apps — Playtest and Debug What You Build",
  description:
    "Small useful web apps on the 4weird coin economy, plus VibeCodeWorker playtesting that inspects, plays, and improves the things you build. Every app metered, every coin funding the arcade.",
  alternates: { canonical: "/web-apps" },
};
export default function Page(){return <MarketingPage title="Play and debug web apps" intro="VibeCodeWorker helps inspect, playtest, and improve the things you build."><ServiceStatus/><div className="flex flex-wrap gap-4"><Link href="/vibecodeworker/hub" className="rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950">Open playtest hub</Link><Link href="/vibecodeworker/docs" className="rounded-full border border-white/20 px-5 py-2">Read documentation</Link></div></MarketingPage>}
