/**
 * Cloud service catalog — client-safe mirror of public.cloud_services.
 * Prices are in Vibe Coins (100 coins = $1.00).
 *
 * Pricing rule (one rule everywhere): every price INCLUDES the 25%
 * UnitUnite workspace compute cut (WORKSPACE_COMPUTE_CUT_PCT). The wallet is
 * debited the gross; the ledger splits it 25% platform / 75% provider per
 * individual workspace. The cut is never added on top.
 * The org wallet pays; fund it from personal coins via fund_org_wallet.
 *
 * Cost/version policy: everything defaults to the CHEAPEST tier that can do
 * the job and the NEWEST viable runtime (see CHEAPEST_DEFAULTS /
 * NEWEST_VIABLE below). No new npm deps were added for this — cheapest for
 * the user, newest that still runs on the current stack.
 */

import { WORKSPACE_COMPUTE_CUT_PCT, workspaceComputeSplit } from "@/lib/economy";

export type CloudService = {
  key: string;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  category: string;
  /** Cheapest viable tier for this service (default selection in UI). */
  tier: string;
  /** Newest viable runtime/image this service runs on. */
  runtime: string;
};

export const CLOUD_SERVICES: CloudService[] = [
  { key: "gpu-pod", name: "GPU Pod", unit: "gpu_min", coinsPerUnit: 12, blurb: "Dedicated GPU, billed per minute", category: "Compute", tier: "cheapest-gpu", runtime: "cuda-newest-viable" },
  { key: "serverless-worker", name: "Serverless Worker", unit: "worker_min", coinsPerUnit: 4, blurb: "Autoscaled endpoint workers", category: "Compute", tier: "eco-128mb", runtime: "node-lts-newest" },
  { key: "serverless-cron", name: "Scheduled Jobs", unit: "worker_min", coinsPerUnit: 2, blurb: "Cron-triggered workers", category: "Compute", tier: "eco-128mb", runtime: "node-lts-newest" },
  { key: "object-storage", name: "Object Storage", unit: "gb_mo", coinsPerUnit: 3, blurb: "S3-style buckets + CDN origin", category: "Storage", tier: "standard", runtime: "s3-compat-v4" },
  { key: "volume-storage", name: "Volumes", unit: "gb_mo", coinsPerUnit: 5, blurb: "Persistent team volumes", category: "Storage", tier: "standard-10gb", runtime: "ext4-newest" },
  { key: "managed-postgres", name: "Managed Postgres", unit: "db_hr", coinsPerUnit: 9, blurb: "Backups + point-in-time restore", category: "Data", tier: "micro-256mb", runtime: "postgres-newest-viable" },
  { key: "kv-store", name: "KV Store", unit: "kv_m writes", coinsPerUnit: 1, blurb: "Edge key-value reads/writes", category: "Data", tier: "pay-per-use", runtime: "kv-newest-api" },
  { key: "job-queue", name: "Job Queue", unit: "queue_k", coinsPerUnit: 1, blurb: "Queues + webhooks + retries", category: "Data", tier: "shared", runtime: "queue-v2-newest" },
  { key: "edge-cdn", name: "Edge CDN", unit: "cdn_gb", coinsPerUnit: 2, blurb: "Global cache + custom domains", category: "Network", tier: "shared-edge", runtime: "http3-newest" },
  { key: "container-builds", name: "Builds", unit: "build_min", coinsPerUnit: 3, blurb: "Image + static site builds", category: "DevOps", tier: "eco-builder", runtime: "buildkit-newest" },
  { key: "ci-actions", name: "Project Actions", unit: "action_min", coinsPerUnit: 2, blurb: "CI runs for the Code tab", category: "DevOps", tier: "eco-runner", runtime: "node-lts-newest" },
  { key: "vector-db", name: "Vector DB", unit: "db_hr", coinsPerUnit: 11, blurb: "Embeddings + ANN search", category: "AI", tier: "micro-256mb", runtime: "hnsw-newest" },
  { key: "realtime-relay", name: "Realtime Relay", unit: "worker_min", coinsPerUnit: 2, blurb: "Sync + presence fan-out", category: "Network", tier: "shared", runtime: "ws-newest" },
  { key: "inference-api", name: "Inference API", unit: "worker_min", coinsPerUnit: 6, blurb: "Hosted model endpoints", category: "AI", tier: "spot-cheapest", runtime: "models-newest-viable" },
];

/** Cheapest viable default per category (what the UI preselects). */
export const CHEAPEST_DEFAULTS: Record<string, string> = {
  Compute: "serverless-cron",
  Storage: "object-storage",
  Data: "kv-store",
  Network: "edge-cdn",
  DevOps: "ci-actions",
  AI: "inference-api",
};

/**
 * Newest viable runtimes — newest that still runs on this stack (Next 15 /
 * React 19 / Supabase, no new deps). Pinned as labels, not floating tags,
 * so a deploy is reproducible and stays on the cheapest tier above.
 */
export const NEWEST_VIABLE = {
  node: "node-lts-newest",
  cuda: "cuda-newest-viable",
  postgres: "postgres-newest-viable",
  next: "next-15-viable",
  react: "react-19-viable",
} as const;

export const WORKSPACE_CUT_NOTE = `Includes ${WORKSPACE_COMPUTE_CUT_PCT}% workspace compute cut — never added on top.`;

export function serviceByKey(key: string): CloudService | undefined {
  return CLOUD_SERVICES.find((s) => s.key === key);
}

export function quoteCost(key: string, qty: number): number {
  const s = serviceByKey(key);
  if (!s || !Number.isInteger(qty) || qty < 1) return 0;
  return s.coinsPerUnit * qty;
}

/** Gross quote + per-workspace 25% split for display ("12 coins = 9 provider + 3 cut"). */
export function workspaceQuote(key: string, qty: number): { gross: number; cut: number; provider: number } {
  return workspaceComputeSplit(quoteCost(key, qty));
}
