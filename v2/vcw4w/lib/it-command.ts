/**
 * Boss / IT monitored work: shared types and constants.
 *
 * Boss and IT admins approve which apps the team may use for work.
 * Employees work only in approved, logged places. Auditors read the
 * logs but change nothing. If it is not approved and logged, it is
 * shadow IT (see shadow-it.ts) and does not belong at work.
 *
 * No imports, no Supabase; pure TypeScript so any page can use it.
 */

export type ItRole = "boss" | "it_admin" | "auditor" | "employee";

export interface ItRoleInfo {
  role: ItRole;
  title: string;
  /** Plain-English explanation (5th-grade reading level). */
  plain: string;
}

export const IT_ROLES: ItRoleInfo[] = [
  {
    role: "boss",
    title: "Boss",
    plain: "The owner. Can approve apps, read all logs, and give or take away access.",
  },
  {
    role: "it_admin",
    title: "IT admin",
    plain: "The helper who sets things up. Can approve apps and read logs, like the boss.",
  },
  {
    role: "auditor",
    title: "Auditor",
    plain: "The checker. Can read the logs to prove the rules were followed, but cannot approve apps or change access.",
  },
  {
    role: "employee",
    title: "Employee",
    plain: "The worker. Uses only approved apps. All work here is logged for IT.",
  },
];

export interface ApprovedApp {
  id: string;
  name: string;
  category: string;
  url: string;
  whyApproved: string;
  owner: string;
}

export type AppRequestStatus = "pending" | "approved" | "denied";

export interface AppRequest {
  id: string;
  appName: string;
  reason: string;
  status: AppRequestStatus;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  /** ISO date string of when it happened. */
  at: string;
}

/**
 * Loose category slugs for approved apps.
 * Keep in sync with APPROVED_ALT_SUGGESTIONS in shadow-it.ts.
 */
export const APPROVED_CATEGORIES: string[] = [
  "file-share",
  "cloud-storage",
  "ai-chat",
  "ai-code",
  "code",
  "code-host",
  "design",
  "docs",
  "team-wiki",
  "chat",
  "video-call",
  "project-tracker",
  "cloud-desktop",
  "cloud-gpu",
  "password-store",
  "billing",
  "support",
];

/** True for boss and IT admins: the staff who run monitored work. */
export function isItStaff(role: ItRole): boolean {
  return role === "boss" || role === "it_admin";
}

/** True for boss and IT admins: the only roles that can approve apps. */
export function canApprove(role: ItRole): boolean {
  return role === "boss" || role === "it_admin";
}

export const MONITORING_NOTICE: string =
  "Your work here is logged for IT. Boss and IT admins can see what you opened, shared, and changed, and when. Use only approved apps. If you need a new app, ask first.";
