"use client";

/**
 * Backwards-compatible shim: the theme controls used to live in this one
 * file. They now live in components/site/themes/ (one small file per
 * control); this module re-exports them so existing imports keep working.
 */
export { ColorThemeSwitcher, SiteThemePicker, SwatchDot } from "@/components/site/themes/color-controls";
export { ModePicker, ThemeSwitcher } from "@/components/site/themes/mode-controls";
export { RandomizeThemeButton } from "@/components/site/themes/randomize-button";
export { useRandomizeTheme } from "@/components/site/themes/use-randomize-theme";
