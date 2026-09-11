"use client";

import { useEffect, useState } from "react";
import { ModePicker, RandomizeThemeButton, SiteThemePicker } from "@/components/theme-switcher";
import {
  A11Y_EVENT,
  COLORBLIND_MODES,
  DEFAULT_A11Y,
  WEBCAM_POSITIONS,
  isColorblindMode,
  isWebcamPosition,
  loadA11y,
  saveA11y,
  type A11ySettings,
  type ColorblindMode,
} from "@/lib/a11y";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4 transition hover:border-cyan-300/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-cyan-300"
      />
      <span>
        <span className="block font-bold text-white">{label}</span>
        <span className="mt-0.5 block text-sm text-slate-300">{hint}</span>
      </span>
    </label>
  );
}

export function AccessibilityControls() {
  const [settings, setSettings] = useState<A11ySettings>({ ...DEFAULT_A11Y });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = loadA11y();
    setSettings(initial);
    // Apply on mount (covers SSR mismatch + cross-tab updates).
    import("@/lib/a11y").then(({ applyA11y }) => applyA11y(initial));
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<A11ySettings>).detail;
      if (detail) setSettings({ ...detail });
    };
    window.addEventListener(A11Y_EVENT, onExternal);
    setReady(true);
    return () => window.removeEventListener(A11Y_EVENT, onExternal);
  }, []);

  const update = (patch: Partial<A11ySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveA11y(next);
  };

  if (!ready) {
    return <p className="text-sm text-slate-400">Loading accessibility settings…</p>;
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="a11y-appearance">
        <h2 id="a11y-appearance" className="text-lg font-black text-white">
          🎨 Appearance
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Five color themes × light/dark mode = 10 combos. Your last pick is
          remembered on this device and restored on every visit.
        </p>
        <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
          Color theme
        </h3>
        <div className="mt-2">
          <SiteThemePicker />
        </div>
        <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
          Light / dark mode
        </h3>
        <div className="mt-2">
          <ModePicker />
        </div>
        <div className="mt-3">
          <RandomizeThemeButton label="🎲 Randomize the whole look" />
        </div>
      </section>

      <section aria-labelledby="a11y-reading">
        <h2 id="a11y-reading" className="text-lg font-black text-white">
          📖 Reading
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Dyslexia-friendly font"
            hint="Atkinson Hyperlegible-style letterforms, wider spacing, taller lines. Applies site-wide."
            checked={settings.dyslexia}
            onChange={(dyslexia) => update({ dyslexia })}
          />
          <Toggle
            label="Extra spacing"
            hint="More letter, word, and line spacing. Pairs with the dyslexia font."
            checked={settings.spacing}
            onChange={(spacing) => update({ spacing })}
          />
          <Toggle
            label="Larger text"
            hint="Bumps the base font size ~12% everywhere."
            checked={settings.large}
            onChange={(large) => update({ large })}
          />
          <Toggle
            label="High contrast"
            hint="Boosts contrast across site chrome and game shells."
            checked={settings.contrast}
            onChange={(contrast) => update({ contrast })}
          />
          <Toggle
            label="Reduce motion"
            hint="Stops ambient animation and tells games to calm camera shake and flashes."
            checked={settings.motion}
            onChange={(motion) => update({ motion })}
          />
          <Toggle
            label="Large click targets"
            hint="Bigger buttons and stronger focus rings; easier for tremor, touch, and gaze."
            checked={settings.largeTargets}
            onChange={(largeTargets) => update({ largeTargets })}
          />
        </div>
      </section>

      <section aria-labelledby="a11y-color">
        <h2 id="a11y-color" className="text-lg font-black text-white">
          👁️ Color vision
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Daltonization filters apply to the whole site <em>and</em> inside game frames. Color-dependent games
          (Battlesharks 2, Server Saver Shield) also label pickups with shapes, not just hue.
        </p>
        <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Colorblind mode</legend>
          {COLORBLIND_MODES.map((mode) => (
            <label
              key={mode.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                settings.colorblind === mode.id
                  ? "border-cyan-300/70 bg-cyan-300/10"
                  : "border-white/10 bg-white/[.04] hover:border-cyan-300/40"
              }`}
            >
              <input
                type="radio"
                name="colorblind-mode"
                value={mode.id}
                checked={settings.colorblind === mode.id}
                onChange={() => update({ colorblind: mode.id as ColorblindMode })}
                className="h-5 w-5 shrink-0 accent-cyan-300"
              />
              <span aria-hidden="true" className={`cb-dot cb-preview-${mode.id}`} />
              <span>
                <span className="block font-bold text-white">{mode.label}</span>
                <span className="block text-xs text-slate-400">{mode.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {isColorblindMode(settings.colorblind) && settings.colorblind !== "none" && (
          <p role="status" className="mt-2 text-sm text-cyan-200">
            Previewing <b>{COLORBLIND_MODES.find((m) => m.id === settings.colorblind)?.label}</b>; open any game and
            the filter follows you into the frame.
          </p>
        )}
      </section>

      <section aria-labelledby="a11y-gaze">
        <h2 id="a11y-gaze" className="text-lg font-black text-white">
          👀 Eye tracker mode
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Works with any eye tracker that moves the mouse (Tobii, etc.); hover or look at a button and it
          clicks itself after the dwell time. No camera permission needed for this mode.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Dwell-to-click"
            hint="Staring at a button, link, or game menu activates it automatically."
            checked={settings.dwell}
            onChange={(dwell) => update({ dwell })}
          />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Dwell time</span>
            <input
              type="range"
              min={400}
              max={5000}
              step={100}
              value={settings.dwellMs}
              onChange={(e) => update({ dwellMs: Number(e.target.value) })}
              aria-label="Dwell time in milliseconds"
              className="flex-1 accent-cyan-300"
            />
            <span className="w-20 text-right text-sm text-cyan-200">{(settings.dwellMs / 1000).toFixed(1)}s</span>
          </label>
        </div>
      </section>

      <section aria-labelledby="a11y-face">
        <h2 id="a11y-face" className="text-lg font-black text-white">
          😄 Face + head gameplay controller
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          On any play page, open <b className="text-white">Face controller</b>: your webcam watches for{" "}
          <b className="text-white">left wink → left click</b>, <b className="text-white">right wink → right click</b>,
          and <b className="text-white">smile → your chosen key</b>. Blinking both eyes does nothing (so natural
          blinks never fire). Turn on the <b className="text-white">head pointer</b> and your nose aims an on-screen
          ✛ cursor; tell it where your webcam sits so side/phone angles stay accurate, then calibrate while
          looking at the screen center. Video never leaves your device.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Head pointer (nose aims)"
            hint="Nose direction moves an on-screen cursor in the face controller."
            checked={settings.headPointer}
            onChange={(headPointer) => update({ headPointer })}
          />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Webcam</span>
            <select
              value={settings.webcam}
              onChange={(e) => {
                if (isWebcamPosition(e.target.value)) update({ webcam: e.target.value });
              }}
              className="flex-1 rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"
              aria-label="Webcam position"
            >
              {WEBCAM_POSITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Speed</span>
            <input
              type="range"
              min={0.4}
              max={5}
              step={0.1}
              value={settings.headGain}
              onChange={(e) => update({ headGain: Number(e.target.value) })}
              aria-label="Head pointer speed"
              className="flex-1 accent-cyan-300"
            />
            <span className="w-14 text-right text-sm text-cyan-200">{settings.headGain.toFixed(1)}×</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Steadiness</span>
            <input
              type="range"
              min={0}
              max={0.95}
              step={0.05}
              value={settings.headSmooth}
              onChange={(e) => update({ headSmooth: Number(e.target.value) })}
              aria-label="Head pointer steadiness"
              className="flex-1 accent-cyan-300"
            />
            <span className="w-14 text-right text-sm text-cyan-200">{(settings.headSmooth * 100).toFixed(0)}%</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Smile key</span>
            <select
              value={settings.smileKey}
              onChange={(e) => update({ smileKey: e.target.value })}
              className="flex-1 rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"
              aria-label="Key sent by smiling"
            >
              {[" ", "Enter", "e", "f", "r", "p"].map((k) => (
                <option key={k} value={k}>
                  {k === " " ? "Space" : k}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="a11y-switch">
        <h2 id="a11y-switch" className="text-lg font-black text-white">
          🔘 Single-switch access
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          One-switch auto-scan steps focus through every control on a timer; press Space/Enter (or any switch
          mapped to them) to choose the highlighted one. Extra features: every game frame gets a strong focus
          ring, and the face controller&apos;s test buttons verify click wiring without a camera model.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Auto-scan controls"
            hint="Focus cycles automatically; your switch press selects."
            checked={settings.switchScan}
            onChange={(switchScan) => update({ switchScan })}
          />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
            <span className="font-bold text-white">Scan step</span>
            <input
              type="range"
              min={600}
              max={6000}
              step={100}
              value={settings.scanMs}
              onChange={(e) => update({ scanMs: Number(e.target.value) })}
              aria-label="Scan step interval in milliseconds"
              className="flex-1 accent-cyan-300"
            />
            <span className="w-20 text-right text-sm text-cyan-200">{(settings.scanMs / 1000).toFixed(1)}s</span>
          </label>
        </div>
      </section>
    </div>
  );
}
