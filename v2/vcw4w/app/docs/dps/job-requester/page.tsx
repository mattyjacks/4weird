import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/dps/job-requester" },
  title: "DPS Job-Requester Guide — Task Types & Pricing Quotes",
  description:
    "Request DonatePersonalSeconds compute: supported task types (game QA, terrain gen, sprite compression), coin pricing quotes, and proof-of-computation verification.",
};

const theme = {
  bg: "bg-gradient-to-br from-cyan-950 via-slate-950 to-emerald-950",
  border: "border-cyan-300/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent",
};

export default function DpsJobRequesterPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · dps requester"
        title={<>Post a job. <span className={theme.title}>The mesh computes.</span></>}
        lede={<>Need background compute without renting a GPU? Post a DonatePersonalSeconds job — game QA runs, procedural terrain, sprite compression — get an upfront coin quote, and pay only for verified results at 100 🪙 = exactly $1.00.</>}
        stats={[
          ["3", "task lanes"],
          ["100 🪙", "= $1.00 exactly"],
          ["Upfront", "coin quotes"],
          ["Verified", "or unpaid"],
        ]}
        glyph="📦"
        theme={theme}
        crumb="Job requester"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[40, 58, 48, 66, 42, 60, 54].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-cyan-200/50 bg-gradient-to-t from-sky-500 to-cyan-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Task types"
        title="What you can post to the mesh"
        body="DPS jobs are chunkable, deterministic background tasks — work that splits into verifiable pieces with hash checkpoints. Three lanes are supported today."
      />
      <MockWindow title="job board — task lanes" badge="3 lanes">
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2"><p className="font-black text-cyan-300">🎮 VibeCodeWorker game QA runs</p><p className="mt-1 text-slate-400">Automated playthroughs capturing screenshots and state data; bugs returned with repro chunks.</p></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><p className="font-black text-cyan-300">🏔️ Procedural terrain generation</p><p className="mt-1 text-slate-400">Seeded heightmap and biome tiles; each tile verified against its deterministic hash.</p></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><p className="font-black text-cyan-300">🗜️ Sprite compression</p><p className="mt-1 text-slate-400">Batch atlas packing and format conversion; byte-exact output checked per chunk.</p></div>
        </div>
      </MockWindow>
      <Callout tone="rose" title="Keep it chunkable">
        Jobs must split into independent chunks with deterministic checkpoints. Interactive sessions, long-lived servers, and tasks needing secrets or private data do not belong on the donor mesh — rent cloud compute instead.
      </Callout>

      <SectionHead
        index="2"
        kicker="Pricing quotes"
        title="One quote, in coins, upfront"
        body="Every job gets a coin quote before it runs, priced from chunk count and lane rate through the fixed parity of 100 🪙 = $1.00. The gross quote is all you pay — the 75/25 provider/platform split is carved out of it, never added on top."
      />
      <MockWindow title="new job — upfront quote" badge="locked quote">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>QA run · 60 chunks × 20 🪙</span><span className="font-black text-cyan-300">1,200 🪙 = $12.00</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Terrain · 25 tiles × 20 🪙</span><span className="font-black text-cyan-300">500 🪙 = $5.00</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2"><span className="font-bold text-cyan-200">Escrow on post</span><span className="font-black text-cyan-200">gross only, no fees added</span></div>
        </div>
      </MockWindow>
      <Callout tone="gold" title="Pay for verified work only">
        Coins escrow when you post and release per verified chunk. Chunks that fail hash verification or redundant-node checks are re-run on a different donor — you never pay for spoofed compute.
      </Callout>

      <SectionHead
        index="3"
        kicker="Posting flow"
        title="From spec to results in five steps"
      />
      <Steps
        items={[
          ["Describe the job", <>Pick a lane, upload inputs, and set chunk parameters (duration, capture mode, seed, formats).</>],
          ["Accept the coin quote", <>Review the upfront gross quote in coins and dollars; escrow locks it — the price cannot drift mid-run.</>],
          ["Mesh matching", <>The signaling server (/api/dps/signal) pairs chunks with available donor nodes by capability labels.</>],
          ["Proof-of-computation", <>Each chunk returns with its deterministic hash checkpoint; a redundant node re-checks before payout releases.</>],
          ["Collect results", <>Download verified outputs; escrow releases per chunk and the 75/25 split settles automatically.</>],
        ]}
      />

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Price a sprite batch before you post"
        body="A concrete quote walkthrough so the escrow number never surprises you. All figures use the flat 100 coins to $1.00 parity."
      />
      <MockWindow title="quote worksheet — sprite atlas batch" badge="requester math">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>240 sprites ÷ 12 per chunk</span><span className="font-black text-cyan-300">20 chunks</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>20 chunks × 15 coins lane rate</span><span className="font-black text-cyan-300">300 coins = $3.00</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2"><span className="font-bold text-cyan-200">Escrow locks</span><span className="font-black text-cyan-200">300 coins gross, split inside</span></div>
        </div>
      </MockWindow>
      <Callout tone="cyan" title="Read the split correctly.">
        The 300 coin escrow above already contains the 75/25 provider and platform split. Donors share 225 coins of credits, the platform keeps 75, and you pay nothing beyond the quoted gross. Spending rules for those credits live in <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.
      </Callout>

      <SectionHead
        index="5"
        kicker="When things wobble"
        title="Slow matches, failed chunks, wrong lane"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🐌 <strong className="text-foreground">Chunks match slowly:</strong> narrow capability needs (WebGPU shaders at peak hours) queue longer. Split the job into more chunks, widen the acceptable window, or post outside peak donor hours.</li>
        <li className="rounded-xl border border-border bg-card p-3">❌ <strong className="text-foreground">Chunks keep failing verification:</strong> nondeterministic inputs are the usual cause. Pin seeds, freeze formats, and remove timestamps from outputs, then repost. Failed chunks re-run on another donor without extra charge.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚫 <strong className="text-foreground">Job rejected as not chunkable:</strong> interactive sessions, long lived servers, and secret bearing tasks do not belong on the mesh. Rent hosted desktops or agents in <Link className="underline" href="/docs/agents-compute">Agents and cloud</Link> instead.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧾 <strong className="text-foreground">Quote higher than expected:</strong> chunk count times lane rate is the whole formula, so shrink scope first. A 30 second QA sample before a full suite callibrates cost without commitment.</li>
      </ul>

      <Pager current="/docs/dps/job-requester" />
    </article>
  );
}
