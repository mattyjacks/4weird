/**
 * Valley Net; the 4weird defense bot / automod layer for clans.
 *
 * Medium-bar, lenient on purpose: posts go through by default and are only
 * held or refused when bad text is CLEARLY there - i.e. an obvious Terms of
 * Use violation (Section 2: illegal content, harassment/hate/threats,
 * sexual content involving minors, fraud/scams/spam floods, IP abuse).
 * Heated debate, trash-talk, profanity, caps, and ordinary links are NOT
 * violations and must flow to `visible`.
 *
 * Valley Net sits in front of every clan write (human posts/comments and bot
 * posts). It combines three signals:
 *   1. Luna (lib/moderation.ts) - ALLOW/BLOCK + heuristic hits.
 *   2. Valley Net shapes; link floods, caps floods, repeat-char floods,
 *      bait phrases. Narrow, clearly-marked patterns only.
 *   3. Caller context; e.g. oversized payloads already rejected by routes.
 *
 * Verdicts: allow | quarantine (store as pending, human review) | block
 * (refuse with 403 + log). Fail-closed like Luna: when Luna is
 * unconfigured or unavailable the verdict is quarantine (never silent
 * allow) and the report net remains. A single weak signal (a few links,
 * caps, a repeat burst) is NOT enough to hold a post - quarantine needs
 * Luna's explicit BLOCK, a Luna outage/unconfigured state, or two
 * independent weak signals, and block needs an unmistakable spam/scam
 * flood.
 * A single weak signal (a few links, caps, a repeat burst) is NOT enough to
 * hold a post - quarantine needs Luna's explicit BLOCK or two independent
 * weak signals, and block needs an unmistakable spam/scam flood.
 * Every non-allow verdict should be logged via logValleynetAction (service
 * role, best-effort, never throws).
 */

import { moderateText } from "@/lib/moderation";
import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import { serviceClient } from "@/lib/supabase/service";

export const VALLEYNET_NAME = "Valley Net";
export const VALLEYNET_BADGE = "👱🏻‍♀️ Protected by Valley Net";

export type ValleynetVerdict = "allow" | "quarantine" | "block";

export type ValleynetResult = {
  verdict: ValleynetVerdict;
  reasons: string[];
  lunaBlocked: boolean;
};

// Narrow flood shapes. Deliberately structural (counts/repetition), never an
// enumerated blocklist pretending to understand language. Thresholds are
// medium-bar: ordinary gamer posts (a few links, some caps, short repeat
// bursts) must NOT match; only unmistakable floods do.
const LINK_RE = /https?:\/\/\S+/gi;
const BAIT_RE =
  /(free\s+(coins|money|crypto|v-?bucks|robux)|click\s+here\s+to\s+claim|earn\s+\$\$\$|double\s+your\s+(coins|crypto)|send\s+\d+\s*(coins?|eth|btc))/i;

export function valleynetShapes(text: string): string[] {
  const t = String(text ?? "");
  const hits: string[] = [];
  const links = t.match(LINK_RE) ?? [];
  if (links.length >= 8) hits.push(`link-flood:${links.length}`);
  else if (links.length >= 5) hits.push(`links:${links.length}`);
  if (/(.)\1{199,}/.test(t)) hits.push("repeat-flood");
  else if (/(.)\1{49,}/.test(t)) hits.push("repeat-burst");
  if (t.length > 400 && t === t.toUpperCase() && /[A-Z]{4,}/.test(t)) hits.push("caps-flood");
  if (BAIT_RE.test(t)) hits.push("bait-phrase");
  return hits;
}

export async function valleynetCheck(text: string, options: { userId?: string } = {}): Promise<ValleynetResult> {
  const input = String(text ?? "");
  const reasons: string[] = [];
  let lunaBlocked = false;
  try {
    let allowExternalAi = false;
    if (options.userId) {
      const eligibility = await checkAuthenticatedVendorEligibility(serviceClient(), options.userId, "openai");
      allowExternalAi = eligibility.allowed;
    }
    const mod = await moderateText(input, { allowExternalAi });
    if (!mod.allowed) {
      lunaBlocked = true;
      reasons.push("luna-block");
      // Fail-closed audit trail: record WHY Luna gave no clearing verdict
      // (unconfigured/outage vs explicit BLOCK) so human reviewers can tell
      // "never reviewed" apart from "reviewed and refused".
      if (mod.reason && mod.reason !== "luna-block") reasons.push(mod.reason);
    } else if (mod.heuristicHit) {
      reasons.push("luna-heuristic");
    }
  } catch {
    // Fail-closed (defense-in-depth; moderateText itself never throws):
    // Luna erroring out is not a verdict of safety - quarantine now and
    // let the throw site land in the log below via console.error.
    reasons.push("luna-unavailable");
    for (const hit of valleynetShapes(input)) reasons.push(hit);
    return { verdict: "quarantine", reasons, lunaBlocked };
  }
  for (const hit of valleynetShapes(input)) reasons.push(hit);

  // Medium-bar verdicts: block only on unmistakable ToS abuse (scam bait or
  // an extreme flood). Quarantine when Luna explicitly BLOCKs (its prompt
  // already requires a clear terms violation), when Luna is unconfigured or
  // unavailable (fail-closed: no clearing verdict exists), or when two
  // independent weak signals corroborate each other. A single weak signal
  // (a few links, caps, one repeat burst, one fallback heuristic) flows
  // through to `visible`.
  const hard = reasons.some((r) =>
    r.startsWith("link-flood") || r === "repeat-flood" || r === "bait-phrase",
  );
  if (hard) return { verdict: "block", reasons, lunaBlocked };
  if (lunaBlocked) return { verdict: "quarantine", reasons, lunaBlocked };
  const weakCount = reasons.length;
  if (weakCount >= 2) return { verdict: "quarantine", reasons, lunaBlocked };
  return { verdict: "allow", reasons, lunaBlocked };
}

export type ValleynetLogInput = {
  clanId?: string | null;
  targetType: "post" | "comment" | "join" | "bot-deploy" | "report";
  targetId?: string | null;
  verdict: ValleynetVerdict;
  reasons: string[];
  actorId?: string | null;
};

/** Best-effort Valley Net audit log. Never throws; logs server-side. */
export async function logValleynetAction(input: ValleynetLogInput): Promise<void> {
  try {
    const { serviceClient, hasServerSupabase } = await import("@/lib/supabase/service");
    if (!hasServerSupabase()) return;
    const db = serviceClient();
    const { error } = await db.from("valleynet_actions").insert({
      clan_id: input.clanId ?? null,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      verdict: input.verdict,
      reasons: input.reasons.slice(0, 8).join(",").slice(0, 500),
      actor_id: input.actorId ?? null,
    });
    if (error) console.error("[valleynet] log insert failed:", error.code ?? error.message);
  } catch (err) {
    console.error("[valleynet] log failed:", err);
  }
}
