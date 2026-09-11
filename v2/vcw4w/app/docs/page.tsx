import type { Metadata } from "next";
import Link from "next/link";
import { DOCS_DATA } from "@/components/docs/docs-data";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, SplitBar } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Official 4weird Games documentation: company, accounts, games, Vibe Coins, clans, bots, agents, game AI, VibeCodeWorker, privacy, and support.",
};

const theme = {
  bg: "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950",
  border: "border-white/15",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent",
};

export default function DocsHome() {
  const guides = DOCS_DATA.filter((d) => d.href !== "/docs");
  return (
    <article>
      <DocsHero
        eyebrow="4weird.com/docs/ · 12 guides"
        title={<>The manual for <span className={theme.title}>Future Forward Fun.</span></>}
        lede={<>Everything about the company and how to use the site and software — one coin economy, 34 games, clans, bots, rentable agents, game AI, and QA tooling. Start anywhere; every guide links to the next.</>}
        stats={[
          ["12", "guides, zero fluff"],
          ["34", "games documented"],
          ["100 🪙", "= exactly $1.00"],
          ["25%", "cut, always inside"],
        ]}
        glyph="📚"
        theme={theme}
        crumb="Docs home"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🎮 Play", "👾 Belong", "🤖 Automate", "🪙 Earn"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="✦"
        kicker="Pick your path"
        title="Where do you want to go?"
        body="Four doors into the same arcade. New here? Take door one and read straight through."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["🌱 New here? Read in order", "About → Getting started → Playing games → Vibe Coins. Fifteen minutes and you'll be dangerous.", "/docs/about"],
          ["🎉 Social player? Belong first", "Clans → Bots → Privacy & safety. Find your people, then give your agent a key.", "/docs/clans"],
          ["🔧 Builder? Rent the cloud", "Agents & cloud → Game AI & Buddy → VibeCodeWorker. Metered compute that funds the arcade.", "/docs/agents-compute"],
          ["🛡️ Trust first? Verify us", "Privacy & safety → FAQ & support → Vibe Coins. Rights, moderation, receipts, humans.", "/docs/privacy-safety"],
        ].map(([t, b, href]) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
          >
            <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>

      <SectionHead
        index="✦"
        kicker="The whole library"
        title="All 12 guides"
        body="Each card is its own page — company, how-tos, economy, social, cloud, trust."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {guides.map((doc, i) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <div aria-hidden="true" className={`h-2 bg-gradient-to-r ${doc.card}`} />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl ${doc.card}`}>
                  {doc.icon}
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Guide {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="text-lg font-black leading-tight">{doc.label}</h2>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{doc.blurb}</p>
              <span className="mt-3 inline-block text-sm font-bold text-cyan-600 transition group-hover:translate-x-1 dark:text-cyan-300">
                Read guide →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <SectionHead
        index="✦"
        kicker="The one rule"
        title="100 🪙 = $1.00. The 25% is already inside."
        body="A coin is worth a cent. When you pay 400 coins ($4.00) for anything metered, the split behind it is always the same:"
      />
      <SplitBar />

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Company: MattyJacks LLC, New Hampshire, USA ·{" "}
        <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> ·{" "}
        <Link className="underline" href="/terms">Terms of Use</Link> ·{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link>
      </p>
    </article>
  );
}
