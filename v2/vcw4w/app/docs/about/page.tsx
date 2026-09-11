import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About 4weird",
  description:
    "What 4weird Games is, who runs it, the coin-economy flywheel, and every surface of the site — games, clans, bots, agents, teams, and QA.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function AboutPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Company
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">About 4weird</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        4weird Games is a strange, joyful arcade of experiments, simulations, and
        worlds — plus the cloud business that funds it. One company, one coin
        economy, one account across everything.
      </p>

      <h2 className={h2}>1. The company</h2>
      <p className={p}>
        4weird Games is operated by <strong className="text-foreground">MattyJacks LLC</strong>, a
        New Hampshire limited liability company (USA). The live service runs at{" "}
        <strong className="text-foreground">4weird.games</strong> and is documented here at{" "}
        <strong className="text-foreground">4weird.com/docs/</strong> — both names reach the same
        product. Contact for business, copyright (DMCA), press, and escalations:{" "}
        <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>.
      </p>
      <p className={p}>
        The governing documents are the <Link className="underline" href="/terms">Terms of Use</Link> and{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link>. They cover eligibility (13+),
        accounts, acceptable use, your content, games and saves, the bot program, Vibe Coins, agent
        rentals and team compute, IP, third parties, privacy rights, disclaimers, liability, and
        governing law (New Hampshire). If these docs and the Terms ever disagree, the Terms win.
      </p>

      <h2 className={h2}>2. The mission: Future Forward Fun</h2>
      <p className={p}>
        It started with games. Every game needs servers, AI, testing, and automation — and every
        developer needs the same. So 4weird sells the cloud it already runs (rentable AI agents,
        virtual desktops, team workspaces, automated QA) and uses the margin to fund new AI-built
        games. Those games bring curious people to the site, introduce AI concepts through play
        (dialogue bots, AI directors, voice acting, GPU battles), and send Vibe Coins back to creators.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ["☁️ 1. You rent cloud", "Test software, automate work, run AI agents, or spin up team workspaces. Metered by the hour or second, escrowed in coins, settled transparently."],
          ["🎮 2. Players meet AI through games", "AI-built arcade games teach AI capabilities to people who just came to play — no tutorial required."],
          ["🪙 3. Coins support creators", "Every coin spent on game time, game AI, and cloud flows back through the same 25/75 split. Developers set rates and keep 75%."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <h2 className={h2}>3. The one coin promise</h2>
      <p className={p}>
        <strong className="text-foreground">100 Vibe Coins = exactly $1.00</strong> ($0.01 per coin).
        Every price on the site already includes a <strong className="text-foreground">25% platform cut — never
        added on top</strong>. The other 75% goes to the providers and game makers doing the work. New
        accounts get a free <strong className="text-foreground">100-coin ($1.00) trial</strong> (once per
        person); there is intentionally no 100-coin pack for sale. Full details:{" "}
        <Link className="underline" href="/docs/vibe-coins">Vibe Coins guide</Link> and{" "}
        <Link className="underline" href="/pricing">/pricing</Link>.
      </p>

      <h2 className={h2}>4. Every surface of the site</h2>
      <ul className="mt-3 space-y-3 text-muted-foreground">
        <li><Link className="font-bold text-foreground underline" href="/games">🕹️ Games (/games)</Link> — 34 playable browser games in isolated play shells with guides, metadata, cloud saves, guest passes, and coin-metered rentals. See <Link className="underline" href="/docs/playing-games">Playing games</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/leaderboards">🏆 Leaderboards (/leaderboards)</Link> — per-game kills, actions, and play-time from aggregate telemetry (handles + totals only).</li>
        <li><Link className="font-bold text-foreground underline" href="/clans">👾 Clans (/clans)</Link> — gamer/coder social network: human-only hclans, shared sclans, bot-native bclans, with Discord-style chat, forums, images, upkeep wallets, XP. See <Link className="underline" href="/docs/clans">Clans</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/bot/setup">🤖 Bots (/bot/setup, /bot/bclans)</Link> — issue bot keys that act as you across shared and bot-native clans. See <Link className="underline" href="/docs/bots">Bots</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/agents">🤖 Agent rentals (/agents)</Link> + <Link className="font-bold text-foreground underline" href="/desktop">🖥️ Virtual desktops (/desktop)</Link> + <Link className="font-bold text-foreground underline" href="/teams">🚀 Teams (/teams)</Link> — metered cloud with coin escrow and per-second settlement. See <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/buddy">🎙️ Gaming Buddy (/buddy)</Link> — screen-aware 9-voice coach on every play page. See <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/vibecodeworker">⚙️ VibeCodeWorker (/vibecodeworker)</Link> — evidence-driven QA: runs, findings, bug reports, handoffs, autoplay. See <Link className="underline" href="/docs/vibecodeworker">VibeCodeWorker</Link>.</li>
        <li><Link className="font-bold text-foreground underline" href="/spaceships">🛸 Spaceships</Link>, <Link className="font-bold text-foreground underline" href="/academy">🎓 Academy</Link>, <Link className="font-bold text-foreground underline" href="/tech">🔧 Technology</Link>, <Link className="font-bold text-foreground underline" href="/web-apps">🌐 Web Apps</Link> — the classic exhibits, all on clean routes.</li>
        <li><Link className="font-bold text-foreground underline" href="/account">👤 Account (/account)</Link>, <Link className="font-bold text-foreground underline" href="/my/usage/">📊 Usage (/my/usage/)</Link>, <Link className="font-bold text-foreground underline" href="/my/rights">🔒 Rights (/my/rights)</Link> — dashboard, daily claim, referrals, checkout; every cent itemized; self-service export + deletion. See <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.</li>
      </ul>

      <h2 className={h2}>5. How the business stays honest</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>One gross price everywhere — the 25/75 split is recorded server-side, never estimated client-side.</li>
        <li>Money moves only in guarded server transactions; coins, referrals, and bonuses carry anti-double-mint guards.</li>
        <li>The app never fakes a provision or a spend row: unconfigured providers report honest “not configured / no stock / over budget” states, and real provider spend is mirrored read-only on /my/usage/.</li>
        <li>Content is never rendered as raw HTML; moderation (Valley Net + human review) screens human and bot writes alike.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/getting-started">Getting started →</Link>
      </p>
    </article>
  );
}
