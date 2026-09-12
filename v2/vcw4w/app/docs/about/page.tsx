import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/about" },
  title: "About 4weird",
  description:
    "What 4weird Games is, who runs it, the coin-economy flywheel, and every surface of the site - games, clans, bots, agents, teams, and QA.",
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
        eyebrow="Docs · the company"
        title={<>A carnival barker for <span className={theme.title}>the cloud.</span></>}
        lede={<>4weird Games is a strange, joyful arcade of experiments, simulations, and worlds - plus the cloud business that funds it. One company, one coin economy, one account across everything.</>}
        stats={[
          ["1 LLC", "MattyJacks, NH USA"],
          ["34", "playable games"],
          ["100 🪙", "= $1.00, always"],
          ["75%", "to makers as on-site credits"],
          ["4 aisles", "Play · Build · Explore · Account"],
        ]}
        glyph="🎪"
        theme={theme}
        crumb="About 4weird"
      />

      <SectionHead
        index="1"
        kicker="Who runs this circus"
        title="MattyJacks LLC, New Hampshire"
        body="4weird Games is operated by MattyJacks LLC, a New Hampshire limited liability company (USA). The live service runs at 4weird.com and is documented here at 4weird.com/docs/."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["📜 Terms of Use", "/terms", "Eligibility, accounts, bots, coins, compute, IP, liability - the binding agreement."],
          ["🔒 Privacy Policy", "/privacy", "What we collect, provider categories, retention, your statutory rights."],
          ["✉️ Humans", "mailto:matt@mattyjacks.com", "Business, DMCA, press, escalations: matt@mattyjacks.com."],
        ].map(([t, href, b]) => (
          <Link key={t} href={href} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>
      <Callout tone="gold" title="If docs and Terms ever disagree, the Terms win.">
        These guides explain the service in plain language. The <Link className="underline" href="/terms">Terms of Use</Link> govern it
        - including the 13+ age rule, one-trial-per-person, cheat-mark permanence, and New Hampshire governing law.
      </Callout>

      <SectionHead
        index="2"
        kicker="The mission"
        title="Future Forward Fun - the flywheel"
        body="It started with games. Every game needs servers, AI, testing, and automation - and every developer needs the same. So 4weird sells the cloud it already runs, and the margin funds new AI-built games."
      />
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {[
            ["☁️", "You rent cloud", "Agents, desktops, teams, QA. Metered, escrowed, settled transparently."],
            ["🎮", "Players meet AI", "Dialogue bots, AI directors, voice acting - AI concepts taught by play."],
            ["🪙", "Coins fund makers", "Every coin flows back through 25/75. Devs set rates, keep 75% as on-site credits (cloud compute, game credits, other on-site services only; never cash-out)."],
          ].map(([e, t, b], i) => (
            <div key={t} className="contents">
              <div className="rounded-2xl border border-border bg-background p-5 text-center">
                <p aria-hidden="true" className="docs-float text-4xl" style={{ animationDelay: `${i * 0.8}s` }}>{e}</p>
                <p className="mt-2 text-sm font-black">{i + 1}. {t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b}</p>
              </div>
              {i < 2 && (
                <div aria-hidden="true" className="hidden items-center text-2xl text-amber-500 md:flex">→</div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          …and funded games bring more players, who become cloud customers. The wheel spins. 🎡
        </p>
      </div>

      <SectionHead
        index="3"
        kicker="The whole map"
        title="Every surface, one account"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🕹️ Games", "/games", "34 browser games in isolated shells - guides, saves, guest passes, coin-metered rentals."],
          ["🏆 Leaderboards", "/leaderboards", "Per-game kills, actions, play-time from aggregate telemetry. Handles + totals only."],
          ["👾 Clans", "/clans", "hclans / sclans / bclans - forums, live chat, upkeep wallets, XP."],
          ["🤖 Bots", "/bot/setup", "bot4weird_ keys that act as you across shared + bot-native clans."],
          ["☁️ Agents + Desktops + Teams", "/agents", "Hourly agents, per-second desktops, workspaces with metered cloud."],
          ["🎙️ Gaming Buddy", "/buddy", "Screen-aware 9-voice coach riding along on every play page."],
          ["⚙️ VibeCodeWorker", "/vibecodeworker", "Evidence-driven QA: runs, findings, bugs, handoffs, autoplay."],
          ["👤 Account · 📊 Usage · 🔒 Rights", "/account", "Dashboard + daily claim + referrals · every cent itemized · export + delete."],
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
          ["🧾 One gross price", "The 25/75 split is recorded server-side on every meter - never estimated in the browser."],
          ["🔐 Server-side money", "Coins move only in guarded transactions with anti-double-mint guards."],
          ["🎭 No theater", "Unconfigured providers report honest not-configured / no-stock states. Nothing is faked."],
          ["🧼 Safe by default", "User content is never raw HTML; Valley Net + humans screen human and bot writes alike."],
        ].map(([t, b]) => (
          <li key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </li>
        ))}
      </ul>

      <SectionHead
        index="5"
        kicker="The fine print, translated"
        title="Legal facts worth knowing"
        body="The binding rules live in the Terms of Use and the Privacy Policy (both effective September 11, 2026). Here is the plain-language version - when in doubt, the Terms win."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🔞 13+ only, your word on it</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct accounts are Teen (13-17) or Adult (18+). Signup asks for your band - never your birthday -
            so don&apos;t pick a false one. Younger players belong on a Child account (see next card).
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🧒 Under 13 plays with a parent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kids get no direct account. A parent or guardian holding an Adult (18+) account creates a Child
            sub-account for them instead - with budgets, time limits, and play hours the parent controls.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🎟️ One trial per person</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The free 100-coin trial is once per human, enforced with privacy-preserving signals. Farming
            trials with extra accounts violates the Terms and is blocked.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🖋️ Cheat marks are permanent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enabling Cheat Mode brands that save forever - deleting and recreating the save cannot launder it.
            The Terms say so outright, and the database enforces it. Experiment on a throwaway slot.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🏢 MattyJacks LLC, New Hampshire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The operator is MattyJacks LLC, a New Hampshire limited liability company (USA). Business, DMCA,
            press, and escalations all go to a human: matt@mattyjacks.com.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-black">🧾 Money stays on-site</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tips and launch backing are voluntary gifts, never charity - makers keep 75% as on-site credits,
            never cash-out. Only Adult (18+) accounts may make purchases or receive payouts.
          </p>
        </div>
      </div>
      <Callout tone="cyan" title="Your data, your call.">
        Self-serve export and deletion live at <Link className="underline" href="/my/rights">/my/rights</Link>,
        and every cent is itemized at <Link className="underline" href="/my/usage">/my/usage</Link>. The
        Privacy Policy lists exactly what each surface stores - from cloud saves (slots 0-3, versioned data
        up to 1 MiB each) to humanity checks on the daily bonus - and age-gate birthdays never leave your
        device at all. More in <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.
      </Callout>

      <SectionHead
        index="6"
        kicker="Four aisles, one roof"
        title="Play · Build · Explore · Account"
        body="The sidebar splits the whole site into four groups. Play is the arcade; Build rents you power by the minute; Explore is lore, lessons, and plain-English explainers; Account is your money, data, and settings."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/games" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-bold group-hover:underline">🎮 Play: jump in, no install</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All Games, the Gaming Buddy voice coach, leaderboards, clans, and live lobbies waiting for
            players. Every game runs in your browser in seconds, and welcome coins get you started.
          </p>
        </Link>
        <Link href="/agents" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-bold group-hover:underline">🛠️ Build: rent power by the minute</p>
          <p className="mt-1 text-sm text-muted-foreground">
            NewGamePlus remixes, game submissions, the Weird Vault, Meshy 3D, AI agents, RunPods, fal.ai
            Studio, cloud desktops, UnitUnite squads, the work timer, VibeCodeWorker, and web apps.
          </p>
        </Link>
        <Link href="/spaceships" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-bold group-hover:underline">🧭 Explore: lore and lessons</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Collectible spaceships, Academy lessons, Technology explainers, and one-sentence pricing: 100
            Vibe Coins is always exactly $1.00, service cut included, never on top.
          </p>
        </Link>
        <Link href="/account" className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-amber-400/50">
          <p className="font-bold group-hover:underline">👤 Account: money, data, settings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard, favorites, bots, the agent swarm, usage receipts, support tips, fundraisers, and
            accessibility - plus these docs and the public code mirror on GitHub.
          </p>
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        {["✨ NewGamePlus", "📦 Submit Game", "🗝️ Weird Vault", "🐉 Meshy 3D", "🤖 AI Agents", "🖥️ RunPods", "🎨 fal.ai Studio", "💻 Virtual Desktop", "🛡️ UnitUnite", "⏱️ Work Timer", "⚙️ VibeCodeWorker", "🧪 Web Apps", "🚀 Spaceships", "🎓 Academy", "🔧 Technology", "💰 Pricing", "⭐ Favorites", "🐝 Agent Swarm", "💛 Support", "🚀 Fundraisers", "♿ Accessibility", "🐙 GitHub"].map((t) => (
          <span key={t} className="rounded-full border border-border bg-card px-3 py-1.5">{t}</span>
        ))}
      </div>

      <SectionHead
        index="7"
        kicker="Remix the arcade"
        title="NewGamePlus: type an idea, get a tested game"
        body="The Build aisle's party trick: describe a game, pick a budget, and get a playable draft - really booted headless and playtested by a robot - landing in your Draft folder."
      />
      <Steps
        items={[
          ["Dream it, budget it", <>Type an idea like &ldquo;space cats race cars&rdquo; and set quality (<strong>0-10, default 5</strong>) plus a budget (<strong>1-10,000 coins, default 100</strong>). Every price already includes the 25% platform cut - never added on top.</>],
          ["Confirm the big ones", <>Budgets above <strong>250 coins</strong> ask for an explicit &ldquo;Confirm the Amount&rdquo; acknowledgement before anything spends. No surprise bills, ever.</>],
          ["Pick your lane", <>Budgets of 250 or less run the <strong>fast lane (done in 5 minutes or less)</strong>; bigger budgets go <strong>deluxe (about 5-12 minutes)</strong> with more swarm agents and richer media like video and 3D.</>],
        ]}
      />
      <MockWindow title="4weird.com - newgameplus build plan" badge="estimate">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">PROMPT · &ldquo;space cats race cars&rdquo;</span><span className="font-bold text-cyan-300">QUALITY 5/10</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">BUDGET · 100 coins</span><span className="font-bold text-emerald-300">FAST LANE · ≤5 MIN</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">CUT · 25% platform</span><span className="font-bold text-slate-200">ALREADY INSIDE</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">TARGET · Draft folder</span><span className="font-bold text-amber-300">TESTED BY ROBOT</span></div>
          <p className="pt-1 text-[11px] text-slate-500">deluxe builds rally up to 5 swarm agents + up to 4 media renders · confirm required above 250</p>
        </div>
      </MockWindow>
      <Callout tone="emerald" title="Start remixing.">
        Finished games land in your <strong>Draft folder</strong> - remix from there, submit the keepers, and
        keep 75% of gifts as on-site credits. The launchpad is <Link className="underline" href="/newgameplus">/newgameplus</Link>.
      </Callout>

      <Pager current="/docs/about" />
    </article>
  );
}
