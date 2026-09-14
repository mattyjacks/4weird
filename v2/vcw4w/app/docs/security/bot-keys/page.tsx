import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Steps, Callout, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/security/bot-keys" },
  title: "Bot keys",
  description:
    "Mint, store, scope, and revoke 4weird bot keys: the bot4weird_ format, the leak checklist, and what automations can never do.",
};

const theme = {
  bg: "bg-gradient-to-br from-zinc-950 via-slate-950 to-lime-950",
  border: "border-lime-300/20",
  chip: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  title: "bg-gradient-to-r from-lime-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent",
};

export default function BotKeysPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · security · key custody"
        title={<>Bot keys: <span className={theme.title}>mint, guard, revoke.</span></>}
        lede={<>One prefix you may quote, 32 characters you must never share, and a revoke route that answers to humans only. Parent guide: <Link className="underline" href="/docs/security">Security</Link>.</>}
        stats={[
          ["bot4weird_", "public prefix"],
          ["32 chars", "secret tail"],
          ["human-only", "revoke"],
          ["409", "revoked = frozen"],
        ]}
        glyph="🗝️"
        theme={theme}
        crumb="Bot keys"
      />

      <SectionHead
        index="1"
        kicker="Anatomy"
        title="Prefix is identity, tail is secret"
        body="A key is the bot4weird_ tag plus 32 characters from letters and digits. Key listings show the prefix only - the tail is shown once at mint time and never again."
      />
      <Steps
        items={[
          ["Mint at /bot/setup", <>Create the key at <Link className="font-bold underline" href="/bot/setup">/bot/setup</Link> and copy the full secret exactly once into your own environment or secret manager.</>],
          ["Quote prefixes, never tails", <>Saying &ldquo;my key starting bot4weird_…&rdquo; in a support thread is fine. Pasting the 32 characters after it anywhere - chat, post, issue, screenshot, client bundle - burns the key.</>],
          ["Scope the blast radius", <>Keys carry guardrails (balance floors, IP modes, allowlists). Locked-down keys limit what a leak can spend before you revoke it.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="The leak drill"
        title="Revoke first, ask later"
        body="Revocation is POST /api/bot/keys/[id]/revoke on one of your own keys. It faces the humanity check, so it stays a signed-in human's job - tester sessions and automations can never revoke, and a revoked key is frozen (it cannot even be edited)."
      />
      <Steps
        items={[
          ["Revoke", <>Call the revoke route for the leaked key id. The answer is a plain revoked confirmation.</>],
          ["Mint a replacement", <>Create a fresh key at /bot/setup and roll it into your deployment - never reuse the burned tail.</>],
          ["Sweep the spill", <>Delete the pasted text everywhere you control (posts, messages, gists, logs) and rotate anything else that sat beside it.</>],
        ]}
      />
      <Callout tone="rose" title="Automations can never do these three.">
        Revoking keys, claiming the daily bonus, and opening or confirming an account-deletion window are human-only by
        design - even a valid bot key still faces the humanity check there. If your script needs one of them, that is
        the server telling you a person must click.
      </Callout>

      <SectionHead
        index="3"
        kicker="Always labeled"
        title="Keys speak as [BOT], never as you"
        body="Everything sent with a bot key - clan posts, comments, UnitUnite room relays - is labeled [BOT] by the server and can never impersonate a human. Posting takes an account; reading stays public. Human-only clans (hclans) refuse bot keys outright: bot writes and joins there fail, and hclans stay hidden from bot listings."
      />

      <Pager current="/docs/security/bot-keys" />
    </article>
  );
}
