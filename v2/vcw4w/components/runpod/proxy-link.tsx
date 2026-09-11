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
 */
export function ProxyLink({ href, label = "Open", className = "" }: ProxyLinkProps) {
  if (!href) return null;
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
