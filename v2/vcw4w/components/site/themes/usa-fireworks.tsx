"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useSiteTheme } from "@/components/site/site-theme-provider";

/**
 * USA USA fireworks: an elaborate pointer-following pyrotechnic overlay that
 * flies only while the USA USA theme is active (id stays `theme-usa`).
 *
 * - Ambient rockets launch on their own every ~second (random sky show).
 * - Moving the mouse / dragging a finger sprinkles star fountains; tapping
 *   (pointerdown) calls a rocket strike right at that spot.
 * - Bursts: peony, ring + pistil, drooping willow, and crackle shells that
 *   pop 6-10 delayed secondaries. Red / white / blue / gold, sometimes all.
 * - Day (light mode) reads SMOKEY: heavy gray lingering puffs, normal
 *   blending, bigger sparks. Night (dark mode) reads CLEAR: faint smoke,
 *   additive-blended glow, twinkle.
 * - Cheap by construction: capped particles, DPR ≤ 1.5, rAF pauses when the
 *   tab hides, zero DOM churn, and total silence when the theme is off or
 *   the user prefers reduced motion.
 */

type Rocket = {
  x: number; y: number; vx: number; vy: number;
  targetX: number; targetY: number; hue: string[]; trail: { x: number; y: number }[];
};

type Spark = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  gravity: number; drag: number; phase: number; crackle: boolean;
};

type Smoke = {
  x: number; y: number; vx: number; vy: number;
  r: number; vr: number; life: number; maxLife: number;
};

type Flash = { x: number; y: number; r: number; vr: number; life: number; maxLife: number; color: string };

type Pending = { at: number; x: number; y: number; palette: string[] };

const REDS = ["#ff4d5e", "#e11d48", "#ff8a94"];
const WHITES = ["#ffffff", "#f8fafc", "#e2e8f0"];
const BLUES = ["#5aa2ff", "#93c5fd", "#2563eb"];
const GOLDS = ["#ffd166", "#fbbf24", "#fff3bf"];
const ALL = [...REDS, ...WHITES, ...BLUES, ...GOLDS];

const MAX_SPARKS = 800;
const MAX_SMOKE = 140;
const MAX_ROCKETS = 10;

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

