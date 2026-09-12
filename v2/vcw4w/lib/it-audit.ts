/**
 * Client-safe audit helpers for monitored work.
 *
 * No imports, no Supabase, no secrets; pure TypeScript so any page can use it.
 * Full audit rows (with actor) stay server-side. Employees see only the
 * redacted shape from redactForEmployee.
 */

export const AUDIT_ACTIONS: string[] = [
  "app.request",
  "app.approve",
  "app.deny",
  "app.launch",
  "file.upload",
  "agent.book",
  "desktop.start",
  "policy.update",
  "report.export",
  "login",
];

export const AUDIT_RETENTION_DAYS = 365;
export const AUDIT_EXPORT_MAX = 1000;

export interface AuditEventRecord {
  id?: string;
  actor: string;
  action: string;
  target: string;
  /** ISO date string of when it happened. */
  at: string;
}

export interface EmployeeAuditEvent {
  id?: string;
  action: string;
  target: string;
  /** ISO date string of when it happened. */
  at: string;
}

/**
 * Build one audit row. Actor/action/target are trimmed and capped so a
 * long input cannot bloat the log. `at` defaults to now (ISO string).
 */
export function buildAuditEvent(
  actor: string,
  action: string,
  target = "",
): AuditEventRecord {
  return {
    actor: String(actor ?? "").slice(0, 200),
    action: String(action ?? "").slice(0, 64),
    target: String(target ?? "").slice(0, 300),
    at: new Date().toISOString(),
  };
}

/**
 * Employee-safe view: drops actor (may hold IP / email) and keeps only
 * id, action, target, and time. Never add actor details back here.
 */
export function redactForEmployee(event: AuditEventRecord): EmployeeAuditEvent {
  const out: EmployeeAuditEvent = {
    action: String(event.action ?? "").slice(0, 64),
    target: String(event.target ?? "").slice(0, 300),
    at: String(event.at ?? ""),
  };
  if (event.id) out.id = String(event.id).slice(0, 64);
  return out;
}
