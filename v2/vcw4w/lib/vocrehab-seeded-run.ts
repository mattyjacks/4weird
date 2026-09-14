export interface VocrehabSeededRun {
  seed: string;
  gameId: string;
  n: number;
  items: unknown[];
  criteria: string[];
  mode: "random" | "seeded";
  replayDescriptor: {
    gameId: string;
    seed: string;
    n: number;
    itemIds: string[];
    criteria: string[];
  };
}

export interface VocrehabDrawResult {
  items: unknown[];
  criteria: string[];
}

export interface VocrehabBuildRunOpts {
  seed?: string;
  n?: number;
  draw: (gameId: string, seed: string, n: number) => VocrehabDrawResult;
}

function vocrehabFallbackSeed(): string {
  // NOTE: intentionally inline (VR- + Math.random) instead of importing the
  // vocrehab seed core, to avoid a missing-dep break when bank files land later.
  return "VR-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function vocrehabItemIdsOf(items: unknown[]): string[] {
  return (items ?? []).map((item, idx) => {
    const id = (item as { id?: unknown } | null | undefined)?.id;
    return String(id ?? idx);
  });
}

export function vocrehabReplayDescriptorOf(run: VocrehabSeededRun): {
  gameId: string;
  seed: string;
  n: number;
  itemIds: string[];
  criteria: string[];
} {
  return {
    gameId: run.gameId,
    seed: run.seed,
    n: run.n,
    itemIds: vocrehabItemIdsOf(run.items),
    criteria: [...run.criteria],
  };
}

export function vocrehabBuildRun(
  gameId: string,
  opts: VocrehabBuildRunOpts
): VocrehabSeededRun {
  const seeded = typeof opts.seed === "string" && opts.seed.length > 0;
  const seed = seeded ? (opts.seed as string) : vocrehabFallbackSeed();
  const n = Math.max(0, Math.floor(opts.n ?? 10));
  const drawn = opts.draw(gameId, seed, n);
  const items = Array.isArray(drawn.items) ? drawn.items : [];
  const criteria = Array.isArray(drawn.criteria) ? drawn.criteria : [];
  const run: VocrehabSeededRun = {
    seed,
    gameId,
    n,
    items,
    criteria,
    mode: seeded ? "seeded" : "random",
    replayDescriptor: {
      gameId,
      seed,
      n,
      itemIds: vocrehabItemIdsOf(items),
      criteria: [...criteria],
    },
  };
  return run;
}
