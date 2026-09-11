import type { Metadata } from "next";
import Link from "next/link";
import { DOCS_NAV } from "./layout";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Official 4weird Games documentation: company, accounts, games, Vibe Coins, clans, bots, agents, game AI, VibeCodeWorker, privacy, and support.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";

export default function DocsHome() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        4weird Docs
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Everything about the company and how to use the site and software — one
        coin economy, 34 games, clans, bots, rentable agents, game AI, and QA
        tooling. Pick a guide below. Every price on this site already includes
        our 25% cut: <strong className="text-foreground">100 🪙 = exactly $1.00</strong>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {DOCS_NAV.filter((d) => d.href !== "/docs").map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="rounded-2xl border border-border bg-card p-5 transition hover:border-cyan-500/60 dark:hover:border-cyan-300/50"
          >
            <h2 className="font-bold">{doc.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{doc.blurb}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-cyan-600 dark:text-cyan-300">
              Read guide →
            </span>
          </Link>
        ))}
      </div>

      <h2 className={h2}>How to use these docs</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>
          <strong className="text-foreground">New here?</strong> Read in order:{" "}
          <Link className="underline" href="/docs/about">About</Link> →{" "}
          <Link className="underline" href="/docs/getting-started">Getting started</Link> →{" "}
          <Link className="underline" href="/docs/playing-games">Playing games</Link> →{" "}
          <Link className="underline" href="/docs/vibe-coins">Vibe Coins</Link>.
        </li>
        <li>
          <strong className="text-foreground">Social player?</strong> Jump to{" "}
          <Link className="underline" href="/docs/clans">Clans</Link> and{" "}
          <Link className="underline" href="/docs/bots">Bots</Link>.
        </li>
        <li>
          <strong className="text-foreground">Builder?</strong> Jump to{" "}
          <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link>,{" "}
          <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>, and{" "}
          <Link className="underline" href="/docs/vibecodeworker">VibeCodeWorker</Link>.
        </li>
        <li>
          <strong className="text-foreground">Trust first?</strong> Start at{" "}
          <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>, then{" "}
          <Link className="underline" href="/docs/faq">FAQ &amp; support</Link>.
        </li>
      </ul>

      <h2 className={h2}>Key facts used across every guide</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["🪙 100 coins = $1.00", "1¢ per coin. Packs are 500 / 1,500 / 5,000 / 25,000 plus custom 500–100,000. 100 coins is the free signup trial — it is never sold as a pack."],
          ["25% cut, always inside", "Every coin price, game rate, clan fee, AI meter, and compute booking already includes the 25% platform share. It is never added on top; 75% goes to providers and makers."],
          ["Live site + legal", "The app lives at 4weird.games (also reachable via 4weird.com). Terms at /terms, Privacy at /privacy, self-service rights at /my/rights, spend ledger at /my/usage/."],
          ["Accounts + guests", "Reading is public; posting, saving, renting, and AI need a signed-in account. Guests get free daily loads plus skippable house ads — no account needed."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Company: MattyJacks LLC, New Hampshire, USA · Contact:{" "}
        <a className="underline" href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> ·{" "}
        <Link className="underline" href="/terms">Terms of Use</Link> ·{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link>
      </p>
    </article>
  );
}
