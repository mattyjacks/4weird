"use client";

import { useEffect, useRef, useState } from "react";
import {
  MOD_IFRAME_SANDBOX,
  TRUSTED_MOD_ORIGINS,
  isModCompatibleWithGame,
  type GameModManifest,
} from "@/lib/game-mods";

interface ModMountProps {
  /** Validated mod manifest to mount. */
  manifest: GameModManifest;
  /** Game slug of the hosting page (compatibility gate). */
  gameSlug: string;
  /** Optional height for the mod frame. */
  height?: number;
}

/**
 * Game-side mod mount (§3.12 blueprint).
 *
 * Runs UNTRUSTED community mod code in a sandboxed iframe (`allow-scripts`
 * ONLY — no `allow-same-origin`, so the mod gets an opaque origin and can
 * never reach 4weird session tokens or the parent DOM).
 *
 * Safety contract:
 * - SSR/hydration-safe: the iframe `src` is attached in `useEffect` only.
 * - postMessage listener enforces a TRUSTED_MOD_ORIGINS allowlist.
 * - Fail-open: incompatible manifests, missing script_url, or load errors
 *   render a small fallback note — never brick game navigation (§1.2 axiom 3).
 */
export function ModMount({ manifest, gameSlug, height = 320 }: ModMountProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [modMessage, setModMessage] = useState<string | null>(null);

  const compatible = isModCompatibleWithGame(manifest, gameSlug);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!(TRUSTED_MOD_ORIGINS as readonly string[]).includes(event.origin)) return;
      // Authenticity: only the mounted mod frame may speak for this mod —
      // a same-origin sibling frame (runtime, ad slot) must not spoof it.
      if (event.source !== frameRef.current?.contentWindow) return;
      if (typeof event.data === "string" && event.data.startsWith("mod:")) {
        setModMessage(event.data.slice("mod:".length));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!compatible) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        Mod “{manifest.name}” targets “{manifest.target_game}” and is not mounted on “{gameSlug}”.
      </div>
    );
  }

  if (!manifest.script_url || loadError) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        Mod “{manifest.name}” is unavailable right now — the game continues without it.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
      <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
        <span className="font-bold text-slate-200">
          🧩 {manifest.name} <span className="font-mono text-slate-500">v{manifest.version}</span>
          {manifest.is_verified ? <span className="ml-1 text-emerald-400">✓ verified</span> : null}
        </span>
        <span className="font-mono">sandbox: {MOD_IFRAME_SANDBOX}</span>
      </div>
      <iframe
        ref={frameRef}
        title={`Community mod: ${manifest.name}`}
        src={manifest.script_url}
        sandbox={MOD_IFRAME_SANDBOX}
        onError={() => setLoadError(true)}
        className="w-full rounded-lg bg-slate-900"
        style={{ height }}
      />
      {modMessage ? <p className="px-2 py-1 text-xs text-slate-500">Mod says: {modMessage}</p> : null}
    </div>
  );
}
