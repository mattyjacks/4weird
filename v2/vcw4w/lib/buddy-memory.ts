/**
 * Buddy cross-session memory (extractive rolling buffer).
 *
 * Opt-in, per-game, zero model calls: this module only appends and trims
 * plain-text "Player: … / Buddy: …" lines. No network, no keys, no AI spend.
 * Client-safe and pure: no imports beyond buddy-engine types (type-only),
 * never throws.
 */

import type { BuddyHistoryTurn } from "@/lib/buddy-engine";

export type BuddyMemoryTurn = Pick<BuddyHistoryTurn, "role" | "text"> | { role: string; text: string };

const LINE_MAX_CHARS = 300;

/**
 * Merge new turns onto stored memory, oldest lines first, capped at maxChars.
 * Existing memory is treated as newline-separated lines; new turns are
 * appended as "Player: …" / "Buddy: …" lines, then oldest lines are dropped
 * until the result fits. Never throws; always returns a string.
 */
export function mergeBuddyMemory(
  existing: string,
  turns: { role: string; text: string }[] | BuddyMemoryTurn[],
  maxChars = 1500,
): string {
  try {
    const cap = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : 1500;
    const lines: string[] = String(existing ?? "")
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim().slice(0, LINE_MAX_CHARS))
      .filter(Boolean)
      .slice(-50);
    const input = Array.isArray(turns) ? turns : [];
    for (const turn of input.slice(-20)) {
      const row = (turn ?? {}) as { role?: unknown; text?: unknown };
      const roleRaw = String(row.role ?? "").toLowerCase();
      const label = roleRaw === "buddy" || roleRaw === "assistant" ? "Buddy" : "Player";
      const text = String(row.text ?? "").replace(/\s+/g, " ").trim().slice(0, LINE_MAX_CHARS);
      if (text) lines.push(`${label}: ${text}`);
    }
    let out = lines.join("\n");
    while (out.length > cap && lines.length > 1) {
      lines.shift();
      out = lines.join("\n");
    }
    return out.slice(0, cap);
  } catch {
    try {
      const cap = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : 1500;
      return String(existing ?? "").slice(0, cap);
    } catch {
      return "";
    }
  }
}

/**
 * Prompt block carrying cross-session memory. Returns "" when there is
 * nothing to remember; otherwise a short "What you remember…" block capped
 * at 600 chars so it stays a cheap, fixed-size prompt addition.
 */
export function memoryPromptSection(memory: string): string {
  try {
    const clean = String(memory ?? "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    return `What you remember about this player: ${clean}`.slice(0, 600);
  } catch {
    return "";
  }
}
