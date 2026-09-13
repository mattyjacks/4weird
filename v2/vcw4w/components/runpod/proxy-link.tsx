"use client";

type ProxyLinkProps = {
  /** Full RunPod proxy URL, e.g. https://<podId>-8888.proxy.runpod.net */
  href: string;
  /** Short label shown before the URL (defaults to "Open"). */
  label?: string;
  className?: string;
};

/**
 * A RunPod proxy URL as a REAL clickable link (anchor), never a blue span.
 * Opens in a new tab; the pod UI (Jupyter, Kasm desktop, render log) stays
 * usable while the 4weird tab stays open.
 *
 * Defense in depth: only https:// URLs render as anchors. Anything else
 * (javascript:, data:, or unparseable) renders as inert text — server
 * validators enforce the same rule, but a stored row must never become
 * executable markup on click.
 */
export function ProxyLink({ href, label = "Open", className = "" }: ProxyLinkProps) {
  if (!href) return null;
  let safe = false;
  try {
    const u = new URL(String(href).trim());
    safe = u.protocol === "https:" && String(href).trim().length <= 2048 && !/[\s<>"']/.test(String(href));
  } catch {
    safe = false;
  }
  if (!safe) {
    return <span className={`break-all font-mono text-xs text-slate-400 ${className}`}>{href}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`font-semibold text-cyan-300 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-200 hover:decoration-cyan-200 ${className}`}
    >
      {label} <span aria-hidden="true">↗</span>{" "}
      <span className="break-all font-normal">{href}</span>
    </a>
  );
}
