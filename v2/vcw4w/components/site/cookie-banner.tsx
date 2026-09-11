"use client";

import { useCallback, useEffect, useState } from "react";

export const COOKIE_CONSENT_KEY = "fw-cookie-consent-v1";
/** Re-ask once every 7 days (and on policy version bumps). */
export const COOKIE_CONSENT_DAYS = 7;
const COOKIE_CONSENT_VERSION = 1;

export type CookieCategories = {
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

type StoredConsent = {
  v: number;
  status: "all" | "rejected" | "custom";
  categories: CookieCategories;
  at: number;
};

const OFF: CookieCategories = { analytics: false, functional: false, marketing: false };
const ALL: CookieCategories = { analytics: true, functional: true, marketing: true };

function loadConsent(): { decided: boolean; categories: CookieCategories } {
  try {
    if (typeof window === "undefined" || !window.localStorage) return { decided: false, categories: OFF };
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return { decided: false, categories: OFF };
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.v !== COOKIE_CONSENT_VERSION || typeof parsed.at !== "number") return { decided: false, categories: OFF };
    if (Date.now() - parsed.at > COOKIE_CONSENT_DAYS * 86_400_000) return { decided: false, categories: OFF };
    const c = parsed.categories ?? OFF;
    return {
      decided: true,
      categories: { analytics: !!c.analytics, functional: !!c.functional, marketing: !!c.marketing },
    };
  } catch {
    return { decided: false, categories: OFF };
  }
}

/** Consent snapshot for gating (e.g. Google Analytics loads only if true). */
export function readCookieConsent(): { decided: boolean; categories: CookieCategories } {
  return loadConsent();
}

function saveConsent(status: StoredConsent["status"], categories: CookieCategories): void {
  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ v: COOKIE_CONSENT_VERSION, status, categories, at: Date.now() } satisfies StoredConsent),
    );
  } catch {
    /* storage may be blocked — banner simply returns next visit */
  }
  try {
    window.dispatchEvent(new Event("fw-consent-changed"));
  } catch {
    /* event is best-effort */
  }
}

/**
 * Cookie banner on every page until you choose (re-asked every 7 days).
 * Real options, strong recommendation: Accept all is prominent because it
 * funds free play and unlocks every feature — Reject and Customize always
 * work too, and essential cookies stay on regardless (sign-in needs them).
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<CookieCategories>(ALL);

  useEffect(() => {
    const { decided, categories } = loadConsent();
    if (!decided) {
      setDraft(ALL);
      setVisible(true);
    } else {
      setDraft(categories);
    }
    const onChange = () => {
      const next = loadConsent();
      setVisible(!next.decided);
      if (next.decided) {
        setDraft(next.categories);
        setCustomizing(false);
      }
    };
    window.addEventListener("fw-consent-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("fw-consent-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent("all", ALL);
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    saveConsent("rejected", OFF);
    setVisible(false);
  }, []);

  const saveCustom = useCallback(() => {
    saveConsent("custom", draft);
    setVisible(false);
  }, [draft]);

  if (!visible) return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold text-white">🍪 We use cookies — and we strongly recommend accepting all of them</p>
        <p className="mt-1 text-xs text-slate-300">
          Accept-all funds free play, keeps every feature working, and lets us improve the Service for any purpose in
          our <a href="/privacy" className="text-cyan-300 underline">Privacy Policy</a>. Essential cookies stay on no
          matter what (sign-in needs them). We re-ask every 7 days; change your mind anytime by clearing site data.
        </p>
        {!customizing ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={acceptAll} className="rounded-lg bg-violet-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-violet-200">
              Accept all (recommended)
            </button>
            <button type="button" onClick={() => setCustomizing(true)} className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
              Customize
            </button>
            <button type="button" onClick={rejectAll} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
              Reject non-essential
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">Essential cookies are always on. Toggle the rest, then save:</p>
            {(
              [
                ["analytics", "Analytics", "Google Analytics usage measurement (loads only if on)."],
                ["functional", "Functional", "Remembered theme, voices, avatar, and game settings."],
                ["marketing", "Marketing", "Campaign and referral measurement."],
              ] as Array<[keyof CookieCategories, string, string]>
            ).map(([key, label, blurb]) => (
              <label key={key} className="flex items-start gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                  className="mt-0.5"
                />
                <span><b>{label}.</b> {blurb}</span>
              </label>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={saveCustom} className="rounded-lg bg-violet-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-violet-200">
                Save my choices
              </button>
              <button type="button" onClick={acceptAll} className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
                Just accept all instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
