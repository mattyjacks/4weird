"use client";

import Link from "next/link";
import { useState } from "react";

type Picker = "all" | "draw" | "video" | "sound";
type Lane = "draw" | "video" | "sound";

interface StudioCard {
  href: "/studio/image" | "/studio/video" | "/studio/paint" | "/studio/audio" | "/studio/recorder";
  emoji: string;
  name: string;
  purpose: string;
  lanes: Lane[];
}

const CARDS: StudioCard[] = [
  {
    href: "/studio/image",
    emoji: "🖼️",
    name: "DictatePic canvas editor",
    purpose: "Layered 512px sprite canvas with brush tools, blend modes, undo, PNG export, and spritesheet slicing.",
    lanes: ["draw"],
  },
  {
    href: "/studio/video",
    emoji: "🎬",
    name: "Media Mogul video studio",
    purpose: "Multi-track timeline with razor split, snap and zoom, live preview, and RunPod render export.",
    lanes: ["video"],
  },
  {
    href: "/studio/paint",
    emoji: "🎨",
    name: "Paint",
    purpose: "Quick two-layer sketching with brush, eraser, and stamp shapes plus one-click PNG export.",
    lanes: ["draw"],
  },
  {
    href: "/studio/audio",
    emoji: "🎙️",
    name: "AliveSpeech Lab",
    purpose: "Upload audio, inspect peak/RMS analysis, apply gain and normalize mastering, and export WAV.",
    lanes: ["sound"],
  },
  {
    href: "/studio/recorder",
    emoji: "⏺️",
    name: "DemoRecorder",
    purpose: "Record your screen with a live timer, log key/mouse input, and export .webm plus a JSON dataset.",
    lanes: ["video"],
  },
];

const PICKER_OPTIONS: { value: Picker; label: string; hint: string }[] = [
  { value: "draw", label: "✏️ draw", hint: "Sprites & sketches" },
  { value: "video", label: "🎥 video", hint: "Timelines & captures" },
  { value: "sound", label: "🔊 sound", hint: "Voice & mastering" },
];

// Studio hub: friendly card index over the five real studios plus a
// no-storage picker that highlights the matching cards. Links are plain
// Next.js routes, so a missing child fails open to its own page.
export function StudioHubClient() {
  const [picker, setPicker] = useState<Picker>("all");

  const isActive = (card: StudioCard) => picker === "all" || card.lanes.includes(picker);
  const visibleCount = CARDS.filter(isActive).length;

  return (
    <div>
      <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
        <p className="text-sm font-bold text-slate-200">Which studio do I need?</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Studio picker">
          {PICKER_OPTIONS.map((option) => {
            const selected = picker === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPicker(selected ? "all" : option.value)}
                aria-pressed={selected}
                title={option.hint}
                className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                  selected
                    ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
                    : "border-white/10 bg-white/[.03] text-slate-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400" role="status">
          {picker === "all"
            ? "Showing all 5 studios — pick one above to narrow it down."
            : `Highlighting ${visibleCount} ${visibleCount === 1 ? "studio" : "studios"} for “${picker}” — tap again to show all.`}
        </p>
      </div>

      {CARDS.length === 0 ? (
        <p role="status" className="mt-6 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
          No studios are listed right now — check back soon.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const active = isActive(card);
            return (
              <li
                key={card.href}
                className={`rounded-xl border p-5 transition-opacity ${
                  active
                    ? "border-white/10 bg-white/[.03]"
                    : "border-white/5 bg-white/[.015] opacity-40"
                }`}
                aria-hidden={!active}
              >
                <p className="text-3xl" aria-hidden="true">
                  {card.emoji}
                </p>
                <h2 className="mt-3 text-lg font-black tracking-tight">{card.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.purpose}</p>
                <Link
                  href={card.href}
                  tabIndex={active ? undefined : -1}
                  className="mt-4 inline-block rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200 transition-colors hover:bg-cyan-300/20"
                >
                  Open →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
