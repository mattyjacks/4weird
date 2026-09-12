import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VcwOverview } from "@/components/vcw/sections/vcw-overview";
import { VcwHub } from "@/components/vcw/sections/vcw-hub";
import { VcwRun } from "@/components/vcw/sections/vcw-run";
import { VcwFull } from "@/components/vcw/sections/vcw-full";
import { VcwPhone } from "@/components/vcw/sections/vcw-phone";
import { VcwDocs } from "@/components/vcw/sections/vcw-docs";
import { VcwDemo } from "@/components/vcw/sections/vcw-demo";
import { ServiceStatus } from "@/components/vcw/service-status";

const sections: Record<string, { title: string; intro: string }> = {
  overview: {
    title: "VibeCodeWorker overview",
    intro: "Autonomous, evidence-driven QA for the things you build.",
  },
  hub: {
    title: "VibeCodeWorker playtest hub",
    intro: "Open runs, record evidence, and file findings — powered by /api/vcw/*.",
  },
  run: {
    title: "Cloud Run",
    intro: "Rent a cloud GPU remote on RunPod. Billed per second; stop it when done.",
  },
  full: {
    title: "VibeCodeWorker full web version",
    intro: "Browse the complete workspace source, straight from this site.",
  },
  phone: {
    title: "VibeCodeWorker Remote",
    intro: "A compact remote-control surface for approved runs.",
  },
  docs: {
    title: "VibeCodeWorker Manual",
    intro: "Operational guidance for evidence-driven playtesting and debugging.",
  },
  demo: {
    title: "VibeCodeWorker Demo",
    intro: "A safe, non-operational preview of the worker workflow.",
  },
};

const order = ["overview", "hub", "run", "full", "phone", "docs", "demo"];

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

// Closed section list: unknown sections 404 with a real 404 status.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const content = sections[section];
  if (!content) return {};
  return {
    title: `${content.title} | VibeCodeWorker`,
    description: content.intro,
    alternates: { canonical: `/vibecodeworker/${section}` },
    openGraph: {
      title: `${content.title} | VibeCodeWorker`,
      description: content.intro,
    },
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = sections[section];
  if (!content) notFound();
  return (
    <div className="bg-slate-950 text-white">
      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <p className="text-xs font-bold tracking-widest text-cyan-300">4WEIRD / VIBECODEWORKER</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{content.intro}</p>
        <nav aria-label="VibeCodeWorker sections" className="mt-4 flex flex-wrap gap-1.5">
          {order
            .filter((s) => s !== section)
            .map((s) => (
              <Link
                key={s}
                href={`/vibecodeworker/${s}`}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {sections[s].title}
              </Link>
            ))}
        </nav>
        {(section === "hub" || section === "run") && (
          <div className="mt-4">
            <ServiceStatus />
          </div>
        )}
        <div className="mt-6">
          {section === "overview" && <VcwOverview />}
          {section === "hub" && <VcwHub />}
          {section === "run" && <VcwRun />}
          {section === "full" && <VcwFull />}
          {section === "phone" && <VcwPhone />}
          {section === "docs" && <VcwDocs />}
          {section === "demo" && <VcwDemo />}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Native page — every section above is rendered by this site, not framed. The preserved legacy
          surfaces remain available as a static archive under /vibecodeworker-legacy/.
        </p>
      </article>
    </div>
  );
}
