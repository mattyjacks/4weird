"use client";

import Link from "next/link";
import { Check, Dices, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { COLOR_THEMES, type ColorThemeId } from "@/lib/site-theme";
import { useSiteTheme } from "@/components/site/site-theme-provider";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";
import { useRandomizeTheme } from "@/components/site/themes/use-randomize-theme";
import { UsaFlag } from "@/components/site/themes/usa-flag";

/**
 * Big footer theme showcase: all five palettes pickable in place, plus a
 * Light/Dark segmented control and Randomize. Same state as the settings
 * page (SiteThemeProvider + next-themes), so the footer and
 * /accessibility never drift apart.
 */
export function FooterThemeSection() {
  const mounted = useMountedTheme();
  const { colorTheme, setColorTheme } = useSiteTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { randomize } = useRandomizeTheme();

  const activeMode = theme ?? resolvedTheme ?? "dark";

  if (!mounted) {
    return (
      <section
        aria-label="Footer - Theme"
        className="mt-4 rounded-2xl border border-border bg-card/50 p-5 backdrop-blur sm:p-6 dark:border-white/10 dark:bg-white/[0.02]"
      >
        <p className="text-sm text-muted-foreground">Loading theme settings…</p>
      </section>
    );
  }

  const modes = [
    { id: "light", label: "Light", hint: "Bright daylight reading.", Icon: Sun },
    { id: "dark", label: "Dark", hint: "Midnight arcade glow.", Icon: Moon },
  ] as const;

  return (
    <section
      aria-label="Footer - Theme"
      className="mt-4 rounded-2xl border border-border bg-card/50 p-5 backdrop-blur sm:p-6 dark:border-white/10 dark:bg-white/[0.02]"
    >
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-foreground">
            <span aria-hidden="true" className="text-cyan-600 dark:text-cyan-300">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Theme — make it yours
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-muted-foreground">
              10 combos
            </span>
          </p>
          <span aria-hidden="true" className="mt-1.5 block h-0.5 w-8 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            Five color themes × light/dark mode. Pick a palette and a mode right here —
            your last pick is remembered on this device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={randomize}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:bg-accent"
            aria-label="Randomize color theme and light/dark mode"
            title="Roll a random theme + mode combo"
          >
            <Dices className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            🎲 Randomize
          </button>
          <Link
            href="/accessibility"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-accent"
          >
            ♿ All theme settings
          </Link>
        </div>
      </div>

      {/* ---- Pickers ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Color themes */}
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            Color theme
          </p>
          <div
            className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            role="radiogroup"
            aria-label="Color theme"
          >
            {COLOR_THEMES.map((t) => {
              const selected = colorTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setColorTheme(t.id as ColorThemeId)}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selected
                      ? "border-cyan-500/60 bg-cyan-500/[0.08] dark:border-cyan-300/60 dark:bg-cyan-300/10"
                      : "border-border bg-background/60 hover:border-cyan-500/40 dark:border-white/10"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/20 dark:border-white/25"
                    style={t.id === "theme-usa" ? undefined : { background: t.swatch }}
                  >
                    {t.id === "theme-usa" ? (
                      <UsaFlag className="h-full w-full rounded-none border-0" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-full w-full"
                        style={{ background: t.swatch }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-black text-foreground">
                      {t.label}
                      {selected && <Check className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" aria-label="Selected" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {t.tagline}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Light / dark mode */}
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            Light / dark mode
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" role="radiogroup" aria-label="Light or dark mode">
            {modes.map(({ id, label, hint, Icon }) => {
              const selected = activeMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selected
                      ? "border-amber-500/60 bg-amber-500/[0.08] dark:border-amber-300/60 dark:bg-amber-300/10"
                      : "border-border bg-background/60 hover:border-amber-500/40 dark:border-white/10"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
                      selected
                        ? "bg-amber-500/15 text-amber-600 dark:bg-amber-300/15 dark:text-amber-200"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[13px] font-black text-foreground">
                      {label}
                      {selected && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" aria-label="Selected" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            Tip: USA USA in dark mode adds fireworks that follow your cursor. 🎆
          </p>
        </div>
      </div>
    </section>
  );
}
