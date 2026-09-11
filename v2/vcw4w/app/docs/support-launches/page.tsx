import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/support-launches" },
  title: "Support & launches",
  description:
    "Voluntary coin support for verified creators and clans, plus gift-based launch campaigns for games and tech startups. Not charity, not investment.",
};

const theme = {
  bg: "bg-gradient-to-br from-pink-950 via-slate-950 to-amber-950",
  border: "border-pink-300/20",
  chip: "border-pink-300/40 bg-pink-300/10 text-pink-200",
  title: "bg-gradient-to-r from-pink-300 via-rose-200 to-amber-300 bg-clip-text text-transparent",
};

export default function SupportLaunchesPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs Â· the tip jar"
        title={<>Coffee money, <span className={theme.title}>not contracts.</span></>}
        lede={<>Subscribe to a verified creator or clan, send a one-time tip, or back someone&apos;s game launch or tech startup â€” all in Vibe Coins, all voluntary, all final. Not a charity, not an investment.</>}
        stats={[
          ["25%", "cut, inside every coin"],
          ["1 ðŸª™", "minimum tip ($0.01)"],
          ["30d", "support periods"],
          ["0", "cash-outs, ever"],
        ]}
        glyph="ðŸ’›"
        theme={theme}
        crumb="Support & launches"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[44, 66, 52, 78, 60, 88, 70].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-pink-200/50 bg-gradient-to-t from-rose-500 to-amber-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <Callout title="The legal shape in one breath">
        Support and launch backing are gratuitous transfers of closed-loop platform credits. Coins have no cash value
        and can never be cashed out. Nothing here is charitable (no tax deduction, no charitable solicitation) and
        nothing is an investment (no equity, interest, or profit-share). Perks and campaign rewards are goals the
        creator hopes to deliver â€” never contractual promises. The binding version lives in{" "}
        <Link className="underline" href="/terms">Terms of Use Â§8A</Link>.
      </Callout>

      <SectionHead
        index="1"
        kicker="Patreon-style"
        title="Support verified creators and clans"
        body="Monthly tiers plus one-time tips. Personal support goes only to verified creators (request verification on the Support page â€” every application is reviewed by hand); clans receive through their moderators into the clan wallet."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["ðŸ’¡ Tip", "1â€“100,000 coins, one tap. Final when sent. You cannot tip yourself; clan owners fund their own clan via the wallet."],
          ["ðŸ” Subscribe", "First 30-day period charged immediately, renews every 30 days. Cancel anytime â€” future renewals stop, completed periods are not prorated or refunded."],
          ["ðŸ›Ÿ Short on coins?", "A renewal you cannot cover lapses to past-due instead of dragging you negative. Top up and resubscribe."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="GoFundMe-style, for launches"
        title="Launch campaigns fund games and startups"
        body="Gift-based backing for creative projects only: game launches, tech startups, and creative tech. Every campaign states a goal, a story, and what the coins will fund. Backers give gifts â€” no ownership, no returns, no enforceable right to any reward."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["ðŸŽ® Game launch", "Art, servers, polish, launch marketing. Tell players what hitting the goal unlocks."],
          ["ðŸš€ Tech startup", "First build, beta hosting, SDK licenses. Explain the milestone the coins fund."],
          ["ðŸ§ª Creative tech", "Tools, mods, engines, weird experiments. Honest scope beats hype."],
          ["ðŸš« Never allowed", "Charity, medical, emergency, disaster, political, or investment language is rejected â€” automatically and on review."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="The money"
        title="One split everywhere"
        body="A supporter pays gross coins; 25% stays with the platform and 75% credits the recipient â€” a verified creator's coin balance or a clan's wallet. Raised campaign coins work the same way. Start at /support or /fundraisers."
      />
      <SplitBar leftLabel="75% creator / project" rightLabel="25% platform" />

      <SectionHead
        index="4"
        kicker="Trust"
        title="Honesty rules, fraud loses"
        body="Campaign creators must describe their project truthfully. Misleading campaigns can be frozen, hidden, or removed, and defrauded backers may be re-credited from frozen amounts where possible. Report abuse through the in-Service report flow or matt@mattyjacks.com."
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/support" className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200">
          Open Support
        </Link>
        <Link href="/fundraisers" className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10">
          Browse campaigns
        </Link>
        <Link href="/terms" className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10">
          Terms Â§8A
        </Link>
      </div>

      <Pager current="/docs/support-launches" />
    </article>
  );
}
