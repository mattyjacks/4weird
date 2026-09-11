"use client";

import { useEffect, useRef, useState } from "react";
import { buildAnimeAvatar } from "./avatars/anime-avatar";
import { buildCloudAvatar } from "./avatars/cloud-avatar";
import { buildCubeAvatar } from "./avatars/cube-avatar";
import { applyCosmetics } from "./avatars/parts";
import type { AvatarKind, T3 } from "./avatars/types";
import type { AvatarLoadout } from "../../lib/cosmetics";

export type BuddyAvatarType = AvatarKind;

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let threePromise: Promise<T3> | null = null;
function loadThree(): Promise<T3> {
  if (!threePromise) {
    threePromise = import(/* webpackIgnore: true */ THREE_CDN) as Promise<T3>;
  }
  return threePromise;
}

function buildRig(T: T3, type: AvatarKind, color: string): T3 {
  if (type === "cloud") return buildCloudAvatar(T, color);
  if (type === "anime") return buildAnimeAvatar(T, color);
  return buildCubeAvatar(T, color);
}

// One MediaElementSource per <audio> for the life of the page (the Web Audio
// API throws if you wrap the same element twice).
const elementSources = new WeakMap<HTMLMediaElement, { ctx: AudioContext; analyser: AnalyserNode }>();

function outputAnalyser(el: HTMLAudioElement): AnalyserNode | null {
  try {
    const hit = elementSources.get(el);
    if (hit) return hit.analyser;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const src = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    elementSources.set(el, { ctx, analyser });
    void ctx.resume().catch(() => undefined);
    return analyser;
  } catch {
    return null;
  }
}

function rms(analyser: AnalyserNode | null, buf: Uint8Array): number {
  if (!analyser) return 0;
  try {
    analyser.getByteTimeDomainData(buf as unknown as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 1) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3);
  } catch {
    return 0;
  }
}

/** Vowel openness for the current spoken word (0..1). Consonant-heavy -> smaller. */
function vowelOpenness(word: string): number {
  const w = word.toLowerCase();
  if (/[aā]/.test(w)) return 1;
  if (/[oō]/.test(w)) return 0.85;
  if (/[eē]/.test(w)) return 0.65;
  if (/[uū]/.test(w)) return 0.55;
  if (/[iī]/.test(w)) return 0.4;
  return 0.5;
}

function currentWord(script: string, startedAt: number | null, now: number): string {
  if (!script || !startedAt) return "";
  const words = script.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  // ~2.4 spoken words/sec; clamp to the script so it holds the last word.
  const idx = Math.min(words.length - 1, Math.floor(((now - startedAt) / 1000) * 2.4));
  return words[Math.max(0, idx)] ?? "";
}

export function BuddyAvatarFallback({ type, label }: { type: BuddyAvatarType; label: string }) {
  const face =
    type === "cloud" ? "(◕‿◕)☁" : type === "anime" ? "(◕‿◕)♡" : "(◕‿◕)▦";
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-xl bg-black/40 text-5xl" role="img" aria-label={`${label} avatar (3D unavailable)`}>
      <span>{face}</span>
      <span className="text-xs text-slate-400">3D avatar unavailable offline — {label} is resting in 2D.</span>
    </div>
  );
}

export type BuddyAvatarProps = {
  type: BuddyAvatarType;
  /** Body/dress color (hex). Customizable live. */
  color: string;
  /** Current buddy reply text; drives word-timed mouth shapes. */
  script: string;
  /** Performance timestamp when the current script started (null = idle). */
  scriptStartedAt: number | null;
  /** True while buddy audio is playing. */
  speaking: boolean;
  /** Buddy voice <audio> element (analyser taps it without changing sound). */
  outputEl: HTMLAudioElement | null;
  /** Live mic stream (analyser only — never recorded or sent). */
  micStream: MediaStream | null;
  /** Equipped wardrobe (hats, glasses, outfits, accessories, effects). */
  loadout: AvatarLoadout;
  label: string;
};

/**
 * Optional cute 3D buddy avatar. three.js loads lazily from CDN (no bundle
 * cost when off); each shape lives in its own avatars/*.tsx file. Mouth
 * follows the voice waveform + spoken words, brows lift with excitement,
 * wings/arms/stars play, eyes blink, track the cursor, and widen; soft
 * shadows + blush included. Anything fails -> 2D fallback, never a crash.
 */
