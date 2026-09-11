/**
 * Buddy voice presence; mic mute/VAD, barge-in (interruption) handling, and
 * interruption memory. 100% pure (no DOM, no imports): the widget owns the
 * MediaStream/Analyser/SpeechRecognition objects and feeds numbers + strings
 * through these functions. Runnable under plain node for tests.
 *
 * Interruption model: when the user starts speaking while Buddy is talking,
 * the widget stops Buddy's audio, keeps (a) the partial user transcript so
 * far and (b) how far Buddy got, and resumes with a self-prompt that carries
 * both; so nothing said on either side is lost. Turns flagged
 * `interrupted` are preserved preferentially in memory.
 */

export type VadState = { speaking: boolean; hang: number };

export type VadEvent = "started" | "ended" | "none";

export const VAD_DEFAULT_THRESHOLD = 0.02;
export const VAD_DEFAULT_HANGOVER_FRAMES = 8;

/** RMS energy of one analyser time-domain frame (0..1-ish). Never throws. */
export function frameEnergy(samples: ArrayLike<number>): number {
  try {
    const n = samples.length;
    if (!n) return 0;
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      const v = Number(samples[i]) || 0;
      sum += v * v;
    }
    return Math.sqrt(sum / n);
  } catch {
    return 0;
  }
}

/**
 * Hangover VAD: speech starts the first frame above threshold, and ends
 * only after `hangoverFrames` consecutive quiet frames (so pauses between
 * words don't chop one utterance into many). Returns the next state plus
 * a single edge event.
 */
export function updateVad(
  prev: VadState,
  energy: number,
  opts?: { threshold?: number; hangoverFrames?: number },
): { state: VadState; event: VadEvent } {
  const threshold = opts?.threshold ?? VAD_DEFAULT_THRESHOLD;
  const hangover = Math.max(1, Math.floor(opts?.hangoverFrames ?? VAD_DEFAULT_HANGOVER_FRAMES));
  const loud = Number(energy) > threshold;
  if (!prev.speaking) {
    if (loud) return { state: { speaking: true, hang: hangover }, event: "started" };
    return { state: { speaking: false, hang: 0 }, event: "none" };
  }
  if (loud) return { state: { speaking: true, hang: hangover }, event: "none" };
  const hang = prev.hang - 1;
  if (hang <= 0) return { state: { speaking: false, hang: 0 }, event: "ended" };
  return { state: { speaking: true, hang }, event: "none" };
}

/** Fold an interim transcript into the running partial (dedupe repeats). */
export function mergePartialTranscript(prevPartial: string, interim: string): string {
  const prev = String(prevPartial ?? "").trim();
  const next = String(interim ?? "").replace(/\s+/g, " ").trim();
  if (!next) return prev;
  if (!prev) return next.slice(0, 500);
  if (next.startsWith(prev) || prev.endsWith(next)) return (next.length >= prev.length ? next : prev).slice(0, 500);
  return `${prev} ${next}`.slice(0, 500);
}

/**
 * One-line resumption note the widget prepends to the next message after a
 * barge-in, so the model sees what both sides said around the interruption.
 */
export function resumptionPrefix(partialUserText: string, buddyReplySoFar: string): string {
  const partial = String(partialUserText ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const soFar = String(buddyReplySoFar ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const bits: string[] = ["[barge-in]"];
  bits.push(partial ? `I cut in saying: "${partial}".` : "I cut in before finishing my sentence.");
  bits.push(soFar ? `You had gotten as far as: "${soFar}".` : "You had just started answering.");
  bits.push("Please continue from my interruption; don't restart your previous answer from the top.");
  return bits.join(" ");
}

/**
 * Self-prompt the widget stores at interruption time: everything needed to
 * resume smartly on the next turn (what was heard, how far Buddy got, what
 * game moment it happened in). Serialized into history, never sent raw.
 */
export type InterruptionSnapshot = {
  at: string;
  partialUserText: string;
  buddyReplySoFar: string;
  gameTitle: string;
};

export function buildInterruptionSnapshot(input: {
  partialUserText: string;
  buddyReplySoFar: string;
  gameTitle?: string;
}): InterruptionSnapshot {
  return {
    at: new Date().toISOString().slice(0, 19),
    partialUserText: String(input.partialUserText ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    buddyReplySoFar: String(input.buddyReplySoFar ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    gameTitle: String(input.gameTitle ?? "").slice(0, 80),
  };
}

/** Render a snapshot back into the resumption note for the next prompt. */
export function snapshotToPrompt(snapshot: InterruptionSnapshot): string {
  return resumptionPrefix(snapshot.partialUserText, snapshot.buddyReplySoFar);
}

/**
 * Prune turns to maxKept, preferring to keep interrupted turns (they carry
 * the redirect context) over older plain turns. Stable, deterministic.
 */
export function pruneHistoryWithInterruptions<T extends { interrupted?: boolean }>(turns: T[], maxKept = 8): T[] {
  const list = Array.isArray(turns) ? turns.slice() : [];
  if (list.length <= maxKept) return list;
  const keep = new Set<number>();
  // Always keep the most recent turn (it anchors the reply).
  keep.add(list.length - 1);
  // Then interrupted turns, newest first.
  for (let i = list.length - 1; i >= 0 && keep.size < maxKept; i -= 1) {
    if (list[i]?.interrupted) keep.add(i);
  }
  // Then the newest remaining turns.
  for (let i = list.length - 1; i >= 0 && keep.size < maxKept; i -= 1) {
    keep.add(i);
  }
  return list.filter((_, i) => keep.has(i));
}
