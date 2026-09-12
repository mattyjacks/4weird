import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Steps, Callout, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/getting-started" },
  title: "Getting started",
  description:
    "Create a 4weird account, claim the 100-coin trial and daily bonus, tour the account hub, and do your first useful things in 15 minutes.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function GettingStartedPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · zero to playing in 15 min"
        title={<>Launch sequence: <span className={theme.title}>3… 2… 1…</span></>}
        lede={<>From zero to playing, saving, earning, and renting in about 15 minutes - using only the website. No downloads, no setup, no datacenter degree.</>}
        stats={[
          ["2 min", "to an account"],
          ["100 🪙", "free trial"],
          ["5-12 🪙", "daily bonus"],
          ["25/25", "referral split"],
          ["13+", "Teen or Adult band"],
        ]}
        glyph="🚀"
        theme={theme}
        crumb="Getting started"
      />

      <SectionHead
        index="1"
        kicker="T-minus 13 minutes"
        title="Create your account"
        body="Two minutes, one email, one password. Passwords need 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols."
      />
      <Steps
        items={[
          ["Sign up, get 100 coins", <>Open <Link className="font-bold underline" href="/auth/sign-up">/auth/sign-up</Link> and register. New accounts receive a <strong>free 100-coin ($1.00) trial</strong> - once per person. Your dashboard confirms the award.</>],
          ["Sign in, see the switch", <>Log in at <Link className="font-bold underline" href="/auth/login">/auth/login</Link>. The header flips from Login / Sign Up to <strong>Dashboard</strong> - your proof of orbit.</>],
          ["Look around free", <>Reading is public: catalog, clans, leaderboards, pricing. You only need the account when you <strong>post, save, rent, or use AI</strong>.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Mission control"
        title="Tour your account hub"
        body="Your dashboard at /account: balance (coins + fractional centicentcoins), checkout, daily claim, referral code, grant recovery - plus doors to usage and rights."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["📅 Daily bonus", "One button, once per UTC day - 5 coins + 1 per streak day, capped at 12. Streaks pay."],
          ["💌 Referrals 25/25", "Share your 8-character code. Someone redeems it → you both get 25 coins. No self-use."],
          ["🛒 Buy coins", "500 / 1,500 / 5,000 / 25,000 packs + custom 500-100,000 at 1¢/coin. Shopify checkout, reconciled by order email."],
          ["🧾 Audit everything", "/my/usage/ itemizes every cent - rentals, AI, Buddy, clan fees, workspace cloud."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="First orbit"
        title="Your first 15 minutes"
        body="A flight plan. Do all four and you'll have touched every major system on the site."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["🕹️ 0:00 - Play", "Pick a game on /games, read its guide, hit Play. Signed-in play meters coins; guests get ads."],
          ["💾 0:05 - Save", "Use slots 0-3 (slot 0 is cheat-proof), then check /leaderboards for kills, actions, play-time."],
          ["👾 0:08 - Belong", "Join a clan on /clans, say hi in #general, react to a post."],
          ["🎙️ 0:12 - Coach", "Open /buddy or the play-page widget and ask for coaching."],
        ].map(([t, b]) => (
          <div key={t} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Callout tone="rose" title="Don't touch that button (yet): Cheat Mode.">
        Enabling cheats permanently brands that save (<code>cheat_mode:true</code>) - delete/recreate cannot launder it.
        Experiment on a throwaway slot. Slot 0 can never be marked, so it is always safe. Full story in <Link className="underline" href="/docs/playing-games">Playing games</Link>.
      </Callout>

      <SectionHead
        index="4"
        kicker="Stay safe up there"
        title="Account hygiene"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">📧 <strong className="text-foreground">Keep your email current</strong> - checkout grants, referrals, and rights flows key off it.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚪 <strong className="text-foreground">Log out on shared devices</strong> via the logout action on /account.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚫 <strong className="text-foreground">One trial per person.</strong> Farming trials with extra accounts violates the Terms and is blocked.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔒 <strong className="text-foreground">Need out?</strong> Self-serve export + deletion at <Link className="underline" href="/my/rights">/my/rights</Link> - see <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.</li>
        <li className="rounded-xl border border-border bg-card p-3">🤖 <strong className="text-foreground">Next: give your agent a key + rent it cloud time.</strong> Keys at <Link className="underline" href="/bot/setup">/bot/setup</Link> (leak-free Windows code included), cloud NanoClaw on <Link className="underline" href="/agents">/agents</Link> - guides <Link className="underline" href="/docs/bots">Bots</Link> + <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link>.</li>
      </ul>

      <SectionHead
        index="5"
        kicker="Who are you, player?"
        title="Pick your age band at signup"
        body="There is no birthday box on the signup form - just your word. Choose the band that fits, because rated games and purchases check it later."
      />
      <Steps
        items={[
          ["Teen or Adult - your call", <>The form at <Link className="font-bold underline" href="/auth/sign-up">/auth/sign-up</Link> asks for email, password, and one choice: <strong>Teen (13-17)</strong> or <strong>Adult (18+)</strong>. It travels with the signup request alongside your email and a local consent flag - and lying about it violates the Terms.</>],
          ["Under 13? Bring a grown-up", <>Picking the under-13 option stops the form cold and points you the right way: a parent or guardian signs up as <strong>Adult (18+)</strong>, then creates your Child account under Account → Family. Only Adult accounts can create Child sub-accounts or make purchases.</>],
          ["Passwords with opinions", <>New passwords need <strong>8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols</strong> - so &ldquo;password&rdquo; and &ldquo;aaaaaaaa&rdquo; never make it. Login never re-judges an old password; the strength rule only applies when a password is chosen.</>],
        ]}
      />
      <Callout tone="cyan" title="No band yet? Rated games wait.">
        Accounts created before bands existed show <strong>not set</strong> - pick Teen or Adult in Account
        settings to unlock rated games. And here&apos;s the receipt behind the header flip:{" "}
        <code>/api/auth/session</code> answers with just your id + email - or <code>401 Login required</code>.
        That tiny answer is what turns Login / Sign Up into Dashboard.
      </Callout>

      <SectionHead
        index="6"
        kicker="The human ritual"
        title="The daily bonus pays streaks"
        body="One button, once per UTC day, humans only. The longer your streak, the fatter the envelope - up to a point."
      />
      <MockWindow title="4weird.com - daily bonus receipt" badge="one award / day">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">DAY 1 · streak starts</span><span className="font-bold text-emerald-300">+5 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">DAY 4 · streak 4</span><span className="font-bold text-emerald-300">+8 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">DAY 8+ · capped</span><span className="font-bold text-emerald-300">+12 🪙</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">SECOND CLAIM · same UTC day</span><span className="font-bold text-slate-400">+0 (already paid)</span></div>
          <p className="pt-1 text-[11px] text-slate-500">POST /api/coins/daily · 5 coins + 1 per streak day, capped at 12 · bots need not apply</p>
        </div>
      </MockWindow>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
          <p className="font-black">🗓️ UTC days, server math</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Streaks count consecutive UTC days, and the date math lives in a server routine - so hammering
            the button concurrently still settles to a single award. A second claim the same day pays 0.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
          <p className="font-black">🤖 Humans only, really</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The claim faces a humanity check that even valid bot keys can&apos;t skip - your automations may
            do everything else, but the bonus stays a real human&apos;s. Burst spam is throttled on top.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
          <p className="font-black">🧾 Bought coins? Recover them</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid but never arrived? The grant-recovery flow matches unclaimed grants by your order email and
            writes the ledger first - so a retry storm can never mint the same coins twice.
          </p>
        </div>
      </div>

      <SectionHead
        index="7"
        kicker="Bring a friend, both get paid"
        title="Referrals: 25 coins each way"
        body="Your dashboard holds a referral code. A newcomer redeems it, and the vault pays both sides - no self-use, no double-dipping."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
          <p className="font-black">💌 25 / 25, exactly</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inviter and invitee each get <strong>25 coins</strong> when a code is redeemed. Each newcomer can
            redeem only one code - a second try is turned away, already-used.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50">
          <p className="font-black">🛡️ Humans, one at a time</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Redeeming a code needs a logged-in human (bot keys don&apos;t count) and is throttled per
            account - the server routine settles races so one code can&apos;t pay the same newcomer twice.
          </p>
        </div>
      </div>
      <Callout tone="emerald" title="Free coins never refund, never expire into cash.">
        Trial, daily, and referral coins are yours to play with - but only unspent <strong>purchased</strong>{" "}
        coins can ever be refunded, and no coins convert to cash. Balances, streaks, codes, and every ledger
        row are all visible from <Link className="underline" href="/account">/account</Link>.
      </Callout>

      <Pager current="/docs/getting-started" />
    </article>
  );
}
