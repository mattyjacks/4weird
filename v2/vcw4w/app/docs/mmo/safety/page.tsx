import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/mmo/safety" },
  title: "MMO safety",
  description:
    "How MMO shards stay kid-safe on 4weird Games: three age bands, birthdays checked in memory and never stored, 140-character chat limits, and in-product reporting.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function MmoSafetyPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · mmo safety"
        title={<>The gate is <span className={theme.title}>simple on purpose.</span></>}
        lede={<>Three bands, one entry rule, zero stored birthdays: a date of birth is checked in memory on your own device and never leaves it. Chat stays short, and every shard is reportable where it happened.</>}
        stats={[
          ["3", "bands: kids · teens · adults"],
          ["0", "birthdays stored, ever"],
          ["13 / 18", "gate ages for teens / adults"],
          ["140", "chars max per chat message"],
        ]}
        glyph="🛡️"
        theme={theme}
        crumb="Safety"
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
        body="Every shard carries one band. Your band decides which doors open — never the other way around. Unknown or forged bands fail closed: the gate denies instead of guessing, and unrated shards never pass a kid through."
      />
      <MockWindow title="shard entry — teens room" badge="gate check">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧒 kids player</span><span className="font-bold text-emerald-300">ENTER → kids rooms only</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧑 teens player</span><span className="font-bold text-emerald-300">ENTER →</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">🧙 adults player</span><span className="font-bold text-emerald-300">ENTER →</span></div>
          <p className="pt-1 text-[11px] text-slate-500">denied players see the band + the reason, never a workaround</p>
        </div>
      </MockWindow>
      <Callout tone="cyan" title="Hosts: your band choice is your audience.">
        Set the band when you rent — it locks for the shard&apos;s whole life. Horror and intense violence belong in adults shards; if kids can enter, keep it kind. Renting walkthrough: <Link className="underline" href="/docs/mmo/host">Host guide</Link>.
      </Callout>

      <SectionHead
        index="2"
        kicker="How the check works"
        title="DOB in memory only — never stored, sent once to mint your pass"
        body="Age checks run as a pure function on your own device: you type a date of birth, the page derives your age fresh against today's date, compares it to the band minimum (13 for teens, 18 for adults), and keeps only the pass/fail for this page load."
      />
      <Steps
        items={[
          [
            "Enter your date of birth",
            <>Typed into the gate on your own device. The picker opens on a neutral placeholder — it knows nothing about you.</>,
          ],
          [
            "Age is derived fresh, in memory",
            <>Sent once to same-origin POST /api/age-verify to mint a signed band pass — used in memory to derive the band, then dropped: never written to any table, never logged, never forwarded, never echoed back. Only the band attestation cookie is kept.</>,
          ],
          [
            "Only the verdict lives on — briefly",
            <>Pass or fail stays in page state until reload. Your age itself is never stored either; every check re-derives it from a freshly entered date.</>,
          ],
          [
            "Too young? You get a date, not a shrug",
            <>Failed gates report how long the wait is and the first eligible date — then the input is gone with the page.</>,
          ],
        ]}
      />
      <Callout tone="emerald" title="Privacy is the feature, not the footnote.">
        Your date of birth travels exactly once — inside a same-origin POST to /api/age-verify, used in memory to derive your band and then dropped. It is never written to any table, never logged, never forwarded, and never echoed back; only the signed band attestation is kept. The shard gate itself never reads a birthday at all: it compares bands only.
      </Callout>

      <SectionHead
        index="3"
        kicker="Talk + flag"
        title="Short chat, real reports"
        body="Match and shard chat messages cap at 140 characters — longer text is refused, not trimmed. When something crosses a line, report it where it happened with a category and details; anonymous reports are allowed."
      />
      <Steps
        items={[
          [
            "Keep it under 140",
            <>One message, 140 characters max. The cap is enforced structurally, so shouting louder never gets through — split the thought instead.</>,
          ],
          [
            "Report where it happened",
            <>Use the report control on the shard, post, or message with a category and details. Reports route to human review; never repost abuse to “prove” it — reposting spreads harm.</>,
          ],
          [
            "Never dodge the gate",
            <>Trying to sneak underage players into an adults shard risks the shard and the account. Rent the right band instead.</>,
          ],
        ]}
      />
      <Callout tone="rose" title="Sexual content involving minors: report immediately.">
        Hidden at once, preserved as evidence, human-reviewed, and referred to the proper authorities by a human. Full flow in <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.
      </Callout>

      <SectionHead
        index="4"
        kicker="Setup in five minutes"
        title="Safety setup for players, hosts, and parents"
        body="Three short checklists, one per role. Do yours before the first session and the gate, the chat cap, and the report button cover the rest."
      />
      <Steps
        items={[
          [
            "Players: verify your band once",
            <>Run the age check on your own device and confirm the band pass matches the rooms you plan to join. If a room you want sits above your band, switch rooms instead of asking the host for an exception: exceptions do not exist.</>,
          ],
          [
            "Hosts: match content to the band",
            <>Kids rooms stay gentle: friendly builds, kind chat, zero horror. Teens rooms allow rivalry and mild spookiness without graphic detail. Adults rooms may run horror and intense plots, and that is exactly why the adults floor never lowers. Renting steps are in the <Link className="underline" href="/docs/mmo/host">Host guide</Link>.</>,
          ],
          [
            "Parents: sit in on the first join",
            <>Watch the shard row with your child: point out the band badge and the headcount, send one chat message together to feel the 140 character cap, and show them the report control before anything goes wrong. Two minutes of rehearsal beats any lecture.</>,
          ],
          [
            "Everyone: know the report path cold",
            <>A report needs three things: where it happened, the category, and what was said or done. Anonymous reports count. Never repost the offending message to prove it happened: reposting spreads the harm the report is trying to stop.</>,
          ],
        ]}
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Content guidance by band
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">Room band</th>
              <th scope="col" className="px-4 py-2.5">Keep it</th>
              <th scope="col" className="px-4 py-2.5">Leave out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧒 Kids</th>
              <td className="px-4 py-2.5 text-muted-foreground">Cozy builds, teamwork, encouragement</td>
              <td className="px-4 py-2.5 text-muted-foreground">Horror, graphic plots, trash talk</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧑 Teens</th>
              <td className="px-4 py-2.5 text-muted-foreground">Rivalry, mild spookiness, strategy debate</td>
              <td className="px-4 py-2.5 text-muted-foreground">Explicit detail, sustained harassment</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">🧙 Adults</th>
              <td className="px-4 py-2.5 text-muted-foreground">Full range, with reports still enforced</td>
              <td className="px-4 py-2.5 text-muted-foreground">Anything involving minors, always reported</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="emerald" title="The boring setup is the safe setup.">
        Verified band, matched content, rehearsed report path: unglamorous and unbeatable. Rights, exports, and deletes beyond shards live in <Link className="underline" href="/docs/privacy-safety">Privacy and safety</Link>.
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
          href="/docs/mmo/faq"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">❓ FAQ →</p>
          <p className="mt-1 text-sm text-muted-foreground">402/403 cases and broke-host behavior.</p>
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
