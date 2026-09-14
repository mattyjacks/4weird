"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectFileSort } from "@/lib/vocrehab-seed-pools";

type VocrehabFolder = "Invoices" | "Schedules" | "Client Notes";

interface VocrehabFileCard {
  id: string;
  name: string;
  folder: VocrehabFolder;
}

const VOCREHAB_FOLDERS: readonly VocrehabFolder[] = ["Invoices", "Schedules", "Client Notes"];

export default function VocrehabGameFileSort({ vocrehabEmit, vocrehabFinish, vocrehabSeed, vocrehabRunKey }: VocrehabGameRunProps) {
  // Seeded deal: 12 cards (4 per folder), same seed replays the same set+order.
  const sel = useMemo(
    () => vocrehabSelectFileSort(parseSeed(vocrehabSeed ?? null) ?? makeSeed()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocrehabSeed, vocrehabRunKey],
  );
  const VOCREHAB_CARDS = sel.cards;
  const [vocrehabPlaced, setVocrehabPlaced] = useState<Record<string, VocrehabFolder>>({});
  const [vocrehabNotice, setVocrehabNotice] = useState<string | null>(null);
  const [vocrehabInterrupted, setVocrehabInterrupted] = useState(false);
  const [vocrehabInterruptHandled, setVocrehabInterruptHandled] = useState(false);
  const doneRef = useRef(false);
  // Guard so the manager-message interruption fires exactly once across
  // both triggers (90s timer, 8-files) without state writes inside effects.
  const interruptFiredRef = useRef(false);

  const vocrehabFireInterruption = (at: string) => {
    if (interruptFiredRef.current) return;
    interruptFiredRef.current = true;
    setVocrehabInterrupted(true);
    vocrehabEmit("interrupt", { source: "manager-message", at });
    setVocrehabNotice("Manager message: please prioritize Client Notes for a moment.");
  };

  // Mid-task interruption: 90s timer, or after 8 files — whichever comes first.
  // State writes happen in the timer subscription callback (not the effect body).
  useEffect(() => {
    const id = window.setTimeout(() => {
      vocrehabFireInterruption("timeout");
    }, 90000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vocrehabSort = (card: VocrehabFileCard, folder: VocrehabFolder) => {
    const prev = vocrehabPlaced[card.id];
    const corrected = prev !== undefined && prev !== folder;
    const next = { ...vocrehabPlaced, [card.id]: folder };
    setVocrehabPlaced(next);
    if (Object.keys(next).length >= 8) {
      vocrehabFireInterruption("8-files");
    }
    if (folder === card.folder) {
      vocrehabEmit("action", { card: card.id, folder, corrected });
      setVocrehabNotice(null);
    } else {
      vocrehabEmit("error", { card: card.id, folder, expected: card.folder });
      setVocrehabNotice(`"${card.name}" usually lives in ${card.folder}. You can move it — mistakes are fixable here.`);
    }
  };

  // Arrow-key roving focus between folder buttons (Enter/Space files natively).
  const vocrehabMoveFolderFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") {
      return;
    }
    const buttons = Array.from(e.currentTarget.querySelectorAll("button"));
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    e.preventDefault();
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const next = forward ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  const vocrehabDismissNotice = () => {    setVocrehabNotice(null);
    if (vocrehabInterrupted && !vocrehabInterruptHandled) {
      setVocrehabInterruptHandled(true);
      vocrehabEmit("action", { handledInterruption: true });
    }
  };

  const sorted = Object.keys(vocrehabPlaced).length;
  const correct = VOCREHAB_CARDS.filter((c) => vocrehabPlaced[c.id] === c.folder).length;

  const vocrehabDone = () => {
    if (doneRef.current || sorted < VOCREHAB_CARDS.length) return;
    doneRef.current = true;
    vocrehabFinish({
      correct,
      total: VOCREHAB_CARDS.length,
      interruptionShown: vocrehabInterrupted,
      interruptionHandled: vocrehabInterruptHandled,
      seed: sel.seed,
    });
  };

  return (
    <div className="vocrehab-game-file-sort space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Sorted {sorted} of {VOCREHAB_CARDS.length} files · {correct} in the right folder
        {vocrehabInterrupted ? " · ✉ Manager message arrived (see below)" : ""}
      </p>
      {vocrehabNotice && (
        <div className="rounded-lg border p-3" role="alert">
          <p className="text-sm">{vocrehabNotice}</p>
          <button type="button" onClick={vocrehabDismissNotice} className="mt-2 rounded border px-3 py-1.5 text-sm font-medium">
            Got it, keep going
          </button>
        </div>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {VOCREHAB_CARDS.map((card) => {
          const placed = vocrehabPlaced[card.id];
          const right = placed === card.folder;
          return (
            <li key={card.id} className="rounded-lg border p-3">
              <p className="font-medium">📄 {card.name}</p>
              <p className="text-sm">
                {placed === undefined ? (
                  <span>○ Not sorted yet</span>
                ) : right ? (
                  <span>✓ In {placed} — looks right</span>
                ) : (
                  <span>✗ In {placed} — usually {card.folder}</span>
                )}
              </p>
              <div
                className="mt-2 flex flex-wrap gap-1.5"
                role="group"
                aria-label={`Sort ${card.name}. Arrow keys move between folders, Enter files.`}
                onKeyDown={vocrehabMoveFolderFocus}
              >
                {VOCREHAB_FOLDERS.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => vocrehabSort(card, folder)}
                    aria-pressed={placed === folder}
                    className="rounded border px-2.5 py-1 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {folder}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={vocrehabDone}
        disabled={sorted < VOCREHAB_CARDS.length}
        className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        Finish sorting
      </button>
    </div>
  );
}
