import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

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
        lede={<>Preserved browser games in isolated play shells - guides, cloud saves, leaderboards, guest passes, coin-metered rentals. A 5-hour session on default rates costs about 6 coins.</>}
        stats={[
          ["34", "playable games"],
          ["~6 🪙", "per 5-hour session"],
          ["3/day", "free guest loads"],
          ["4", "save slots / game"],
          ["60s", "heartbeats bill the delta"],
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
        body="The catalog at /games lists all 34 titles. Each game has a detail page (guide link, metadata, play-rate badge, AI badges) and a play page - the PlayGate shell around the isolated frame. Add ?match= to a play URL to join a match."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🖺️ Detail page", "/games/[slug]", "Read the guide when present - controls, scoring, secrets. Check the rate badge before you play."],
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
        body="Signed-in play never shows ads - it meters coins instead, with the 25% cut already inside every figure. Two parts:"
      />
      <MockWindow title="4weird.com - play session receipt" badge="live meter">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">LOAD · 1.0 MiB fresh bytes</span><span className="font-bold text-emerald-300">−1.00 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">PLAY · 5h Ö 1 coin/hr, per-second</span><span className="font-bold text-emerald-300">−5.00 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SAME VERSION · replay within 24h</span><span className="font-bold text-cyan-300">FREE</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">TOTAL · ≈ $0.06</span><span className="font-bold text-amber-300">−6.00 🪙</span></div>
          <p className="pt-1 text-[11px] text-slate-500">still-playing check every 5h · heartbeats bill the delta · devs set 0-100 coins/load+hr</p>
        </div>
      </MockWindow>
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Load fee (default 1 coin / MiB):</strong> proportional to exact bytes - sub-MB loads pay their exact fraction down to 1 centicentcoin. Same version free 24h.</li>
        <li><strong className="text-foreground">Running play (default 1 coin/hr):</strong> billed per second from the first second - 100 centicentcoins over 3,600 seconds. 1-minute heartbeats bill only the delta.</li>
        <li><strong className="text-foreground">Developer rates 0-100:</strong> mapped devs set their own per-load + per-hour; 0 = free game. The public price list is always visible first.</li>
        <li><strong className="text-foreground">AI bills on top, only when used</strong> - see <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>.</li>
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
        title="Cloud saves, slots 0-3"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {["SLOT 0", "SLOT 1", "SLOT 2", "SLOT 3"].map((s, i) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="font-mono text-xs font-black tracking-widest text-muted-foreground">{s}</p>
            <p aria-hidden="true" className="mt-1 text-3xl">{i === 0 ? "🛡️" : i === 3 ? "🚫" : "💾"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{i === 0 ? "Cheat-proof safety slot. Can never be marked." : i === 3 ? "Cheat-branded. Still playable, forever flagged." : "≤1 MiB · versioned · yours"}</p>
          </div>
        ))}
      </div>
      <Callout tone="rose" title="Cheat Mode is a tattoo, not a sticker.">
        Enabling cheats permanently marks that save (<code>cheat_mode:true</code>) as a database invariant -
        deleting and recreating the save cannot launder it. Experiment on a throwaway slot. Slot 0 can never be
        marked or allow cheats, so it is always safe.
      </Callout>

      <SectionHead
        index="5"
        kicker="Glory"
        title="Telemetry, leaderboards, lobbies"
        body="Gameplay emits aggregate events powering /leaderboards (handles + totals, anonymous-friendly). Telemetry never decides billing - the rental session does. Find humans in /lobbies and join via ?match= links; for a permanent home, join a clan."
      />
      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="font-black">Party up in GraveGain</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Multiplayer lives in three cabinets: GraveGain1D (&ldquo;Ley-Line Race&rdquo;, Teens 13+),
          GraveGain2D (&ldquo;Dungeon Duel&rdquo;, Adults 18+), and GraveGain3D (&ldquo;Spire Siege&rdquo;, Adults 18+).
          Age ratings are unchanged and the server enforces them - entering a birthday can&apos;t overrule your band.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Quick-match:</strong> POST /api/matches pairs you with opponents.</li>
          <li><strong className="text-foreground">Party invites:</strong> /api/lobbies - invite friends, then join with a ?match=&lt;uuid&gt; link.</li>
          <li><strong className="text-foreground">In the match:</strong> live progress, an event feed, emotes, and chat (140 characters max per message).</li>
          <li><strong className="text-foreground">Run it back:</strong> rematch from the result screen when the dust settles.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Signed-in players only - guests are excluded from multiplayer, like saves, AI, and Buddy.
          Fair play is structural: there are no purchasable advantages, and multiplayer boosts are banned,
          so every match is won on skill.
        </p>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="font-black">GraveGain multiplayer guide</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Controls recap (same keys as solo): GraveGain2D - WASD / arrows move, left-click melee,
          right-click timed block, F race ability, Shift sprint, 1/2/3 temporal mode, Esc/P pause.
          GraveGain3D - WASD move, mouse look, left-click melee/skill (hold to charge), right-click
          block/projectile, F / Shift ability, Space jump, Q potion (drink under half health), E enter
          buildings, Esc/P pause. GraveGain1D has no separate static guide yet, so its keys require
          reading the on-screen help in the play shell before you queue.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Mode rules: every mode requires the same loop - quick-match or lobby invite, play the live match,
          rematch from the results. Exact scoring per mode requires the match shell&apos;s rules line; the names
          signal the format: Ley-Line Race (1D) is a race, Dungeon Duel (2D) is a head-to-head dungeon run,
          Spire Siege (3D) is a siege on the spire.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Etiquette: keep chat under 140 characters and readable, use emotes over taunts, and never hold a
          lobby hostage - if you must leave, leave between matches, not mid-fight.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">401 from a match call</strong> requires a signed-in session - sign in and retry.</li>
          <li><strong className="text-foreground">Stuck waiting</strong> requires no patience beyond action - try a lobby invite or re-queue quick-match.</li>
          <li><strong className="text-foreground">Stale match link</strong> requires a fresh start - rematch from the results or ask for a new ?match= link.</li>
        </ul>
      </div>

      <SectionHead
        index="6"
        kicker="Start · heartbeat · end"
        title="The session lifecycle"
        body="Every signed-in play session is three verbs against one endpoint. Start opens the meter, heartbeats drip coins per second, end settles the tab."
      />
      <MockWindow title="4weird.com - session ledger" badge="per-second">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">START · fresh bytes + version</span><span className="font-bold text-emerald-300">load fee</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">HEARTBEAT · +60s visible-tab</span><span className="font-bold text-emerald-300">delta only</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">END · session closed</span><span className="font-bold text-cyan-300">settled</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">402 · short funds → top up</span><span className="font-bold text-amber-300">403 · band blocked</span></div>
          <p className="pt-1 text-[11px] text-slate-500">POST /api/games/session · actions start, heartbeat, end · each beat covers at most 5 min</p>
        </div>
      </MockWindow>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">🟢 Start: version-aware</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Starting names the game, the bundle version, and how many fresh bytes loaded. Zero fresh bytes
            costs zero - and a version you already paid for in the last 24 hours replays free.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">💓 Heartbeat: the honest delta</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The shell reports visible-tab seconds about every minute, and only the new seconds since the
            last beat are debited - beats can never double-bill, and one beat covers at most 5 minutes.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">🔚 End: errors with manners</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Short funds answer 402 (time to top up), age and band problems answer 403 (never &ldquo;metering
            is down&rdquo;). Only true outages fall back - everything else tells you exactly what to do.
          </p>
        </div>
      </div>
      <Callout tone="violet" title="Bots may grind too.">
        Signed-in automation is welcome at the meter: an AI playing through a real session pays coins exactly
        like human play. Anti-cheat lives elsewhere - the cheat-mark invariant, rate limits, and aggregate
        leaderboards. Only anonymous free-play abuse meets the bot gate.
      </Callout>

      <SectionHead
        index="7"
        kicker="Two switches, one tattoo"
        title="Cheat settings: per-slot + global"
        body="Cheats have two switches that OR together - one for this game + slot, one master switch for everything. Either one on means cheats on."
      />
      <Steps
        items={[
          ["Flip one slot", <>Point at a game + slot (1-3) and set it on or off. The server records the moment with a timestamp - and that timestamp is what brands the save&apos;s <code>cheat_mode</code> forever.</>],
          ["Or flip the whole sky", <>One master switch covers every game and every slot at once. The play shell reads both: per-slot <strong>or</strong> global on means cheats are on for that session.</>],
          ["Slot 0 refuses", <>Ask for cheats on slot 0 and the server answers <code>400</code>: that slot is cheat-proof and can never allow cheats. Saves written there get any client-supplied marker stripped automatically.</>],
        ]}
      />
      <MockWindow title="4weird.com - cheat status" badge="slot 2">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">PER-SLOT · this game + slot</span><span className="font-bold text-rose-300">ON</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">GLOBAL · every game, every slot</span><span className="font-bold text-slate-300">OFF</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">EFFECTIVE · either switch on</span><span className="font-bold text-rose-300">CHEATS ON</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">SLOT 0 · asks for cheats</span><span className="font-bold text-emerald-300">400 NO</span></div>
          <p className="pt-1 text-[11px] text-slate-500">GET + PUT /api/cheats · per-slot or the all-games scope · saves keep cheat_mode:true forever</p>
        </div>
      </MockWindow>
      <Callout tone="rose" title="There is no reset button - on purpose.">
        Cloud saves <strong>cannot be deleted from the client at all</strong> (the request is refused), and an
        old cheat mark is re-applied over every new write to that slot. A database trigger enforces the same
        rule for anything that skips the API. Slot 0 is your fresh start - guard it.
      </Callout>

      <SectionHead
        index="8"
        kicker="Free doors + fenced yards"
        title="Guests, age gates, and glory details"
        body="No account? The arcade still lets you in - through a smaller door, with house ads for company. And some cabinets card you at the entrance."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">🎟️ Guests: 3 free loads a day</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Each internet address gets <strong>3 free loads per day</strong> (20 loads max, gentle burst
            limits). Past the free ones, instantly-skippable house ads unlock more play - with a signed token
            chain so skipping the ad can&apos;t skip the deal. A banner drops by every 30 minutes mid-play.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">🔞 Age gates card at the door</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Most games are all-ages. Cartoon-combat titles (think neon invaders and platform wars) need
            Teens 13+, while intense horror and violence titles need Adult 18+. Your account&apos;s age band
            decides - entering a birthday can&apos;t overrule it.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">🎂 Birthdays never leave the couch</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a gate asks for a date of birth, it&apos;s checked in your browser&apos;s memory for that
            moment only - never sent to any server, never stored anywhere. There&apos;s nothing to leak
            because nothing was collected. Kids Mode is just a device flag, not age data.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50">
          <p className="font-black">📊 What glory remembers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Telemetry keeps kills, actions, active seconds, and deaths - and leaderboards show handles +
            totals only. It never touches billing: the rental session is the only meter that matters. Find
            humans in <Link className="underline" href="/lobbies">/lobbies</Link> and join via match links.
          </p>
        </div>
      </div>
      <Callout tone="cyan" title="Kids Mode hides the grown-up shelf.">
        Flip Kids Mode on and Adults (18+) games vanish from the catalog; Teens games still ask a 13+ check
        before playing. Under-13 players don&apos;t browse here at all - they play through a parent-created
        Child login with its own wallet, hours, and budget guards.
      </Callout>

      <Pager current="/docs/playing-games" />
    </article>
  );
}
