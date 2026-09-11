"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";

const ICON_SIZE = 16;

/** Light/dark mode switcher (owns the `light`/`dark` class via next-themes). */
export function ThemeSwitcher() {
  const mounted = useMountedTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (!mounted) {
    return null;
  }

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
}

/** Segmented light/dark picker for the settings page. */
export function ModePicker() {
  const mounted = useMountedTheme();
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
