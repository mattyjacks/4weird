import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/desktop/opencode" },
  title: "Desktop OpenCode setup",
  description:
    "Run OpenCode with the 4weird desktop app: CLI requirements, cli vs server modes, and the Export / Fix / Heal loop.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent",
};

export default function DesktopOpencodePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · desktop · opencode"
        title={<>OpenCode on desktop, <span className={theme.title}>the supported way.</span></>}
        lede={<>The desktop app drives a user-installed OpenCode binary — never a bundled copy. Pick <strong>cli</strong> mode (<code>opencode run</code> per fix) or <strong>server</strong> mode (long-lived <code>opencode serve</code>), then Export, Fix, or Heal from the desktop panel.</>}
        stats={[
          ["cli", "opencode run per fix"],
          ["server", "opencode serve :4096"],
          ["Export", "BUGFIX-<game>-<stamp>"],
          ["Heal", "test → fix → re-test"],
        ]}
        glyph="🛠️"
        theme={theme}
        crumb="OpenCode"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[56, 80, 64, 92, 70, 84, 60].map((h, i) => (
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
        kicker="Requirements"
        title="What you need installed"
        body="The desktop app probes PATH for the binary and degrades gracefully when it is missing — status line, Enable toggle, and Export/Fix/Heal all fall back to an install hint instead of crashing."
      />
      <Steps
        items={[
          ["Install the OpenCode CLI", <>Install the <code>opencode</code> binary for your OS (Windows: package manager or npm) and confirm <code>opencode --version</code> prints from a fresh shell.</>],
          ["Put it on PATH", <>The desktop probes PATH — if the binary is not found you get an install hint, not an error dialog. Re-open the app after changing PATH.</>],
          ["Open the desktop panel", <>Tick <strong>Enable</strong> in the desktop OpenCode panel and pick <code>cli</code> or <code>server</code> below. The status dot goes green when the bridge can reach the binary.</>],
          ["Keep secrets out", <>Paste API keys once per shell session — never into chat, bug exports, or Heal logs. The bridge never logs secrets.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Two modes"
        title="opencode run vs opencode serve"
        body="Both modes use your installed binary. CLI mode cold-boots per fix; server mode keeps one persistent process so fixes skip the cold boot."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">⌨️</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">cli (default)</p>
          <p className="font-black">opencode run per fix</p>
          <p className="mt-1 text-sm text-muted-foreground">Headless <code>opencode run -f BUGFIX-&lt;game&gt;-&lt;stamp&gt;.md</code> per fix. Simplest setup, nothing to keep alive — best when you heal rarely.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🛰️</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">server</p>
          <p className="font-black">opencode serve --port 4096</p>
          <p className="mt-1 text-sm text-muted-foreground">Long-lived sidecar (<code>OPENCODE_MODE=server</code>, <code>OPENCODE_SERVER_URL=http://127.0.0.1:4096</code>). Fixes skip the per-run boot — best for tight Heal loops.</p>
        </div>
      </div>

      <Callout tone="emerald" title="Missing binary is a hint, not a crash.">
        If the status dot stays red, the panel shows an install hint with the exact install command for your OS.
        Export still works — it writes the <code>BUGFIX-&lt;game&gt;-&lt;stamp&gt;.md/json</code> report you can paste into <code>opencode run -f file</code> by hand.
      </Callout>

      <SectionHead
        index="3"
        kicker="Worked example"
        title="Your first Fix, end to end"
        body="A concrete pass through Export and Fix in cli mode: from a failing playtest to a reviewed diff, with every click and command named."
      />
      <Steps
        items={[
          ["Reproduce the bug in the game", <>Play until the failure shows, then note the game slug, the screen, and the input sequence. The Export report is only as good as these three facts.</>],
          ["Export the BUGFIX report", <>In the desktop panel, press Export. You get <code>BUGFIX-&lt;game&gt;-&lt;stamp&gt;.md</code> plus a JSON twin: repro steps, logs, and workspace paths the agent may touch.</>],
          ["Run the fix headlessly", <>In a shell rooted at the workspace, run <code>opencode run -f BUGFIX-&lt;game&gt;-&lt;stamp&gt;.md</code>. The agent edits code inside the workspace root and prints the files it changed.</>],
          ["Review the diff before keeping it", <>Read every hunk in git diff. Keep the hunks that match the repro, revert the rest, then re-run the same playtest. Clean on the second pass means the fix held.</>],
          ["Escalate to Heal when it recurs", <>If the failure returns on retest, press Heal instead of re-running by hand. The loop in <Link className="underline" href="/docs/desktop/opencode/heal-loops">Heal loops</Link> repeats test, fix, retest until clean or the budget trips.</>],
        ]}
      />

      <SectionHead
        index="4"
        kicker="Troubleshooting"
        title="When the panel stays red"
        body="Four common failure shapes, each with the fastest check first. All of them are local PATH or process issues, never account issues."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Binary not found after install</p>
          <p className="mt-1 text-sm text-muted-foreground">Close and re-open the desktop app so it re-reads PATH, then run <code>opencode --version</code> in a fresh shell. Package-manager shims often land on PATH only for new processes.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Server mode refuses to connect</p>
          <p className="mt-1 text-sm text-muted-foreground">Confirm <code>opencode serve --port 4096</code> is still running and <code>OPENCODE_SERVER_URL=http://127.0.0.1:4096</code> matches the port. A second serve on another port splits the brain: kill extras, keep one.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Fix edits files outside the game</p>
          <p className="mt-1 text-sm text-muted-foreground">Re-check the working-dir picker: runs must root at the game workspace. Re-export after picking the right folder, since the report snapshots the paths it may touch.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">Run hangs with no output</p>
          <p className="mt-1 text-sm text-muted-foreground">Press stop, shorten the per-run timeout, and re-run with a smaller report. Streaming stdout and stderr should resume line by line; silence past the timeout means the process wedged, not that it is thinking.</p>
        </div>
      </div>
      <Callout tone="cyan" title="Still stuck? Compare surfaces first.">
        Open <Link className="underline" href="/docs/desktop/opencode/terminal">Web terminal + desktop panel</Link> and
        confirm you are driving the desktop panel, not the web <code>/terminal</code> page. The web page cannot reach
        your binary, so every OpenCode symptom there is expected behavior. General site questions belong on{" "}
        <Link className="underline" href="/docs/faq">FAQ and support</Link>.
      </Callout>

      <SectionHead
        index="5"
        kicker="Next steps"
        title="Where to go from here"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/docs/desktop/opencode/terminal"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🖥️ Web terminal + desktop panel</p>
          <p className="mt-1 text-sm text-muted-foreground">What <code>/terminal</code> runs locally vs what the desktop panel drives.</p>
          <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">Read the slice →</p>
        </Link>
        <Link
          href="/docs/desktop/opencode/heal-loops"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
        >
          <p className="font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-300">🔁 Bugtest → fix → retest</p>
          <p className="mt-1 text-sm text-muted-foreground">Heal loops, token budgets, coin quotes, and MCP pay (queued future).</p>
          <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">Read the slice →</p>
        </Link>
      </div>

      <Pager current="/docs/desktop/opencode" />
    </article>
  );
}
