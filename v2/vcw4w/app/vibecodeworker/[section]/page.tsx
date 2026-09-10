import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";

const sections = new Map([
  ["overview", ["VibeCodeWorker overview", "Autonomous, evidence-driven QA for the things you build."]],
  ["hub", ["VibeCodeWorker playtest hub", "A workspace for projects, runs, telemetry, and findings."]],
  ["run", ["Cloud Run", "Launch and observe a remote playtest through an authenticated service boundary."]],
  ["full", ["VibeCodeWorker full web version", "The complete browser workspace remains under active migration."]],
  ["phone", ["VibeCodeWorker Remote", "A compact remote-control surface for approved local-first runs."]],
  ["docs", ["VibeCodeWorker Manual", "Operational guidance for evidence-driven playtesting and debugging."]],
  ["demo", ["VibeCodeWorker Demo", "A preserved interactive demonstration of the original worker workflow."]],
]);

export function generateStaticParams() { return [...sections.keys()].map((section) => ({ section })); }
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; const content = sections.get(section); if (!content) notFound(); const legacy = section === "docs" ? "/vibecodeworker-legacy/docs/index.html" : section === "demo" ? "/vibecodeworker-legacy/demo/index.html" : `/vibecodeworker-legacy/${section}.html`; return <MarketingPage title={content[0]} intro={content[1]}><Link className="inline-block rounded-full border border-white/20 px-5 py-2 text-cyan-300" href={legacy}>Open original v1 surface</Link></MarketingPage>; }
