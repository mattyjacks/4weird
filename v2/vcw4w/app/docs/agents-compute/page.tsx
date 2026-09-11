import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agents & cloud",
  description:
    "How to rent AI agents, virtual desktops, and UnitUnite team workspaces on 4weird: booking, escrow, per-second metering, and reading usage.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function AgentsComputePage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Build
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Agents &amp; cloud</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Rent AI agents by the hour, virtual desktops by the second, and team workspaces with
        metered cloud — all in Vibe Coins, all with the 25% cut already inside the price.
      </p>

      <h2 className={h2}>1. Renting AI agents (/agents)</h2>
      <p className={p}>
        <Link className="underline" href="/agents">/agents</Link> lists rentable agents by runtime and
        provider. Booking flow, entirely on the site:
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li>Browse by runtime and provider; open an agent to see its hourly coin price and terms.</li>
        <li>Book by hours — the gross coin amount is <strong className="text-foreground">escrowed</strong> from your balance up front.</li>
        <li>Metered heartbeats settle actual run seconds into 25% platform / 75% provider. The final charge can only go down — <strong className="text-foreground">never above escrow</strong>.</li>
        <li>End the booking when done; unused escrow returns to you. Track bookings under “my bookings.”</li>
      </ol>
      <p className={p}>
        Availability depends on real provider capacity. If a booking can&apos;t start, the page says so
        honestly (no stock / over budget / unavailable) — you are not charged for time that didn&apos;t run.
      </p>

      <h2 className={h2}>2. Virtual desktops (/desktop)</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">CPU box:</strong> Ubuntu desktop in your browser — good for browsing, editing, light dev.</li>
        <li><strong className="text-foreground">GPU workstation:</strong> graphical desktop for heavier visual work and game-adjacent tasks.</li>
        <li>Provision from <Link className="underline" href="/desktop">/desktop</Link> while signed in (optional max-budget + name). You get a proxy URL back; billing is per-second by the provider and mirrored read-only on <Link className="underline" href="/my/usage/">/my/usage/</Link>. Coin figures shown for desktops are display equivalents only.</li>
      </ul>

      <h2 className={h2}>3. UnitUnite team workspaces (/teams)</h2>
      <p className={p}>
        <Link className="underline" href="/teams">/teams</Link> organizes orgs → teams → projects/rooms with role
        catalogs, org coin wallets, messaging, and a metered cloud catalog (GPU pods, serverless, storage,
        databases, KV, queue). Every workspace meter carries the same included 25% cut, with every cent of the
        platform share attributed. Use teams when several people share budget, rooms, and cloud in one place.
      </p>

      <h2 className={h2}>4. Reading cloud spend (/my/usage/)</h2>
      <p className={p}>
        Open <Link className="underline" href="/my/usage/">/my/usage/</Link> for agent-rental compute lines,
        workspace cloud with function runs broken out (serverless-worker/cron, inference, queues, relays),
        game AI/Buddy, clan fees, game rentals, and combined 25/75 totals — plus the provider-spend mirror card
        with a Sync button. If a number surprises you, this page is the receipt support will ask for.
      </p>

      <h2 className={h2}>5. Practical tips</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Book short first sessions to calibrate cost; heartbeats settle per second so short tests stay cheap.</li>
        <li>Set a max budget on desktop provisions to avoid surprises.</li>
        <li>End bookings and close desktops when done — metering follows run time, not browser tabs.</li>
        <li>Estimates are not guarantees: capacity, queues, and provider pricing can shift mid-session.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy →</Link> ·{" "}
        <Link className="underline" href="/docs/vibe-coins">Vibe Coins →</Link>
      </p>
    </article>
  );
}
