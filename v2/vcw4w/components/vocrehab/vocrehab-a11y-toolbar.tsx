"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { vocrehabCourseOutline } from "@/lib/vocrehab-course";
import { vocrehabCourseStorageKey } from "./vocrehab-course-card";
import type { VocrehabA11yPrefs } from "@/types/vocrehab-course";

export const vocrehabA11yStorageKey = "vocrehab-a11y-prefs-v1";

export const vocrehabDefaultA11yPrefs: VocrehabA11yPrefs = {
  vocrehabTextSize: 100,
  vocrehabContrast: "standard",
  vocrehabVoice: false,
  vocrehabMotion: "full",
  vocrehabHints: false,
};

const vocrehabTextSizes: VocrehabA11yPrefs["vocrehabTextSize"][] = [
  100, 112, 125,
];

function vocrehabReadA11yPrefs(): VocrehabA11yPrefs {
  try {
    const vocrehabRaw = window.localStorage.getItem(vocrehabA11yStorageKey);
    if (!vocrehabRaw) return vocrehabDefaultA11yPrefs;
    const vocrehabParsed = JSON.parse(
      vocrehabRaw,
    ) as Partial<VocrehabA11yPrefs>;
    return {
      vocrehabTextSize: vocrehabTextSizes.includes(
        vocrehabParsed.vocrehabTextSize as 100,
      )
        ? (vocrehabParsed.vocrehabTextSize as 100 | 112 | 125)
        : 100,
      vocrehabContrast:
        vocrehabParsed.vocrehabContrast === "high" ? "high" : "standard",
      vocrehabVoice: vocrehabParsed.vocrehabVoice === true,
      vocrehabMotion:
        vocrehabParsed.vocrehabMotion === "reduced" ? "reduced" : "full",
      vocrehabHints: vocrehabParsed.vocrehabHints === true,
    };
  } catch {
    return vocrehabDefaultA11yPrefs;
  }
}

function vocrehabApplyA11yPrefs(vocrehabPrefs: VocrehabA11yPrefs) {
  // Module root from app/vocrehab/layout.tsx: prefs apply to every
  // /vocrehab/ page, never to the rest of 4weird.
  const vocrehabRoot = document.querySelector(".vocrehab-layout");
  if (!(vocrehabRoot instanceof HTMLElement)) return;
  vocrehabRoot.style.setProperty(
    "--vocrehab-text-scale",
    `${vocrehabPrefs.vocrehabTextSize}%`,
  );
  vocrehabRoot.style.setProperty(
    "--vocrehab-focus",
    vocrehabPrefs.vocrehabContrast === "high" ? "#ffff00" : "#22d3ee",
  );
  vocrehabRoot.classList.toggle(
    "vocrehab-contrast-high",
    vocrehabPrefs.vocrehabContrast === "high",
  );
  vocrehabRoot.classList.toggle(
    "vocrehab-motion-reduced",
    vocrehabPrefs.vocrehabMotion === "reduced",
  );
  vocrehabRoot.classList.toggle(
    "vocrehab-voice-on",
    vocrehabPrefs.vocrehabVoice,
  );
}

/**
 * VocrehabA11yToolbar — module-scoped accessibility controls.
 * Text size 100/112/125%, contrast standard/high, voice toggle,
 * motion toggle, keyboard hints. Persists to
 * `vocrehab-a11y-prefs-v1` and applies `vocrehab-` classes plus
 * `--vocrehab-` variables on the `.vocrehab-layout` module root (see
 * app/vocrehab/vocrehab.css for the rules that consume them) —
 * never on `body`, never leaking to the rest of 4weird.
 */
