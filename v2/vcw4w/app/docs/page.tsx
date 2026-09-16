import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, SplitBar } from "@/components/docs/docs-bits";
import { getDocsHub } from "@/lib/site-content";

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
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

// Static guide cards, cached per Cache Components docs: fully static catalog
// data (no cookies/headers/searchParams), so the grid joins the prerendered
// shell and streams inside <Suspense>. Per-guide read progress stays client-side
// (useDocsProgress, localStorage) and is never cached.
// Collapsible hub groups (spec p68: Platform | Arcade | DevCompute | VocRehab).
// href-keyed here in the route shell so no lib/component wiring is needed;
// guides missing from the map fall back to the first group so every link
// always renders exactly once.
const DOCS_GROUPS = [
  { id: "platform", label: "Platform & Economics", hrefs: ["/docs/about", "/docs/getting-started", "/docs/vibe-coins", "/docs/support-launches", "/docs/clans", "/docs/privacy-safety", "/docs/faq"] },
  { id: "arcade", label: "Arcade & Games", hrefs: ["/docs/playing-games", "/docs/mmo", "/docs/mmo/hosting", "/docs/mmo/age-bands", "/docs/mmo/player", "/docs/mmo/host", "/docs/mmo/safety", "/docs/mmo/faq", "/docs/game-ai-buddy", "/docs/explore-more"] },
  { id: "devcompute", label: "Developer & Compute", hrefs: ["/docs/bots", "/docs/agents-compute", "/docs/vibecodeworker"] },
  { id: "vocrehab", label: "Vocational Rehab", hrefs: [] as string[] },
] as const;

