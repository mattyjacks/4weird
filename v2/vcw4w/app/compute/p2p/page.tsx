import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { P2pBenchmark } from "@/components/compute/p2p-benchmark";

export const metadata: Metadata = {
  alternates: { canonical: "/compute/p2p" },
  title: "DonatePersonalSeconds | Rent Tech | 4weird Games",
  description:
    "Check what your device can do: a free in-browser speed test that measures your CPU with a real math benchmark and detects WebGPU. Nothing is uploaded or shared.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Share compute · P2P"
      title="DonatePersonalSeconds: P2P WebGPU compute sharing"
      blurb="Run a quick, private capability check on your own device. This page only measures local speed — it does not share your compute or upload anything."
    >
      <Suspense
        fallback={
          <p
            role="status"
            className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
          >
            Loading P2P benchmark…
          </p>
        }
      >
        <P2pBenchmark />
      </Suspense>
    </ToolShell>
  );
}
