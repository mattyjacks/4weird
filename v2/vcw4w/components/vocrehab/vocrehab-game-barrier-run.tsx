"use client";

import { useRef, useState } from "react";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";

interface VocrehabChoice {
  label: string;
  barrier: string;
  strategy: string;
}

interface VocrehabNode {
  id: string;
  scene: string;
  text: string;
  choices: VocrehabChoice[];
}

const VOCREHAB_NODES: readonly VocrehabNode[] = [
  {
    id: "commute",
    scene: "Morning commute",
    text: "Your bus is running 20 minutes late and your shift starts in 30. What do you do?",
    choices: [
      { label: "Text your supervisor now and catch the next bus", barrier: "Getting to work", strategy: "Backup ride plan" },
      { label: "Call your backup ride and save the bus fare", barrier: "Getting to work", strategy: "Backup ride plan" },
      { label: "Wait it out and rush in silently", barrier: "Getting to work", strategy: "Ask about schedule-shifted starts" },
    ],
  },
  {
    id: "swap",
    scene: "Shift swap",
    text: "A coworker asks you to cover Friday evening, but that clashes with family care. How do you answer?",
    choices: [
      { label: "Offer a trade: Sunday morning for Friday evening", barrier: "Schedule conflicts", strategy: "Shift-swap script" },
      { label: "Say no plainly and suggest another coworker", barrier: "Schedule conflicts", strategy: "Weekly planning habit" },
    ],
  },
  {
    id: "disclosure",
    scene: "Disclosure moment",
    text: "Training is all fast videos and you need written steps. Your new manager seems rushed. What now?",
    choices: [
      { label: "Share the one-sentence ask: written steps help me start confidently", barrier: "Whether to share disability information", strategy: "One-sentence accommodation ask" },
      { label: "Hold off and try the disclosure helper paths first", barrier: "Whether to share disability information", strategy: "Disclosure timing options" },
      { label: "Ask a coworker for their notes instead", barrier: "Schedule conflicts", strategy: "Weekly planning habit" },
    ],
  },
  {
    id: "tool",
    scene: "Tool failure",
    text: "The shared tablet you trained on freezes mid-task with a line waiting. What helps most?",
    choices: [
      { label: "Switch to the paper backup steps and report the freeze calmly", barrier: "Tools and technology access", strategy: "Keyboard-path check" },
      { label: "Ask for a trial of a different tool for this task", barrier: "Tools and technology access", strategy: "Assistive technology trial" },
    ],
  },
];

export default function VocrehabGameBarrierRun({ vocrehabEmit, vocrehabFinish }: VocrehabGameRunProps) {
  const [vocrehabIndex, setVocrehabIndex] = useState(0);
  const [vocrehabPath, setVocrehabPath] = useState<string[]>([]);
  const [vocrehabBarriers, setVocrehabBarriers] = useState<string[]>([]);
  const doneRef = useRef(false);

  const node = VOCREHAB_NODES[vocrehabIndex];
  const finished = vocrehabIndex >= VOCREHAB_NODES.length;

  const vocrehabChoose = (choice: VocrehabChoice) => {
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
              vocrehabFinish({ path: vocrehabPath, barriers: vocrehabBarriers });
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
        Scene {vocrehabIndex + 1} of {VOCREHAB_NODES.length} · No timer · Progress saves per scene
      </p>
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
