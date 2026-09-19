import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/desktop/opencode/terminal" },
  title: "Web terminal + desktop panel",
  description:
    "What /terminal runs (allow-listed local commands only) versus what the desktop OpenCode panel drives (your installed opencode binary).",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent",
};

export default function DesktopOpencodeTerminalPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · desktop · opencode"
        title={<>Two terminals, <span className={theme.title}>two jobs.</span></>}
        lede={<>The web <Link className="underline" href="/terminal">/terminal</Link> runs allow-listed local commands only — no server exec, no eval. Driving OpenCode is the desktop panel&apos;s job: it shells to your installed <code>opencode</code> binary with a working-dir guard, timeout, and stop button.</>}
        stats={[
          ["/terminal", "local allow-list only"],
          ["desktop", "opencode binary"],
          ["guard", "workspace root"],
          ["stop", "per-run timeout"],
        ]}
        glyph="🖥️"
        theme={theme}
        crumb="Terminal"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[48, 72, 60, 84, 66, 78, 54].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-emerald-200/50 bg-gradient-to-t from-cyan-500 to-emerald-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Web side"
        title="Attach to /terminal for local commands"
        body="The web terminal maps every input to a TypeScript handler — there is no remote shell behind it. Use it for local power-user commands (help, coin quotes, deterministic seeds); it stays fail-open offline."
      />
      <Steps
        items={[
          ["Open /terminal", <>Visit <Link className="underline" href="/terminal">/terminal</Link> in the web app — Quake-style CLI, history capped, every command emits an interop event.</>],
          ["Stay inside the allow-list", <>Unknown input prints help instead of executing. There is no server exec, no fetch, no eval — by design, not by accident.</>],
          ["Need OpenCode? Switch surfaces", <>The web terminal cannot reach your machine&apos;s <code>opencode</code> binary. For Export / Fix / Heal, move to the desktop panel below.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Desktop side"
        title="The desktop panel drives opencode"
        body="The desktop terminal panel (sibling desktop lane) offers a command input, scrolling output, working-dir picker, and stop button. It spawns headless opencode runs — it never reimplements the CLI bridge."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">📂</p>
          <p className="font-black">Working-dir guard</p>
          <p className="mt-1 text-sm text-muted-foreground">Runs are rooted at your workspace — never the repo root, never your home directory.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">⏱️</p>
          <p className="font-black">Timeout + stop</p>
          <p className="mt-1 text-sm text-muted-foreground">Every run carries a per-run timeout and a stop button; stdout/stderr stream back live.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🧯</p>
          <p className="font-black">Fail-open when absent</p>
          <p className="mt-1 text-sm text-muted-foreground">No binary on PATH? The panel shows the install hint and Export still writes the BUGFIX report.</p>
        </div>
      </div>

      <Callout tone="emerald" title="Do not confuse the two attach points.">
        <code>/terminal</code> never executes on your machine and never calls OpenCode; the desktop panel never runs
        web allow-list commands. If a guide tells you to &ldquo;attach the terminal to opencode&rdquo;, it means the{" "}
        <strong>desktop</strong> panel — the web page is the wrong surface.
      </Callout>

      <SectionHead
        index="3"
        kicker="Command reference"
        title="What the web allow-list actually runs"
        body="Each verb below maps to one TypeScript handler in the page. Anything not on this list prints help; there is deliberately no passthrough to a shell."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Command</th>
              <th className="px-4 py-2 font-black">Local result</th>
              <th className="px-4 py-2 font-black">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">help</td>
              <td className="px-4 py-2 text-muted-foreground">Lists every allowed verb with a one line gloss.</td>
              <td className="px-4 py-2 text-muted-foreground">Start here when a guess fails.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">status</td>
              <td className="px-4 py-2 text-muted-foreground">Session flags and bridge reachability summary.</td>
              <td className="px-4 py-2 text-muted-foreground">Purely local, works offline.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">coins</td>
              <td className="px-4 py-2 text-muted-foreground">Read-only quote at 100 coins to one dollar.</td>
              <td className="px-4 py-2 text-muted-foreground">Predicts cost, writes nothing.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">luck</td>
              <td className="px-4 py-2 text-muted-foreground">Deterministic preview from the seed you pass.</td>
              <td className="px-4 py-2 text-muted-foreground">Same seed always replays the same preview.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">desktop</td>
              <td className="px-4 py-2 text-muted-foreground">Fit guidance plus a deep-link to the right desktop tab.</td>
              <td className="px-4 py-2 text-muted-foreground">The bridge verb: see the companion guide.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">whoami / clear / echo</td>
              <td className="px-4 py-2 text-muted-foreground">Identity label, screen reset, text repeat.</td>
              <td className="px-4 py-2 text-muted-foreground">Utilities with zero side effects.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="The full bridge map lives one page over.">
        For virtual versus local desktop choice, deep-link params, and the can and cannot lists, read{" "}
        <Link className="underline" href="/docs/terminal-desktop">Terminal and Desktop bridge</Link>. This page
        stays focused on the two terminals; that page maps the whole crossing.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Quote in web, fix on desktop"
        body="A realistic split session: price the work where it is cheap (web), spend the budget where it counts (desktop)."
      />
      <Steps
        items={[
          ["Price the idea on the web", <>Open <Link className="underline" href="/terminal">/terminal</Link> and run a <code>coins</code> quote for the expected effort. Note the gross coins and the 75/25 split for your records.</>],
          ["Switch surfaces deliberately", <>Run <code>desktop opencode</code> in the web terminal, read the printed recipe, then open the desktop app and attach the game workspace. Confirm the status dot turns green.</>],
          ["Export, then Fix, then retest", <>Export the BUGFIX report from the panel and run it through your installed binary per <Link className="underline" href="/docs/desktop/opencode">Desktop OpenCode setup</Link>. Keep the session on the desktop until the retest passes.</>],
          ["Loop only when needed", <>If failures persist across two manual fixes, press Heal and let <Link className="underline" href="/docs/desktop/opencode/heal-loops">Heal loops</Link> budget the remaining rounds instead of hand-rolling more attempts.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Wrong surface symptoms"
        body="Most terminal confusion is a surface mix-up. Match your symptom to the fix before reinstalling anything."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Typed an opencode command on the web page</p>
          <p className="mt-1 text-sm text-muted-foreground">Expected: the page prints help instead of running it. Move to the desktop panel, which shells to your binary with the workspace guard and timeout.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Desktop panel shows the install hint</p>
          <p className="mt-1 text-sm text-muted-foreground">Install the CLI, verify <code>opencode --version</code> in a fresh shell, and reopen the app so PATH refreshes. Export still works meanwhile as a hand-runnable report.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Stop button never lights up</p>
          <p className="mt-1 text-sm text-muted-foreground">No run is active: the button arms only while a headless run streams stdout. Start a Fix first; a lit button with no output means the process is still booting.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Output vanished after clear</p>
          <p className="mt-1 text-sm text-muted-foreground">History is capped by design on the web side. Re-run <code>status</code> to confirm health, and keep long desktop output in the BUGFIX report instead of scrollback.</p>
        </div>
      </div>

      <SectionHead
        index="6"
        kicker="FAQ"
        title="Terminal questions, answered"
        body="Offline behavior, history limits, secrets, and why eval stays banned."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Does the web terminal work offline?</p>
          <p className="mt-1 text-sm text-muted-foreground">Yes for handlers: help, status, coins, luck, and guidance print without a network. Only navigation links need connectivity, since the destination pages load separately.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">How much history is kept?</p>
          <p className="mt-1 text-sm text-muted-foreground">Scrollback is capped so long sessions stay light. Copy durable output into the BUGFIX report or a squad thread before running clear.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Can I paste a secret for debugging?</p>
          <p className="mt-1 text-sm text-muted-foreground">No. Echo repeats input visibly and there is no vault here. Keep tokens in the shell session that owns the tool, and rotate anything pasted by accident.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Why is eval permanently off the table?</p>
          <p className="mt-1 text-sm text-muted-foreground">Arbitrary execution would turn a guidance widget into an attack surface. The allow-list plus typed handlers keeps every input predictable, auditable, and safe to link from docs.</p>
        </div>
      </div>

      <SectionHead
        index="7"
        kicker="Up next"
        title="Heal with a budget, not a hope"
        body="Once the panel is green, the Heal button loops bugtest → fix → retest until clean or the budget is spent. The next page covers that loop."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/docs/desktop/opencode"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">← Setup</p>
          <p className="mt-1 text-sm text-muted-foreground">CLI requirements and run vs serve modes.</p>
        </Link>
        <Link
          href="/docs/desktop/opencode/heal-loops"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🔁 Heal loops →</p>
          <p className="mt-1 text-sm text-muted-foreground">Token budgets, coin quotes, MCP pay (queued future).</p>
        </Link>
      </div>

      <Pager current="/docs/desktop/opencode/terminal" />
    </article>
  );
}
