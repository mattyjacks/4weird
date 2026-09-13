"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mood = "happy" | "content" | "hungry" | "sleepy" | "grumpy";

interface PetState {
  name: string;
  hunger: number;
  happiness: number;
  energy: number;
}

const STORAGE_KEY = "4weird_pet_room_v1";
const TICK_MS = 5000;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function deriveMood(
  hunger: number,
  happiness: number,
  energy: number,
  sleeping: boolean,
): Mood {
  if (sleeping || energy < 25) return "sleepy";
  if (hunger < 30) return "hungry";
  if (happiness < 30) return "grumpy";
  if (happiness > 60 && hunger > 50 && energy > 50) return "happy";
  return "content";
}

function moodBlurb(mood: Mood, name: string): string {
  switch (mood) {
    case "happy":
      return `${name} is bouncing with joy!`;
    case "hungry":
      return `${name}'s tummy is rumbling — time for a snack.`;
    case "sleepy":
      return `${name} is drowsy and needs rest.`;
    case "grumpy":
      return `${name} feels a bit grumpy — maybe play together?`;
    case "content":
      return `${name} feels cozy and calm.`;
  }
}

function loadState(): PetState {
  const fallback: PetState = {
    name: "Mochi",
    hunger: 80,
    happiness: 70,
    energy: 80,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PetState>;
    return {
      name:
        typeof parsed.name === "string" && parsed.name.trim().length > 0
          ? parsed.name.trim().slice(0, 24)
          : fallback.name,
      hunger: typeof parsed.hunger === "number" ? clamp(parsed.hunger) : fallback.hunger,
      happiness:
        typeof parsed.happiness === "number"
          ? clamp(parsed.happiness)
          : fallback.happiness,
      energy:
        typeof parsed.energy === "number" ? clamp(parsed.energy) : fallback.energy,
    };
  } catch {
    return fallback;
  }
}

function StatBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-all ${tone}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function PetRoom() {
  const [pet, setPet] = useState<PetState>(() => loadState());
  const [sleeping, setSleeping] = useState(false);
  const [isDay, setIsDay] = useState(() => {
    if (typeof window === "undefined") return true;
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19;
  });
  const [flash, setFlash] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persist to localStorage.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    } catch {
      // Storage full or blocked — the pet still works for this visit.
    }
  }, [pet]);

  // Decay timer: stats drift down; sleep restores energy; a fully rested
  // pet wakes itself up. State updates happen in the timer callback, and
  // the timer re-subscribes when pet/sleeping change so it sees fresh values.
  useEffect(() => {
    const id = window.setInterval(() => {
      const hunger = clamp(pet.hunger - 2);
      const happiness = clamp(
        pet.happiness - (pet.hunger < 30 || pet.energy < 25 ? 2 : 1),
      );
      const energy = sleeping
        ? clamp(pet.energy + 6)
        : clamp(pet.energy - 1);
      setPet({ ...pet, hunger, happiness, energy });
      if (sleeping && energy >= 100) {
        setSleeping(false);
        setFlash(`${pet.name} woke up full of energy!`);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [pet, sleeping]);

  const mood = deriveMood(pet.hunger, pet.happiness, pet.energy, sleeping);

  const feed = useCallback(() => {
    if (sleeping) {
      setFlash(`${pet.name} is snoozing — let it wake up before eating.`);
      return;
    }
    setPet((prev) => ({
      ...prev,
      hunger: clamp(prev.hunger + 16),
      happiness: clamp(prev.happiness + 3),
      energy: clamp(prev.energy - 1),
    }));
    setFlash(`${pet.name} munches happily. Yum! (+food)`);
  }, [pet.name, sleeping]);

  const play = useCallback(() => {
    if (sleeping) {
      setFlash(`${pet.name} is asleep — shhh. Wake it first to play.`);
      return;
    }
    setPet((prev) => ({
      ...prev,
      happiness: clamp(prev.happiness + 12),
      hunger: clamp(prev.hunger - 5),
      energy: clamp(prev.energy - 8),
    }));
    setFlash(`You toss a ball and ${pet.name} zooms after it! (+fun, -energy)`);
  }, [pet.name, sleeping]);

  const toggleSleep = useCallback(() => {
    setSleeping((prev) => {
      const next = !prev;
      setFlash(
        next
          ? `${pet.name} curls up and dozes off… (energy recharges)`
          : `${pet.name} stretches and wakes up!`,
      );
      return next;
    });
  }, [pet.name]);

  const toggleDayNight = useCallback(() => {
    setIsDay((prev) => !prev);
    setFlash(isDay ? "The moon rises over the pet room." : "Sunrise! The pet room brightens.");
  }, [isDay]);

  const reset = useCallback(() => {
    setPet({ name: pet.name, hunger: 80, happiness: 70, energy: 80 });
    setSleeping(false);
    setFlash(`${pet.name} feels brand new!`);
  }, [pet.name]);

  // Canvas creature: bobbing blob, mood face, day/night room.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      frame += 1;
      const w = canvas.width;
      const h = canvas.height;
      const bob = sleeping ? 0 : Math.sin(frame / 24) * 6;

      // Room background.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      if (isDay) {
        sky.addColorStop(0, "#7dd3fc");
        sky.addColorStop(1, "#1e3a5f");
      } else {
        sky.addColorStop(0, "#0b1026");
        sky.addColorStop(1, "#312e81");
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sun / moon.
      ctx.beginPath();
      ctx.arc(w - 70, 60, 24, 0, Math.PI * 2);
      ctx.fillStyle = isDay ? "#fde047" : "#e2e8f0";
      ctx.fill();
      if (!isDay) {
        ctx.beginPath();
        ctx.arc(w - 62, 54, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#0b1026";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 24; i += 1) {
          const sx = (i * 67) % w;
          const sy = (i * 41) % 110;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // Floor.
      ctx.fillStyle = isDay ? "#3f6212" : "#1e1b4b";
      ctx.fillRect(0, h - 40, w, 40);

      // Creature body color by mood.
      const body =
        mood === "happy"
          ? "#f472b6"
          : mood === "hungry"
            ? "#fb923c"
            : mood === "sleepy"
              ? "#818cf8"
              : mood === "grumpy"
                ? "#94a3b8"
                : "#34d399";
      const cx = w / 2;
      const cy = h / 2 + 20 + bob;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 62, 54, 0, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();
      // Belly.
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 34, 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();
      // Feet.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(cx - 34, cy + 50, 16, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 34, cy + 50, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ears.
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 34);
      ctx.lineTo(cx - 58, cy - 66);
      ctx.lineTo(cx - 22, cy - 46);
      ctx.moveTo(cx + 44, cy - 34);
      ctx.lineTo(cx + 58, cy - 66);
      ctx.lineTo(cx + 22, cy - 46);
      ctx.fill();

      // Eyes: closed curves when sleepy/sleeping.
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      if (sleeping || mood === "sleepy") {
        for (const dx of [-20, 20]) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy - 8, 9, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
      } else {
        for (const dx of [-20, 20]) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy - 8, 10, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + dx, cy - 6, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#0f172a";
          ctx.fill();
        }
      }

      // Mouth by mood.
      ctx.beginPath();
      if (mood === "happy") {
        ctx.arc(cx, cy + 10, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      } else if (mood === "grumpy" || mood === "hungry") {
        ctx.arc(cx, cy + 26, 12, 1.15 * Math.PI, 1.85 * Math.PI);
      } else {
        ctx.arc(cx, cy + 12, 10, 0.2 * Math.PI, 0.8 * Math.PI);
      }
      ctx.stroke();

      // Cheeks when happy.
      if (mood === "happy") {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(cx - 34, cy + 8, 7, 0, Math.PI * 2);
        ctx.arc(cx + 34, cy + 8, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Zzz when sleeping.
      if (sleeping) {
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "bold 22px sans-serif";
        const zBob = Math.sin(frame / 20) * 4;
        ctx.fillText("z", cx + 52, cy - 44 + zBob);
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("z", cx + 66, cy - 60 + zBob);
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("z", cx + 78, cy - 72 + zBob);
      }

      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [mood, sleeping, isDay]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label
              htmlFor="pet-name"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Pet name
            </label>
            <input
              id="pet-name"
              type="text"
              value={pet.name}
              maxLength={24}
              onChange={(e) =>
                setPet((prev) => ({
                  ...prev,
                  name: e.target.value.slice(0, 24),
                }))
              }
              aria-label="Pet name"
              placeholder="Name your pet"
              className="mt-1 block w-56 rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
          </div>
          <p aria-live="polite" className="text-sm font-semibold text-cyan-200">
            Mood: {mood} {sleeping ? "(asleep)" : ""}
          </p>
        </div>

        <canvas
          ref={canvasRef}
          width={560}
          height={320}
          role="img"
          aria-label={`${pet.name || "Your pet"} the companion, feeling ${mood}${sleeping ? " and asleep" : ""}, in a ${isDay ? "sunny day" : "starry night"} room.`}
          className="mt-4 h-auto w-full rounded-xl border border-white/10"
        />
        <p className="mt-2 text-xs text-slate-400">
          {moodBlurb(mood, pet.name.trim() || "Your pet")}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-lg font-bold text-white">Care</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={feed}
            aria-label="Feed your pet"
            className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
          >
            Feed
          </button>
          <button
            type="button"
            onClick={play}
            aria-label="Play with your pet"
            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
          >
            Play
          </button>
          <button
            type="button"
            onClick={toggleSleep}
            aria-label={sleeping ? "Wake your pet up" : "Put your pet to sleep"}
            aria-pressed={sleeping}
            className="rounded-xl bg-indigo-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-indigo-300"
          >
            {sleeping ? "Wake up" : "Sleep"}
          </button>
          <button
            type="button"
            onClick={toggleDayNight}
            aria-label={isDay ? "Switch the room to night" : "Switch the room to day"}
            aria-pressed={!isDay}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            {isDay ? "Night" : "Day"}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset your pet's stats"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Reset
          </button>
        </div>
        <p aria-live="polite" role="status" className="mt-3 min-h-5 text-sm text-slate-200">
          {flash || "Feed, play, or rest — your pet reacts right away."}
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:grid-cols-3">
        <StatBar label="Fullness" value={pet.hunger} tone="bg-emerald-400" />
        <StatBar label="Happiness" value={pet.happiness} tone="bg-cyan-400" />
        <StatBar label="Energy" value={pet.energy} tone="bg-indigo-400" />
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Hunger, happiness, and energy drift down every few seconds — sleep
        restores energy. Your pet is saved in this browser and greets you
        again on your next visit. Day and night follow your clock, and you can
        flip them anytime.
      </p>
    </div>
  );
}