export function UsaFireworks() {
  const { colorTheme } = useSiteTheme();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(false);
  const modeRef = useRef("dark");
  activeRef.current = colorTheme === "theme-usa";
  modeRef.current = resolvedTheme === "light" ? "light" : "dark";

  const isUsa = colorTheme === "theme-usa";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isUsa) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let nextAmbient = last + 400;
    let lastPointer = 0;
    const rand = Math.random;

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const smokes: Smoke[] = [];
    const flashes: Flash[] = [];
    const pending: Pending[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const puff = (x: number, y: number, n: number, day: boolean) => {
      for (let i = 0; i < n && smokes.length < MAX_SMOKE; i++) {
        const life = day ? 2600 + rand() * 1600 : 1400 + rand() * 900;
        smokes.push({
          x: x + (rand() - 0.5) * 14,
          y: y + (rand() - 0.5) * 14,
          vx: (rand() - 0.5) * 0.25,
          vy: -0.15 - rand() * 0.25,
          r: 6 + rand() * 10,
          vr: day ? 0.35 + rand() * 0.3 : 0.2 + rand() * 0.2,
          life,
          maxLife: life,
        });
      }
    };

    const burst = (x: number, y: number, palette: string[], big: boolean) => {
      const day = modeRef.current === "light";
      const kind = rand();
      const base = big ? 110 + rand() * 50 : 60 + rand() * 40;
      const speed = (big ? 3.4 : 2.6) + rand() * 1.2;
      // Flashbulb behind the burst (punch on bright days, glow at night).
      flashes.push({ x, y, r: 8, vr: big ? 3.2 : 2.2, life: 420, maxLife: 420, color: palette.includes("#ffffff") ? "#ffffff" : palette[0] });
      puff(x, y, big ? 10 : 5, day);
      if (kind < 0.3) {
        // Peony: even sphere.
        for (let i = 0; i < base && sparks.length < MAX_SPARKS; i++) {
          const a = (i / base) * Math.PI * 2 + rand() * 0.2;
          const s = speed * (0.75 + rand() * 0.45);
          const life = 1100 + rand() * 900;
          sparks.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life, maxLife: life, size: day ? 2.4 + rand() * 1.6 : 1.6 + rand() * 1.4,
            color: pick(palette, rand), gravity: 0.028, drag: 0.982, phase: rand() * 6.28, crackle: false,
          });
        }
      } else if (kind < 0.5) {
        // Ring + contrasting pistil.
        const ringColor = pick(palette, rand);
        const inner = pick(palette.filter((c) => c !== ringColor), rand) ?? "#ffffff";
        for (let i = 0; i < base && sparks.length < MAX_SPARKS; i++) {
          const a = (i / base) * Math.PI * 2;
          const life = 1200 + rand() * 700;
          sparks.push({
            x, y, vx: Math.cos(a) * speed * 1.15, vy: Math.sin(a) * speed * 1.15,
            life, maxLife: life, size: day ? 2.6 : 1.9, color: ringColor,
            gravity: 0.02, drag: 0.985, phase: rand() * 6.28, crackle: false,
          });
        }
        for (let i = 0; i < base / 2.5 && sparks.length < MAX_SPARKS; i++) {
          const a = rand() * Math.PI * 2;
          const s = speed * rand() * 0.45;
          const life = 900 + rand() * 600;
          sparks.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life, maxLife: life, size: 1.8, color: inner,
            gravity: 0.025, drag: 0.98, phase: rand() * 6.28, crackle: false,
          });
        }
      } else if (kind < 0.72) {
        // Willow: long gold droop.
        const cols = palette.includes(GOLDS[0]) ? palette : [...palette, ...GOLDS];
        for (let i = 0; i < base && sparks.length < MAX_SPARKS; i++) {
          const a = (i / base) * Math.PI * 2 + rand() * 0.3;
          const s = speed * (0.6 + rand() * 0.6);
          const life = 2000 + rand() * 1400;
          sparks.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6,
            life, maxLife: life, size: 1.7 + rand(), color: pick(cols, rand),
            gravity: 0.045, drag: 0.988, phase: rand() * 6.28, crackle: false,
          });
        }
      } else {
        // Crackle shell: modest pop now, delayed secondaries.
        for (let i = 0; i < base / 2 && sparks.length < MAX_SPARKS; i++) {
          const a = rand() * Math.PI * 2;
          const s = speed * rand();
          const life = 700 + rand() * 500;
          sparks.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life, maxLife: life, size: 1.8, color: pick(palette, rand),
            gravity: 0.03, drag: 0.98, phase: rand() * 6.28, crackle: true,
          });
        }
        const now = performance.now();
        for (let i = 0; i < 8; i++) {
          pending.push({
            at: now + 250 + rand() * 900,
            x: x + (rand() - 0.5) * 160,
            y: y + (rand() - 0.5) * 120,
            palette,
          });
        }
      }
    };

    const launch = (targetX?: number, targetY?: number) => {
      if (rockets.length >= MAX_ROCKETS) return;
      const sx = targetX ?? rand() * w;
      rockets.push({
        x: targetX ?? rand() * w,
        y: h + 12,
        vx: (rand() - 0.5) * 0.6,
        vy: -(7 + rand() * 2.5),
        targetX: targetX ?? sx,
        targetY: targetY ?? h * (0.14 + rand() * 0.38),
        hue: rand() < 0.25 ? ALL : rand() < 0.5 ? [...REDS, ...WHITES] : rand() < 0.75 ? [...BLUES, ...WHITES] : GOLDS,
        trail: [],
      });
    };

    const fountain = (x: number, y: number) => {
      const day = modeRef.current === "light";
      for (let i = 0; i < 10 && sparks.length < MAX_SPARKS; i++) {
        const a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
        const s = 0.8 + rand() * 1.8;
        const life = 500 + rand() * 500;
        sparks.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life, maxLife: life, size: day ? 2.2 : 1.6, color: pick(ALL, rand),
          gravity: 0.035, drag: 0.985, phase: rand() * 6.28, crackle: false,
        });
      }
      if (rand() < 0.4) puff(x, y, 1, day);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;
      const now = performance.now();
      if (now - lastPointer < 70) return;
      lastPointer = now;
      fountain(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!activeRef.current) return;
      launch(e.clientX, Math.max(40, e.clientY - 60));
      fountain(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!activeRef.current) {
        // Theme off: drain leftovers once, then idle on a clear canvas.
        if (!rockets.length && !sparks.length && !smokes.length && !flashes.length && !pending.length) {
          ctx.clearRect(0, 0, w, h);
          last = now;
          return;
        }
      }
      const dt = Math.min(50, now - last);
      last = now;
      const step = dt / 16.67;
      const day = modeRef.current === "light";

      if (activeRef.current && now >= nextAmbient) {
        nextAmbient = now + 700 + rand() * 900;
        launch();
      }

      // Delayed crackle secondaries.
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (now >= p.at) {
          pending.splice(i, 1);
          for (let k = 0; k < 14 && sparks.length < MAX_SPARKS; k++) {
            const a = rand() * Math.PI * 2;
            const s = 0.6 + rand() * 1.6;
            const life = 350 + rand() * 350;
            sparks.push({
              x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
              life, maxLife: life, size: 1.5, color: pick(p.palette, rand),
              gravity: 0.02, drag: 0.97, phase: rand() * 6.28, crackle: false,
            });
          }
          flashes.push({ x: p.x, y: p.y, r: 4, vr: 1.4, life: 220, maxLife: 220, color: "#ffffff" });
        }
      }

      // Rockets climb, wobble, and pop at their target.
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += 0.045 * step;
        r.vx += Math.sin(now / 130 + i) * 0.008 * step;
        r.x += r.vx * step;
        r.y += r.vy * step;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 22) r.trail.shift();
        if (r.y <= r.targetY || r.vy > -0.6 || r.y < -20) {
          rockets.splice(i, 1);
          burst(r.x, Math.max(30, r.y), r.hue, true);
        }
      }

      // Sparks fall, twinkle, and die.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += s.gravity * step;
        s.vx *= Math.pow(s.drag, step);
        s.vy *= Math.pow(0.995, step);
        s.x += s.vx * step;
        s.y += s.vy * step;
      }

      // Smoke rises, swells, and thins.
      for (let i = smokes.length - 1; i >= 0; i--) {
        const m = smokes[i];
        m.life -= dt;
        if (m.life <= 0) {
          smokes.splice(i, 1);
          continue;
        }
        m.x += (m.vx + Math.sin(now / 900 + i) * 0.08) * step;
        m.y += m.vy * step;
        m.r += m.vr * step;
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= dt;
        if (f.life <= 0) {
          flashes.splice(i, 1);
          continue;
        }
        f.r += f.vr * step;
      }

      // ---- paint ----
      ctx.clearRect(0, 0, w, h);

      // Smoke first (under the sparks). Day: thick gray; night: faint blue.
      for (const m of smokes) {
        const t = m.life / m.maxLife;
        const a = (day ? 0.30 : 0.10) * t;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        const tint = day ? "122,122,132" : "150,170,205";
        g.addColorStop(0, `rgba(${tint},${a.toFixed(3)})`);
        g.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, 6.2832);
        ctx.fill();
      }

      // Flashbulbs.
      for (const f of flashes) {
        const t = f.life / f.maxLife;
        ctx.globalCompositeOperation = day ? "source-over" : "lighter";
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, f.color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 0.5 * t;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = day ? "source-over" : "lighter";

      // Rocket trails.
      for (const r of rockets) {
        for (let k = 0; k < r.trail.length; k++) {
          const p = r.trail[k];
          const t = k / r.trail.length;
          ctx.globalAlpha = 0.65 * t;
          ctx.fillStyle = k % 3 === 0 ? "#ffffff" : "#ffd166";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.4 * t + 0.4, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Star sparks with twinkle (crackle cores strobe instead of shimmering).
      for (const s of sparks) {
        const t = s.life / s.maxLife;
        const tw = s.crackle
          ? (Math.sin(now / 40 + s.phase) > 0 ? 1 : 0.25)
          : 0.72 + 0.28 * Math.sin(now / 90 + s.phase);
        ctx.globalAlpha = Math.min(1, t * 1.6) * tw;
        ctx.fillStyle = s.color;
        const rad = s.size * (0.6 + 0.4 * t);
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, 6.2832);
        ctx.fill();
        // Cross glint on the brightest youngsters (night only, cheap).
        if (!day && t > 0.75 && s.size > 1.7) {
          ctx.globalAlpha = (t - 0.75) * 2 * tw;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x - rad * 2.4, s.y);
          ctx.lineTo(s.x + rad * 2.4, s.y);
          ctx.moveTo(s.x, s.y - rad * 2.4);
          ctx.lineTo(s.x, s.y + rad * 2.4);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isUsa]);

  if (!isUsa) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200]"
    />
  );
}
