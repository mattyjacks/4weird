import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/age-bands" },
  title: "MMORPG age bands",
  description:
    "Who may enter which MMORPG shard on 4weird Games: adults enter all, teens enter kids and teens, kids enter kids-only. DOB is checked in memory only per lib/age-gate.ts and never stored.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmorpgAgeBandsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmorpg age bands"
        title={<>The gate is <span className={theme.title}>simple on purpose.</span></>}
        lede={<>Three bands, one entry rule, zero stored birthdays: your date of birth is checked in memory on your own device and never leaves it. Fail the gate and you wait — the page tells you exactly how long.</>}
        stats={[
          ["3", "bands: kids · teens · adults"],
          ["0", "birthdays stored, ever"],
          ["13 / 18", "gate ages for teens / adults"],
          ["1", "rule to memorize"],
        ]}
        glyph="🛡️"
        theme={theme}
        crumb="Age bands"
        art={
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {["🧒 Kids → kids", "🧑 Teens → kids + teens", "🧙 Adults → all"].map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The one rule"
        title="Adults enter all · teens enter kids + teens · kids enter kids-only"
        body="Every shard carries one band. Your band decides which doors open — never the other way around. Nobody enters above their band, ever."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ["🧒 kids", "Kids-only shards", "border-emerald-400/50 from-emerald-500/20 to-transparent", "Ages 0-12, no gate. Kids players enter kids shards only — the gentlest worlds, the strictest company."],
          ["🧑 teens", "Kids + teens shards", "border-cyan-400/50 from-cyan-500/20 to-transparent", "Ages 13-17, 13+ gate on gated devices. Teens players enter kids and teens shards — never adults shards."],
          ["🧙 adults", "Every shard", "border-teal-400/50 from-teal-500/20 to-transparent", "Ages 18+, always 18+ gated. Adults players enter kids, teens, and adults shards — with great power, etc."],
        ].map(([e, t, s, b]) => (
          <div key={t} className={`rounded-3xl border bg-gradient-to-b p-6 text-center transition hover:-translate-y-1 ${s}`}>
            <p aria-hidden="true" className="docs-float text-5xl">{e}</p>
            <p className="mt-3 font-black">{t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <MockWindow title="shard entry — emberfall raid (teens)" badge="gate check">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧒 kids player</span><span className="font-bold text-rose-300">DENIED · teens-only</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧑 teens player</span><span className="font-bold text-emerald-300">ENTER →</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧙 adults player</span><span className="font-bold text-emerald-300">ENTER →</span></div>
          <p className="pt-1 text-[11px] text-slate-500">denied players see the band + the wait, never a workaround</p>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="How the check works"
        title="DOB in memory only — never stored, never sent"
        body="The gate follows lib/age-gate.ts: you type a date of birth, the page derives your age fresh from that input, compares it to the band minimum (13 for teens, 18 for adults), and keeps only the pass/fail in React state for this page load."
      />
      <Steps
        items={[
          [
            "Enter your date of birth",
            <>Typed into the gate on your own device. The picker opens on a neutral placeholder — it knows nothing about you.</>,
          ],
          [
            "Age is derived fresh, in memory",
            <>A pure function compares the entered date against today&apos;s date. No fetch, no Supabase, no cookies, no localStorage — the input is used for this call and never stored.</>,
          ],
          [
            "Only the verdict lives on — briefly",
            <>Pass or fail stays in page state until reload. Your age itself is never stored either; every check re-derives it from a freshly entered date.</>,
          ],
          [
            "Too young? You get a date, not a shrug",
            <>Failed gates report exactly how long the wait is (years, months, days) and the first eligible date — then the input is gone with the page.</>,
          ],
        ]}
      />
      <Callout tone="emerald" title="Privacy is the feature, not the footnote.">
        Date of birth is never sent to any API, never written to any table, and never persisted anywhere — the same
        guarantee as every other age gate on the site. See <code>lib/age-gate.ts</code> for the implementation.
      </Callout>

      <SectionHead
        index="3"
        kicker="Hosts, take note"
        title="Your band choice is your audience"
        body="Set the band when you rent the server — it locks for the shard's whole life. A kids band means everyone can enter but the content must stay gentle; an adults band means intense combat but teens and kids can never join."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🎯 Match band to content</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Horror and intense violence belong in adults shards. Cartoon combat fits teens. If kids can enter, keep it
            kind — the band is a promise to parents.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🚫 No upgrades mid-shard</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bands never change after rent. Want a different audience? Rent a new server — the old shard keeps its
            promise to the players already inside.
          </p>
        </div>
      </div>
      <Callout tone="rose" title="Never repost to dodge the gate.">
        Shard bands, like clan reports, are safety tooling — trying to sneak underage players into an adults shard
        risks the shard and the account. Rent the right band instead.
      </Callout>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/mmo"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← MMORPG mode</p>
          <p className="mt-1 text-sm text-muted-foreground">Shards, dimensions, world bosses.</p>
        </Link>
        <Link
          href="/docs/mmo/hosting"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🏠 Hosting →</p>
          <p className="mt-1 text-sm text-muted-foreground">Rent the server these rules guard.</p>
        </Link>
        <Link
          href="/docs/privacy-safety"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🛡️ Privacy &amp; safety</p>
          <p className="mt-1 text-sm text-muted-foreground">Rights, moderation, reports.</p>
        </Link>
      </div>
    </article>
  );
}
