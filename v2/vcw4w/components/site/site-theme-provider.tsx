"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  SITE_COLOR_STORAGE_KEY,
  isColorThemeId,
  type ColorThemeId,
} from "@/lib/site-theme";

interface SiteThemeValue {
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
}

const SiteThemeContext = createContext<SiteThemeValue | null>(null);

function readStoredColorTheme(): ColorThemeId {
  try {
    const raw = window.localStorage.getItem(SITE_COLOR_STORAGE_KEY);
    if (isColorThemeId(raw)) return raw;
  } catch {
    // Private mode / blocked storage: fall through to default.
  }
  return DEFAULT_COLOR_THEME;
}

/** Stamp the color-theme class on <html> (mode class from next-themes is untouched). */
export function applyColorThemeClass(id: ColorThemeId): void {
  const root = document.documentElement;
  for (const theme of COLOR_THEMES) {
    if (theme.id !== id) root.classList.remove(theme.id);
  }
  root.classList.add(id);
  root.dataset.siteColor = id;
}

/**
 * Owns the 4weird color theme (Blue Boy / Girly Girl / Trans Them / Green
 * Guy), persisted to localStorage so the last choice survives reloads.
 * Light/dark mode stays with next-themes; the two compose into 8 combos.
 */
export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    const initial = readStoredColorTheme();
    setColorThemeState(initial);
    applyColorThemeClass(initial);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SITE_COLOR_STORAGE_KEY && isColorThemeId(event.newValue)) {
        setColorThemeState(event.newValue);
        applyColorThemeClass(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
    applyColorThemeClass(id);
    try {
      window.localStorage.setItem(SITE_COLOR_STORAGE_KEY, id);
    } catch {
      // Storage blocked: theme still applies for this session.
    }
  }, []);

  return (
    <SiteThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme(): SiteThemeValue {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error("useSiteTheme must be used within <SiteThemeProvider>");
  return ctx;
}
