/**
 * Weird Vault; blob-based private file storage on Supabase.
 *
 * Model: content-addressed blobs (sha256) + per-scope file rows.
 * - Scopes are STRICTLY separate: personal (owner_id) vs team (team_id) vs
 *   org (org_id). Exactly one scope per file. No cross-scope reads; the
 *   database enforces it with RLS + RPC membership checks.
 * - Blobs are deduplicated by sha256: storing the same bytes twice costs
 *   once. Quotas count logical bytes per scope, not physical blobs.
 * - Buckets: `game-blobs` (private). No public write path; signed URLs only.
 * - Every price INCLUDES the 25% platform cut (VAULT_CUT_PCT), never on top.
 * - AI artifacts (fal, Meshy, chat, logs, audio/video/text) autosave here -
 *   see lib/ai-autosave.ts for the routing; this module owns paths + prices.
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const VAULT_CUT_PCT = SERVICE_CUT_PCT;
export const VAULT_BUCKET = "game-blobs";
/** 50 MiB per blob; same cap as game .zip submissions so all games load fast. */
export const VAULT_MAX_BLOB_BYTES = 50 * 1024 * 1024;
/** Free quota per personal scope (bytes). Teams/orgs start at 0, fund up. */
export const VAULT_FREE_BYTES_PERSONAL = 500 * 1024 * 1024;
/** Overage: coins per GB-month, gross, cut INCLUDED. */
export const VAULT_COINS_PER_GB_MO = 3;
/** Min charge per store (dust guard, like clans). */
export const VAULT_MIN_COINS = 0.01;

export type VaultScope = "personal" | "team" | "org";

export function isVaultScope(value: unknown): value is VaultScope {
  return value === "personal" || value === "team" || value === "org";
}

/** Least-privilege scope keys for the Vault (split read/write/share). */
export const VAULT_SCOPES = [
  "vault:read",
  "vault:write",
  "vault:share",
  "vault:quarantine",
] as const;

export function vaultSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * VAULT_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/** Storage quote for bytes held one month (gross, cut INCLUDED). */
export function quoteVaultStorage(bytes: number): number {
  const b = Math.max(0, Math.floor(bytes || 0));
  const gb = b / (1024 * 1024 * 1024);
  return Math.max(
    VAULT_MIN_COINS,
    Math.round(gb * VAULT_COINS_PER_GB_MO * 100) / 100,
  );
}

export function quoteVaultStorageSplit(bytes: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  return vaultSplit(quoteVaultStorage(bytes));
}

export const VAULT_CUT_NOTE = `Includes ${VAULT_CUT_PCT}% platform cut; never added on top.`;

/** Clean a vault path: relative, POSIX, no escapes, 1..512 chars. Spaces and
 *  parentheses are allowed (screenshots like "Screenshot 2026-01-01 103922.png"
 *  or "Screenshot (12).png" must store); URL-breaking / glob / escape
 *  characters (& ? # * % ` ' " | ; < > $ ! \) stay rejected. */
export function cleanVaultPath(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\\/g, "/");
  if (!raw || raw.length > 512) return "";
  if (raw.startsWith("/") || raw.includes("..") || raw.includes("//")) return "";
  if (!/^[A-Za-z0-9._/@:+() \-]+$/.test(raw.replace(/\//g, "a"))) return "";
  if (!/^[A-Za-z0-9._/() :\-]+$/.test(raw)) return "";
  return raw.replace(/^\/+|\/+$/g, "");
}

/** Storage object key: scope-bucketed + content hash (dedup-friendly). */
export function vaultObjectKey(input: {
  scope: VaultScope;
  scopeId: string;
  sha256: string;
  ext: string;
}): string {
  const ext = String(input.ext ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return `${input.scope}/${input.scopeId}/${input.sha256}${ext ? `.${ext.toLowerCase()}` : ""}`;
}

/** Kind routing for autosaved AI artifacts (folder prefixes). */
export const VAULT_KIND_PREFIX: Record<string, string> = {
  "model-3d": "models",
  image: "images",
  animation: "animations",
  code: "code",
  audio: "audio",
  video: "video",
  text: "text",
  chat: "chats",
  log: "logs",
  asset: "assets",
};

export function vaultPathForKind(kind: string, filename: string): string {
  const prefix = VAULT_KIND_PREFIX[kind] ?? "assets";
  const clean = cleanVaultPath(filename) || "untitled";
  return `${prefix}/${clean}`.slice(0, 512);
}
