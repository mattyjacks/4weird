"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import { makeSeed, mulberry32, parseSeed, shuffle, xmur3 } from "@/lib/vocrehab-seed";
import { vocrehabSelectFocus } from "@/lib/vocrehab-seed-pools";

interface VocrehabCard {
  key: string;
  symbol: string;
  label: string;
}

export default function VocrehabGameFocusShift(props: VocrehabGameRunProps) {
  // Remount per run key so retry reshuffles from a lazy initializer —
  // no effects, SSR-stable first render, no hydration mismatch.
  return <VocrehabFocusShiftBoard key={props.vocrehabRunKey} {...props} />;
}

function VocrehabFocusShiftBoard({ vocrehabEmit, vocrehabFinish, vocrehabSeed, vocrehabRunKey }: VocrehabGameRunProps) {
  // Seeded deal: 10 pair types, same seed replays the same set+order.
  const sel = useMemo(
    () => vocrehabSelectFocus(parseSeed(vocrehabSeed ?? null) ?? makeSeed()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocrehabSeed, vocrehabRunKey],
  );
  const [vocrehabDeck] = useState<VocrehabCard[]>(() => {
    const deck: VocrehabCard[] = [];
    sel.pairs.forEach((p, i) => {
      deck.push({ key: `a${i}`, symbol: p.symbol, label: p.label });
      deck.push({ key: `b${i}`, symbol: p.symbol, label: p.label });
    });
    return shuffle(mulberry32(xmur3(`${sel.seed}|focus-shift:layout`)()), deck);
  });
  const [vocrehabOpen, setVocrehabOpen] = useState<string[]>([]);
  const [vocrehabMatched, setVocrehabMatched] = useState<string[]>([]);
  const [vocrehabInterrupted, setVocrehabInterrupted] = useState(false);
  const [vocrehabOverlay, setVocrehabOverlay] = useState(false);
  const [vocrehabMismatches, setVocrehabMismatches] = useState(0);
  const dismissAtRef = useRef(0);
  const refocusMsRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const deck = vocrehabDeck;
  const pairs = vocrehabMatched.length / 2;

  const vocrehabDismiss = () => {
    setVocrehabOverlay(false);
    dismissAtRef.current = performance.now();
    vocrehabEmit("action", { resumedAfterInterruption: true });
  };

  const vocrehabFlip = useCallback(
    (card: VocrehabCard) => {
      if (vocrehabOverlay || vocrehabOpen.includes(card.key) || vocrehabMatched.includes(card.key)) return;
      if (vocrehabOpen.length >= 2) return;
      const next = [...vocrehabOpen, card.key];
      setVocrehabOpen(next);
      vocrehabEmit("action", { flip: card.label });
      if (next.length === 2) {
        const first = deck.find((c) => c.key === next[0]);
        const second = deck.find((c) => c.key === next[1]);
        if (first && second && first.label === second.label) {
          const matchedNow = [...vocrehabMatched, first.key, second.key];
          setVocrehabMatched(matchedNow);
          setVocrehabOpen([]);
          if (dismissAtRef.current > 0 && refocusMsRef.current === null) {
            refocusMsRef.current = Math.round(performance.now() - dismissAtRef.current);
          }
          vocrehabEmit("action", { match: first.label, pairs: matchedNow.length / 2 });
          // Scripted interruption fires when the 6th pair is on the board (5 matched).
          if (matchedNow.length / 2 === 5 && !vocrehabInterrupted) {
            setVocrehabInterrupted(true);
            setVocrehabOverlay(true);
            vocrehabEmit("interrupt", { source: "announcement", atPair: 6 });
          }
          if (matchedNow.length === deck.length && !doneRef.current) {
            doneRef.current = true;
            vocrehabFinish({
              pairs: matchedNow.length / 2,
              mismatches: vocrehabMismatches,
              interruptionShown: vocrehabInterrupted || matchedNow.length / 2 >= 5,
              refocusMs: refocusMsRef.current,
              seed: sel.seed,
            });
          }
        } else {
          setVocrehabMismatches((m) => m + 1);
          vocrehabEmit("error", { mismatch: true });
          window.setTimeout(() => setVocrehabOpen([]), 700);
        }
      }
    },
    [vocrehabOverlay, vocrehabOpen, vocrehabMatched, deck, vocrehabMismatches, vocrehabInterrupted, vocrehabEmit, vocrehabFinish, sel.seed],
  );

  return (
    <div className="vocrehab-game-focus-shift space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Matched {pairs} of 10 pairs · Mismatches: {vocrehabMismatches}
        {vocrehabInterrupted ? " · 📢 Announcement happened (see below)" : ""}
      </p>
      {vocrehabOverlay ? (
        <div className="rounded-lg border p-5 text-center" role="alert">
          <p className="font-semibold">📢 Mock announcement</p>
          <p className="text-sm text-muted-foreground">
            “Attention — the break room will close early today.” Interruptions happen at work. Notice it, then
            refocus when you are ready. This is practice, not a test.
          </p>
          <button
            type="button"
            onClick={vocrehabDismiss}
            className="mt-2 rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Noted — back to matching
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Symbol cards">
          {deck.map((card) => {
            const faceUp = vocrehabOpen.includes(card.key) || vocrehabMatched.includes(card.key);
            const done = vocrehabMatched.includes(card.key);
            return (
              <li key={card.key}>
                <button
                  type="button"
                  onClick={() => vocrehabFlip(card)}
                  disabled={done}
                  aria-label={faceUp ? `${card.label}` : "Face-down card"}
                  aria-pressed={faceUp}
                  className="flex h-16 w-full items-center justify-center rounded-lg border text-2xl font-bold disabled:opacity-70"
                >
                  {faceUp ? card.symbol : "?"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        Framing: interruptions happen at work — this shows what helps you refocus, not how fast you are.
      </p>
    </div>
  );
}
