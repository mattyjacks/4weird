/**
 * Bot key request logging (SERVER-ONLY: service-role client).
 *
 * Tiers (see lib/bot-key-policy.ts):
 *  - full: prompt, output, context + request/response previews are STORED.
 *  - half (default): metadata + short preview only; full texts are dropped.
 *  - none: compliance minimum only; time, key, route, status, ip, coins,
 *    bytes. Nothing viewable beyond that, nothing extra stored. Safety and
 *    compliance fields are ALWAYS stored regardless of mode.
 *
 * Every stored request also bills log-file storage in Vibe Coins with the
 * 25% platform cut INCLUDED (logStorageSplit). Never throws: logging must
 * never break the request it observes.
 */

import { serviceClient } from "@/lib/supabase/service";
import {
  LOG_HALF_PREVIEW_CHARS,
  LOG_MAX_TEXT_CHARS,
  logStorageSplit,
  type LoggingMode,
} from "@/lib/bot-key-policy";

function clip(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export interface BotLogParts {
  prompt?: unknown;
  output?: unknown;
  context?: unknown;
  requestBody?: unknown;
  responseSummary?: unknown;
}

export async function logBotKeyRequest(input: {
  keyId: string;
  userId: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  coinsSpent?: number;
  loggingMode?: string;
  parts?: BotLogParts;
}): Promise<string | null> {
  try {
    const mode: LoggingMode =
      input.loggingMode === "full" || input.loggingMode === "none" ? input.loggingMode : "half";
    const parts = input.parts ?? {};
    const promptFull = clip(parts.prompt, LOG_MAX_TEXT_CHARS);
    const outputFull = clip(parts.output, LOG_MAX_TEXT_CHARS);
    const contextFull =
      parts.context === undefined || parts.context === null
        ? null
        : (() => {
            try {
              return JSON.stringify(parts.context).slice(0, LOG_MAX_TEXT_CHARS);
            } catch {
              return null;
            }
          })();
    const reqFull = clip(parts.requestBody, LOG_MAX_TEXT_CHARS);
    const resFull = clip(parts.responseSummary, LOG_MAX_TEXT_CHARS);

    const storedPrompt = mode === "full" ? promptFull : null;
    const storedOutput = mode === "full" ? outputFull : null;
    const storedContext = mode === "full" ? contextFull : null;
    const storedReq =
      mode === "full" ? reqFull : mode === "half" ? clip(reqFull, LOG_HALF_PREVIEW_CHARS) : null;
    const storedRes =
      mode === "full" ? resFull : mode === "half" ? clip(resFull, LOG_HALF_PREVIEW_CHARS) : null;

    const bytes =
      (storedPrompt?.length ?? 0) +
      (storedOutput?.length ?? 0) +
      (storedContext?.length ?? 0) +
      (storedReq?.length ?? 0) +
      (storedRes?.length ?? 0);
    const storage = logStorageSplit(bytes);

    const db = serviceClient();
    const { data } = await db
      .from("bot_key_request_logs")
      .insert({
        key_id: input.keyId,
        user_id: input.userId,
        method: String(input.method || "GET").slice(0, 10).toUpperCase(),
        path: String(input.path || "").slice(0, 500),
        status: Math.floor(Number(input.status)) || 0,
        ip: String(input.ip || "").slice(0, 64),
        coins_spent: Math.round(Number(input.coinsSpent || 0) * 100) / 100,
        log_cut_coins: storage.cut,
        bytes: storage.bytes,
        prompt_text: storedPrompt,
        output_text: storedOutput,
        context: storedContext ? { text: storedContext } : null,
        request_preview: storedReq,
        response_preview: storedRes,
      })
      .select("id")
      .maybeSingle();
    const row = data as { id?: string } | null;
    return typeof row?.id === "string" ? row.id : null;
  } catch {
    return null;
  }
}
