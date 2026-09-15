"use client";

import { useCallback, useState } from "react";
import { PetRoom } from "@/components/pet/pet-room";

const COACH_KEY = "4weird_pet_coach_seen_v1";

const STEPS = [
  {
    title: "Feed when Fullness drops",
    body: "Hunger drifts down every few seconds. A snack restores Fullness and a little Happiness.",
  },
  {
    title: "Play for Happiness",
    body: "Toss the ball to raise Happiness — it costs a bit of Fullness and Energy.",
  },
  {
    title: "Sleep to recharge",
    body: "Tuck your pet in and Energy climbs back. It wakes up on its own at 100%.",
  },
];

/**
 * Colocated client entry for /pet: the PetRoom canvas simulation plus the
 * first-run coach marks the room itself does not render. The seen-flag lives
 * in localStorage so the tour shows once and stays dismissible afterwards.
 */
export function PetClient() {
  // Lazy initializer reads the seen-flag once (SSR-safe: window-guarded, no
  // effect needed, so no cascading render).
  const [showCoach, setShowCoach] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COACH_KEY) !== "1";
    } catch {
      // Storage blocked (private mode) — show the tour once per visit.
      return true;
    }
  });

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(COACH_KEY, "1");
    } catch {
      // Private mode: the tour simply returns next visit. Harmless.
    }
    setShowCoach(false);
  }, []);

  const replay = useCallback(() => {
    setShowCoach(true);
  }, []);

  return (
    <div className="relative">
      {showCoach ? (
        <div
          role="dialog"
          aria-label="Pet room quick tour"
          className="absolute inset-x-0 top-0 z-20 max-h-[70vh] overflow-y-auto rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-5 shadow-2xl shadow-cyan-950/50 backdrop-blur"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-white">
              Quick tour — your first visit
            </h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss the quick tour"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Start caring
            </button>
          </div>
          <ol className="mt-2 grid gap-2 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={replay}
            aria-label="Replay the pet room quick tour"
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            (?) Tour
          </button>
        </div>
      )}
      <PetRoom />
    </div>
  );
}
