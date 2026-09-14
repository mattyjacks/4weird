"use client";

export type MusicMode = "theory" | "pure-ai" | "human";

export interface ModeSwitchProps {
  value?: MusicMode;
  onChange?: (mode: MusicMode) => void;
}

const MODES: { id: MusicMode; label: string; blurb: string }[] = [
  { id: "theory", label: "Theory Forge", blurb: "Guided scales, chords, and grids." },
  { id: "pure-ai", label: "Pure AI Summon", blurb: "The machine dreams the whole track." },
  { id: "human", label: "Human Hands", blurb: "Your notes lead, assist only suggests." },
];

export function ModeSwitch({ value = "theory", onChange }: ModeSwitchProps): React.JSX.Element {
  const selected: MusicMode =
    value === "theory" || value === "pure-ai" || value === "human" ? value : "theory";

  function pick(mode: MusicMode): void {
    if (mode === selected) return;
    try {
      onChange?.(mode);
    } catch {
      // Fail-open: a throwing handler must not break the picker.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3" role="group" aria-label="Music mode">
      {MODES.map((mode) => {
        const active = mode.id === selected;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={active}
            onClick={() => pick(mode.id)}
            className={
              active
                ? "rounded-lg border border-violet-500 bg-violet-950/60 px-3 py-2 text-left text-zinc-100"
                : "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            }
          >
            <span className="block text-sm font-semibold">{mode.label}</span>
            <span className="block text-xs text-zinc-400">{mode.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ModeSwitch;
