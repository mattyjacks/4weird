"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const INSTALL_PROMPT_DISMISS_KEY = "fw-install-dismissed-v1";

/** Minimal shape of the Chromium `beforeinstallprompt` event (not in TS DOM lib). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function readDismissed(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    return window.localStorage.getItem(INSTALL_PROMPT_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISS_KEY, "1");
  } catch {
    /* storage may be blocked; banner simply returns next visit */
  }
}

function readInstalled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (typeof window.navigator !== "undefined" && (window.navigator as NavigatorWithStandalone).standalone === true) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function readIsIOS(): boolean {
  try {
    if (typeof window === "undefined" || typeof window.navigator === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    // iPadOS 13+ reports as Macintosh; touch points distinguish it.
    if (/macintosh/i.test(ua) && typeof window.navigator.maxTouchPoints === "number" && window.navigator.maxTouchPoints > 1) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Install banner so customers can install the site as a phone app for demos.
 * - Chromium/Android: captures `beforeinstallprompt` and fires it from an Install button.
 * - iOS Safari (no `beforeinstallprompt` there): manual Add-to-Home-Screen guidance.
 * - Dismissible; dismissal persists in localStorage. Already-installed app: never shows.
 * - SSR-safe: first render is null; every navigator/window touch is in effects/handlers.
 * - Fail-open: PWA unsupported anywhere simply renders nothing.
 */
export function InstallPrompt() {
  // Lazy init keeps this SSR-safe (every read* guards `typeof window`) and
  // avoids synchronous set-state inside the effect below.
  const [isIOS] = useState(() => readIsIOS());
  const [visible, setVisible] = useState(() => {
    if (readDismissed() || readInstalled()) return false;
    // iOS Safari never fires beforeinstallprompt: show manual guidance immediately.
    return readIsIOS();
  });
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isIOS) return undefined;
    const onBeforeInstall = (e: Event) => {
      try {
        e.preventDefault();
      } catch {
        /* preventDefault is best-effort */
      }
      deferredRef.current = e as BeforeInstallPromptEvent;
      if (!readDismissed()) setVisible(true);
    };
      window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      const onInstalled = () => {
        deferredRef.current = null;
        setVisible(false);
      };
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
        window.removeEventListener("appinstalled", onInstalled);
      };
  }, [isIOS]);

  const install = useCallback(async () => {
    const deferred = deferredRef.current;
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice && choice.outcome === "accepted") {
        deferredRef.current = null;
        setVisible(false);
      }
    } catch {
      /* prompt is best-effort; banner stays so the user can retry or dismiss */
    }
  }, []);

  const dismiss = useCallback(() => {
    saveDismissed();
    deferredRef.current = null;
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isIOS ? "Add 4weird to your home screen" : "Install 4weird as an app"}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="mx-auto max-w-4xl">
        {isIOS ? (
          <>
            <p className="text-sm font-bold text-white">📲 Add 4weird to your home screen</p>
            <p className="mt-1 text-xs text-slate-300">
              Install 4weird like a phone app for demos: tap <b>Share</b> (the square with an arrow), then{" "}
              <b>Add to Home Screen</b>, then <b>Add</b>. It opens full-screen from your home screen.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg bg-violet-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-violet-200"
              >
                Got it
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-white">📲 Install 4weird as a phone app</p>
            <p className="mt-1 text-xs text-slate-300">
              Add 4weird to your home screen for one-tap demos — it opens full-screen, just like a native app.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-violet-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-violet-200"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
