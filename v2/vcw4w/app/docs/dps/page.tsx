import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/dps" },
  title: "DonatePersonalSeconds (DPS) — Donate Compute, Earn Coins",
  description:
    "Share idle CPU, RAM, and WebGPU through DonatePersonalSeconds: donor setup, share sliders, 100-coins-=$1 earnings, and requesting compute jobs.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function DpsOverviewPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · donatepersonalseconds"
        title={<>Your idle PC is <span className={theme.title}>someone&apos;s render farm.</span></>}
        lede={<>DonatePersonalSeconds (DPS) lets you share spare CPU, RAM, and WebGPU with the 4weird P2P mesh — running background tasks like game QA runs, terrain generation, and sprite compression — and earn Vibe Coins at the fixed parity of 100 🪙 = exactly $1.00.</>}
        stats={[
          ["100 🪙", "= $1.00 exactly"],
          ["CPU·RAM·GPU", "share sliders"],
          ["WebGPU", "+ WASM workers"],
          ["75 / 25", "provider / platform"],
        ]}
        glyph="⚡"
        theme={theme}
        crumb="DPS"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[44, 62, 38, 70, 52, 76, 58].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-cyan-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Two sides"
        title="Donate, or request"
        body="DPS has two roles. Donors share spare hardware from their browser and earn coins. Job requesters post background tasks to the mesh and pay coins. Pick your guide below."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/docs/dps/donor-guide" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-emerald-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Donor guide →</p>
          <p className="mt-1 text-lg font-black"><span aria-hidden="true" className="mr-2">🖥️</span>Donate compute &amp; earn</p>
          <p className="text-sm text-muted-foreground">Hardware detection, share sliders, thermal and battery guards, earnings math.</p>
        </Link>
        <Link href="/docs/dps/job-requester" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-cyan-500/50">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Requester guide →</p>
          <p className="mt-1 text-lg font-black"><span aria-hidden="true" className="mr-2">📦</span>Request a compute job</p>
          <p className="text-sm text-muted-foreground">Task types, pricing quotes in coins, proof-of-computation verification.</p>
        </Link>
      </div>

      <SectionHead
        index="2"
        kicker="How it works"
        title="Browser to mesh in four steps"
        body="Donor browsers run sandboxed WebGPU compute shaders or WebAssembly workers, matched to jobs over a WebRTC P2P mesh through the signaling server at /api/dps/signal. Coins credit to the donor wallet on completion."
      />
      <Steps
        items={[
          ["Detect hardware", <>Your browser reports CPU cores, RAM, GPU renderer, WebGPU support, and network speed — nothing leaves the device except capability labels.</>],
          ["Set share sliders", <>Cap CPU, RAM, and GPU usage (e.g. CPU 80%, RAM 50%, GPU 90%) so donating never hogs your machine.</>],
          ["Get matched & compute", <>The signaling server pairs you with a job; sandboxed workers run chunks and checkpoint deterministic hashes.</>],
          ["Earn coins", <>Verified results credit Vibe Coins to your wallet at 100 🪙 = $1.00, split 75% provider / 25% platform.</>],
        ]}
      />

      <Callout tone="gold" title="One rate, everywhere">
        100 🪙 = exactly $1.00 USD — one coin is one cent. DPS earnings, job quotes, and invoice totals all use this parity. Never a second exchange rate.
      </Callout>

      <SectionHead
        index="3"
        kicker="The split"
        title="75% provider, 25% platform"
        body="Every paid DPS job splits automatically at payout. The gross coin price is all the requester pays; the split is carved out of it, never added on top."
      />
      <SplitBar leftLabel="75% donor credits" rightLabel="25% platform" />

      <Pager current="/docs/dps" />
    </article>
  );
}
