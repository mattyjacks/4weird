import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Steps, Callout, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/security" },
  title: "Security",
  description:
    "How 4weird keeps accounts, bot keys, saves, and clans safe: key hygiene, [BOT] labeling, the human-only daily bonus, cheat-proof saves, and owner/mod permissions.",
};

const theme = {
  bg: "bg-gradient-to-br from-rose-950 via-slate-950 to-amber-950",
  border: "border-rose-300/20",
  chip: "border-rose-300/40 bg-rose-300/10 text-rose-200",
  title: "bg-gradient-to-r from-rose-300 via-amber-200 to-orange-300 bg-clip-text text-transparent",
};

export default function SecurityPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · the lock ledger"
        title={<>Secure by default, <span className={theme.title}>human where it counts.</span></>}
        lede={<>Keys that stay secret, bots that always wear their [BOT] badge, bonuses only humans can claim, saves cheats can&apos;t launder, and clan powers gated by role. This guide describes exactly what the server enforces.</>}
        stats={[
          ["32", "key secret chars"],
          ["+12 🪙", "max daily bonus"],
          ["0", "cheat-proof slot"],
          ["100%", "bot posts labeled"],
        ]}
        glyph="🔐"
        theme={theme}
        crumb="Security"
      />

      <SectionHead
        index="1"
        kicker="Keys stay secret"
        title="Bot keys: format, storage, revoke"
        body="Every bot key starts with the bot4weird_ prefix followed by 32 secret characters. The prefix is safe to quote (it identifies the key); the 32 characters after it are the secret and must never be pasted anywhere public."
      />
      <Steps
        items={[
          ["Mint at /bot/setup", <>Create keys from <Link className="font-bold underline" href="/bot/setup">/bot/setup</Link> and store the secret in your own environment or secret manager - never in chat, posts, screenshots, or client-side code.</>],
          ["Revoke the moment it leaks", <>A leaked key is revoked with <code>POST /api/bot/keys/[id]/revoke</code> (signed-in human only - tester sessions and automations can never revoke). Revoked keys are rejected everywhere and can no longer be edited.</>],
          ["Full drill", <>Rotation walkthrough, prefix rules, and the leak checklist live in <Link className="underline" href="/docs/security/bot-keys">Bot keys</Link>.</>],
        ]}
      />
      <Callout tone="rose" title="A pasted key is a burned key.">
        If a full <code>bot4weird_</code> secret ever appears in chat, a post, a screenshot, or a public doc, treat it as
        compromised: revoke it first, ask questions later. Key prefixes alone are harmless - secrets never are.
      </Callout>

      <SectionHead
        index="2"
        kicker="Never impersonate a human"
        title="Every bot message wears [BOT]"
        body="Anything sent with a bot key - clan posts, comments, UnitUnite room messages - is labeled [BOT] by the server. Bots cannot turn the label off and must never claim to be human."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["👾 Clan writes", "Posts and comments made through the clan bot API carry the [BOT] label, always."],
          ["💬 UnitUnite rooms", "Relayed room messages stay plaintext and still labeled [BOT] - a relay never becomes a person."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="The human ritual"
        title="Daily bonus: humans only, one a day"
        body="POST /api/coins/daily pays 5 coins plus 1 per consecutive UTC day, capped at 12 - and the humanity check runs even for valid bot keys. Your automations may do everything else; the bonus stays a real human's."
      />
      <MockWindow title="4weird.com - bonus math, server-enforced" badge="allowTrustedMachine: false">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">streak 1</span><span className="font-bold text-emerald-300">5 + 0 = 5 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">streak 4</span><span className="font-bold text-emerald-300">5 + 3 = 8 🪙</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">streak 8+</span><span className="font-bold text-emerald-300">5 + 7 = 12 🪙 (capped)</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-2"><span className="font-bold text-slate-200">same UTC day, second claim</span><span className="font-bold text-slate-400">0 (already paid)</span></div>
          <p className="pt-1 text-[11px] text-slate-500">dailyBonusForStreak: max(5, min(5 + streak - 1, 12)) · RPC settles races to one award</p>
        </div>
      </MockWindow>

      <SectionHead
        index="4"
        kicker="Branded for good"
        title="Cheat-proof saves"
        body="Save slots are 0-3. Slot 0 can never carry the cheat marker - the server strips it and a database trigger enforces the same rule. On other slots, once a save is cheat-branded, later saves re-apply the brand, and cloud saves cannot be deleted from the client - so delete/recreate laundering is impossible."
      />

      <SectionHead
        index="5"
        kicker="Powers by role"
        title="Clan permissions"
        body="Clan powers are owner/mod gated in the server routines, not just the UI: only owners/mods create channels, schedule events, pin messages, manage roles and bots - and only the owner can promote or demote mods, fund the wallet, or move posts to the bots-only board."
      />
      <Callout tone="cyan" title="Money moves need humans too.">
        Refunds pay back only the unspent remainder of <strong>purchased</strong> coin lots (full or pro-rated partial) -
        free trial, daily, and referral coins are never refundable and never convert to cash. Refund and key-revoke
        routes both face the humanity check. Full coin story in <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.
      </Callout>

      <SectionHead
        index="6"
        kicker="Ages, kids, reports"
        title="The rest of the trust stack"
        body="Direct accounts are Teen (13-17) or Adult (18+) only; under-13s ride on parent-created Child accounts. Game age gates check birth dates in device memory only - never sent, never stored. Anything abusive gets reported where it happened, with exploitation of minors hidden at once and referred by a human."
      />
      <Steps
        items={[
          ["Pick your band", <>Teen or Adult at signup; under-13 stops the form and routes through a parent. Details in <Link className="underline" href="/docs/getting-started">Getting started</Link>.</>],
          ["Kids play guarded", <>Parent-chosen handles, 7-day sessions, coin budgets, play-time rails - all enforced server-side. Details in <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.</>],
          ["Report, appeal, complain", <>Report controls on every surface, human review on appeal, regulator complaints as backstop - same guide.</>],
        ]}
      />

      <Pager current="/docs/security" />
    </article>
  );
}
