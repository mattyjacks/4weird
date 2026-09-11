// Site color themes: 4 named palettes that layer on top of the light/dark
// mode, giving 8 combinations in total. The color theme is a second class on
// <html> (e.g. `theme-girly-girl`) managed by SiteThemeProvider and persisted
// in localStorage, independent of next-themes (which keeps owning light/dark).

export const SITE_COLOR_STORAGE_KEY = "4weird-color-theme";

export type ColorThemeMode = "light" | "dark";

export interface ColorTheme {
  /** Class stamped on <html>. */
  id: string;
  label: string;
  tagline: string;
  /** CSS background for the swatch dot (gradients welcome). */
  swatch: string;
}

export const COLOR_THEMES: readonly ColorTheme[] = [
  {
    id: "theme-blue-boy",
    label: "Blue Boy",
    tagline: "Classic cyan arcade glow with neon shine.",
    swatch: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
  },
  {
    id: "theme-girly-girl",
    label: "Girly Girl",
    tagline: "Bubbly pink, glossy buttons, extra sparkle.",
    swatch: "linear-gradient(135deg, #f9a8d4 0%, #ec4899 100%)",
  },
  {
    id: "theme-trans-them",
    label: "Trans Them",
    tagline: "Trans-pride pastels with a flag-stripe hairline.",
    swatch:
      "linear-gradient(180deg, #5bcefa 0 20%, #f5abb9 20% 40%, #ffffff 40% 60%, #f5abb9 60% 80%, #5bcefa 80% 100%)",
  },
  {
    id: "theme-green-guy",
    label: "Green Guy",
    tagline: "Sharp corners, olive drab, camo shadows.",
    swatch:
      "linear-gradient(135deg, #4d7c0f 0 35%, #a3a35c 35% 55%, #3f6212 55% 80%, #365314 80% 100%)",
  },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const COLOR_THEME_IDS: readonly string[] = COLOR_THEMES.map((t) => t.id);

export const DEFAULT_COLOR_THEME: ColorThemeId = "theme-blue-boy";

export function isColorThemeId(value: unknown): value is ColorThemeId {
  return typeof value === "string" && (COLOR_THEME_IDS as readonly string[]).includes(value);
}

export function colorThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}
