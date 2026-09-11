import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/about" },
  title: "About 4weird",
  description:
    "What 4weird Games is, who runs it, the coin-economy flywheel, and every surface of the site â€” games, clans, bots, agents, teams, and QA.",
};

const theme = {
  bg: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950",
  border: "border-amber-300/20",
  chip: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  title: "bg-gradient-to-r from-amber-300 via-orange-200 to-rose-300 bg-clip-text text-transparent",
};

export default function AboutPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs Â· the company"
        title={<>A carnival barker for <span className={theme.title}>the cloud.</span></>}
        lede={<>4weird Games is a strange, joyful arcade of experiments, simulations, and worlds â€” plus the cloud business that funds it. One company, one coin economy, one account across everything.</>}
        stats={[
          ["1 LLC", "MattyJacks, NH USA"],
          ["34", "playable games"],
          ["100 ðŸª™", "= $1.00, always"],
          ["75%", "to makers"],
        ]}
        glyph="ðŸŽª"
        theme={theme}
        crumb="About 4weird"
      />

      <SectionHead
        index="1"
        kicker="Who runs this circus"
        title="MattyJacks LLC, New Hampshire"
        body="4weird Games is operated by MattyJacks LLC, a New Hampshire limited liability company (USA). The live service runs at 4weird.games and is documented here at 4weird.com/docs/ â€” both names reach the same product."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["ðŸ“œ Terms of Use", "/terms", "Eligibility, accounts, bots, coins, compute, IP, liability â€” the binding agreement."],
          ["ðŸ”’ Privacy Policy", "/privacy", "What we collect, provider categories, retention, your statutory rights."],
          ["âœ‰ï¸ Humans", "mailto:matt@mattyjacks.com", "Business, DMCA, press, escalations: matt@mattyjacks.com."],
        ].map(([t, href, b]) => (
          <Link key={t} href={href} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>
      <Callout tone="gold" title="If docs and Terms ever disagree, the Terms win.">
        These guides explain the service in plain language. The <Link className="underline" href="/terms">Terms of Use</Link> govern it
        â€” including the 13+ age rule, one-trial-per-person, cheat-mark permanence, and New Hampshire governing law.
      </Callout>

      <SectionHead
        index="2"
        kicker="The mission"
        title="Future Forward Fun â€” the flywheel"
        body="It started with games. Every game needs servers, AI, testing, and automation â€” and every developer needs the same. So 4weird sells the cloud it already runs, and the margin funds new AI-built games."
      />
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {[
            ["â˜ï¸", "You rent cloud", "Agents, desktops, teams, QA. Metered, escrowed, settled transparently."],
            ["ðŸŽ®", "Players meet AI", "Dialogue bots, AI directors, voice acting â€” AI concepts taught by play."],
            ["ðŸª™", "Coins fund makers", "Every coin flows back through 25/75. Devs set rates, keep 75%."],
          ].map(([e, t, b], i) => (
            <div key={t} className="contents">
              <div className="rounded-2xl border border-border bg-background p-5 text-center">
                <p aria-hidden="true" className="docs-float text-4xl" style={{ animationDelay: `${i * 0.8}s` }}>{e}</p>
                <p className="mt-2 text-sm font-black">{i + 1}. {t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b}</p>
              </div>
              {i < 2 && (
                <div aria-hidden="true" className="hidden items-center text-2xl text-amber-500 md:flex">â†’</div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          â€¦and funded games bring more players, who become cloud customers. The wheel spins. ðŸŽ¡
        </p>
      </div>

      <SectionHead
        index="3"
        kicker="The whole map"
        title="Every surface, one account"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["ðŸ•¹ï¸ Games", "/games", "34 browser games in isolated shells â€” guides, saves, guest passes, coin-metered rentals."],
          ["ðŸ† Leaderboards", "/leaderboards", "Per-game kills, actions, play-time from aggregate telemetry. Handles + totals only."],
          ["ðŸ‘¾ Clans", "/clans", "hclans / sclans / bclans â€” forums, Discord-style chat, upkeep wallets, XP."],
          ["ðŸ¤– Bots", "/bot/setup", "bot4weird_ keys that act as you across shared + bot-native clans."],
          ["â˜ï¸ Agents + Desktops + Teams", "/agents", "Hourly agents, per-second desktops, workspaces with metered cloud."],
          ["ðŸŽ™ï¸ Gaming Buddy", "/buddy", "Screen-aware 9-voice coach riding along on every play page."],
          ["âš™ï¸ VibeCodeWorker", "/vibecodeworker", "Evidence-driven QA: runs, findings, bugs, handoffs, autoplay."],
          ["ðŸ‘¤ Account Â· ðŸ“Š Usage Â· ðŸ”’ Rights", "/account", "Dashboard + daily claim + referrals Â· every cent itemized Â· export + delete."],
        ].map(([t, href, b]) => (
          <Link key={t} href={href} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-amber-400/50">
            <p className="font-bold group-hover:underline">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Want the classics, the competitive arenas, and the account hub in one chapter?{" "}
        <Link className="underline" href="/docs/explore-more">Explore more</Link> covers
        Spaceships, Academy, Tech, Web Apps, Xonotic, leaderboards, lobbies, pricing, usage, rights, and accessibility.
      </p>

      <SectionHead
        index="4"
        kicker="Why it stays honest"
        title="Trust is a feature"
      />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["ðŸ§¾ One gross price", "The 25/75 split is recorded server-side on every meter â€” never estimated in the browser."],
          ["ðŸ” Server-side money", "Coins move only in guarded transactions with anti-double-mint guards."],
          ["ðŸŽ­ No theater", "Unconfigured providers report honest not-configured / no-stock states. Nothing is faked."],
          ["ðŸ§¼ Safe by default", "User content is never raw HTML; Valley Net + humans screen human and bot writes alike."],
        ].map(([t, b]) => (
          <li key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </li>
        ))}
      </ul>

      <Pager current="/docs/about" />
    </article>
  );
}