export function BuddyAvatar(props: BuddyAvatarProps) {
  const { type, color, script, scriptStartedAt, speaking, outputEl, micStream, loadout, label } = props;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ type, color, script, scriptStartedAt, speaking, outputEl, micStream, loadout });
  stateRef.current = { type, color, script, scriptStartedAt, speaking, outputEl, micStream, loadout };
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dead = false;
    let renderer: T3 | null = null;
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let micAnalyser: AnalyserNode | null = null;
    let outAnalyser: AnalyserNode | null = null;
    const buf = new Uint8Array(256);
    const look = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      look.x = Math.max(-1, Math.min(1, e.clientX / window.innerWidth - 0.5)) * 2;
      look.y = Math.max(-1, Math.min(1, e.clientY / window.innerHeight - 0.5)) * 2;
    };
    window.addEventListener("pointermove", onMove);

    (async () => {
      try {
        const mount = mountRef.current;
        if (!mount) return;
        const T: T3 = await loadThree();
        if (dead) return;
        if (!mount.isConnected) return;

        const W = mount.clientWidth || 320;
        const H = 224;
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        renderer.outputColorSpace = T.SRGBColorSpace ?? undefined;
        mount.appendChild(renderer.domElement);

        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(38, W / H, 0.1, 50);
        camera.position.set(0, 0.35, 4.6);
        camera.lookAt(0, -0.1, 0);

        scene.add(new T.HemisphereLight(0xcdd6ff, 0x3a2d5c, 0.95));
        const key = new T.DirectionalLight(0xfff2dd, 1.6);
        key.position.set(2.5, 4.5, 3.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -4;
        key.shadow.camera.right = 4;
        key.shadow.camera.top = 4;
        key.shadow.camera.bottom = -4;
        scene.add(key);
        const rim = new T.DirectionalLight(0x8b7cf6, 0.7);
        rim.position.set(-3, 1.5, -2.5);
        scene.add(rim);

        const ground = new T.Mesh(
          new T.CircleGeometry(2.6, 40),
          new T.ShadowMaterial({ opacity: 0.28 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.25;
        ground.receiveShadow = true;
        scene.add(ground);

        let rig: T3 = buildRig(T, stateRef.current.type, stateRef.current.color);
        scene.add(rig);
        let dressedSig = "";
        const dress = (kind: AvatarKind, look: AvatarLoadout): void => {
          try {
            applyCosmetics(T, rig, look ?? {}, kind);
            dressedSig = JSON.stringify(look ?? {});
          } catch {
            dressedSig = JSON.stringify(look ?? {});
          }
        };
        dress(stateRef.current.type, stateRef.current.loadout);
        let painted = stateRef.current.color;
        const repaint = (c: string) => {
          painted = c;
          try {
            rig.traverse((o: T3) => {
              if (o.isMesh && o.userData?.paint && o.material?.color) o.material.color.set(c);
            });
          } catch { /* recolor is cosmetic */ }
        };

        // Mic analyser (level only — the stream never leaves the device).
        try {
          if (stateRef.current.micStream) {
            const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Ctx) {
              audioCtx = new Ctx();
              const src = audioCtx.createMediaStreamSource(stateRef.current.micStream);
              micAnalyser = audioCtx.createAnalyser();
              micAnalyser.fftSize = 512;
              src.connect(micAnalyser);
              void audioCtx.resume().catch(() => undefined);
            }
          }
        } catch { /* mic levels are optional */ }

        let nextBlink = performance.now() + 2200;
        let blinkUntil = 0;
        const t0 = performance.now();
        setLoading(false);

        const tick = () => {
          if (dead) return;
          raf = requestAnimationFrame(tick);
          const s = stateRef.current;
          const now = performance.now();
          const t = (now - t0) / 1000;

          // Hot-swap rig on type change; repaint on color change; re-dress wardrobe.
          const want = s.type;
          if (rig.userData.kind !== want) {
            scene.remove(rig);
            rig = buildRig(T, want, s.color);
            scene.add(rig);
            painted = s.color;
            dress(want, s.loadout);
          } else if (painted !== s.color) {
            repaint(s.color);
          }
          try {
            if (JSON.stringify(s.loadout ?? {}) !== dressedSig) dress(want, s.loadout);
          } catch {
            /* wardrobe diff is best-effort */
          }

          // Levels: buddy voice output + live mic (whichever is louder).
          if (!outAnalyser || s.outputEl !== (outAnalyser as unknown as { __el?: unknown }).__el) {
            outAnalyser = s.outputEl ? outputAnalyser(s.outputEl) : null;
          }
          const outLevel = rms(outAnalyser, buf);
          const micLevel = rms(micAnalyser, buf);
          const level = Math.min(1, Math.max(outLevel, micAnalyser ? micLevel * 0.9 : 0));
          const talking = s.speaking || level > 0.04;

          // Mouth: waveform amplitude x word viseme while speaking, else rest.
          const word = s.speaking ? currentWord(s.script, s.scriptStartedAt, now) : "";
          const viseme = word ? vowelOpenness(word) : 0;
          const target = talking
            ? Math.min(1, 0.25 + level * 1.1 + viseme * 0.45)
            : 0.06;
          const mouth = rig.userData.mouth as T3;
          const cur = (mouth.scale.y as number) || 0.2;
          const open = cur + (target - cur) * 0.45;
          mouth.scale.y = open;
          mouth.scale.x = 1.1 + open * 0.5;

          // Brows lift + tilt with excitement.
          const ud = rig.userData as {
            eyeL: T3; eyeR: T3; browL?: T3; browR?: T3;
            wingL?: T3; wingR?: T3; armL?: T3; armR?: T3;
            star?: T3; starBaseY?: number; effectSpin?: T3;
          };
          for (const [brow, sgn] of [[ud.browL, -1], [ud.browR, 1]] as Array<[T3 | undefined, number]>) {
            if (!brow) continue;
            try {
              const base = Number(brow.userData?.base ?? 0);
              const baseY = Number(brow.userData?.baseY ?? brow.position.y);
              brow.rotation.z = base + sgn * level * 0.45;
              brow.position.y = baseY + level * 0.05;
            } catch { /* cosmetic */ }
          }

          // Squash-and-stretch on the voice.
          try {
            const squash = talking ? 1 - Math.min(0.1, level * 0.1) : 1;
            rig.scale.y += (squash - rig.scale.y) * 0.35;
            const wide = 1 + (1 - rig.scale.y) * 0.7;
            rig.scale.x = wide;
            rig.scale.z = wide;
          } catch { /* cosmetic */ }

          // Cloud wings flap harder while talking; anime arms wave.
          try {
            if (ud.wingL && ud.wingR) {
              const flap = talking ? Math.sin(t * 9) * 0.5 : Math.sin(t * 2) * 0.12;
              ud.wingL.rotation.z = Number(ud.wingL.userData?.base ?? 0.45) + flap;
              ud.wingR.rotation.z = Number(ud.wingR.userData?.base ?? -0.45) - flap;
            }
            if (ud.armL && ud.armR) {
              const wave = talking ? Math.sin(t * 7) * 0.35 : Math.sin(t * 1.6) * 0.08;
              ud.armL.rotation.z = Number(ud.armL.userData?.base ?? 0) - Math.abs(wave);
              ud.armR.rotation.z = Number(ud.armR.userData?.base ?? 0) + Math.abs(wave);
            }
            if (ud.star) {
              ud.star.rotation.y += 0.025;
              ud.star.position.y = Number(ud.starBaseY ?? ud.star.position.y) + Math.sin(t * 2.2) * 0.07;
            }
            // Wardrobe effects (sparkles / bubbles) orbit gently.
            if (ud.effectSpin) {
              ud.effectSpin.rotation.y += talking ? 0.03 : 0.008;
            }
          } catch { /* cosmetic */ }

          // Eyes: blink, cursor tracking, excitement widen.
          const { eyeL, eyeR } = ud;
          if (now > nextBlink) {
            blinkUntil = now + 130;
            nextBlink = now + 2200 + Math.random() * 2200;
          }
          const blinking = now < blinkUntil;
          const excite = 1 + level * 0.25;
          for (const eye of [eyeL, eyeR]) {
            eye.scale.y = blinking ? 0.08 : excite;
            const pupil = eye.userData.pupil as T3;
            pupil.position.x = look.x * 0.06;
            pupil.position.y = -look.y * 0.05;
            const ps = 1 + level * 0.35;
            pupil.scale.set(ps, ps, ps);
          }

          // Idle life: bob, sway, breathe (per-kind ground offset).
          const kind = rig.userData.kind as string;
          const baseY = kind === "anime" ? 0.35 : kind === "cloud" ? 0.15 : 0.1;
          rig.position.y = baseY + Math.sin(t * 1.6) * 0.07;
          rig.rotation.y = Math.sin(t * 0.5) * 0.18 + look.x * 0.12;
          rig.rotation.z = kind === "anime" ? Math.sin(t * 1.1) * 0.03 : Math.sin(t * 0.9) * 0.05;

          renderer.render(scene, camera);
        };
        tick();
      } catch {
        if (!dead) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      dead = true;
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      try {
        if (renderer) {
          renderer.dispose();
          renderer.domElement?.parentNode?.removeChild(renderer.domElement);
        }
      } catch { /* teardown is best-effort */ }
      try {
        void audioCtx?.close().catch(() => undefined);
      } catch { /* teardown is best-effort */ }
    };
  }, []);

  if (failed) return <BuddyAvatarFallback type={type} label={label} />;
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-violet-500/15 to-black/50">
      <div ref={mountRef} className="h-56 w-full" aria-label={`${label} 3D avatar`} role="img" />
      {loading && <p className="absolute inset-x-0 top-2 text-center text-xs text-slate-400">Warming up the avatar…</p>}
    </div>
  );
}
