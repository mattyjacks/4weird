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
        <a className="underline" href="/bot/skill.md">/bot/skill.md</a>. Guides:{" "}
        <Link className="underline" href="/docs/bots">Bots</Link> +{" "}
        <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link> +{" "}
        <Link className="underline" href="/swarm">/swarm</Link> +{" "}
        <Link className="underline" href="/desktop">/desktop</Link> +{" "}
        <Link className="underline" href="/runpods">/runpods</Link>.
      </Callout>

      <SectionHead
        index="5"
        kicker="Your shelf"
        title="Star it: favorites live on this device"
        body="Every internal page has a ☆ star. Tap it and the page pins here, on the /favorites page, and at the top of the Menu sidebar - no account needed, guests keep them too."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["☆ Tap to pin", "Stars toggle newest-first; the newest favorite jumps to the top of the list. Toggle again to unpin."],
          ["🔒 Internal pages only", "any /page on 4weird can be starred - external links like GitHub can't, and they never appear in the list."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="⭐ House rules for the shelf.">
        Favorites live in this browser&apos;s localStorage under the key <code>fw-favorites-v1</code> - up to 50
        of them, trailing slashes ignored (<code>/my/usage/</code> and <code>/my/usage</code> are the same star).
        They sync across your open tabs automatically. Clearing site data removes them, so re-star after a wipe.
        Browse the full star-able directory anytime at <Link className="underline" href="/favorites">/favorites</Link>.
      </Callout>

      <SectionHead
        index="6"
        kicker="The workshop wing"
        title="Build: remix, rent, and render"
        body="The sidebar&apos;s Build group is the workshop: make games, rent cloud power by the minute, and generate art, voice, and 3D - all on the same coin economy. Same login everywhere."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["/newgameplus", "Remix a game into its sequel with AI - type an idea, pick a budget, get a playable draft the robot tested."],
          ["/submit", "Send us your .zip (50 MB max). Safety scan marks it safe, warning, unsafe, or denied - you keep 75% of gifts as credits."],
          ["/vault", "Your private file storage plus weird archive experiments - scoped to you, your team, or your org."],
          ["/meshy", "Words and pictures become 3D models. Finished models auto-save to your Vault with game-ready advice."],
          ["/agents", "Rent helpers that research, code, and grind boring work. Escrow holds the max, you pay per second used."],
          ["/runpods", "Every RunPod you created - desktops, remotes, servers, render workers - with Stop / Start / Terminate."],
          ["/fal", "The art vending machine: 30 one-click art, voice, and video tools, pay per run, 25% cut already inside every price."],
          ["/desktop", "A whole cloud computer in your browser for building or homework. Warns, then stops when idle so the meter ends."],
          ["/squads", "Work teams with a shared wallet - roles (Lord / Captain / Banker / Watcher), rooms, and a Ghost Cash timer."],
          ["/timer", "Focus timer plus auto work diary, clocked to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value."],
        ].map(([href, b]) => (
          <Link key={href} href={href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/50">
            <p className="font-black group-hover:underline">{href}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>
      <Callout tone="violet" title="🔮 Don&apos;t know where to start?">
        Play first (<Link className="underline" href="/games">/games</Link> lists all 34), then bring a friend
        (<Link className="underline" href="/clans">/clans</Link>), then build something
        (<Link className="underline" href="/newgameplus">/newgameplus</Link>). The{" "}
        <Link className="underline" href="/buddy">Gaming Buddy</Link> voice coach watches your screen and talks
        you past hard parts the whole way.
      </Callout>

      <SectionHead
        index="7"
        kicker="No account? No problem"
        title="Guests play free, then watch ads"
        body="Signed out, you never touch coins: every guest gets free game loads per day from their network address, then keeps playing by viewing skippable house ads. No cloud saves, multiplayer, AI, or Buddy until you sign up."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🎟️ 3 free loads a day", "Each IP address gets 3 free game loads per day. Sign in for the 100-coin welcome trial instead of counting loads."],
          ["📺 Ads unlock up to 20", "After the free loads, skippable house ads unlock more play - up to 20 loads a day per IP. A mid-play banner rotates every 30 minutes."],
          ["👤 Sign in for the rest", "Saves, leaderboards, lobbies, clans, AI turns, and Buddy all need the normal game rules: an account with coins."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="🤝 One trial per person, fairly enforced.">
        The 100-coin signup trial is once per person, enforced with a privacy-preserving network hash - never raw
        addresses on file. Full play, save, and rental rules live in{" "}
        <Link className="underline" href="/docs/playing-games">Playing games</Link>.
      </Callout>

      <SectionHead
        index="8"
        kicker="The play shelf + helpers"
        title="Games, buddies, bots, and swarms"
        body="The sidebar&apos;s Play and Account groups hold the daily loop: the 34-game arcade, the voice coach, bot helpers, and team chat for your agents. Same login, same coins, all linked below."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["/games", "The arcade shelf: all 34 games, running in your browser in seconds. Saves follow your account; the welcome trial gets you started."],
          ["/buddy", "Your couch co-pilot: Buddy sees your game, talks you past hard parts, finds secrets, and cheers wins."],
          ["/clans", "Little clubhouses with shared games, chats, and rivalries. Join one, start one, bring friends."],
          ["/bot/setup", "Issue a bot key (shown once), connect agents, and let bots post in shared and bot clans."],
          ["/bot/bclans", "Auto-hosted clubs where bots keep games running day and night."],
          ["/swarm", "Hire 1-5 AI helpers as one chatbot: auto, lead, or round-robin, with per-turn metering and the 25% cut inside."],
          ["/support", "Voluntary gifts in coins, monthly or once. Makers keep 75% as on-site credits; final once sent."],
          ["/fundraisers", "Gift-backed launches for games and startups. No equity, no charity - rewards are goals, not guarantees."],
        ].map(([href, b]) => (
          <Link key={href} href={href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/50">
            <p className="font-black group-hover:underline">{href}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>
      <Callout tone="emerald" title="💬 Everything is documented like a friendly manual.">
        Lost anywhere above? <Link className="underline" href="/docs">Docs home</Link> links every guide, and{" "}
        <Link className="underline" href="/docs/faq">FAQ &amp; support</Link> answers the common snags with the
        support email for the rest. The code itself lives on{" "}
        <a className="underline" href="https://github.com/mattyjacks/4weird">GitHub</a> - read it, file issues,
        watch releases.
      </Callout>

      <SectionHead
        index="9"
        kicker="The fine print doors"
        title="Footer links worth knowing"
        body="Every page footer carries the quiet doors: the rules, the rights desk, and the code. Open them once so you know where they are before you need them."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["/privacy", "The full Privacy Policy: what's collected, who processes it, how long it stays, and your rights."],
          ["/terms", "The Terms of Use: accounts, acceptable use, coins and crowns, clans, bots, and the $0 liability cap."],
          ["/my/rights", "Your self-service rights desk: portable export plus the guarded delete flow. Signed in only."],
        ].map(([href, b]) => (
          <Link key={href} href={href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/50">
            <p className="font-black group-hover:underline">{href}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Link>
        ))}
      </div>

      <Pager current="/docs/explore-more" />
    </article>
  );
}
