import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Steps, Callout, Pager } from "@/components/docs/docs-bits";

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
        lede={<>From zero to playing, saving, earning, and renting in about 15 minutes — using only the website. No downloads, no setup, no datacenter degree.</>}
        stats={[
          ["2 min", "to an account"],
          ["100 🪙", "free trial"],
          ["5–12 🪙", "daily bonus"],
          ["25/25", "referral split"],
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
          ["Sign up, get 100 coins", <>Open <Link className="font-bold underline" href="/auth/sign-up">/auth/sign-up</Link> and register. New accounts receive a <strong>free 100-coin ($1.00) trial</strong> — once per person. Your dashboard confirms the award.</>],
          ["Sign in, see the switch", <>Log in at <Link className="font-bold underline" href="/auth/login">/auth/login</Link>. The header flips from Login / Sign Up to <strong>Dashboard</strong> — your proof of orbit.</>],
          ["Look around free", <>Reading is public: catalog, clans, leaderboards, pricing. You only need the account when you <strong>post, save, rent, or use AI</strong>.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Mission control"
        title="Tour your account hub"
        body="Your dashboard at /account: balance (coins + fractional centicentcoins), checkout, daily claim, referral code, grant recovery — plus doors to usage and rights."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["📅 Daily bonus", "One button, once per UTC day — 5 coins + 1 per streak day, capped at 12. Streaks pay."],
          ["💌 Referrals 25/25", "Share your 8-character code. Someone redeems it → you both get 25 coins. No self-use."],
          ["🛒 Buy coins", "500 / 1,500 / 5,000 / 25,000 packs + custom 500–100,000 at 1¢/coin. Shopify checkout, reconciled by order email."],
          ["🧾 Audit everything", "/my/usage/ itemizes every cent — rentals, AI, Buddy, clan fees, workspace cloud."],
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
          ["🕹️ 0:00 — Play", "Pick a game on /games, read its guide, hit Play. Signed-in play meters coins; guests get ads."],
          ["💾 0:05 — Save", "Use slots 1–3, then check /leaderboards for kills, actions, play-time."],
          ["👾 0:08 — Belong", "Join a clan on /clans, say hi in #general, react to a post."],
          ["🎙️ 0:12 — Coach", "Open /buddy or the play-page widget and ask for coaching."],
        ].map(([t, b]) => (
          <div key={t} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Callout tone="rose" title="Don't touch that button (yet): Cheat Mode.">
        Enabling cheats permanently brands that save (<code>cheat_mode:true</code>) — delete/recreate cannot launder it.
        Experiment on a throwaway slot. Full story in <Link className="underline" href="/docs/playing-games">Playing games</Link>.
      </Callout>

      <SectionHead
        index="4"
        kicker="Stay safe up there"
        title="Account hygiene"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">📧 <strong className="text-foreground">Keep your email current</strong> — checkout grants, referrals, and rights flows key off it.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚪 <strong className="text-foreground">Log out on shared devices</strong> via the logout action on /account.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚫 <strong className="text-foreground">One trial per person.</strong> Farming trials with extra accounts violates the Terms and is blocked.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔒 <strong className="text-foreground">Need out?</strong> Self-serve export + deletion at <Link className="underline" href="/my/rights">/my/rights</Link> — see <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.</li>
      </ul>

      <Pager current="/docs/getting-started" />
    </article>
  );
}
