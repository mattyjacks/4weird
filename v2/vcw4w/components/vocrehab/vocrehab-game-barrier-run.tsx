"use client";

import { useMemo, useRef, useState } from "react";
import { makeSeed } from "@/lib/vocrehab-seed";
import {
  vocrehabBarrierPoolVariants,
  vocrehabSelectBarrier,
  type VocrehabBarrierPoolChoice,
} from "@/lib/vocrehab-seed-pools3";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import { barrierRunTemplate } from "@/lib/vocrehab-game-template-state";

export default function VocrehabGameBarrierRun({
  vocrehabEmit,
  vocrehabFinish,
  vocrehabSeed,
  vocrehabRunKey,
  vocrehabTemplateState,
}: VocrehabGameRunProps) {
  const [vocrehabIndex, setVocrehabIndex] = useState(0);
  const [vocrehabPath, setVocrehabPath] = useState<string[]>([]);
  const [vocrehabBarriers, setVocrehabBarriers] = useState<string[]>([]);
  const doneRef = useRef(false);

  // Seeded story variant: every seed replays the same fair beats.
  const vocrehabSelected = useMemo(() => {
    const seed = vocrehabSeed ?? makeSeed();
    const selection = vocrehabSelectBarrier(seed);
    const variant = barrierRunTemplate(vocrehabTemplateState) ??
      vocrehabBarrierPoolVariants.find((v) => v.variantId === selection.variantId) ??
      vocrehabBarrierPoolVariants[0];
    return { seed, variant };
  }, [vocrehabSeed, vocrehabRunKey, vocrehabTemplateState]);

  const vocrehabNodes = vocrehabSelected.variant.beats;
  const node = vocrehabNodes[vocrehabIndex];
  const finished = vocrehabIndex >= vocrehabNodes.length;

  const vocrehabChoose = (choice: VocrehabBarrierPoolChoice) => {
    vocrehabEmit("action", { node: node.id, choice: choice.label, barrier: choice.barrier });
    setVocrehabPath((p) => [...p, `${node.scene}: ${choice.label}`]);
    setVocrehabBarriers((b) => (b.includes(choice.barrier) ? b : [...b, choice.barrier]));
    setVocrehabIndex((i) => i + 1);
  };

  const vocrehabReplay = () => {
    vocrehabEmit("action", { replay: true });
    setVocrehabIndex(0);
    setVocrehabPath([]);
    setVocrehabBarriers([]);
  };

  if (finished) {
    return (
      <div className="vocrehab-game-barrier-run space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">✓ Your path through the day</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {vocrehabPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-sm">
          Barriers this path surfaced: <strong>{vocrehabBarriers.join("; ")}</strong>. Every choice was valid —
          replay to try other paths and grow the strategy list.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={vocrehabReplay} className="rounded border px-4 py-2 font-medium">
            Replay other paths
          </button>
          <button
            type="button"
            onClick={() => {
              if (doneRef.current) return;
              doneRef.current = true;
              vocrehabFinish({ path: vocrehabPath, barriers: vocrehabBarriers, seed: vocrehabSelected.seed });
            }}
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Finish with this path
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vocrehab-game-barrier-run space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Scene {vocrehabIndex + 1} of {vocrehabNodes.length} · {vocrehabSelected.variant.title} · No timer · Progress saves per scene
      </p>
      <p className="text-sm text-muted-foreground">{vocrehabSelected.variant.briefing}</p>
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">🧭 {node.scene}</h3>
        <p className="mt-1">{node.text}</p>
        <div className="mt-3 space-y-2" role="group" aria-label={`Choices for ${node.scene}`}>
          {node.choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={() => vocrehabChoose(choice)}
              className="block w-full rounded border px-3 py-2 text-left font-medium"
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      {vocrehabPath.length > 0 && (
        <ol className="list-decimal pl-5 text-sm text-muted-foreground" aria-label="Path so far">
          {vocrehabPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
