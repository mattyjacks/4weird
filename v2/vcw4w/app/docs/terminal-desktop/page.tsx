import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terminal ↔ Desktop bridge",
  description:
    "How /terminal connects to the virtual desktop (/desktop RunPod pods) vs the local desktop app (v2/desktop/code), and what the terminal can and can't do.",
  alternates: { canonical: "/docs/terminal-desktop" },
};

export default function TerminalDesktopDocsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-4">
      <p className="text-xs text-muted-foreground">
        <Link href="/docs" className="hover:underline">← Docs</Link> · <Link href="/terminal" className="hover:underline">/terminal</Link> ·{" "}
        <Link href="/desktop" className="hover:underline">/desktop</Link>
      </p>
      <h1 className="mt-2 text-2xl font-black tracking-tight">Terminal ↔ Desktop bridge</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <code>/terminal</code> (CryptArt Commander) is a local, allow-listed sandbox: every input maps to a
        TypeScript handler, publishes an <code>interopBus</code> event, and never performs server execution or
        fetches. It connects to desktop surfaces by <strong>printing guidance + deep-links</strong> — it never
        launches or controls them.
      </p>

      <h2 className="mt-6 text-lg font-black tracking-tight">Two desktops, one terminal</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        <li>
          <strong>Virtual desktop</strong> — <Link href="/desktop?from=terminal&kind=virtual">/desktop (virtual)</Link>:
          RunPod pods in the browser. Use it when you need cloud GPUs without installing anything. Provisioning
          and pod control happen on <code>/desktop</code>, never inside <code>/terminal</code>.
        </li>
        <li>
          <strong>Local desktop app</strong> — <Link href="/desktop?from=terminal&kind=local">/desktop (local)</Link>:
          the native app under <code>v2/desktop/code</code>. Use it when you want local files, local devices, and
          OpenCode attached to your own workspace.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-black tracking-tight">Terminal commands</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        <li>
          <code>desktop [virtual|local|opencode]</code> — prints which desktop fits and a deep-link such as{" "}
          <code>/desktop?from=terminal&amp;kind=virtual</code>.
        </li>
        <li>
          <code>opencode</code> — prints the OpenCode → desktop bridge: open <code>/desktop</code> first, attach
          the workspace in the local app, then run OpenCode there.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-black tracking-tight">What /terminal can / can&apos;t do</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        <li>
          <strong>Can:</strong> <code>help</code>, <code>echo</code>, <code>status</code>,{" "}
          <code>coins</code> quotes, <code>luck</code> previews, <code>desktop</code> / <code>opencode</code>{" "}
          guidance, <code>clear</code>, <code>whoami</code> — all local-only with an interopBus emit.
        </li>
        <li>
          <strong>Can&apos;t:</strong> no server exec, no <code>fetch</code>, no pod start/stop, no OpenCode
          execution, no eval. Anything outside the allow-list prints &quot;Command not found&quot;.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-black tracking-tight">Worked example: from question to desktop</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>
          Open <Link href="/terminal" className="hover:underline">/terminal</Link> and type{" "}
          <code>desktop virtual</code>. The terminal prints a short explanation plus a deep-link to{" "}
          <code>/desktop?from=terminal&amp;kind=virtual</code>.
        </li>
        <li>
          Follow the printed link to <Link href="/desktop" className="hover:underline">/desktop</Link>. Pick a
          GPU class, a region, and a template, then provision the pod there. Provisioning screens, SSH strings,
          and start/stop buttons live on <code>/desktop</code> only.
        </li>
        <li>
          Need local files instead? Type <code>desktop local</code>, follow the link with{" "}
          <code>kind=local</code>, and open the native app from <code>v2/desktop/code</code>. Attach your
          project folder, then drive OpenCode from the desktop panel. The web guide for that panel is{" "}
          <Link href="/docs/desktop/opencode" className="hover:underline">Desktop OpenCode setup</Link>.
        </li>
        <li>
          Unsure which surface runs commands? Read{" "}
          <Link href="/docs/desktop/opencode/terminal" className="hover:underline">
            Web terminal + desktop panel
          </Link>
          . It lists what the web terminal runs locally versus what the desktop panel shells out to.
        </li>
      </ol>

      <h2 className="mt-6 text-lg font-black tracking-tight">Command reference</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Command</th>
              <th className="px-4 py-2 font-black">What it prints</th>
              <th className="px-4 py-2 font-black">Where the real work happens</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">help</td>
              <td className="px-4 py-2 text-muted-foreground">Full allow-list with one line per command.</td>
              <td className="px-4 py-2 text-muted-foreground">Nowhere: reference text only.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">status</td>
              <td className="px-4 py-2 text-muted-foreground">Local session summary and feature flags.</td>
              <td className="px-4 py-2 text-muted-foreground">In the page: no servers contacted.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">coins [amount]</td>
              <td className="px-4 py-2 text-muted-foreground">Coin quote at 100 coins to one dollar with the 75/25 split.</td>
              <td className="px-4 py-2 text-muted-foreground">Quote only: no ledger writes.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">luck [seed]</td>
              <td className="px-4 py-2 text-muted-foreground">Deterministic preview derived from the seed string.</td>
              <td className="px-4 py-2 text-muted-foreground">Local math: same seed, same preview.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">desktop [virtual|local|opencode]</td>
              <td className="px-4 py-2 text-muted-foreground">Fit guidance plus a deep-link carrying from and kind params.</td>
              <td className="px-4 py-2 text-muted-foreground">On /desktop after you click through.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">opencode</td>
              <td className="px-4 py-2 text-muted-foreground">Bridge recipe: open /desktop, attach workspace, run binary.</td>
              <td className="px-4 py-2 text-muted-foreground">In the local app, never in the browser.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 text-lg font-black tracking-tight">Troubleshooting</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        <li>
          <strong>&quot;Command not found&quot; on valid-looking input:</strong> the allow-list is exact and
          lowercase. Check spelling, drop extra flags, and run <code>help</code> to see the accepted verbs.
        </li>
        <li>
          <strong>Deep-link lands on the wrong desktop tab:</strong> confirm the URL carries both{" "}
          <code>from=terminal</code> and <code>kind=virtual</code> (or <code>kind=local</code>). Re-run the{" "}
          <code>desktop</code> command and click the freshly printed link instead of a bookmark.
        </li>
        <li>
          <strong>Expecting the terminal to start a pod:</strong> it cannot by design. Pod billing, GPU choice,
          and SSH setup happen on <Link href="/desktop" className="hover:underline">/desktop</Link>. The
          terminal only points you there and explains the choice.
        </li>
        <li>
          <strong>Expecting the terminal to run OpenCode:</strong> it cannot reach your machine&apos;s binary.
          Install the CLI, open the desktop panel, and follow{" "}
          <Link href="/docs/desktop/opencode" className="hover:underline">Desktop OpenCode setup</Link> to pick
          cli or server mode.
        </li>
        <li>
          <strong>Nothing renders after typing:</strong> run <code>clear</code> then <code>status</code>. Both
          are local, so they answer even when the network is down. If they print, the sandbox is healthy and
          the earlier input was simply outside the allow-list.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-black tracking-tight">FAQ</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        <li>
          <strong>Does /terminal store my input on a server?</strong> No. Handlers run in the page and emit a
          local interop event. There is no server execution path to audit because none exists.
        </li>
        <li>
          <strong>Can I paste secrets into /terminal?</strong> Do not. There is no secret vault here, and
          guidance output is plain text. Paste API keys only into the shell session that owns the tool needing
          them.
        </li>
        <li>
          <strong>Which desktop is right for GPU work?</strong> The virtual desktop, reached with{" "}
          <code>desktop virtual</code>. It rents cloud GPUs without installs. Choose the local app when the
          code, devices, or files must stay on your machine.
        </li>
        <li>
          <strong>Where do coin rules live?</strong> The quote math (100 coins to one dollar, 75 percent
          provider credits, 25 percent platform) is shared across docs. The heal-loop page shows the same
          quote pattern applied to bugfix budgets.
        </li>
      </ul>

      <p className="mt-4 text-sm leading-relaxed">
        Try it: open <Link href="/terminal">/terminal</Link>, type <code>desktop virtual</code>, then follow the
        printed link to <Link href="/desktop">/desktop</Link>.
      </p>
    </main>
  );
}
