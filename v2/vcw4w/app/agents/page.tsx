import type { Metadata } from "next";
import Link from "next/link";
import { Marketplace } from "@/components/agents/marketplace";
import { MyCompute } from "@/components/agents/my-compute";

export const metadata: Metadata = {
  alternates: { canonical: "/agents" },
  title: "Rent an Agent | 4weird Games",
  description:
    "Rent an AI agent or a Xonotic game server by the hour. Every price is a gross USD/hr maximum (25% platform cut included) and you are billed per second.",
};

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      
      <section className="mx-auto max-w-5xl px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <h1 className="mt-4 text-4xl font-black">Rent an agent</h1>
        <p className="mt-4 text-slate-300">
          Rent an OpenClaw / NanoClaw / VibeCodeWorker agent — or a Xonotic
          game server where VibeCodeWorker plays for you or you play yourself.
          Pick a listing below to rent it, or list your own compute below to
          earn coins from other players.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Every price is a gross USD-per-hour <strong>maximum</strong> (25%
          platform cut included, never added on top). Metering bills{" "}
          <strong>per second</strong> from the first second, so a partial hour
          never costs the full hour. RunPod listings need no endpoint URL from
          you — booking auto-provisions a server and hands you the RunPod
          default endpoint.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Want a worker to play for you? Every game page has a{" "}
          <strong>VibeCodeWorker autoplay</strong> panel (RunPod CPU/GPU, on-site browser control for 4weird games
          only).{" "}
          <Link href="/xonotic" className="text-cyan-300 hover:underline">
            Xonotic autoplay lives here
          </Link>{" "}
          — GPU boosted + off-site, desktop app required.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Need a full computer instead of an agent?{" "}
          <Link href="/desktop" className="text-cyan-300 hover:underline">
            Rent a virtual desktop →
          </Link>{" "}
          CPU Ubuntu box or GPU Kasm graphical desktop, streamed in your browser per second.
        </p>
        <nav className="mt-8 flex gap-2" aria-label="Agent marketplace tabs">
          <a
            href="#browse"
            className="rounded-t-lg border border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-cyan-300"
          >
            Rent an agent
          </a>
          <a
            href="#my-compute"
            className="rounded-t-lg border border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-cyan-300"
          >
            List your compute
          </a>
        </nav>
        <div className="rounded-b-xl rounded-tr-xl border border-slate-800 p-5">
          <section id="browse" aria-label="Rent an agent">
            <Marketplace />
          </section>
          <hr className="my-10 border-slate-800" />
          <section id="my-compute" aria-label="List your compute">
            <MyCompute />
          </section>
        </div>
      </section>
    </main>
  );
}
