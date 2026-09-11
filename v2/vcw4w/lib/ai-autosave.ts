/**
 * AI autosave; every AI artifact lands in the Weird Vault automatically.
 *
 * Covered kinds: 3d models, images, animations, code, chat context, full
 * logs, half logs, minimal logs, audio, video, text; plus provenance
 * (which op/model made it) so files stay attributable and reviewable.
 *
 * Log tiers (match the bot-key logging contract):
 *   full   ; prompt + output + context + request/response bodies.
 *   half   ; metadata + short preview (first 500 chars), rest dropped.
 *   minimal; compliance minimum only (time, op, coins, bytes). Nothing
 *             viewable beyond metadata.
 * After autosave the artifact is "worked on automatically": the caller gets
 * a vault path + follow-up hints (e.g. remesh a heavy model, upscale art).
 *
 * Client-safe: pure routing + pricing. No Supabase import.
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";
import { vaultPathForKind } from "@/lib/blob-vault";

export const AUTOSAVE_CUT_PCT = SERVICE_CUT_PCT;

export const AI_ARTIFACT_KINDS = [
  "model-3d",
  "image",
  "animation",
  "code",
  "audio",
  "video",
  "text",
  "chat",
  "log",
  "asset",
] as const;
export type AiArtifactKind = (typeof AI_ARTIFACT_KINDS)[number];

export function isAiArtifactKind(value: unknown): value is AiArtifactKind {
  return (
    typeof value === "string" &&
    (AI_ARTIFACT_KINDS as readonly string[]).includes(value)
  );
}

export const LOG_TIERS = ["full", "half", "minimal"] as const;
export type LogTier = (typeof LOG_TIERS)[number];

export function isLogTier(value: unknown): value is LogTier {
  return (
    typeof value === "string" &&
    (LOG_TIERS as readonly string[]).includes(value)
  );
}

export const LOG_HALF_PREVIEW_CHARS = 500;
export const LOG_FULL_MAX_CHARS = 20000;

export type AutosavePlan = {
  kind: AiArtifactKind;
  tier: LogTier;
  vaultPath: string;
  /** What was dropped (for honest UI: "full text dropped in half mode"). */
  dropped: string[];
  /** Automatic follow-up work queued for the artifact. */
  followUps: string[];
};

export function planAutosave(input: {
  kind: unknown;
  tier?: unknown;
  filename?: unknown;
  bytes?: number;
}): AutosavePlan | null {
  const kind = isAiArtifactKind(input.kind) ? input.kind : null;
  if (!kind) return null;
  const tier: LogTier = isLogTier(input.tier) ? input.tier : "half";
  const filename = String(input.filename ?? "artifact").slice(0, 128) || "artifact";
  const vaultPath = vaultPathForKind(kind, filename);
  const dropped: string[] =
    tier === "half"
      ? ["full prompt/output text beyond the 500-char preview"]
      : tier === "minimal"
        ? ["all viewable text (metadata only)"]
        : [];
  const followUps: string[] =
    kind === "model-3d"
      ? ["remesh check", "GLB convert hint"]
      : kind === "image"
        ? ["upscale hint", "cutout hint"]
        : kind === "code"
          ? ["static audit", "beautiful preview"]
          : kind === "log" || kind === "chat"
            ? ["tiered retention"]
            : ["vault indexed"];
  return { kind, tier, vaultPath, dropped, followUps };
}

/** Least-privilege scope keys for AI autosave. */
export const AUTOSAVE_SCOPES = ["ai:autosave", "ai:read"] as const;

export const AUTOSAVE_CUT_NOTE = `Includes ${AUTOSAVE_CUT_PCT}% platform cut; never added on top.`;
