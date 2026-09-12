/**
 * Buddy proactive score reactions; opt-in auto-commentary on big score moments.
 * 100% pure (no DOM, no imports): the widget owns the score feed, toggle, and
 * timers and feeds numbers + strings through these functions. Runnable under
 * plain node for tests.
 *
 * Moment model: the widget watches the game score, and on a meaningful jump
 * asks the buddy to react with the same prompt shape as a manual /react, but
 * capped per session and spaced by a cooldown so it never spams.
 */

export type ProactiveState = { lastScore: number | null; lastAutoAt: number; autoCount: number };

export const PROACTIVE_DEFAULT_MIN_DELTA = 10;
export const PROACTIVE_DEFAULT_COOLDOWN_MS = 60000;
export const PROACTIVE_DEFAULT_MAX_PER_SESSION = 10;

/**
 * True only on a meaningful score jump: |next - prev| >= minDelta, or a
 * crossing from null (first real score). Never true on null/NaN next, or on
 * equal values. Cooldown gate is purely a function of args: when lastAutoAt
 * is a real timestamp, a re-fire inside cooldownMs returns false.
 */
export function shouldAutoReactScore(
  prev: number | null,
  next: number | null,
  now: number,
  opts?: { minDelta?: number; cooldownMs?: number; lastAutoAt?: number },
): boolean {
  try {
    const nextNum = Number(next);
    if (next === null || next === undefined || !Number.isFinite(nextNum)) return false;
    const nowNum = Number(now);
    const safeNow = Number.isFinite(nowNum) ? nowNum : 0;
    let minDelta = Number(opts?.minDelta);
    if (!Number.isFinite(minDelta) || minDelta < 0) minDelta = PROACTIVE_DEFAULT_MIN_DELTA;
    const rawLast = Number(opts?.lastAutoAt);
    if (Number.isFinite(rawLast) && rawLast > 0) {
      let cooldownMs = Number(opts?.cooldownMs);
      if (!Number.isFinite(cooldownMs) || cooldownMs < 0) cooldownMs = PROACTIVE_DEFAULT_COOLDOWN_MS;
      if (safeNow - rawLast < cooldownMs) return false;
    }
    const prevNum = Number(prev);
    if (prev === null || prev === undefined || !Number.isFinite(prevNum)) return true;
    if (prevNum === nextNum) return false;
    return Math.abs(nextNum - prevNum) >= minDelta;
  } catch {
    return false;
  }
}

/** True when enough wall-clock time passed since the last auto react. Never throws. */
export function cooldownReady(lastAutoAt: number, now: number, cooldownMs = 60000): boolean {
  try {
    let cd = Number(cooldownMs);
    if (!Number.isFinite(cd) || cd < 0) cd = PROACTIVE_DEFAULT_COOLDOWN_MS;
    const nowNum = Number(now);
    if (!Number.isFinite(nowNum)) return false;
    const last = Number(lastAutoAt);
    if (!Number.isFinite(last) || last <= 0) return true;
    return nowNum - last >= cd;
  } catch {
    return false;
  }
}

/**
 * Build a /react-shaped prompt for an auto moment so server normalization
 * treats it like a manual react. Reuses the React to this moment phrasing.
 */
export function autoReactPrompt(score: number | null, screenText: string): string {
  try {
    const screen = String(screenText ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    const scoreNum = Number(score);
    const hasScore = score !== null && score !== undefined && Number.isFinite(scoreNum);
    const at = screen ? ` Current screen: ${screen}.` : "";
    const lead = hasScore
      ? `React to this moment in 1-2 short sentences: Score is now ${scoreNum}.`
      : `React to this moment in 1-2 short sentences: to the current screen.`;
    return (lead + at).slice(0, 900);
  } catch {
    return "React to this moment in 1-2 short sentences: to the current screen.";
  }
}

/** True while more autos are allowed this session (count < max). Never throws. */
export function capAutos(count: number, maxPerSession = 10): boolean {
  try {
    let max = Number(maxPerSession);
    if (!Number.isFinite(max)) max = PROACTIVE_DEFAULT_MAX_PER_SESSION;
    max = Math.floor(max);
    if (max <= 0) return false;
    let c = Number(count);
    if (!Number.isFinite(c) || c < 0) c = 0;
    else c = Math.floor(c);
    return c < max;
  } catch {
    return false;
  }
}
