import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/explore-more" },
  title: "Explore more",
  description:
    "The rest of 4weird: classic exhibits (Spaceships, Academy, Tech, Web Apps, Xonotic), competitive play (leaderboards, lobbies), and your account hub (pricing, usage, rights, accessibility).",
};

const theme = {
  bg: "bg-gradient-to-br from-cyan-950 via-slate-950 to-violet-950",
  border: "border-cyan-400/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent",
};

export default function ExploreMorePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · beyond the main quest"
        title={<>Done the tour? <span className={theme.title}>Here&apos;s the rest.</span></>}
        lede={<>Classic exhibits, competitive play, and your account hub - every surface the other guides didn&apos;t give its own chapter. One account, one coin economy, all of it below.</>}
        stats={[
          ["5", "classic exhibits"],
          ["2", "competitive arenas"],
          ["4", "account-hub pages"],
          ["1", "login for all of it"],
        ]}
        glyph="🧭"
        theme={theme}
        crumb="Explore more"
      />

      <SectionHead
        index="1"
        kicker="The museum wing"
        title="Classic exhibits"
        body="The original 4weird attractions - still live on clean routes, with legacy URLs redirecting to them. Free to browse; play and AI where present follow the normal game rules."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🚀 Spaceships", "/spaceships", "The classic fleet exhibit - specs, lore, and the ships that started it all."],
          ["🎓 Academy", "/academy", "Learn-by-playing: the concepts behind the games, taught where they&apos;re used."],
          ["🔬 Tech", "/tech", "The technology shelf - what the arcade runs on and why."],
          ["🧪 Web Apps", "/web-apps", "Small interactive web toys and tools from the early 4weird lab."],
          ["💥 Xonotic", "/xonotic", "The arena shooter corner - open-source FPS action alongside the browser catalog."],
        ].map(([t, href, b]) => (
          <Link key={t} href={href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/50">
            <p className="font-black group-hover:underline">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="Prove it"
        title="Competitive play: leaderboards + lobbies"
        body="Glory has two addresses. Both are public to read; playing and matching need the normal game rules (account for metered play, guests for quota + ads)."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🏆 <Link className="underline" href="/leaderboards">/leaderboards</Link></p>
          <p className="mt-2 text-sm text-muted-foreground">
            Per-game kills, actions, and play-time from aggregate telemetry - handles and totals only,
            anonymous-friendly. Telemetry never decides billing; the rental session does.
            Full story in <Link className="underline" href="/docs/playing-games">Playing games</Link>.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🎪 <Link className="underline" href="/lobbies">/lobbies</Link></p>
          <p className="mt-2 text-sm text-muted-foreground">
            Find humans, then join via <code>?match=</code> links on any play URL
            (<code>/games/[slug]/play?match=…</code>). For a permanent home with chat, upkeep,
            and XP, graduate to a <Link className="underline" href="/docs/clans">clan</Link>.
          </p>
        </div>
      </div>

      <SectionHead
        index="3"
        kicker="Mission control, extended"
        title="Your account hub"
        body="Four pages, one login. Pricing is public; the other three need your session. Renting compute or bots? Jump to /agents (NanoClaw serverful/serverless) + /bot/setup (keys) + /docs/bots + /docs/agents-compute."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["👤 /account", "Dashboard: balance (coins + fractional centicentcoins), checkout, daily claim, referral code, grant recovery - plus doors to usage and rights. Tour it in /docs/getting-started."],
          ["💰 /pricing", "The public catalog: 500 / 1,500 / 5,000 / 25,000 packs + custom 500-100,000 at 1¢/coin. 100 coins is the free trial - never sold. Details in /docs/vibe-coins."],
          ["🧾 /my/usage/", "Every cent itemized: session + total + 1h/24h, by-kind + by-game, rentals, AI/Buddy turns, clan fees, workspace cloud, RunPod mirror, combined 25/75 totals. Screenshot it for support."],
          ["🛡️ /my/rights", "Self-service export (portable JSON) + guarded delete flow + correction path. Only your own account; deceased-family cases go by email with proof. Details in /docs/privacy-safety."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <SectionHead
        index="4"
        kicker="Ship it"
        title="Submit your game - 50 MB, loads fast ⚡"
        body="Zip your game (50 MB max into the game-blobs vault), name the game root like a Vercel Root Directory, and our scanner marks it safe, warning, unsafe, or denied. The cap is a feature: every game on 4weird loads fast. Start at /submit."
      />
      <Callout tone="cyan" title="⚡ Accessibility lives at /accessibility.">
        Keyboard paths, contrast, reduced-motion, and screen-reader notes for the whole arcade -
        linked from the footer on every page. Found a barrier? Email{" "}
        <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with
        the page URL and what broke, per <Link className="underline" href="/docs/faq">FAQ &amp; support</Link>.
      </Callout>

      <Callout tone="emerald" title="🤖 Agents + bots live next door.">
        Rent NanoClaw on <Link className="font-bold underline" href="/agents">/agents</Link> (serverful pod or
        serverless endpoint, website chat + Telegram), get the key at{" "}
        <Link className="font-bold underline" href="/bot/setup">/bot/setup</Link>, drive it from{" "}
        <Link className="underline" href="/bot/bclans">/bot/bclans</Link>, read{" "}
        <Link className="underline" href="/bot/skill.md">/bot/skill.md</Link>. Guides:{" "}
        <Link className="underline" href="/docs/bots">Bots</Link> +{" "}
        <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link> +{" "}
        <Link className="underline" href="/swarm">/swarm</Link> +{" "}
        <Link className="underline" href="/desktop">/desktop</Link> +{" "}
        <Link className="underline" href="/runpods">/runpods</Link>.
      </Callout>

      <Pager current="/docs/explore-more" />
    </article>
  );
}
