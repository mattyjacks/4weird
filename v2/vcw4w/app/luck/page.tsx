"use client";

/**
 * Luck Factory (Remastery Feature 08, Wave 3).
 *
 * Intention-meditation flow + deterministic seed engine over the landed
 * lib/remastery/luck-factory.ts foundation (imported, never edited) plus the
 * 🍀 Clover fake currency in lib/remastery/luck-clovers.ts (pure, tested
 * guards). Free display only: NO paid draws, NO ledger writes, NO fetch, NO
 * wagers, NO payouts, NO prizes — entertainment only. Fail-open offline;
 * SSR-safe ("use client", no browser APIs at module top).
 *
 * HACKER-PROOF NOTES (why there is nothing to exploit):
 * - Clovers live in React state only: no API, no ledger, no localStorage, no
 *   cookies, no URL params. Devtools can repaint your own screen, and a
 *   refresh wipes it, because no backend ever heard about it.
 * - Grants are deterministic (boosted roll + fixed perfect bonus): same
 *   visible inputs → same clovers. No RNG to rig, no multiplier to tamper.
 * - All inputs are allow-listed (type + range + length) and all arithmetic
 *   is safe-integer checked with a hard session cap. NaN/Infinity/overflow
 *   can never render or accumulate. Invalid input fails closed: the draw is
 *   rejected and the balance is untouched.
 * - Clover amounts are never emitted on interopBus, so no other tool can
 *   mistake them for value. A 1-second draw cooldown stops double-click and
 *   macro spam from inflating the session count.
 */

import { useRef, useState } from "react";
import { interopBus } from "@/lib/interop";
import {
  drawLuck,
  fnv1aHex,
  intentionBoost,
  isJackpot,
} from "@/lib/remastery/luck-factory";
import {
  addClovers,
  cloversForDraw,
  CLOVER_EMOJI,
  DRAW_COOLDOWN_MS,
  MAX_COUNTER,
  MAX_INTENTION_CHARS,
  MAX_STREAK_DAYS,
  sanitizeCounter,
  sanitizeIntention,
  sanitizeStreak,
} from "@/lib/remastery/luck-clovers";

interface DrawResult {
  seedHex: string;
  value: number;
  roll: number;
  boosted: number;
  perfect: boolean;
  clovers: number;
  error?: undefined;
}

interface DrawError {
  error: string;
}

type DrawState = DrawResult | DrawError | null;

function isDrawError(s: DrawState): s is DrawError {
  return s !== null && (s as DrawError).error !== undefined;
}

export default function LuckPage() {
  const [intention, setIntention] = useState("");
  const [streakDays, setStreakDays] = useState("0");
  const [counter, setCounter] = useState("0");
  const [result, setResult] = useState<DrawState>(null);
  const [sessionClovers, setSessionClovers] = useState(0);
  const lastDrawAt = useRef(0);

  function onDraw() {
    // Cooldown: one accepted draw per second (double-click / macro guard).
    const now = Date.now();
    if (now - lastDrawAt.current < DRAW_COOLDOWN_MS) {
      setResult({ error: "Slow down — one draw per second." });
      return;
    }
    // Fail-closed validation: bad input rejects the draw, balance untouched.
    const seedCheck = sanitizeIntention(intention);
    if (!seedCheck.ok) {
      setResult({ error: seedCheck.error });
      return;
    }
    const counterCheck = sanitizeCounter(counter);
    if (!counterCheck.ok) {
      setResult({ error: counterCheck.error });
      return;
    }
    const streak = sanitizeStreak(streakDays);
    try {
      const seedHex = fnv1aHex(seedCheck.value);
      const draw = drawLuck(seedCheck.value, counterCheck.value);
      const boosted = intentionBoost(draw.roll, streak);
      const perfect = isJackpot(draw);
      const clovers = cloversForDraw(boosted, perfect);
      lastDrawAt.current = now;
      // Session-only balance: worth nothing, resets on refresh, never coins.
      setSessionClovers((prev) => addClovers(prev, clovers));
      setResult({ seedHex, value: draw.value, roll: draw.roll, boosted, perfect, clovers });
      try {
        // Best-effort signal only: carries NO amounts, so no tool can treat
        // clovers as value.
        interopBus.emit("tools:used", { tool: "luck-factory", action: "draw" });
      } catch {
        // Fail-open: bus delivery is best-effort.
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1>Luck Factory</h1>
      <p>
        Turn an intention or mantra into a deterministic luck preview. Entertainment only — not gambling:
        no wagers, no payouts, nothing is recorded or charged.
      </p>

      <section
        aria-live="polite"
        aria-label="Session clover balance"
        style={{ marginTop: "1rem", border: "1px solid #6ee7b7", borderRadius: 8, padding: "0.75rem 1rem", background: "#052e22" }}
      >
        <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
          {CLOVER_EMOJI} {sessionClovers.toLocaleString()} clovers
        </p>
        <p style={{ margin: "0.25rem 0 0" }}>
          <small>
            Session only — resets on refresh, worth nothing. Clovers are never coins,
            never convertible, never withdrawable.
          </small>
        </p>
      </section>

      <section style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label>
          Intention / mantra
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="e.g. ship the demo with calm focus"
            rows={3}
            maxLength={MAX_INTENTION_CHARS}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label>
            Meditation streak (days)
            <input
              type="number"
              min={0}
              max={MAX_STREAK_DAYS}
              value={streakDays}
              onChange={(e) => setStreakDays(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem" }}
            />
          </label>
          <label>
            Draw counter
            <input
              type="number"
              min={0}
              max={MAX_COUNTER}
              step={1}
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem" }}
            />
          </label>
        </div>
        <button type="button" onClick={onDraw} style={{ justifySelf: "start" }}>
          Draw luck seed
        </button>
      </section>

      {result && isDrawError(result) && (
        <p role="alert" style={{ color: "#b00020" }}>{result.error}</p>
      )}

      {result && !isDrawError(result) && (
        <section aria-live="polite" style={{ marginTop: "1rem", border: "1px solid #ccc", borderRadius: 8, padding: "1rem" }}>
          <h2>Deterministic preview</h2>
          <dl>
            <dt>Seed (FNV-1a hex of intention)</dt>
            <dd><code>{result.seedHex}</code></dd>
            <dt>Draw value (uniform [0, 1))</dt>
            <dd>{result.value.toFixed(6)}</dd>
            <dt>D100 roll</dt>
            <dd>{result.roll}</dd>
            <dt>With meditation boost</dt>
            <dd>{result.boosted}</dd>
            <dt>Clovers granted</dt>
            <dd>{CLOVER_EMOJI} +{result.clovers.toLocaleString()}</dd>
          </dl>
          {result.perfect && <p>Perfect 100 — illustration only, worth nothing.</p>}
          <p><small>Same intention + counter always yields the same preview and the same clovers. Streak bonus: +1 per full 7-day week, capped at +10.</small></p>
        </section>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Transparent odds</h2>
        <p>
          D100 rolls are uniform over 1–100 (each face ~1%). A perfect 100 is
          illustration only, worth nothing. No paid draws exist: nothing is
          charged, nothing is won, nothing is recorded.
        </p>
        <p>
          {CLOVER_EMOJI} Clovers are fake currency: each draw grants the boosted roll
          in clovers (plus a fixed 100 bonus on a perfect 100). They exist only on
          this screen, reset on refresh, and can never become coins or anything
          else of value.
        </p>
      </section>
    </main>
  );
}
