"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { COLOR_THEMES, colorThemeById, type ColorThemeId } from "@/lib/site-theme";
import { useSiteTheme } from "@/components/site/site-theme-provider";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function SwatchDot({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span
      aria-hidden="true"
      title={label}
      className="h-4 w-4 shrink-0 rounded-full border border-black/20 dark:border-white/30"
      style={{ background: swatch }}
    />
  );
}

/** Light/dark mode switcher (owns the `light`/`dark` class via next-themes). */
const ThemeSwitcher = () => {
  const mounted = useMounted();
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;
  const active = theme ?? resolvedTheme ?? "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Select light or dark mode"
        >
          {active === "light" ? (
            <Sun
              key="light"
              size={ICON_SIZE}
              className={"text-muted-foreground"}
            />
          ) : (
            <Moon
              key="dark"
              size={ICON_SIZE}
              className={"text-muted-foreground"}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup
          value={active}
          onValueChange={(e) => setTheme(e)}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun size={ICON_SIZE} className="text-muted-foreground" />{" "}
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon size={ICON_SIZE} className="text-muted-foreground" />{" "}
            <span>Dark</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Color-palette switcher (Blue Boy / Girly Girl / Trans Them / Green Guy). */
function ColorThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted();
  const { colorTheme, setColorTheme } = useSiteTheme();

  if (!mounted) {
    return null;
  }

  const active = colorThemeById(colorTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" aria-label={`Color theme: ${active.label}. Change color theme`}>
            <SwatchDot swatch={active.swatch} label={active.label} />
          </Button>
        ) : (
          <Button variant="outline" size="sm" aria-label="Select color theme" className="gap-2">
            <Palette size={16} className="text-muted-foreground" aria-hidden="true" />
            <SwatchDot swatch={active.swatch} label={active.label} />
            <span>{active.label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuRadioGroup
          value={colorTheme}
          onValueChange={(value) => setColorTheme(value as ColorThemeId)}
        >
          {COLOR_THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} className="flex items-center gap-2" value={t.id}>
              <SwatchDot swatch={t.swatch} label={t.label} />
              <span className="flex-1">{t.label}</span>
              {t.id === colorTheme && <Check size={14} aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Card-grid palette picker for the settings page. */
function SiteThemePicker() {
  const mounted = useMounted();
  const { colorTheme, setColorTheme } = useSiteTheme();

  if (!mounted) {
    return <p className="text-sm text-slate-400">Loading color themes…</p>;
  }

  return (
    <fieldset>
      <legend className="sr-only">Color theme</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Color theme">
        {COLOR_THEMES.map((t) => {
          const selected = colorTheme === t.id;
          return (
            <label
              key={t.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                selected
                  ? "border-pink-400/70 bg-pink-400/10 dark:border-pink-300/60"
                  : "border-white/10 bg-white/[.04] hover:border-white/30 dark:hover:border-white/30"
              }`}
            >
              <input
                type="radio"
                name="site-color-theme"
                value={t.id}
                checked={selected}
                onChange={() => setColorTheme(t.id as ColorThemeId)}
                className="h-5 w-5 shrink-0 accent-pink-400"
              />
              <span
                aria-hidden="true"
                className="h-10 w-10 shrink-0 rounded-lg border border-black/20 dark:border-white/25"
                style={{ background: t.swatch }}
              />
              <span>
                <span className="block font-bold text-white">{t.label}</span>
                <span className="block text-xs text-slate-400">{t.tagline}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Segmented light/dark picker for the settings page. */
function ModePicker() {
  const mounted = useMounted();
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (!mounted) {
    return <p className="text-sm text-slate-400">Loading light/dark mode…</p>;
  }

  const active = theme ?? resolvedTheme ?? "dark";
  const options = [
    { id: "light", label: "Light", hint: "Bright surfaces, easy daylight reading.", Icon: Sun },
    { id: "dark", label: "Dark", hint: "Midnight arcade glow. The default.", Icon: Moon },
  ] as const;

  return (
    <fieldset>
      <legend className="sr-only">Light or dark mode</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Light or dark mode">
        {options.map(({ id, label, hint, Icon }) => {
          const selected = active === id;
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                selected
                  ? "border-amber-300/70 bg-amber-300/10"
                  : "border-white/10 bg-white/[.04] hover:border-white/30"
              }`}
            >
              <input
                type="radio"
                name="site-color-mode"
                value={id}
                checked={selected}
                onChange={() => setTheme(id)}
                className="h-5 w-5 shrink-0 accent-amber-300"
              />
              <Icon size={20} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span>
                <span className="block font-bold text-white">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export { ColorThemeSwitcher, ModePicker, SiteThemePicker, ThemeSwitcher };
