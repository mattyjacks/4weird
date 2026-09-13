import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/dps/donor-guide" },
  title: "DPS Donor Guide — Share Hardware, Earn Vibe Coins",
  description:
    "Become a DonatePersonalSeconds donor: hardware detection (CPU, RAM, WebGPU), share sliders, battery and thermal guards, and earnings at 100 coins = $1.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function DpsDonorGuidePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · dps donor"
        title={<>Donate spare cycles. <span className={theme.title}>Earn real coins.</span></>}
        lede={<>Turn idle CPU, RAM, and WebGPU into Vibe Coins. Your browser runs sandboxed compute chunks for the P2P mesh — game QA runs, terrain generation, sprite compression — while share sliders and battery guards keep your machine yours.</>}
        stats={[
          ["3", "share sliders"],
          ["100 🪙", "= $1.00 exactly"],
          ["0", "DOM / storage access"],
          ["30%", "battery auto-pause"],
        ]}
        glyph="🖥️"
        theme={theme}
        crumb="Donor guide"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[52, 36, 64, 44, 72, 50, 60].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-teal-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Requirements"
        title="What your device needs"
        body="DPS runs entirely in the browser. The donor client detects capabilities on first run: CPU core count, device memory, GPU renderer string, WebGPU availability, and network downlink speed. No install, no driver hunt."
      />
      <MockWindow title="donor client — detected hardware" badge="auto-detected">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>CPU cores</span><span className="font-black text-emerald-300">8</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Device memory</span><span className="font-black text-emerald-300">8 GB</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>GPU renderer</span><span className="font-black text-emerald-300">WebGL / WebGPU adapter</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>WebGPU</span><span className="font-black text-emerald-300">supported</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2"><span className="font-bold text-emerald-200">Network downlink</span><span className="font-black text-emerald-200">~50 Mbps</span></div>
        </div>
      </MockWindow>
      <Callout tone="cyan" title="WebGPU is a bonus, not a gate">
        Devices without WebGPU still donate through WebAssembly workers on CPU. WebGPU simply unlocks the faster compute-shader task lane and higher-value jobs.
      </Callout>

      <SectionHead
        index="2"
        kicker="Share sliders"
        title="Cap what the mesh may use"
        body="Three sliders bound the donor worker: CPU share, RAM share, and GPU share. Defaults of CPU 80%, RAM 50%, GPU 90% keep the machine responsive; lower them any time and in-flight chunks checkpoint and migrate."
      />
      <MockWindow title="donor client — share sliders" badge="live caps">
        <div className="space-y-3 text-xs">
          {[
            ["CPU share", "80%", "w-4/5"],
            ["RAM share", "50%", "w-1/2"],
            ["GPU share", "90%", "w-11/12"],
          ].map(([label, val, bar]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between font-mono"><span>{label}</span><span className="font-black text-emerald-300">{val}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 ${bar}`} /></div>
            </div>
          ))}
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Safety"
        title="Sandboxed, cool, and charged"
        body="Donor workers run untrusted task payloads, so the client treats safety as non-negotiable: sandboxed Web Workers with no DOM, cookie, or storage access; thermal and battery guards; deterministic hash checkpoints on every chunk."
      />
      <Steps
        items={[
          ["Sandbox every payload", <>Never execute raw script strings from the mesh. Tasks run inside a sandboxed worker communicating only through typed postMessage cloning.</>],
          ["Guard battery & heat", <>The client pauses compute when the device drops below 30% battery on unplugged power, and throttles when thermal pressure rises.</>],
          ["Checkpoint with hashes", <>Each chunk carries a deterministic hash checkpoint (e.g. SHA-256 seed check) so spoofed compute claims fail verification.</>],
          ["Verify before payout", <>Results are checked against a lightweight redundant node; only verified work credits coins to your wallet.</>],
        ]}
      />

      <SectionHead
        index="4"
        kicker="Earnings"
        title="100 🪙 = exactly $1.00"
        body="Verified compute credits Vibe Coins to your Supabase wallet at the fixed parity: one coin is one cent, everywhere. Payouts split 75% to you as on-site credits (games, cloud compute, AI services; non-withdrawable) and 25% to the platform for infrastructure."
      />
      <MockWindow title="wallet — recent dps payouts" badge="100 = $1">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>QA run · 42 chunks verified</span><span className="font-black text-emerald-300">+840 🪙 = $8.40</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Terrain gen · 18 chunks verified</span><span className="font-black text-emerald-300">+360 🪙 = $3.60</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2"><span className="font-bold text-emerald-200">Month total</span><span className="font-black text-emerald-200">+4,200 🪙 = $42.00</span></div>
        </div>
      </MockWindow>
      <SplitBar leftLabel="75% donor credits" rightLabel="25% platform" />

      <Pager current="/docs/dps/donor-guide" />
    </article>
  );
}
