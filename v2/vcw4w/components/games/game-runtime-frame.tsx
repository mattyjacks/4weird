"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { A11Y_EVENT, loadA11y } from "@/lib/a11y";
import { FaceController, type FaceGameInput } from "@/components/a11y/face-controller";
import { UniversalSavePanel } from "@/components/games/universal-save-panel";

type RuntimeEvent = {
  version?: number;
  type?: string;
  slug?: string;
  slot?: number;
  kind?: string;
  schema_version?: number;
  data?: unknown;
  message?: string;
  score?: number;
  bytes?: number;
  active_seconds?: number;
  actions?: number;
};

// First-party hosts the shell and the static game bundles can be served
// from. Kept in sync with public/games/html/runtime-bridge.js. Exported so
// other shell listeners (e.g. the Buddy widget's score feed) can apply the
// same origin allowlist instead of trusting every iframe on the page.
export const TRUSTED_GAME_ORIGINS = [
  "https://4weird.com",
  "https://www.4weird.com",
];

function originOf(src: string) {
  try {
    return new URL(src, window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}

/**
 * Cloud saves are signed-in only. Probe the *local* Supabase session (no
 * network round trip, so logged-out guests never fire a doomed GET that
 * 401s in DevTools); guests play local-only, silently.
 */
async function hasLocalSession(): Promise<boolean> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const { data } = await createClient().auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

// DS-AUTOSAVE-02: shell autosave preference + slot-0 mirror keys. The mirror
// key matches UniversalSavePanel's `save:<slug>:slot:<slot>` so the timer
// and the manual panel read/write the same device copy.
function autosaveKey(slug: string) {
  return `autosave:${slug}:enabled`;
}

function autosaveMirrorKey(slug: string) {
  return `save:${slug}:slot:0`;
}

// Per-slot autosave routing: each slot 0-3 has manual + auto (load-only).
// Manual lives at `save:<slug>:slot:<N>`; the auto companion (written by
// the 60s timer + routed bridge autosaves, never overwriting manual) lives
// at `save:<slug>:slot:<N>:auto`.
function autoCompanionKey(slug: string, slot: number) {
  return `save:${slug}:slot:${slot}:auto`;
}

function manualSlotKey(slug: string, slot: number) {
  return `save:${slug}:slot:${slot}`;
}

function clampSlot(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3 ? (value as number) : 0;
}

export function GameRuntimeFrame({ slug, title, src }: { slug: string; title: string; src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The bundle can end up on the apex/www counterpart of the shell's origin
  // (Vercel redirects apex -> www, so a cached apex shell frames a www
  // bundle). Track the runtime's actual origin from its messages and accept
  // handshakes from any first-party host instead of the shell origin only.
  const runtimeOrigin = useRef<string | null>(null);
  // Last save payload observed from the runtime bridge (save events carry the
  // full game snapshot). Feeds the universal save panel's manual Save buttons
  // so every game gets slots 0-3 with zero per-game glue.
  const lastSaveData = useRef<unknown>(null);
  // Active slot for per-slot autosave routing: last bridge manual save slot
  // or last manual load, default 0. The autosave timer writes the AUTO
  // companion of this slot, never the manual copy.
  const activeSlotRef = useRef<number>(0);
  const postToRuntime = useCallback(
    (message: Record<string, unknown>) => {
      frame.current?.contentWindow?.postMessage(message, runtimeOrigin.current ?? originOf(src));
    },
    [src],
  );
  const [status, setStatus] = useState("Loading original HTML runtime…");
  const [score, setScore] = useState<number | null>(null);
  const [showTouchPad, setShowTouchPad] = useState(false);
  const [barsOpen, setBarsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fakeFullscreen, setFakeFullscreen] = useState(false);
  // Shell-side autosave (DS-AUTOSAVE-02): ON by default, persisted per game
  // under `autosave:<slug>:enabled` (absent = enabled).
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const autosaveEnabledRef = useRef(true);
  // Last time a save landed via any path (bridge save, timer, request).
  const lastAutosaveAt = useRef<number | null>(null);

  const pushA11y = useCallback(() => {
    try {
      postToRuntime({ version: 1, type: "a11y", slug, settings: loadA11y() });
    } catch {
      /* bridge absent; site-level classes still apply */
    }
  }, [slug, postToRuntime]);

  const sendKey = useCallback(
    (key: string, pressed: boolean) => {
      // Assist keys always travel via the runtime-bridge postMessage channel
      // (works same-origin AND across the apex/www redirect). The synthetic
      // dispatch below is a same-origin best-effort extra, never the only path.
      postToRuntime({ version: 1, type: "input", slug, action: "key", key, pressed });
      // Assistive fullscreen exit: a synthetic Escape must exit BOTH shell
      // and bridge fullscreen. Synthetic keys never trigger the browser's
      // native-Esc exit and never fire the shell's window keydown listener,
      // so handle it here on the key-down edge. mode:"exit" (not toggle) so
      // a shell/bridge state mismatch can only ever exit, never re-enter.
      // NOTE: F is gameplay input (Ability/fire/typing) — only Escape exits.
      if (pressed !== false && key === "Escape" && (isFullscreen || fakeFullscreen)) {
        try {
          const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
          if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => undefined);
          } else if (typeof doc.webkitExitFullscreen === "function") {
            void doc.webkitExitFullscreen();
          }
        } catch {
          /* native exit failed; CSS fallback still clears below */
        }
        setFakeFullscreen(false);
        postToRuntime({ version: 1, type: "fullscreen", slug, mode: "exit" });
      }
      const target = frame.current?.contentWindow;
      if (!target) return;
      try {
        const code =
          key === " " ? "Space" : key.startsWith("Arrow") ? key : key === "Escape" ? "Escape" : key === "Enter" ? "Enter" : `Key${key.toUpperCase()}`;
        const event = new KeyboardEvent(pressed ? "keydown" : "keyup", { key, code, bubbles: true });
        target.dispatchEvent(event);
        target.document?.dispatchEvent(event);
      } catch {
        // Cross-origin runtime (apex/www redirect): synthetic keys cannot be
        // dispatched; the postMessage above still delivers the input.
      }
    },
    [postToRuntime, slug, isFullscreen, fakeFullscreen],
  );

  /** Assistive input (face winks, head pointer, switch): normalized 0..1. */
  const handleGameInput = useCallback(
    (input: FaceGameInput) => {
      const rect = frame.current?.getBoundingClientRect();
      if (input.kind === "key") {
        sendKey(input.key, true);
        setTimeout(() => sendKey(input.key, false), 60);
        return;
      }
      let nx = 0.5;
      let ny = 0.5;
      if (typeof input.x === "number" && typeof input.y === "number" && rect && rect.width > 0 && rect.height > 0) {
        nx = Math.min(1, Math.max(0, (input.x - rect.left) / rect.width));
        ny = Math.min(1, Math.max(0, (input.y - rect.top) / rect.height));
      }
      postToRuntime({
        version: 1,
        type: "input",
        slug,
        action: input.kind === "rightclick" ? "rightclick" : "click",
        nx,
        ny,
      });
    },
    [slug, postToRuntime, sendKey],
  );

  useEffect(() => {
    setStatus("Loading game…");
    loadTimer.current = setTimeout(() => setStatus("The game is taking longer than expected to load. You can still open the standalone runtime URL in a new tab."), 8000);
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [src]);

  // The runtime bundle is game-only (the sync step strips the legacy site
  // chrome at build time), so the shell must NOT reach into the iframe's
  // document: that access throws cross-origin after an apex/www redirect and
  // is unnecessary same-origin. The postMessage handshake below ("ready")
  // is the single source of truth for load state.
  const handleLoad = () => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setStatus("");
    pushA11y();
    focusGame();
  };

  // Tap-to-focus must not scroll the page away on phones: focusing the
  // iframe with preventScroll keeps the game viewport stable. Desktop
  // behavior is unchanged (same focus targets, same order).
  const focusGame = useCallback(() => {
    try {
      frame.current?.contentWindow?.focus();
    } catch {
      /* cross-origin window focus unavailable; element focus still applies */
    }
    try {
      const el = frame.current as unknown as (HTMLElement & {
        focus?: (options?: { preventScroll?: boolean }) => void;
      }) | null;
      el?.focus?.({ preventScroll: true });
    } catch {
      try {
        frame.current?.focus();
      } catch {
        /* iframe focus unavailable; keyboard still works after a click */
      }
    }
  }, []);

  // Fullscreen targets the wrapper div (works for cross-origin apex/www
  // iframes where iframe.requestFullscreen() is denied). Standard +
  // webkit fallbacks; any failure drops to CSS "fake fullscreen" so the
  // button always visually works.
  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      setFakeFullscreen((prev) => !prev);
      focusGame();
      return;
    }
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const shellEl = shell.current as (HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    const iframeEl = frame.current as unknown as (HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    }) | null;
    const nativeActive = Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
    if (nativeActive || fakeFullscreen) {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (typeof doc.webkitExitFullscreen === "function") {
          await doc.webkitExitFullscreen();
        }
      } catch {
        /* native exit failed; still clear the CSS fallback below */
      }
      setFakeFullscreen(false);
      // Explicit exit (not toggle): bridge decides on its own isFullscreen(),
      // so a bare toggle here re-enters when states disagree (shell fake vs
      // bridge native). mode:"exit" is a no-op when already exited.
      postToRuntime({ version: 1, type: "fullscreen", slug, mode: "exit" });
      focusGame();
      return;
    }
    const target = shellEl ?? iframeEl;
    try {
      if (target && typeof target.requestFullscreen === "function") {
        await target.requestFullscreen();
      } else if (target && typeof target.webkitRequestFullscreen === "function") {
        await target.webkitRequestFullscreen();
      } else {
        throw new Error("fullscreen_unsupported");
      }
    } catch {
      // Native fullscreen denied/unavailable (cross-origin iframe, insecure
      // context, old Safari): CSS fallback still fills the viewport.
      setFakeFullscreen(true);
    }
    // Explicit enter (not toggle) for the same shell/bridge state-mismatch
    // reason as the exit path above.
    postToRuntime({ version: 1, type: "fullscreen", slug, mode: "enter" });
    focusGame();
  }, [fakeFullscreen, focusGame, postToRuntime, slug]);

  const fullscreenActive = isFullscreen || fakeFullscreen;

  // NOTE: no auto-focus steal to an exit control on entering fullscreen.
  // A focused "Exit fullscreen" pill turned every Space/Enter gameplay key
  // (jump/attack/confirm) into an exit-fullscreen click and pulled keyboard
  // focus out of the iframe. Exit lives in the toolbar (always visible),
  // on native Esc, and on F — no overlay over the canvas.

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const updateTouchMode = () => setShowTouchPad(coarsePointer.matches);
    updateTouchMode();
    const legacy = coarsePointer as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };
    if (typeof coarsePointer.addEventListener === "function") {
      coarsePointer.addEventListener("change", updateTouchMode);
      return () => coarsePointer.removeEventListener("change", updateTouchMode);
    }
    if (typeof legacy.addListener === "function" && typeof legacy.removeListener === "function") {
      legacy.addListener(updateTouchMode);
      return () => legacy.removeListener!(updateTouchMode);
    }
    return;
  }, []);

  // Track native fullscreen (standard + webkit) so the button label stays
  // correct when the user exits via Esc/browser chrome instead of the button.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const el = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      const shellEl = shell.current;
      const iframeEl = frame.current;
      setIsFullscreen(Boolean(el && (el === shellEl || el === iframeEl || (shellEl !== null && shellEl.contains(el)))));
    };
    onChange();
    const docWithPrefix = document as unknown as {
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    };
    document.addEventListener("fullscreenchange", onChange);
    docWithPrefix.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      docWithPrefix.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // CSS-fallback fullscreen (the iOS Safari / denied-native path) must also
  // lock the page behind the game: without this the viewport-sized shell
  // still scrolls under a swipe, and there is no browser-chrome exit gesture
  // (native Esc/controls don't exist for a CSS class). Restores on exit.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!fakeFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fakeFullscreen]);

  // "f" toggles fullscreen (desktop); Esc exits the CSS fallback (native
  // fullscreen exits itself). Ignored while typing so chat/inputs keep "f".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fakeFullscreen) {
        setFakeFullscreen(false);
        // Bridge holds its own fullscreen (documentElement) — tell it to
        // exit too, or a CSS-fallback Esc leaves the game stuck fullscreen.
        postToRuntime({ version: 1, type: "fullscreen", slug, mode: "exit" });
        focusGame();
        return;
      }
      if (event.key !== "f" && event.key !== "F") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;
        // Same-origin runtimes bubble game key events up to the shell window:
        // an F pressed as game input (Ability/fire/typing) inside the frame
        // must not toggle fullscreen. Button/toolbar F still toggles.
        try {
          if (frame.current && (target === frame.current || frame.current.contains(target))) return;
        } catch {
          /* frame access failed; fall through to toggle */
        }
      }
      event.preventDefault();
      void toggleFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fakeFullscreen, focusGame, toggleFullscreen, postToRuntime, slug]);

  // Shell-side a11y changes (colorblind filter, reduced motion, …) must
  // reach the game document, where shell CSS cannot penetrate.
  useEffect(() => {
    const onA11y = () => pushA11y();
    window.addEventListener(A11Y_EVENT, onA11y);
    return () => window.removeEventListener(A11Y_EVENT, onA11y);
  }, [pushA11y]);

  useEffect(() => {
    const expected = originOf(src);
    const onMessage = (event: MessageEvent<RuntimeEvent>) => {
      if ((event.origin !== expected && !TRUSTED_GAME_ORIGINS.includes(event.origin)) || event.source !== frame.current?.contentWindow || !event.data || event.data.version !== 1) return;
      // Slug-match drop (DS-SEC-GAMES-01): the bridge always tags its slug,
      // so a payload naming another game is dropped even from an otherwise
      // trusted source. NOTE on the outbound direction: the bundle-side
      // public/games/html/runtime-bridge.js hostTarget() still falls back to
      // "*" when document.referrer is untrusted — that file is parity-locked
      // (verify-game-bundles enforced) and was deliberately left untouched;
      // the drop-when-untrusted fix is filed as a QUEUE wiring request for
      // the sync-game-bundles generator owner (steward-owned scripts/**).
      if (typeof event.data.slug === "string" && event.data.slug !== slug) return;
      runtimeOrigin.current = event.origin;
      const origin = event.origin;
      const payload = event.data;
      if (payload.type === "score" && Number.isFinite(payload.score)) {
        setScore(payload.score!);
        return;
      }
      if (payload.type === "stats") {
        // Bridge-observed engagement (visible seconds + real inputs) for
        // legacy games that never learned the telemetry protocol. Guests
        // 401 here and are silently skipped; failures never surface as UI
        // noise. kills/deaths stay 0 - the bridge cannot observe them.
        const sec = Math.floor(Number(payload.active_seconds));
        const acts = Math.floor(Number(payload.actions));
        if (Number.isFinite(sec) && Number.isFinite(acts) && (sec > 0 || acts > 0)) {
          void fetch("/api/stats", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              game_slug: slug,
              active_seconds: Math.max(0, Math.min(3600, sec)),
              actions: Math.max(0, Math.min(100000, acts)),
              kills: 0,
              deaths: 0,
            }),
          }).catch(() => undefined);
        }
        return;
      }
      if (payload.type === "metering" && Number.isFinite(payload.bytes)) {
        // Cache accounting from inside the runtime (transferSize is 0 for
        // cache hits): re-broadcast where the play-metering gate listens.
        window.dispatchEvent(
          new CustomEvent("fourweird-metering", { detail: { bytes: Math.max(0, Math.floor(payload.bytes!)), slug } }),
        );
        return;
      }
      if (payload.type === "ready") {
        setStatus("");
        frame.current?.contentWindow?.postMessage({ version: 1, type: "host-ready", slug }, origin);
        pushA11y();
        // Guests have no cloud saves: fall back to the device copies only
        // (no 401 noise). A lapsed signed-in session (401) also stays
        // silent — local progress keeps working; only real backend faults
        // (5xx) warn. Ready auto-load tries manual slot 0 first, then the
        // auto slot 0 companion, so a corrupted manual still boots from
        // autosave.
        void (async () => {
          const postLocalFallback = (): boolean => {
            // Manual slot 0 first.
            try {
              const manualRaw = window.localStorage.getItem(manualSlotKey(slug, 0));
              if (manualRaw) {
                const parsed: unknown = JSON.parse(manualRaw);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  frame.current?.contentWindow?.postMessage({ version: 1, type: "load", slot: 0, schema_version: 1, data: parsed }, origin);
                  return true;
                }
              }
            } catch {
              /* corrupted manual falls through to the auto companion */
            }
            // Auto slot 0 fallback.
            try {
              const autoRaw = window.localStorage.getItem(autoCompanionKey(slug, 0));
              if (autoRaw) {
                const parsed: unknown = JSON.parse(autoRaw);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  frame.current?.contentWindow?.postMessage({ version: 1, type: "load", slot: 0, schema_version: 1, data: parsed }, origin);
                  return true;
                }
              }
            } catch {
              /* no usable autosave; boot fresh */
            }
            return false;
          };
          const postCloudSave = (save: { slot?: unknown; schema_version?: unknown; data?: unknown } | undefined): boolean => {
            if (save?.data && typeof save.data === "object" && !Array.isArray(save.data)) {
              frame.current?.contentWindow?.postMessage({ version: 1, type: "load", slot: save.slot, schema_version: save.schema_version ?? 1, data: save.data }, origin);
              return true;
            }
            return false;
          };
          if (!(await hasLocalSession())) { postLocalFallback(); return; }
          let response: Response;
          try {
            response = await fetch(`/api/saves?game=${encodeURIComponent(slug)}&slot=0`, { credentials: "include" });
          } catch {
            postLocalFallback();
            return;
          }
          if (response.status === 401) { postLocalFallback(); return; }
          if (!response.ok) { setStatus("Cloud save unavailable; playing with local progress."); postLocalFallback(); return; }
          let body: { saves?: unknown } | null = null;
          try {
            body = (await response.json()) as { saves?: unknown };
          } catch {
            setStatus("Cloud save data was invalid; playing with local progress."); postLocalFallback(); return;
          }
          if (body && !Array.isArray(body.saves)) { setStatus("Cloud save data was invalid; playing with local progress."); postLocalFallback(); return; }
          const savesList = (Array.isArray(body?.saves) ? body.saves : []) as Array<{ slot?: unknown; kind?: unknown; schema_version?: unknown; data?: unknown }>;
          // Manual slot 0 first, then any auto-kind entry, then any valid entry.
          const manual = savesList.find((entry) => entry?.data && typeof entry.data === "object" && !Array.isArray(entry.data) && (entry.kind === "manual" || entry.kind === undefined || entry.kind === null));
          if (postCloudSave(manual)) return;
          const auto = savesList.find((entry) => entry?.data && typeof entry.data === "object" && !Array.isArray(entry.data));
          if (postCloudSave(auto)) return;
          postLocalFallback();
        })();
      } else if (payload.type === "error") {
        setStatus(payload.message || "The game reported a runtime error.");
      } else if (payload.type === "save" && payload.data && typeof payload.data === "object") {
        const slot = clampSlot(payload.slot);
        const isAutoPost = payload.kind === "auto";
        lastSaveData.current = payload.data;
        lastAutosaveAt.current = Date.now();
        if (isAutoPost) {
          // Routed bridge autosave: write the AUTO companion of the ACTIVE
          // slot, never overwriting manual. Active slot is unchanged.
          const active = clampSlot(activeSlotRef.current);
          try {
            window.localStorage.setItem(autoCompanionKey(slug, active), JSON.stringify(payload.data));
          } catch {
            /* private-mode/quota errors must never break the game */
          }
          // No session → local progress only; never fire a doomed PUT.
          void (async () => {
            if (!(await hasLocalSession())) return;
            try {
              const response = await fetch("/api/saves", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_slug: slug, slot: active, kind: "auto", schema_version: Number.isInteger(payload.schema_version) ? payload.schema_version : 1, data: payload.data }),
              });
              if (response.status === 401) return;
              if (!response.ok) throw new Error("save_failed");
            } catch {
              setStatus("Cloud save unavailable; local progress is unchanged.");
            }
          })();
          return;
        }
        activeSlotRef.current = slot;
        // Fail-open device mirror for the game-requested manual save itself,
        // so slot state survives even before the first 60s timer tick.
        try {
          window.localStorage.setItem(manualSlotKey(slug, slot), JSON.stringify(payload.data));
        } catch {
          /* private-mode/quota errors must never break the game */
        }
        // No session → local progress only; never fire a doomed PUT.
        void (async () => {
          if (!(await hasLocalSession())) return;
          try {
            const response = await fetch("/api/saves", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ game_slug: slug, slot, kind: "manual", schema_version: Number.isInteger(payload.schema_version) ? payload.schema_version : 1, data: payload.data }),
            });
            if (response.status === 401) return;
            if (!response.ok) throw new Error("save_failed");
          } catch {
            setStatus("Cloud save unavailable; local progress is unchanged.");
          }
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug, src, pushA11y]);

  // Shell-side autosave (DS-AUTOSAVE-02): ON by default. The last bridge
  // save payload is mirrored to the AUTO companion of the ACTIVE slot every
  // 60s (localStorage always, cloud PUT kind auto when signed in) and on
  // shell request events. No-op until the runtime has emitted at least one
  // save — never persists empty snapshots. Never overwrites manual.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(autosaveKey(slug));
      const enabled = raw === null ? true : raw !== "0" && raw !== "false";
      setAutosaveEnabled(enabled);
      autosaveEnabledRef.current = enabled;
    } catch {
      setAutosaveEnabled(true);
      autosaveEnabledRef.current = true;
    }
  }, [slug]);

  useEffect(() => {
    autosaveEnabledRef.current = autosaveEnabled;
  }, [autosaveEnabled]);

  const persistAutosaveSnapshot = useCallback(async () => {
    const snapshot = lastSaveData.current;
    if (snapshot === null || snapshot === undefined) return;
    const active = clampSlot(activeSlotRef.current);
    try {
      window.localStorage.setItem(autoCompanionKey(slug, active), JSON.stringify(snapshot));
    } catch {
      /* fail-open: private-mode/quota errors must never break the game */
    }
    lastAutosaveAt.current = Date.now();
    // No session → local progress only; never fire a doomed PUT.
    // Fail-open, silent unless cloud down (status warn only on failure).
    if (!(await hasLocalSession())) return;
    try {
      const response = await fetch("/api/saves", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_slug: slug, slot: active, kind: "auto", schema_version: 1, data: snapshot }),
      });
      if (response.status === 401) return;
      if (!response.ok) throw new Error("save_failed");
    } catch {
      setStatus("Cloud save unavailable; local progress is unchanged.");
    }
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setInterval(() => {
      if (!autosaveEnabledRef.current) return;
      if (lastSaveData.current === null || lastSaveData.current === undefined) return;
      void persistAutosaveSnapshot();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [persistAutosaveSnapshot]);

  // Inbound only: cutscene/level triggers elsewhere in the shell dispatch
  // `fourweird-shell-request-save` (optionally { slug }) and the runtime
  // bridge posts { type: "save" } (handled in the message listener above).
  // No outbound polling — the shell never asks the runtime for state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRequestSave = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: unknown }>).detail;
      if (detail && typeof detail.slug === "string" && detail.slug !== slug) return;
      if (!autosaveEnabledRef.current) return;
      if (lastSaveData.current === null || lastSaveData.current === undefined) return;
      void persistAutosaveSnapshot();
    };
    window.addEventListener("fourweird-shell-request-save", onRequestSave);
    return () => window.removeEventListener("fourweird-shell-request-save", onRequestSave);
  }, [slug, persistAutosaveSnapshot]);

  const toggleAutosave = useCallback(
    (next: boolean) => {
      setAutosaveEnabled(next);
      autosaveEnabledRef.current = next;
      try {
        window.localStorage.setItem(autosaveKey(slug), next ? "1" : "0");
      } catch {
        /* fail-open */
      }
    },
    [slug],
  );

  const command = (type: "pause" | "resume" | "fullscreen") => {
    if (type === "fullscreen") {
      void toggleFullscreen();
      return;
    }
    postToRuntime({ version: 1, type, slug });
  };

  const padButton = (label: string, key: string, className = "") => <button type="button" aria-label={label} className={`grid h-12 w-12 touch-none place-items-center rounded-full border border-cyan-100/40 bg-slate-950/85 text-lg text-cyan-50 active:bg-cyan-400 active:text-black ${className}`} onPointerDown={(event) => { event.preventDefault(); sendKey(key, true); }} onPointerUp={() => sendKey(key, false)} onPointerCancel={() => sendKey(key, false)} onPointerLeave={() => sendKey(key, false)}>{label}</button>;

  // Universal save slots (0-3) for every game: manual Save snapshots the last
  // bridge-observed state, manual Load forwards the cloud/device snapshot
  // into the runtime via the bridge's load channel. Manual loads carry
  // reason "manual" so the bridge applies them immediately even mid-session
  // (the click is consent to replace local state); the auto slot-0 load on
  // "ready" omits it and only applies pre-interaction.
  const getUniversalSnapshot = useCallback(() => lastSaveData.current, []);
  const applyUniversalSnapshot = useCallback(
    (snapshot: unknown, slot: number) => {
      if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
        activeSlotRef.current = clampSlot(slot);
        postToRuntime({ version: 1, type: "load", slot: clampSlot(slot), schema_version: 1, data: snapshot, reason: "manual" });
      }
    },
    [postToRuntime],
  );
  return (
    <div className="w-full">
      <div ref={shell} className={`perf-frame play-frame-height play-frame-ar relative w-full overflow-hidden rounded-2xl border border-white/15 bg-black${fakeFullscreen ? " fw-fake-fullscreen" : ""}`} onClick={focusGame}>
        {barsOpen ? (
        <div className="absolute right-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap items-center justify-end gap-1.5 rounded bg-black/70 p-1.5">
          {score !== null && <span role="status" className="px-2 py-1 text-xs text-cyan-200">Score: {score}</span>}
          <span className="hidden px-2 py-1 text-[11px] text-white/60 lg:inline" aria-hidden="true">Press F for fullscreen</span>
          <button type="button" onClick={focusGame} className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline-flex" title="Focus the game so keyboard controls respond">Focus</button>
          <button type="button" onClick={() => command("pause")} className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline-flex">Pause</button>
          <button type="button" onClick={() => command("resume")} className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:inline-flex">Resume</button>
          <button type="button" onClick={() => command("fullscreen")} aria-pressed={fullscreenActive} aria-label={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"} title={fullscreenActive ? "Exit fullscreen (Esc)" : "Enter fullscreen (F)"} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20">{fullscreenActive ? "Exit fullscreen" : "Fullscreen"}</button>
          <a href={src} target="_blank" rel="noopener" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20" title="Open the standalone game window in a new tab">Pop out</a>
          <button type="button" onClick={() => setShowTouchPad((v) => !v)} aria-pressed={showTouchPad} aria-label="Toggle touch controls" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20 sm:hidden" title="Toggle touch controls">Pad</button>
          <button type="button" onClick={() => { setBarsOpen(false); focusGame(); }} aria-label="Hide game controls" title="Hide controls" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-xs text-white hover:bg-white/20">×</button>
        </div>
        ) : (
          <button type="button" onClick={() => setBarsOpen(true)} aria-label="Show game controls" title="Show controls" className="absolute right-2 top-2 z-20 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-white/20">⋯</button>
        )}
        <p role="status" className={`absolute left-2 top-2 z-20 max-w-[70%] rounded bg-black/70 px-3 py-1 text-xs text-white/80 ${status ? "pointer-events-none" : "sr-only"}`}>{status}{status ? <button type="button" onClick={() => { if (loadTimer.current) clearTimeout(loadTimer.current); setStatus(""); focusGame(); }} aria-label="Dismiss status message" className="pointer-events-auto ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-1 text-white hover:bg-white/20">×</button> : null}</p>
        {/* No floating exit pill over the canvas: a bottom-center overlay
            turned normal gameplay clicks (attack/dialog/touch-pad) into
            accidental fullscreen exits, and its auto-focus turned Space/Enter
            into exit clicks. Exit via the toolbar button above, Esc, or F. */}
        {showTouchPad && <div role="group" aria-label="Touch controls" className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between"><div className="pointer-events-auto grid grid-cols-3 gap-1">{padButton("↑", "ArrowUp", "col-start-2")}{padButton("←", "ArrowLeft")}{padButton("↓", "ArrowDown")}{padButton("→", "ArrowRight")}</div><div className="pointer-events-auto flex items-start gap-2">{padButton("A", " ")}{padButton("↻", "r")}<button type="button" onClick={() => setShowTouchPad(false)} aria-label="Hide touch controls" title="Hide touch controls" className="grid h-12 w-12 touch-none place-items-center rounded-full border border-white/20 bg-black/70 text-sm text-white hover:bg-white/20">×</button></div></div>}
        <iframe ref={frame} title={title} src={src} onLoad={handleLoad} onError={() => setStatus("The game could not be loaded. Try the Pop out link to open the standalone runtime.")} className="h-full w-full touch-manipulation border-0 bg-black" allow="autoplay; fullscreen; gamepad" sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts" />
      </div>
      {/* Save management lives BELOW the game box, never inside it: the
          bordered shell above is the game viewport only. Slot 0 still
          auto-loads on runtime "ready" (see the message handler); the panel
          below is manual Save/Load per slot. */}
      <section aria-label={`${slug} cloud saves`} className="mt-4 rounded-2xl border border-white/15 bg-black p-4 sm:p-5">
        <h2 className="text-sm font-black text-white">Cloud saves</h2>
        <p className="mt-1 text-xs text-slate-400">
          Progress auto-starts from slot 0 (cheat-free) when you&apos;re signed in; slots 1–3 are optional alternates.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={autosaveEnabled}
            onChange={(event) => toggleAutosave(event.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Autosave (every minute + on game request)
        </label>
        <div className="mt-3">
          <UniversalSavePanel
            slug={slug}
            getSnapshot={getUniversalSnapshot}
            applySnapshot={applyUniversalSnapshot}
          />
        </div>
      </section>
      <div className="mt-3 grid w-full grid-cols-1 gap-3">
        <FaceController onGameInput={handleGameInput} />
      </div>
    </div>
  );
}
