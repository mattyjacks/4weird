import type { Metadata } from "next";
import Link from "next/link";
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

      <SectionHead
        index="5"
        kicker="First session"
        title="Earn your first coins in fifteen minutes"
      />
      <Steps
        items={[
          ["Open the donor client", <>Launch the DPS donor page in a desktop browser with the charger plugged in. Confirm the auto detected CPU, memory, and WebGPU lines match your machine.</>],
          ["Set conservative sliders", <>Start at CPU 50%, RAM 40%, GPU 60% for the first session. You can raise them once you know how warm and loud your machine gets under load.</>],
          ["Run one chunk batch", <>Accept a single small batch, such as a short QA chunk set, and watch the checkpoint hashes land. Leave the tab open until the batch verifies.</>],
          ["Check the wallet", <>Verified chunks credit Vibe Coins at 100 coins to $1.00. Compare the payout row against the wallet example above, then read <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link> for spending options.</>],
        ]}
      />

      <SectionHead
        index="6"
        kicker="Troubleshooting"
        title="No jobs, paused compute, missing payouts"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">📭 <strong className="text-foreground">No jobs matched:</strong> WebGPU devices get matched first, so CPU only machines wait longer. Keep the client open, confirm network speed is stable, and try a busier hour rather than changing sliders.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔋 <strong className="text-foreground">Compute keeps pausing:</strong> unplugged devices pause below 30% battery and throttle on heat. Plug in, close heavy tabs, and lower the GPU share before assuming the mesh is broken.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧱 <strong className="text-foreground">Browser warns about load:</strong> that is the share cap working as designed. Lower CPU share in steps of ten until the machine stays responsive, since in flight chunks checkpoint and migrate instead of failing.</li>
        <li className="rounded-xl border border-border bg-card p-3">🪙 <strong className="text-foreground">Payout smaller than expected:</strong> only verified chunks pay, and failed hash checks are re-run on another donor at no cost to you. Compare verified versus attempted chunk counts first, then check the <Link className="underline" href="/docs/dps">DPS overview</Link> split math.</li>
        <li className="rounded-xl border border-border bg-card p-3">📦 <strong className="text-foreground">Curious about the other side?</strong> Requesters post the jobs you compute, with quotes and verification explained in the <Link className="underline" href="/docs/dps/job-requester">requester guide</Link>. General account help lives in <Link className="underline" href="/docs/faq">FAQ and support</Link>.</li>
      </ul>

      <Pager current="/docs/dps/donor-guide" />
    </article>
  );
}