export function VocrehabA11yToolbar() {
  const [vocrehabPrefs, setVocrehabPrefs] = useState<VocrehabA11yPrefs>(() =>
    typeof window === "undefined"
      ? vocrehabDefaultA11yPrefs
      : vocrehabReadA11yPrefs(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        vocrehabA11yStorageKey,
        JSON.stringify(vocrehabPrefs),
      );
    } catch {
      // Storage unavailable: prefs still apply for this visit.
    }
    vocrehabApplyA11yPrefs(vocrehabPrefs);
  }, [vocrehabPrefs]);

  function vocrehabSetPrefs(vocrehabPatch: Partial<VocrehabA11yPrefs>) {
    setVocrehabPrefs((vocrehabPrev) => ({ ...vocrehabPrev, ...vocrehabPatch }));
  }

  return (
    <details className="vocrehab-a11y-panel fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-300 bg-white/95 shadow-xl backdrop-blur">
      <summary
        aria-label="Open display and access options"
        className="cursor-pointer list-none rounded-2xl px-3.5 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-100 [&::-webkit-details-marker]:hidden"
      >
        Access options
      </summary>
      <div
        className="vocrehab-a11y-toolbar max-w-sm border-t border-stone-200"
        role="toolbar"
        aria-label="VocRehab display and access options"
      >
      <span className="vocrehab-a11y-label" id="vocrehab-text-size-label">
        Text size
      </span>
      <div
        role="group"
        aria-labelledby="vocrehab-text-size-label"
        className="vocrehab-a11y-group"
      >
        {vocrehabTextSizes.map((vocrehabSize) => (
          <button
            key={vocrehabSize}
            type="button"
            aria-pressed={vocrehabPrefs.vocrehabTextSize === vocrehabSize}
            onClick={() => vocrehabSetPrefs({ vocrehabTextSize: vocrehabSize })}
            className="vocrehab-a11y-button"
          >
            {vocrehabSize}%
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={vocrehabPrefs.vocrehabContrast === "high"}
        onClick={() =>
          vocrehabSetPrefs({
            vocrehabContrast:
              vocrehabPrefs.vocrehabContrast === "high"
                ? "standard"
                : "high",
          })
        }
        className="vocrehab-a11y-button"
      >
        {vocrehabPrefs.vocrehabContrast === "high"
          ? "Contrast: high"
          : "Contrast: standard"}
      </button>

      <button
        type="button"
        aria-pressed={vocrehabPrefs.vocrehabVoice}
        onClick={() =>
          vocrehabSetPrefs({ vocrehabVoice: !vocrehabPrefs.vocrehabVoice })
        }
        className="vocrehab-a11y-button"
      >
        {vocrehabPrefs.vocrehabVoice ? "Voice: on" : "Voice: off"}
      </button>

      <button
        type="button"
        aria-pressed={vocrehabPrefs.vocrehabMotion === "reduced"}
        onClick={() =>
          vocrehabSetPrefs({
            vocrehabMotion:
              vocrehabPrefs.vocrehabMotion === "reduced" ? "full" : "reduced",
          })
        }
        className="vocrehab-a11y-button"
      >
        {vocrehabPrefs.vocrehabMotion === "reduced"
          ? "Motion: reduced"
          : "Motion: full"}
      </button>

      <button
        type="button"
        aria-pressed={vocrehabPrefs.vocrehabHints}
        onClick={() =>
          vocrehabSetPrefs({ vocrehabHints: !vocrehabPrefs.vocrehabHints })
        }
        className="vocrehab-a11y-button"
      >
        Keyboard hints
      </button>

      {vocrehabPrefs.vocrehabHints ? (
        <p className="vocrehab-a11y-hints">
          Every button, game, slider, and roleplay box works with Tab + Enter
          or arrows. Press Tab to move, Enter to choose, arrow keys on sliders.
        </p>
      ) : null}
      </div>
    </details>
  );
}

/**
 * VocrehabProgressRail — guest-local course progress readout.
 * Reads `vocrehab-course-progress-v1` in an effect and refreshes on
 * `vocrehab:course:module-done` events. Rendered inside Suspense
 * by the /vocrehab layout.
 */
export function VocrehabProgressRail() {
  const [vocrehabDoneCount, setVocrehabDoneCount] = useState(0);

  useEffect(() => {
    function vocrehabRefresh() {
      try {
        const vocrehabRaw = window.localStorage.getItem(
          vocrehabCourseStorageKey,
        );
        if (!vocrehabRaw) {
          setVocrehabDoneCount(0);
          return;
        }
        const vocrehabParsed = JSON.parse(vocrehabRaw) as {
          vocrehabDone?: unknown;
        };
        setVocrehabDoneCount(
          Array.isArray(vocrehabParsed.vocrehabDone)
            ? vocrehabParsed.vocrehabDone.length
            : 0,
        );
      } catch {
        setVocrehabDoneCount(0);
      }
    }
    vocrehabRefresh();
    window.addEventListener("vocrehab:course:module-done", vocrehabRefresh);
    return () =>
      window.removeEventListener(
        "vocrehab:course:module-done",
        vocrehabRefresh,
      );
  }, []);

  return (
    <p className="vocrehab-progress-rail" role="status">
      Your vocrehab progress: {vocrehabDoneCount} of{" "}
      {vocrehabCourseOutline.length} lessons done on this device.{" "}
      <Link href="/vocrehab/course" className="vocrehab-progress-link">
        Continue the course &rarr;
      </Link>
    </p>
  );
}
