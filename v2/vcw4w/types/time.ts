// Ghost Cash (👻) & Timer Types for 4weird

export interface TimerProject {
  id: string;
  name: string;
  color: string;
  ghostRate: number; // 👻 Ghost Cash rate per hour
  budgetHours: number | null;
  isBillable: boolean;
  isArchived: boolean;
  orgId?: string | null;
  teamId?: string | null;
  clientId?: string | null;
  client?: {
    id: string;
    username: string;
    displayName?: string;
  } | null;
  org?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  totalSeconds?: number;
  totalGhostCash?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimerScreenshot {
  id: string;
  entryId: string;
  imageUrl: string;
  isBlurred: boolean;
  activityLevel: number; // 0 - 100%
  memo?: string | null;
  capturedAt: string;
}

export interface TimerEntry {
  id: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null; // seconds
  isBillable: boolean;
  isRunning: boolean;
  ghostRate: number; // hourly rate in 👻
  ghostCashOwed: number; // total calculated 👻 down to the second
  activityScore: number; // 0-100%
  upworkSyncMode?: boolean; // Dual-timer companion with an external tracker app
  upworkContractId?: string | null;
  upworkMemo?: string | null;
  tags: string | null;
  projectId: string | null;
  project?: {
    id: string;
    name: string;
    color: string;
    ghostRate?: number;
    orgId?: string | null;
  } | null;
  debtorId?: string | null;
  debtor?: {
    id: string;
    username: string;
    displayName?: string;
  } | null;
  orgId?: string | null;
  screenshots?: TimerScreenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface GhostDebt {
  id: string;
  orgId: string | null;
  projectId: string | null;
  creditorId: string;
  debtorId: string;
  creditor?: {
    id: string;
    username: string;
    displayName?: string;
  };
  debtor?: {
    id: string;
    username: string;
    displayName?: string;
  };
  amountGhostCash: number;
  status: "pending" | "settled" | "forgiven";
  memo: string;
  settledAt?: string | null;
  createdAt: string;
}

export interface TimerReport {
  summary: {
    totalSeconds: number;
    billableSeconds: number;
    nonBillableSeconds: number;
    totalGhostCashOwed: number; // 👻
    entryCount: number;
    totalHours: number;
    billableHours: number;
    averageActivityScore: number;
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    projectColor: string;
    totalSeconds: number;
    totalGhostCash: number;
  }>;
  byDebtor: Array<{
    debtorId: string;
    debtorName: string;
    totalSeconds: number;
    totalGhostCash: number;
  }>;
}

// Utility functions for Ghost Cash (👻)
export function formatGhostCash(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "👻 0.00";
  return `👻 ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calcGhostCash(durationSeconds: number, hourlyRate: number): number {
  if (!durationSeconds || durationSeconds <= 0 || !hourlyRate || hourlyRate <= 0) return 0;
  return Number(((durationSeconds / 3600) * hourlyRate).toFixed(4));
}

// Formatting utilities
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDurationShort(seconds: number): string {
  if (!seconds || seconds < 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export const TIMER_PROJECT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];