async function CachedGuidesGrid() {
  "use cache";
  cacheLife("days");
  cacheTag("docs-hub");
  const guides = await getDocsHub();
  const indexed = guides.map((doc, i) => ({ doc, i }));
  const groupOf = (href: string) =>
    DOCS_GROUPS.find((g) => (g.hrefs as readonly string[]).includes(href)) ?? DOCS_GROUPS[0];
  return (
    <div className="mt-3 space-y-3">
      {DOCS_GROUPS.map((g) => {
        const items = indexed.filter(({ doc }) => groupOf(doc.href).id === g.id);
        return (
          <details
            key={g.id}
            open
            className="overflow-hidden rounded-2xl border border-border bg-card/40"
          >
            <summary className="flex h-7 cursor-pointer list-none items-center gap-2 px-4 text-[13px] font-bold transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
              {g.label}
              <span className="rounded-full border border-border px-2 py-px text-[11px] font-black text-muted-foreground">
                {g.id === "vocrehab" ? items.length + 1 : items.length}
              </span>
            </summary>
            <div className="grid gap-3 border-t border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ doc, i }) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div aria-hidden="true" className={`h-1 bg-gradient-to-r ${doc.card}`} />
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg ${doc.card}`}>
                        {doc.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Guide {String(i + 1).padStart(2, "0")} · {g.label}
                        </p>
                        <h2 className="text-base font-black leading-tight">{doc.label}</h2>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[13px] text-muted-foreground">{doc.blurb}</p>
                    <span className="mt-1.5 inline-block text-[13px] font-bold text-cyan-600 transition group-hover:translate-x-1 dark:text-cyan-300">
                      Read guide →
                    </span>
                  </div>
                </Link>
              ))}
              {g.id === "vocrehab" && (
                <Link
                  href="/vocrehab"
                  className="group relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-4 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Practice module
                  </p>
                  <p className="mt-1 text-base font-black">VocRehab practice →</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drills, discovery, and the course track live under /vocrehab.
                  </p>
                </Link>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default function DocsHome() {
  return (
    <article>
      <div className="sticky top-0 z-10 mb-4 flex h-12 items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 backdrop-blur">
        <p className="shrink-0 text-sm font-black">
          📚 <Link href="/docs" className="hover:underline">Docs</Link>
        </p>
        <form action="/search" method="get" role="search" className="flex flex-1 items-center gap-2">
          <label htmlFor="docs-search" className="sr-only">Search documentation</label>
          <input
            id="docs-search"
            name="q"
            type="search"
            placeholder="Quick search documentation... ⌘K"
            className="h-8 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan-500/60"
          />
          <button type="submit" className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-bold transition hover:border-cyan-500/50">
            Search
          </button>
        </form>
      </div>
      <DocsHero
        eyebrow="4weird.com/docs/ · 13 guides"
        title={<>The manual for <span className={theme.title}>Future Forward Fun.</span></>}
        lede={<>Everything about the company and how to use the site and software - one coin economy, 34 games, clans, bots, rentable agents, game AI, and QA tooling. Start anywhere; every guide links to the next.</>}
        stats={[
          ["13", "guides, zero fluff"],
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

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {[
          ["🌱 New here? Read in order", "About → Getting started → Playing games → Vibe Coins. Fifteen minutes and you'll be dangerous.", "/docs/about"],
          ["🎉 Social player? Belong first", "Clans → Bots → Privacy & safety. Find your people, then give your agent a key.", "/docs/clans"],
          ["🔧 Builder? Rent the cloud", "Agents & cloud → Game AI & Buddy → VibeCodeWorker. Metered compute that funds the arcade.", "/docs/agents-compute"],
          ["🛡️ Trust first? Verify us", "Privacy & safety → FAQ & support → Vibe Coins. Rights, moderation, receipts, humans.", "/docs/privacy-safety"],
        ].map(([t, b, href]) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
          >
            <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>

      <SectionHead
        index="✦"
        kicker="The whole library"
        title="All 13 guides"
        body="Each card is its own page - company, how-tos, economy, social, cloud, trust."
      />

      <Suspense
        fallback={
          <p className="mt-6 text-sm text-muted-foreground">Loading guides…</p>
        }
      >
        <CachedGuidesGrid />
      </Suspense>

      <SectionHead
        index="✦"
        kicker="The one rule"
        title="100 🪙 = $1.00. The 25% is already inside."
        body="A coin is worth a cent. When you pay 400 coins ($4.00) for anything metered, the split behind it is always the same:"
      />
      <SplitBar />

      <SectionHead
        index="★"
        kicker="Your first day"
        title="A 15-minute flight plan"
        body="Do all four and you'll have touched every major system on the site."
      />
      <Steps
        items={[
          [
            "Sign up, meet your 100 coins",
            <>
              Register at <Link className="font-bold underline" href="/auth/sign-up">/auth/sign-up</Link> —
              new accounts get a free 100-coin ($1.00) trial, once per person. Return visits
              go through <Link className="font-bold underline" href="/auth/login">/auth/login</Link>;
              the header flipping to Dashboard is your proof of orbit.
            </>,
          ],
          [
            "Claim the day, share the code",
            <>
              Hit the daily bonus button on <Link className="font-bold underline" href="/account">/account</Link> —
              5 coins + 1 per streak day, capped at 12, once per UTC day. Grab your 8-character
              referral code while you&apos;re there: both sides earn 25 coins on redeem.
            </>,
          ],
          [
            "Play something, save smart",
            <>
              Pick a cabinet on <Link className="font-bold underline" href="/games">/games</Link> and
              hit Play. Saves live in slots 0-3 (slot 0 is cheat-proof, so it can never be
              marked) — then chase your name on{" "}
              <Link className="font-bold underline" href="/leaderboards">/leaderboards</Link>.
            </>,
          ],
          [
            "Read your own receipt",
            <>
              Open <Link className="font-bold underline" href="/my/usage">/my/usage</Link> and learn
              to love it: session + total, by-kind + by-game, rentals, AI turns, clan fees,
              workspace cloud. Full tour in{" "}
              <Link className="font-bold underline" href="/docs/getting-started">Getting started</Link>.
            </>,
          ],
        ]}
      />

      <SectionHead
        index="❖"
        kicker="Mission control"
        title="Four pages, one login"
        body="Pricing is public; the other three need your session. Learn them once, use them daily."
      />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="font-black">👤 /account</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard: balance (coins + fractional centicentcoins), checkout, daily claim,
            referral code, grant recovery — plus doors to usage and rights.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="font-black">💰 /pricing</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The public catalog: 500 / 1,500 / 5,000 / 25,000 packs + custom 500-100,000
            at 1¢/coin. 100 coins is the free trial — never sold.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="font-black">🧾 /my/usage/</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every cent itemized: session + total + 1h/24h, by-kind + by-game, rentals,
            AI + Buddy turns, clan fees, workspace cloud, combined 25/75 totals.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="font-black">🛡️ /my/rights</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Self-service export (portable JSON) + guarded 30-minute delete flow +
            correction path. Only your own account; deceased-family cases go by email
            with proof.
          </p>
        </div>
      </div>

      <Callout tone="gold" title="The trial stays special on purpose.">
        100 coins arrive free at signup and there is intentionally no 100-coin pack — packs
        start at 500 so the gift means something. Need an in-between amount? The custom
        500-100,000 pack bills at the same flat 1¢/coin on{" "}
        <Link className="underline" href="/pricing">/pricing</Link>.
      </Callout>

      <Callout tone="cyan" title="No account? No problem.">
        Guests never pay: 3 free loads a day, then instantly-skippable house ads keep you
        playing, with a banner every 30 minutes. The trade-off is real — no saves,
        multiplayer, AI, or Buddy — so sign in when a cabinet hooks you.
      </Callout>

      <SectionHead
        index="✦"
        kicker="Start smart"
        title="If you only read three guides"
        body="Fifteen minutes across these three and the other ten turn into reference."
      />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        <Link
          href="/docs/getting-started"
          className="group rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">🚀 Getting started</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Account, trial, first day: signup, the account hub tour, your first 15 minutes.
          </p>
        </Link>
        <Link
          href="/docs/vibe-coins"
          className="group rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">🪙 Vibe Coins</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Packs, bonuses, checkout: the five ways coins arrive and where they go when you spend.
          </p>
        </Link>
        <Link
          href="/docs/playing-games"
          className="group rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-cyan-600 dark:group-hover:text-cyan-300">🕹️ Playing games</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Catalog, play, saves, guests: rentals, slots 0-3, cheat-mode rules, leaderboards.
          </p>
        </Link>
      </div>

      <p className="mt-3 rounded-2xl border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
        Company: MattyJacks LLC, New Hampshire, USA ·{" "}
        <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> ·{" "}
        <Link className="underline" href="/terms">Terms of Use</Link> ·{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link>
      </p>
    </article>
  );
}
