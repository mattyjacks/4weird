import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/playing-games" },
  title: "Playing games",
  description:
    "How to browse, play, save, rent game time, play as a guest, use Cheat Mode safely, and climb the leaderboards on 4weird Games.",
};

const theme = {
  bg: "bg-gradient-to-br from-fuchsia-950 via-slate-950 to-purple-950",
  border: "border-fuchsia-400/20",
  chip: "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-200",
  title: "bg-gradient-to-r from-fuchsia-300 via-pink-200 to-purple-300 bg-clip-text text-transparent",
};

export default function PlayingGamesPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · insert coin"
        title={<>34 cabinets. <span className={theme.title}>One joystick: you.</span></>}
        lede={<>Preserved browser games in isolated play shells — guides, cloud saves, leaderboards, guest passes, coin-metered rentals. A 5-hour session on default rates costs about 6 coins.</>}
        stats={[
          ["34", "playable games"],
          ["~6 🪙", "per 5-hour session"],
          ["3/day", "free guest loads"],
          ["3", "save slots / game"],
        ]}
        glyph="🕹️"
        theme={theme}
        crumb="Playing games"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="docs-blink text-3xl">▏</span>
            <p className="font-mono text-sm font-bold tracking-widest text-fuchsia-200">▶ NOW PLAYING: YOU</p>
            <span aria-hidden="true" className="docs-cursor font-mono text-fuchsia-200">▌</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The arcade floor"
        title="Browse like a regular"
        body="The catalog at /games lists all 34 titles. Each game has a detail page (guide link, metadata, play-rate badge, AI badges) and a play page — the PlayGate shell around the isolated frame. Add ?match= to a play URL to join a match."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🖺️ Detail page", "/games/[slug]", "Read the guide when present — controls, scoring, secrets. Check the rate badge before you play."],
          ["▶️ Play shell", "/games/[slug]/play", "Signed-in coin sessions around the frame. Guests get quota + skippable house ads."],
          ["🏆 Leaderboards", "/leaderboards", "Kills, actions, play-time from aggregate telemetry. Handles + totals only."],
        ].map(([t, code, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
            <p className="font-black">{t}</p>
            <code className="mt-1 inline-block rounded bg-black/10 px-2 py-0.5 font-mono text-xs dark:bg-white/10">{code}</code>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="The meter is running (gently)"
        title="Rentals: load fee + per-second play"
        body="Signed-in play never shows ads — it meters coins instead, with the 25% cut already inside every figure. Two parts:"
      />
      <MockWindow title="4weird.games — play session receipt" badge="live meter">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">LOAD · 1.0 MiB fresh bytes</span><span className="font-bold text-emerald-300">−1.00 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">PLAY · 5h Ö 1 coin/hr, per-second</span><span className="font-bold text-emerald-300">−5.00 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SAME VERSION · replay within 24h</span><span className="font-bold text-cyan-300">FREE</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">TOTAL · ≈ $0.06</span><span className="font-bold text-amber-300">−6.00 🪙</span></div>
          <p className="pt-1 text-[11px] text-slate-500">still-playing check every 5h · heartbeats bill the delta · devs set 0–100 coins/load+hr</p>
        </div>
      </MockWindow>
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Load fee (default 1 coin / MiB):</strong> proportional to exact bytes — sub-MB loads pay their exact fraction down to 1 centicentcoin. Same version free 24h.</li>
        <li><strong className="text-foreground">Running play (default 1 coin/hr):</strong> billed per second from the first second — 100 centicentcoins over 3,600 seconds. 1-minute heartbeats bill only the delta.</li>
        <li><strong className="text-foreground">Developer rates 0–100:</strong> mapped devs set their own per-load + per-hour; 0 = free game. The public price list is always visible first.</li>
        <li><strong className="text-foreground">AI bills on top, only when used</strong> — see <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>.</li>
      </ul>

      <SectionHead
        index="3"
        kicker="No account? no problem"
        title="Guests play free (with skips)"
        body="Guests never pay: a guest pass (IP-throttled) gives 3 free loads/day, then instantly-skippable house ads keep you playing, with a banner every 30 minutes. Trade-off: no saves, multiplayer, AI, or Buddy."
      />
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        {["🪙 Coins", "🤖 Buddy", "👾 Clans", "☁️ Agents", "⚙️ Testing", "🏆 Boards"].map((t) => (
          <span key={t} className="rounded-full border border-border bg-card px-3 py-1.5">{t} <span className="text-muted-foreground">· Skip ⏩</span></span>
        ))}
      </div>

      <SectionHead
        index="4"
        kicker="Save states"
        title="Cloud saves, slots 1–3"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {["SLOT 1", "SLOT 2", "SLOT 3"].map((s, i) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="font-mono text-xs font-black tracking-widest text-muted-foreground">{s}</p>
            <p aria-hidden="true" className="mt-1 text-3xl">{i === 2 ? "🚫" : "💾"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{i === 2 ? "Cheat-branded. Still playable, forever flagged." : "≤1 MiB · versioned · yours"}</p>
          </div>
        ))}
      </div>
      <Callout tone="rose" title="Cheat Mode is a tattoo, not a sticker.">
        Enabling cheats permanently marks that save (<code>cheat_mode:true</code>) as a database invariant —
        deleting and recreating the save cannot launder it. Experiment on a throwaway slot.
      </Callout>

      <SectionHead
        index="5"
        kicker="Glory"
        title="Telemetry, leaderboards, lobbies"
        body="Gameplay emits aggregate events powering /leaderboards (handles + totals, anonymous-friendly). Telemetry never decides billing — the rental session does. Find humans in /lobbies and join via ?match= links; for a permanent home, join a clan."
      />

      <Pager current="/docs/playing-games" />
    </article>
  );
}
