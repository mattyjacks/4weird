import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "VibeCodeWorker - Evidence-Driven Game QA",
  description:
    "VibeCodeWorker is evidence-driven QA for the things you build: run, observe, debug, and improve web experiences with playtest hubs, cloud GPU runs, autoplay, and a full manual. Local-first agentic workflow.",
  keywords: [
    "game QA automation",
    "automated playtesting",
    "VibeCodeWorker",
    "software testing agent",
    "game debugging tool",
    "cloud GPU testing",
  ],
  alternates: { canonical: "/vibecodeworker" },
  openGraph: {
    title: "VibeCodeWorker - Evidence-Driven Game QA",
    description:
      "Run, observe, debug, and improve web experiences: playtest hubs, cloud GPU runs, autoplay, and a full manual.",
  },
};

const sections = [
  { slug: "overview", label: "Overview", blurb: "What VibeCodeWorker does and how the loop works." },
  { slug: "hub", label: "Workspace", blurb: "Load a target, run a playtest, review evidence." },
  { slug: "run", label: "Cloud Run", blurb: "Rent a cloud GPU with your own RunPod key (BYOK)." },
  { slug: "full", label: "Full Web", blurb: "Browse the complete workspace source in the browser." },
  { slug: "phone", label: "Remote", blurb: "Control a worker from your phone with a control token." },
  { slug: "docs", label: "Manual", blurb: "Operational guidance for playtesting and debugging." },
  { slug: "demo", label: "Demo", blurb: "A safe, non-operational interface preview." },
];

export default function Page() {
  return (
    <MarketingPage
      title="VibeCodeWorker"
      intro="Evidence-driven QA for the things you build. Run, observe, debug, and improve web experiences through a local-first agentic workflow."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.slug}
            href={`/vibecodeworker/${section.slug}`}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-cyan-300/40"
          >
            <p className="font-bold text-white">{section.label}</p>
            <p className="mt-1 text-sm text-slate-400">{section.blurb}</p>
            <p className="mt-3 text-sm font-semibold text-cyan-300">
              Open {section.label} →
            </p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Desktop builds and agent API docs live at{" "}
        <Link className="text-cyan-300" href="/vcw/desktop/">
          /vcw/desktop/
        </Link>{" "}
        and{" "}
        <Link className="text-cyan-300" href="/vcw/agent/">
          /vcw/agent/
        </Link>
        .
      </p>
    </MarketingPage>
  );
}
