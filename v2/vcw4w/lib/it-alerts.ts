/**
 * IT alerts: simple anomaly detection for suspected Shadow IT.
 *
 * Boss and IT admins watch for signs that work left the approved,
 * logged places (see it-command.ts and shadow-it.ts). These helpers
 * flag odd events so a person can check them. They do not prove
 * wrongdoing; they say "look here first".
 *
 * No imports, no Supabase; pure TypeScript so any page can use it.
 */

export interface SuspiciousSignal {
  id: string;
  title: string;
  label: string;
  /** Plain-English explanation (5th-grade reading level). */
  whatItMeans: string;
}

export const SUSPICIOUS_SIGNALS: SuspiciousSignal[] = [
  {
    id: "unknown-domain",
    title: "Unknown domain",
    label: "Unknown domain",
    whatItMeans: "Someone opened a web address the team did not approve. It may be a mystery app holding work files.",
  },
  {
    id: "bulk-upload",
    title: "Bulk upload",
    label: "Bulk upload",
    whatItMeans: "A lot of data was sent out at once. It may mean work files were copied to an unapproved place.",
  },
  {
    id: "off-hours-access",
    title: "Off-hours access",
    label: "Off-hours access",
    whatItMeans: "Work happened very late at night or very early in the morning. It may be normal, or it may be someone hiding activity.",
  },
  {
    id: "new-ai-tool",
    title: "New AI tool",
    label: "New AI tool",
    whatItMeans: "Someone opened an AI app the team did not approve. Pasted text there cannot be taken back.",
  },
  {
    id: "large-download",
    title: "Large download",
    label: "Large download",
    whatItMeans: "A very big file was pulled down at once. It may hold many work files in one grab.",
  },
  {
    id: "unapproved-install",
    title: "Unapproved install",
    label: "Unapproved install",
    whatItMeans: "Someone fetched a program from an unapproved place. It may hide a virus that steals files.",
  },
];

/** Web addresses the team already approved. Anything else is unknown. */
const APPROVED_DOMAINS: string[] = [
  "4weird.com",
  "vault.4weird.com",
  "docs.4weird.com",
];

/** More than this many bytes in one event counts as large (50 MB). */
const LARGE_BYTES = 50 * 1024 * 1024;

export interface SuspiciousEvent {
  domain: string;
  /** Bytes moved in one event (up or down). */
  bytes: number;
  /** Hour of day, 0-23. */
  hour: number;
}

/**
 * Flag which suspicious signals match one event.
 * Returns signal ids such as ["unknown-domain", "off-hours-access"].
 */
export function flagSuspicious({ domain, bytes, hour }: SuspiciousEvent): string[] {
  const flags: string[] = [];
  const host = (domain || "").trim().toLowerCase();
  const size = Math.max(0, bytes || 0);

  const known = APPROVED_DOMAINS.some(
    (d) => host === d || host.endsWith("." + d),
  );
  if (!known) flags.push("unknown-domain");
  if (size > LARGE_BYTES) {
    flags.push("bulk-upload");
    flags.push("large-download");
  }
  if (hour < 6 || hour > 22) flags.push("off-hours-access");
  if (host.includes("ai") || host.includes("gpt") || host.includes("llm")) {
    if (!flags.includes("new-ai-tool")) flags.push("new-ai-tool");
  }
  if (
    host.includes("download") ||
    host.includes("install") ||
    host.includes("setup") ||
    host.endsWith(".exe")
  ) {
    flags.push("unapproved-install");
  }

  return flags;
}

export type AlertSeverity = "low" | "medium" | "high";

/** All alert levels, from calm to urgent. */
export const ALERT_SEVERITY: AlertSeverity[] = ["low", "medium", "high"];

/**
 * Turn a flag list into one level.
 * No flags is low, one flag is medium, two or more is high.
 */
export function severityFor(flags: string[]): AlertSeverity {
  const count = (flags || []).length;
  if (count >= 2) return "high";
  if (count === 1) return "medium";
  return "low";
}
