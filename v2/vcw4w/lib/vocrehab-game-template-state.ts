import { vocrehabFileSortPool, vocrehabInboxPool, vocrehabFocusPool } from "@/lib/vocrehab-seed-pools";
import { vocrehabBarrierPoolVariants } from "@/lib/vocrehab-seed-pools3";

type State = Record<string, unknown>;
const record = (value: unknown): State | null => value && typeof value === "object" && !Array.isArray(value) ? value as State : null;
const shortText = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

export function fileSortTemplate(value: unknown) {
  const state = record(value);
  if (!state || !Array.isArray(state.files) || state.files.length < 1 || state.files.length > 24) return null;
  const folders = ["Invoices", "Schedules", "Client Notes"] as const;
  const ids = new Set<string>();
  const files = [];
  for (const raw of state.files) {
    const item = record(raw);
    if (!item || !shortText(item.id, 40) || !shortText(item.name, 120) || !folders.includes(item.folder as typeof folders[number]) || ids.has(item.id)) return null;
    ids.add(item.id);
    files.push({ id: item.id, name: item.name.trim(), folder: item.folder as typeof folders[number] });
  }
  return files;
}

export function inboxSprintTemplate(value: unknown) {
  const state = record(value);
  if (!state || !Array.isArray(state.messages) || state.messages.length < 1 || state.messages.length > 20) return null;
  const kinds = ["urgent", "normal", "fyi", "phishing", "accommodation"] as const;
  const ids = new Set<string>();
  const messages = [];
  for (const raw of state.messages) {
    const item = record(raw);
    if (!item || !shortText(item.id, 40) || !shortText(item.from, 100) || !shortText(item.subject, 140) || !shortText(item.body, 800) || !kinds.includes(item.kind as typeof kinds[number]) || ids.has(item.id)) return null;
    ids.add(item.id);
    messages.push({ id: item.id, from: item.from.trim(), subject: item.subject.trim(), body: item.body.trim(), kind: item.kind as typeof kinds[number] });
  }
  const replyTargetId = state.replyTargetId;
  if (replyTargetId !== undefined && (typeof replyTargetId !== "string" || !ids.has(replyTargetId))) return null;
  return { messages, replyTargetId: typeof replyTargetId === "string" ? replyTargetId : null };
}

export function focusShiftTemplate(value: unknown) {
  const state = record(value);
  if (!state || !Array.isArray(state.pairs) || state.pairs.length < 2 || state.pairs.length > 10) return null;
  const ids = new Set<string>();
  const pairs = [];
  for (const raw of state.pairs) {
    const item = record(raw);
    if (!item || !shortText(item.id, 40) || !shortText(item.symbol, 12) || !shortText(item.label, 80) || ids.has(item.id)) return null;
    ids.add(item.id);
    pairs.push({ id: item.id, symbol: item.symbol, label: item.label.trim() });
  }
  const interruptionAfterPairs = state.interruptionAfterPairs;
  if (interruptionAfterPairs !== undefined && (!Number.isInteger(interruptionAfterPairs) || (interruptionAfterPairs as number) < 1 || (interruptionAfterPairs as number) > pairs.length)) return null;
  return { pairs, interruptionAfterPairs: typeof interruptionAfterPairs === "number" ? interruptionAfterPairs : Math.min(5, pairs.length) };
}

export function barrierRunTemplate(value: unknown) {
  const state = record(value);
  if (!state || typeof state.variantId !== "string") return null;
  const variant = vocrehabBarrierPoolVariants.find((item) => item.variantId === state.variantId);
  return variant ?? null;
}

// These canonical pools are intentionally referenced here so the supported
// schema remains discoverable alongside source content when a template is authored.
export const vocrehabTemplateSourceCounts = { fileSort: vocrehabFileSortPool.length, inbox: vocrehabInboxPool.length, focus: vocrehabFocusPool.length };
