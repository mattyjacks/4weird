"use client";

import { ModMount } from "./mod-mount";
import { describeMod, type GameModManifest } from "@/lib/game-mods";

interface ModCatalogListProps {
  /** Pre-filtered mods for the hosting game (see modsForGame in content/mods-catalog.ts). */
  mods: readonly GameModManifest[];
  /** Game slug of the hosting page. */
  gameSlug: string;
}

/**
 * Renders every compatible mod for a game page. Server-safe list wrapper
 * around <ModMount /> — empty catalogs render a quiet note, never an error.
 */
export function ModCatalogList({ mods, gameSlug }: ModCatalogListProps) {
  if ((mods ?? []).length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        No community mods for “{gameSlug}” yet — check back after the next catalog drop.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(Array.isArray(mods) ? mods : []).map((manifest, index) => (
        <section key={manifest?.slug ?? index} aria-label={describeMod(manifest)}>
          <ModMount manifest={manifest} gameSlug={gameSlug} />
        </section>
      ))}
    </div>
  );
}
