import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/faq" },
  title: "MMO FAQ",
  description:
    "MMO billing and access answers: why per-minute metering, what 402 and 403 mean, quote-mismatch retries, and what happens when the host runs dry.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

const FAQS: [string, string, string][] = [
  ["⏱️", "Why per-minute instead of flat?", "Because the costs are per-minute: server compute ticks while the shard is live, load follows actual bytes moved, and the host's hourly rental prorates per minute. Per-minute metering means a 10-minute drop-in costs a sixth of an hour-long siege — and a stopped shard bills nothing further."],
  ["🪙", "What is the coin math?", "100 coins is exactly $1.00 (1 coin = $0.01, 1 coin = 100 centicentcoins). Every figure already includes the 25% platform cut — never added on top. Money math runs in integer centicentcoins, so split shares land dust-free."],
  ["💳", "What does 402 mean?", "Insufficient coins for this session. The billing check compares your quoted share against your live ledger balance (SUM over coin_ledger, read-only) before anything moves — short balance answers 402 and nothing is billed. Top up, confirm the shown total again, and retry."],
  ["🚫", "What does 403 mean?", "Band-blocked, not broke. Your band may not enter that shard's band (kids→kids-only, teens→kids+teens, adults→all), or the room sits below its game's minimum band. The reason names both bands. Coins are untouched — fix the room choice, not the wallet."],
  ["🔁", "Why did my confirm answer 400?", "Quote mismatch: the accepted total must equal the quoted player total exactly. Prices move as players join and leave, so re-read the fresh quote and confirm that figure. Malformed input and unknown servers also answer 400 — never a charge."],
  ["🪫", "What happens when the host runs dry?", "Fail-closed, same as players: the short side answers 402 and nothing bills — nobody is half-charged and no phantom session is written. Until the guarded ledger settlement lands, both rent and billing return quotes only (charged: false), so past quotes are never back-billed."],
  ["🆓", "When is play actually free?", "Kids rooms (0 coins per player per minute) and any room whose host flips hostFree — the host pays server + load + rental, players pay 0. Your receipt is /my/usage/; your balance is always SUM(delta) over your ledger rows."],
  ["🔞", "Do you store my birthday for the gate?", "Never stored. Game-play gates check it in memory on your device only. MMO shard entry sends it once to same-origin POST /api/age-verify, used in memory to mint a signed band pass and then dropped — never written, logged, forwarded, or echoed back. The shard gate itself compares bands only."],
];

export default function MmoFaqPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmo faq"
        title={<>Short answers. <span className={theme.title}>Honest meters.</span></>}
        lede={<>Why the meter ticks per minute, what 402 and 403 actually mean, and what happens when any side of the table runs dry. Every answer below describes a gate the code enforces.</>}
        stats={[
          ["402", "short funds · nothing billed"],
          ["403", "wrong band · coins untouched"],
          ["400", "stale quote · confirm again"],
          ["100 🪙", "= exactly $1.00"],
        ]}
        glyph="❓"
        theme={theme}
        crumb="FAQ"
      />

      <SectionHead
        index="?"
        kicker="The lightning round"
        title="Questions, answered"
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {FAQS.map(([icon, q, a], i) => (
          <details
            key={q}
            className="group rounded-2xl border border-border bg-card transition open:border-emerald-400/50 open:shadow-xl"
          >
            <summary className="flex cursor-pointer items-start gap-3 p-4 font-bold">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 text-lg">
                {icon}
              </span>
              <span className="flex-1">
                <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Q{String(i + 1).padStart(2, "0")}</span>
                {q}
              </span>
              <span aria-hidden="true" className="text-muted-foreground transition group-open:rotate-180">▾</span>
            </summary>
            <p className="px-4 pb-4 pl-[4.25rem] text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>

      <SectionHead
        index="🧾"
        kicker="Status decoder"
        title="Read the number, take the step"
        body="Three digits cover nearly every MMO hiccup. Anything else names itself in the reason string."
      />
      <MockWindow title="mmo status decoder" badge="cheat sheet">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">400 · bad input / stale quote</span><span className="font-bold text-cyan-300">re-confirm total</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">401 · not signed in</span><span className="font-bold text-cyan-300">sign in + retry</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">402 · short funds</span><span className="font-bold text-amber-300">top up · nothing billed</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">403 · band blocked</span><span className="font-bold text-rose-300">pick another room</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">429 · rate limited</span><span className="font-bold text-slate-200">wait + retry</span></div>
          <p className="pt-1 text-[11px] text-slate-500">balance always SUM(delta) over coin_ledger · no parallel balance column</p>
        </div>
      </MockWindow>
      <Callout tone="gold" title="The two MMO answers, shortest version.">
        Short funds → top up; the 402 billed nothing. Wrong room → the 403 names both bands; the wallet is untouched. Still stuck? Write <Link className="underline" href="/docs/faq">support like a pro</Link> with the shard URL, both bands, and a <Link className="underline" href="/my/usage/">/my/usage/</Link> screenshot.
      </Callout>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmo/player"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← Player guide</p>
          <p className="mt-1 text-sm text-muted-foreground">Join, coin math, free-play.</p>
        </Link>
        <Link
          href="/docs/mmo/host"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🏠 Host guide</p>
          <p className="mt-1 text-sm text-muted-foreground">Rent, subsidy, population.</p>
        </Link>
        <Link
          href="/docs/mmo/safety"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Safety</p>
          <p className="mt-1 text-sm text-muted-foreground">Bands, birthdays, chat, reports.</p>
        </Link>
      </div>
    </article>
  );
}
