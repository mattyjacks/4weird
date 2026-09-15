import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/tools/tool-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/compute" },
  title: "Share Compute | Rent Tech | 4weird Games",
  description:
    "Donate idle device compute or benchmark what your device can do: the DonatePersonalSeconds donor console and the private P2P WebGPU benchmark. Nothing uploads or shares unless you opt in.",
};

/**
 * /compute index (DS-PAGEFIX-04).
 *
 * Fail-open hub: no backend, no client state — two honest cards pointing at
 * the real sub-routes. If either sub-route is ever removed, this page still
 * renders and says so instead of 500ing.
 */
export default function Page() {
  return (
    <ToolShell
      kicker="Share compute"
      title="Compute, shared honestly"
      blurb="Two local-first tools: donate idle device compute for Vibe Coins, or privately benchmark what your device can do. Both run in your browser; nothing is shared or uploaded unless you opt in."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">
            Donate · earn coins
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Donate Personal Seconds
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Share idle CPU/GPU from this device and earn Vibe Coins (100 coins
            = $1.00 USD). Share controls are local-only; earnings are a
            placeholder until the ledger wires up — the page says so instead
            of inventing a balance.
          </p>
          <Link
            href="/compute/dps"
            className="mt-3 inline-block rounded-full bg-cyan-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-cyan-500"
          >
            Open the donor console →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">
            Measure · private
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            P2P capability benchmark
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            A free in-browser speed test: real math benchmark plus WebGPU
            detection. Measures only — it never shares your compute or uploads
            anything.
          </p>
          <Link
            href="/compute/p2p"
            className="mt-3 inline-block rounded-full border border-white/15 px-4 py-1.5 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            Run the benchmark →
          </Link>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Need rented hardware instead?{" "}
        <Link href="/desktop" className="font-bold text-cyan-300 hover:underline">
          Rent a desktop
        </Link>{" "}
        · manage yours at{" "}
        <Link href="/runpods" className="font-bold text-cyan-300 hover:underline">
          My RunPods
        </Link>
        .
      </p>
    </ToolShell>
  );
}
