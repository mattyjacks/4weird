"use client";

import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";
import { useRandomizeTheme } from "@/components/site/themes/use-randomize-theme";

/**
 * Randomize button: rolls a random palette + light/dark combo (10 combos)
 * and applies both halves at once. Never lands on the combo you already
 * have - every click visibly changes something.
 */
export function RandomizeThemeButton({ label = "Randomize" }: { label?: string }) {
  const mounted = useMountedTheme();
  const { randomize } = useRandomizeTheme();

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={randomize}
      aria-label="Randomize color theme and light/dark mode"
      title="Roll a random theme + mode combo"
      className="gap-2"
    >
      <Dices size={16} className="text-muted-foreground" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}
