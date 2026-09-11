import { notFound } from "next/navigation";
import { VcwSectionView } from "@/components/vcw/vcw-section-view";

const sections = new Map([
  [
    "overview",
    [
      "VibeCodeWorker overview",
      "Autonomous, evidence-driven QA for the things you build.",
      "/vibecodeworker-legacy/overview.html",
    ],
  ],
  [
    "hub",
    [
      "VibeCodeWorker playtest hub",
      "A workspace for projects, runs, telemetry, and findings.",
      "/vibecodeworker-legacy/hub.html",
    ],
  ],
  [
    "run",
    [
      "Cloud Run",
      "Rent a cloud GPU with your own RunPod key. Key stays in this tab only.",
      "/vibecodeworker-legacy/run.html",
    ],
  ],
  [
    "full",
    [
      "VibeCodeWorker full web version",
      "Browse the complete workspace source, straight from this site.",
      "/vibecodeworker-legacy/full.html",
    ],
  ],
  [
    "phone",
    [
      "VibeCodeWorker Remote",
      "A compact remote-control surface for approved local-first runs.",
      "/vibecodeworker-legacy/phone.html",
    ],
  ],
  [
    "docs",
    [
      "VibeCodeWorker Manual",
      "Operational guidance for evidence-driven playtesting and debugging.",
      "/vibecodeworker-legacy/docs/index.html",
    ],
  ],
  [
    "demo",
    [
      "VibeCodeWorker Demo",
      "A safe, non-operational preview of the worker workflow.",
      "/vibecodeworker-legacy/demo/index.html",
    ],
  ],
]);

export function generateStaticParams() {
  return [...sections.keys()].map((section) => ({ section }));
}

// Closed section list: unknown sections 404 with a real 404 status.
export const dynamicParams = false;

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = sections.get(section);
  if (!content) notFound();
  const [title, intro, frameSrc] = content;
  return (
    <VcwSectionView
      title={title}
      intro={intro}
      frameSrc={frameSrc}
      frameTitle={title}
    />
  );
}
