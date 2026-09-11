"use client";

import { useTheme } from "next-themes";
import { useSiteTheme } from "@/components/site/site-theme-provider";
import { randomCombo } from "@/lib/site-theme";

/** Roll a random theme + mode combo and apply both halves at once. */
export function useRandomizeTheme(): { randomize: () => void } {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useSiteTheme();
  const randomize = () => {
    const combo = randomCombo(colorTheme, theme ?? resolvedTheme ?? "dark");
    setColorTheme(combo.theme);
    setTheme(combo.mode);
  };
  return { randomize };
}
