"use client";

import { useEffect, useState } from "react";

/** Loads an assigned or personal saved state for standalone VocRehab games. */
export function useVocrehabTemplateState(gameId: string, provided?: Record<string, unknown>) {
  const [state, setState] = useState<Record<string, unknown> | undefined>(provided);
  const [error, setError] = useState(false);
  const hasSavedStateId = !provided && typeof window !== "undefined" && Boolean(new URLSearchParams(window.location.search).get("savedStateId"));

  useEffect(() => {
    if (provided) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("savedStateId");
    if (!id) return;
    let live = true;
    const query = new URLSearchParams({ id });
    const kidId = params.get("kid_id");
    if (kidId) query.set("kid_id", kidId);
    fetch(`/api/vocrehab/saved-states?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Saved state unavailable");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") throw new Error("Invalid saved state");
        const saved = (payload as { saved_state?: unknown }).saved_state;
        if (!saved || typeof saved !== "object") throw new Error("Invalid saved state");
        const row = saved as { game_id?: unknown; state?: unknown };
        if (row.game_id !== gameId || !row.state || typeof row.state !== "object" || Array.isArray(row.state)) {
          throw new Error("Saved state does not match this game");
        }
        if (live) setState(row.state as Record<string, unknown>);
      })
      .catch(() => { if (live) setError(true); })
      ;
    return () => { live = false; };
  }, [gameId, provided]);

  return { state: provided ?? state, loading: hasSavedStateId && !state && !error, error };
}

export function templateString(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}
