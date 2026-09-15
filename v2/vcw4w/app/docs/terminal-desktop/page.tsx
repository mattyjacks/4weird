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

      <p className="mt-4 text-sm leading-relaxed">
        Try it: open <Link href="/terminal">/terminal</Link>, type <code>desktop virtual</code>, then follow the
        printed link to <Link href="/desktop">/desktop</Link>.
      </p>
    </main>
  );
}
