"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useSiteTheme } from "@/components/site/site-theme-provider";

/**
 * USA USA overlay — same gate (`theme-usa`), fireworks + bombing run:
 *
 * - NIGHT (dark mode): fireworks AND the bombing run, layered.
 *   Fireworks (ambient rockets, mouse fountains, click strikes, peony / ring /
 *   willow / crackle shells with additive glow) fly behind; airplane emojis
 *   (✈️ / 🛩️) cruise left-to-right AND right-to-left on top, buildings line
 *   the bottom, planes drop 💣 bombs, each impact pops a big 💥 with fire +
 *   flag-colored debris, smoke, screen shake, and destruction physics.
 * - DAY (light mode): NO fireworks. Bombing run only (same planes, buildings,
 *   bombs, 💥, debris, shake).
 * - EVERY click / tap drops a bomb from that exact spot, in BOTH modes
 *   (night clicks also still call a firework strike — bomb preserved).
 *
 * Cheap by construction: capped particles, DPR ≤ 1.5, rAF pauses when the
 * tab hides, zero DOM churn, and total silence when the theme is off or
 * the user prefers reduced motion.
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

// ---- Bombing-run types (both modes) ----
type Plane = {
  x: number; y: number; vx: number; dir: 1 | -1;
  emoji: string; size: number; dropIn: number; wobble: number;
};

type Building = {
  x: number; y: number; emoji: string; size: number;
  alive: boolean; respawnAt: number; slot: number;
};

type Bomb = { x: number; y: number; vx: number; vy: number; spin: number };

type Boom = { x: number; y: number; life: number; maxLife: number; size: number };

type Rubble = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; rot: number; vr: number;
};

const REDS = ["#ff4d5e", "#e11d48", "#ff8a94"];
const WHITES = ["#ffffff", "#f8fafc", "#e2e8f0"];
const BLUES = ["#5aa2ff", "#93c5fd", "#2563eb"];
const GOLDS = ["#ffd166", "#fbbf24", "#fff3bf"];
const ALL = [...REDS, ...WHITES, ...BLUES, ...GOLDS];

const MAX_SPARKS = 800;
const MAX_SMOKE = 140;
const MAX_ROCKETS = 10;

// Bombing-run caps (kept small — emoji + rects only, no blur shadows).
const MAX_PLANES = 4;
const MAX_BOMBS = 24;
const MAX_BOOMS = 12;
const MAX_RUBBLE = 320;

const PLANES = ["✈️", "🛩️", "✈️", "🛩️"];
// Every building emoji worth lining Main Street with.
const BUILDINGS = [
  "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨",
  "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒",
  "🗼", "⛪", "🕌", "🕍", "⛩️", "🏟️", "🏛️", "🏚️",
];
const FIRE = ["#b31942", "#e11d48", "#ff6b00", "#ff9f1c", "#ffd166", "#0a3161", "#ffffff"];

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
    let nextPlane = last + 300;
    let shake = 0;
    let lastMode = modeRef.current;
    const rand = Math.random;

    // Fireworks state (night only).
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const smokes: Smoke[] = [];
    const flashes: Flash[] = [];
    const pending: Pending[] = [];

    // Bombing-run state (both modes, on top of fireworks at night).
    const planes: Plane[] = [];
    const buildings: Building[] = [];
    const bombs: Bomb[] = [];
    const booms: Boom[] = [];
    const rubble: Rubble[] = [];
    let buildingCursor = 0;

    const groundY = () => h - 26;

    const layoutBuildings = () => {
      buildings.length = 0;
      const gap = 64;
      const n = Math.max(3, Math.floor(w / gap));
      for (let i = 0; i < n; i++) {
        const emoji = BUILDINGS[(buildingCursor + i) % BUILDINGS.length];
        buildings.push({
          x: (i + 0.5) * (w / n),
          y: groundY(),
          emoji,
          size: 30 + rand() * 10,
          alive: true,
          respawnAt: 0,
          slot: i,
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Buildings spawn in BOTH modes — relayout keeps the street full.
      layoutBuildings();
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
      const kind = rand();
      const base = big ? 110 + rand() * 50 : 60 + rand() * 40;
      const speed = (big ? 3.4 : 2.6) + rand() * 1.2;
      // Flashbulb behind the burst (night glow).
      flashes.push({ x, y, r: 8, vr: big ? 3.2 : 2.2, life: 420, maxLife: 420, color: palette.includes("#ffffff") ? "#ffffff" : palette[0] });
      puff(x, y, big ? 10 : 5, false);
      if (kind < 0.3) {
        // Peony: even sphere.
        for (let i = 0; i < base && sparks.length < MAX_SPARKS; i++) {
          const a = (i / base) * Math.PI * 2 + rand() * 0.2;
          const s = speed * (0.75 + rand() * 0.45);
          const life = 1100 + rand() * 900;
          sparks.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life, maxLife: life, size: 1.6 + rand() * 1.4,
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
            life, maxLife: life, size: 1.9, color: ringColor,
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
      for (let i = 0; i < 10 && sparks.length < MAX_SPARKS; i++) {
        const a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
        const s = 0.8 + rand() * 1.8;
        const life = 500 + rand() * 500;
        sparks.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life, maxLife: life, size: 1.6, color: pick(ALL, rand),
          gravity: 0.035, drag: 0.985, phase: rand() * 6.28, crackle: false,
        });
      }
      if (rand() < 0.4) puff(x, y, 1, false);
    };

    // ---- Bombing-run helpers (both modes) ----
    const spawnPlane = (now: number) => {
      if (planes.length >= MAX_PLANES) return;
      const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
      const speed = 1.6 + rand() * 1.6;
      planes.push({
        x: dir === 1 ? -60 : w + 60,
        y: h * (0.06 + rand() * 0.28),
        vx: speed * dir,
        dir,
        emoji: pick(PLANES, rand),
        size: 30 + rand() * 10,
        dropIn: now + 600 + rand() * 2200,
        wobble: rand() * 6.28,
      });
    };

    const dropBomb = (x: number, y: number, vx = 0) => {
      if (bombs.length >= MAX_BOMBS) return;
      bombs.push({ x, y, vx, vy: 1.2, spin: rand() * 6.28 });
    };

    const explode = (x: number, y: number, big: boolean) => {
      if (booms.length < MAX_BOOMS) {
        booms.push({ x, y, life: 650, maxLife: 650, size: big ? 56 : 44 });
      }
      // Fire + flag-colored shrapnel with real gravity.
      const n = big ? 34 : 22;
      for (let i = 0; i < n && rubble.length < MAX_RUBBLE; i++) {
        const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
        const s = 1.5 + rand() * (big ? 5.5 : 4);
        const life = 700 + rand() * 900;
        rubble.push({
          x, y: y - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
          life, maxLife: life, size: 2 + rand() * 4,
          color: pick(FIRE, rand), rot: rand() * 6.28, vr: (rand() - 0.5) * 0.3,
        });
      }
      // A few lingering smoke puffs (explosion aftermath, not fireworks haze).
      for (let i = 0; i < 5 && smokes.length < MAX_SMOKE; i++) {
        const life = 900 + rand() * 800;
        smokes.push({
          x: x + (rand() - 0.5) * 18,
          y: y - 10 + (rand() - 0.5) * 10,
          vx: (rand() - 0.5) * 0.6,
          vy: -0.4 - rand() * 0.5,
          r: 7 + rand() * 8,
          vr: 0.25 + rand() * 0.25,
          life,
          maxLife: life,
        });
      }
      flashes.push({ x, y, r: 10, vr: 3.4, life: 300, maxLife: 300, color: "#ffd166" });
      shake = Math.min(10, shake + (big ? 7 : 4));
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;
      // Fireworks sprinkle belongs to the NIGHT show only.
      if (modeRef.current === "light") return;
      const now = performance.now();
      if (now - lastPointer < 70) return;
      lastPointer = now;
      fountain(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!activeRef.current) return;
      // EVERY click / tap drops a bomb, in both modes — preserved.
      dropBomb(e.clientX, Math.max(10, e.clientY));
      if (modeRef.current === "light") return;
      // Night additionally calls a firework strike right at that spot.
      launch(e.clientX, Math.max(40, e.clientY - 60));
      fountain(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!activeRef.current) {
        // Theme off: drain leftovers once, then idle on a clear canvas.
        if (!rockets.length && !sparks.length && !smokes.length && !flashes.length && !pending.length
          && !planes.length && !bombs.length && !booms.length && !rubble.length && !buildings.length) {
          ctx.clearRect(0, 0, w, h);
          last = now;
          return;
        }
      }
      const dt = Math.min(50, now - last);
      last = now;
      const step = dt / 16.67;
      const day = modeRef.current === "light";

      // Mode flip: fireworks must never leak into the DAY show, so wipe
      // the night-only actors when entering light. The bombing run persists
      // across both modes — just make sure the street is laid out.
      if (modeRef.current !== lastMode) {
        lastMode = modeRef.current;
        if (day) {
          rockets.length = 0;
          sparks.length = 0;
          pending.length = 0;
        }
        if (!buildings.length) layoutBuildings();
        nextPlane = now + 200;
      }

      // ============ Bombing run: ALWAYS (both modes, on top at night) ============
      if (activeRef.current && now >= nextPlane) {
        nextPlane = now + 900 + rand() * 1600;
        spawnPlane(now);
      }
      if (!buildings.length) layoutBuildings();

      // Planes cruise; auto-drop bombs over living buildings.
      for (let i = planes.length - 1; i >= 0; i--) {
        const p = planes[i];
        p.wobble += 0.03 * step;
        p.x += p.vx * step;
        p.y += Math.sin(p.wobble) * 0.25 * step;
        if (now >= p.dropIn) {
          p.dropIn = now + 1400 + rand() * 2600;
          const target = buildings.find((b) => b.alive && Math.abs(b.x - p.x) < 90);
          if (target || rand() < 0.35) dropBomb(p.x, p.y + 14, p.vx * 0.35);
        }
        if ((p.dir === 1 && p.x > w + 80) || (p.dir === -1 && p.x < -80)) {
          planes.splice(i, 1);
        }
        // Contrail crumbs.
        if (rand() < 0.5 && rubble.length < MAX_RUBBLE) {
          const life = 400 + rand() * 300;
          rubble.push({
            x: p.x - p.dir * 18, y: p.y + (rand() - 0.5) * 6,
            vx: -p.vx * 0.15, vy: 0.15,
            life, maxLife: life, size: 1.5 + rand() * 1.5,
            color: pick(["#ffffff", "#ffd166", "#93c5fd"], rand),
            rot: 0, vr: 0,
          });
        }
      }

      // Bombs fall with gravity; impact = 💥 + destruction.
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        b.vy += 0.16 * step;
        b.x += b.vx * step;
        b.y += b.vy * step;
        b.spin += 0.05 * step;
        let hit = false;
        let big = false;
        for (const bd of buildings) {
          if (!bd.alive) continue;
          if (Math.abs(b.x - bd.x) < 26 && b.y >= bd.y - 30 && b.y <= bd.y + 12) {
            bd.alive = false;
            bd.respawnAt = now + 4000 + rand() * 4000;
            buildingCursor += 1;
            hit = true;
            big = true;
            break;
          }
        }
        if (!hit && b.y >= groundY()) {
          hit = true;
          big = false;
        }
        if (hit) {
          bombs.splice(i, 1);
          explode(b.x, Math.min(b.y, groundY()), big);
        } else if (b.y > h + 30) {
          bombs.splice(i, 1);
        }
      }

      // Respawning buildings march back in.
      for (const bd of buildings) {
        if (!bd.alive && now >= bd.respawnAt) {
          bd.alive = true;
          bd.emoji = BUILDINGS[(bd.slot + buildingCursor) % BUILDINGS.length];
        }
      }

      // Rubble: gravity, one ground bounce, fade.
      for (let i = rubble.length - 1; i >= 0; i--) {
        const r = rubble[i];
        r.life -= dt;
        if (r.life <= 0) {
          rubble.splice(i, 1);
          continue;
        }
        r.vy += 0.18 * step;
        r.vx *= Math.pow(0.99, step);
        r.x += r.vx * step;
        r.y += r.vy * step;
        r.rot += r.vr * step;
        if (r.y > groundY() && r.vy > 0) {
          r.y = groundY();
          r.vy *= -0.42;
          r.vx *= 0.6;
        }
      }

      for (let i = booms.length - 1; i >= 0; i--) {
        const m = booms[i];
        m.life -= dt;
        if (m.life <= 0) booms.splice(i, 1);
      }
      shake = Math.max(0, shake - 0.5 * step);

      // ============ Fireworks: NIGHT ONLY (behind the bombing run) ============
      if (!day) {
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
      }

      // Smoke + flashes decay (shared by both shows).
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

      // ---- paint (single pass, bombing run on top) ----
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (shake > 0.2) ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);

      if (!day) {
        // Fireworks smoke (faint blue, under everything).
        for (const m of smokes) {
          const t = m.life / m.maxLife;
          const a = 0.10 * t;
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
          g.addColorStop(0, `rgba(150,170,205,${a.toFixed(3)})`);
          g.addColorStop(1, "rgba(150,170,205,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, 6.2832);
          ctx.fill();
        }
        // Flashbulbs (additive glow).
        for (const f of flashes) {
          const t = f.life / f.maxLife;
          ctx.globalCompositeOperation = "lighter";
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
        ctx.globalCompositeOperation = "lighter";
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
        // Star sparks with twinkle.
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
          if (t > 0.75 && s.size > 1.7) {
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
      } else {
        // Day smoke (thin, warm gray — explosion aftermath only).
        for (const m of smokes) {
          const t = m.life / m.maxLife;
          const a = 0.22 * t;
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
          g.addColorStop(0, `rgba(110,110,120,${a.toFixed(3)})`);
          g.addColorStop(1, "rgba(110,110,120,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, 6.2832);
          ctx.fill();
        }
        // Day flashbulbs.
        for (const f of flashes) {
          const t = f.life / f.maxLife;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
          g.addColorStop(0, f.color);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = 0.55 * t;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, 6.2832);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ---- Bombing run on top (both modes) ----
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (const bd of buildings) {
        if (!bd.alive) continue;
        ctx.font = `${bd.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        ctx.fillText(bd.emoji, bd.x, bd.y + 22);
      }
      // Planes (mirrored when flying right-to-left).
      for (const p of planes) {
        ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        if (p.dir === 1) {
          ctx.fillText(p.emoji, p.x, p.y);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(-1, 1);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(p.emoji, 0, 0);
          ctx.restore();
        }
      }
      // Falling bombs.
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      for (const b of bombs) {
        ctx.font = `20px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        ctx.fillText("💣", b.x, b.y);
      }
      // Rubble shards.
      for (const r of rubble) {
        const t = r.life / r.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.8);
        ctx.fillStyle = r.color;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.fillRect(-r.size / 2, -r.size / 2, r.size, r.size * 0.7);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // 💥 impact markers: pop big, then shrink away.
      for (const m of booms) {
        const t = m.life / m.maxLife;
        const size = m.size * (1.25 - 0.45 * t);
        ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("💥", m.x, m.y + size * 0.35);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
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
