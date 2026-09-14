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
