import type { Metadata } from "next";
import Link from "next/link";
import { Marketplace } from "@/components/agents/marketplace";
import { MyCompute } from "@/components/agents/my-compute";

export const metadata: Metadata = {
  title: "Rent AI Agents | 4weird Games",
  description:
    "Rent openclaw / nanoclaw-style AI agents by the hour. Every price is gross and includes the 25% platform cut.",
};

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      
      <section className="mx-auto max-w-5xl px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <h1 className="mt-4 text-4xl font-black">Rent AI Agents</h1>
        <p className="mt-4 text-slate-300">
          Rent openclaw / nanoclaw-style agents hosted on RunPod, DigitalOcean,
          or a custom endpoint. Every price below is gross and includes the 25%
          platform cut — the cut is never added on top.
        </p>
        <nav className="mt-8 flex gap-2" aria-label="Agent marketplace tabs">
          <a
            href="#browse"
            className="rounded-t-lg border border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-cyan-300"
          >
            Browse
          </a>
          <a
            href="#my-compute"
            className="rounded-t-lg border border-b-0 border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-cyan-300"
          >
            My compute
          </a>
        </nav>
        <div className="rounded-b-xl rounded-tr-xl border border-slate-800 p-5">
          <section id="browse" aria-label="Browse agents">
            <Marketplace />
          </section>
          <hr className="my-10 border-slate-800" />
          <section id="my-compute" aria-label="My compute">
            <MyCompute />
          </section>
        </div>
      </section>
    </main>
  );
}
