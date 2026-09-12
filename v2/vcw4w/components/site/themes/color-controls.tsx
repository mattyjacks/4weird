"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Dices, Palette } from "lucide-react";
import { COLOR_THEMES, colorThemeById, type ColorThemeId } from "@/lib/site-theme";
import { useSiteTheme } from "@/components/site/site-theme-provider";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";
import { useRandomizeTheme } from "@/components/site/themes/use-randomize-theme";
import { UsaFlag } from "@/components/site/themes/usa-flag";

export function SwatchDot({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span
      aria-hidden="true"
      title={label}
      className="h-4 w-4 shrink-0 rounded-full border border-black/20 dark:border-white/30"
      style={{ background: swatch }}
    />
  );
}

/** Color-palette switcher (Blue Boy / Girly Girl / Trans Them / Green Guy / USA USA). */
export function ColorThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const mounted = useMountedTheme();
  const { colorTheme, setColorTheme } = useSiteTheme();
  const { randomize } = useRandomizeTheme();

  if (!mounted) {
    return null;
  }

  const active = colorThemeById(colorTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" aria-label={`Color theme: ${active.label}. Change color theme`}>
            {active.id === "theme-usa" ? <UsaFlag /> : <SwatchDot swatch={active.swatch} label={active.label} />}
          </Button>
        ) : (
          <Button variant="outline" size="sm" aria-label="Select color theme" className="gap-2">
            <Palette size={16} className="text-muted-foreground" aria-hidden="true" />
            {active.id === "theme-usa" ? <UsaFlag /> : <SwatchDot swatch={active.swatch} label={active.label} />}
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
              {t.id === "theme-usa" ? <UsaFlag /> : <SwatchDot swatch={t.swatch} label={t.label} />}
              <span className="flex-1">{t.label}</span>
              {t.id === colorTheme && <Check size={14} aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={randomize} className="flex items-center gap-2">
          <Dices size={14} className="text-muted-foreground" aria-hidden="true" />
          <span>Randomize (theme + mode)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Card-grid palette picker for the settings page. */
export function SiteThemePicker() {
  const mounted = useMountedTheme();
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
                className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/20 dark:border-white/25"
                style={t.id === "theme-usa" ? undefined : { background: t.swatch }}
              >
                {t.id === "theme-usa" ? <UsaFlag className="h-full w-full rounded-none border-0" /> : null}
              </span>
              <span>
                <span className="block font-bold text-foreground">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.tagline}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
