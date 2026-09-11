import type { Metadata } from "next";
import Link from "next/link";
import { HOUSE_ADS } from "@/lib/ads";
import { AdsPlayground } from "./ads-playground";

export const metadata: Metadata = {
  title: "Ads - Wow, Look at All Those Ads… | 4weird Games",
  description:
    "The 4weird ad wall: every house fallback ad in one glorious place, plus room for future on-site ads. 100% skippable, 0 trackers, maximum weird.",
  keywords: ["4weird ads", "house ads", "sponsor wall"],
  alternates: { canonical: "/ads" },
  openGraph: {
    title: "Ads - Wow, Look at All Those Ads… | 4weird Games",
    description:
      "Every 4weird house ad on one glorious wall. Come for the coins pitch, stay for the merch.",
  },
};

const TICKER = ["🪙", "🎧", "👾", "🤖", "🚀", "🧠", "⚡", "🏆", "🎩", "🛍️"];

export default function AdsPage() {
  return (
    <div className="bg-slate-950 text-white">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300 sm:text-sm">
          📢 The ad page · yes, really
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Wow, look at all those ads<span className="text-yellow-300">…</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          You asked for ads. We brought <em>ALL</em> the ads. This is the sacred wall where every
          4weird house fallback ad lives; the same creatives guests see between plays, gathered in
          one place for your gawking pleasure. Stare as long as you like. They love the attention.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Site stats">
          {[
            `📦 ${HOUSE_ADS.length} house ads`,
            "⏭️ 100% skippable",
            "🕵️ 0 trackers",
            "🪙 Signed-in players pay coins, never watch",
          ].map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-white/15 bg-white/[.04] px-4 py-1.5 text-xs font-bold text-slate-200"
            >
              {pill}
            </span>
          ))}
        </div>

        {/* Ticker */}
        <div
          aria-hidden="true"
          className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[.02] py-3"
        >
          <p className="whitespace-nowrap text-center text-2xl tracking-[0.5em]">
            {TICKER.join(" · ")} · {TICKER.join(" · ")}
          </p>
        </div>
      </section>

      {/* The full collection */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5" aria-label="All house ads">
        <h2 className="text-2xl font-black sm:text-3xl">
          The full collection <span className="text-slate-500">({HOUSE_ADS.length}/{HOUSE_ADS.length} ads and counting)</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every fallback creative from <code className="text-cyan-300">lib/ads.ts</code>, live and
          unskippable-proof. Hit shuffle. Hit skip-all. The ads will survive. They always survive.
        </p>
        <div className="mt-6">
          <AdsPlayground />
        </div>
      </section>

      {/* On-site ads: future home */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-5" aria-label="On-site ads, coming soon">
        <h2 className="text-2xl font-black sm:text-3xl">
          On-site ads <span className="text-yellow-300">(coming soon… probably… eventually…)</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          This velvet-roped VIP section is reserved for a whole bunch of future on-site ads; clan
          shout-outs, game launches, community chaos. Today it is beautifully, hilariously empty.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { emoji: "👾", title: "Your clan here", blurb: "Recruit the weird. Game nights, forums, glory.", href: "/clans", cta: "Browse clans" },
            { emoji: "🚀", title: "Your game launch here", blurb: "Launching something strange? Fund it with gifts.", href: "/fundraisers", cta: "Start a fundraiser" },
            { emoji: "💛", title: "Your creator shout-out here", blurb: "Tip verified creators. Get thanked forever.", href: "/support", cta: "Support creators" },
          ].map((slot) => (
            <article
              key={slot.title}
              className="rounded-3xl border-2 border-dashed border-white/15 bg-white/[.02] p-6 text-center"
            >
              <p aria-hidden="true" className="text-5xl opacity-40">
                {slot.emoji}
              </p>
              <h3 className="mt-3 text-lg font-black text-slate-300">{slot.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{slot.blurb}</p>
              <Link
                href={slot.href}
                className="mt-4 inline-block rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              >
                {slot.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5" aria-label="Ad questions">
        <h2 className="text-2xl font-black sm:text-3xl">Questions nobody asked</h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              q: "Why does this page exist?",
              a: "Because someone said “make a page called /ads/” and honestly? Respect. Also: transparency; every fallback creative, out in the open, no dark patterns.",
            },
            {
              q: "Do signed-in players see ads?",
              a: "Nope; signed-in players pay coins instead of watching ads. Guests get quota + skippable house ads. This page is the one place everyone can gawk at them on purpose.",
            },
            {
              q: "Do these ads track me?",
              a: "The house ads are just links and emoji; no trackers, no fingerprinting. The optional provider slot (when configured) loads in a sandboxed iframe and still falls back here on error, timeout, or adblock.",
            },
            {
              q: "Can I advertise my weird thing here?",
              a: "Not yet; the on-site slots above are placeholders. Until then, the honest paths are clans, fundraisers, and creator support. This page will be first to know.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <dt className="font-black text-yellow-200">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-300">{item.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/games"
            className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Enough ads; play games →
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Or skip ads forever with coins
          </Link>
        </div>
      </section>
    </div>
  );
}
