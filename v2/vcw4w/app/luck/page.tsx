"use client";

/**
 * Luck Factory (Remastery Feature 08, Wave 3).
 *
 * Intention-meditation flow + deterministic seed engine over the landed
 * lib/remastery/luck-factory.ts foundation (imported, never edited).
 * Free display only: NO paid draws, NO ledger writes, NO fetch, NO wagers,
 * NO payouts, NO prizes — entertainment only. Fail-open offline; SSR-safe
 * ("use client", no browser APIs at module top).
 */

import { useState } from "react";
import { interopBus } from "@/lib/interop";
import {
  drawLuck,
  fnv1aHex,
  intentionBoost,
  isJackpot,
} from "@/lib/remastery/luck-factory";

interface DrawResult {
  seedHex: string;
  value: number;
  roll: number;
  boosted: number;
  perfect: boolean;
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

  function onDraw() {
    const seed = intention.trim();
    const parsedCounter = Number(counter);
    const parsedStreak = Number(streakDays);
    try {
      if (!seed) {
        setResult({ error: "Enter an intention first — the seed is derived from it." });
        return;
      }
      if (!Number.isInteger(parsedCounter) || parsedCounter < 0) {
        setResult({ error: "Counter must be a non-negative integer." });
        return;
      }
      const seedHex = fnv1aHex(seed);
      const draw = drawLuck(seed, parsedCounter);
      const streak = Number.isFinite(parsedStreak) && parsedStreak > 0 ? Math.floor(parsedStreak) : 0;
      const boosted = intentionBoost(draw.roll, streak);
      setResult({ seedHex, value: draw.value, roll: draw.roll, boosted, perfect: isJackpot(draw) });
      try {
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

      <section style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label>
          Intention / mantra
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="e.g. ship the demo with calm focus"
            rows={3}
            maxLength={500}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label>
            Meditation streak (days)
            <input
              type="number"
              min={0}
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
          </dl>
          {result.perfect && <p>Perfect 100 — illustration only, worth nothing.</p>}
          <p><small>Same intention + counter always yields the same preview. Streak bonus: +1 per full 7-day week, capped at +10.</small></p>
        </section>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Transparent odds</h2>
        <p>
          D100 rolls are uniform over 1–100 (each face ~1%). A perfect 100 is
          illustration only, worth nothing. No paid draws exist: nothing is
          charged, nothing is won, nothing is recorded.
        </p>
      </section>
    </main>
  );
}
