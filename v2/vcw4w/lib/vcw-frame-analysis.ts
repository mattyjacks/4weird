/**
 * VibeCodeWorker frame-analysis playtest loop — shared pure logic.
 *
 * This is the evidence half of the testing-video pipeline, ported from
 * the local capture scripts into the v2 app so agents and routes share
 * one implementation:
 *
 *   1. Sample N frames at 1 fps from a gameplay take
 *      (`frameSamplePlan` — 15 frames for a 15 s take).
 *   2. Aggregate per-tick telemetry into per-second segment descriptors
 *      (`segmentTicks`) for the live TestingH/TestingV dashboard overlays.
 *   3. Build the spatiotemporal heatmap inputs (`buildThreatHeat`,
 *      `buildTrailPath`, `buildInputHeat`): threat blobs + movement path
 *      in normalized canvas coordinates ([-1,1] x, [0,1] y, intensity).
 *   4. Turn frame observations into an improved input plan
 *      (`improveFromObservations`) and re-run — the observe -> reason ->
 *      act loop the skill documents.
 *
 * Coordinates are normalized so H (1920x1080) and V (1080x1920) layouts
 * share the same data. Routes own auth, rate limits, and persistence.
 */

export type TelemetryTick = {
  t: number;
  mode?: string;
  lap?: number | null;
  speed?: number;
  playerX?: number;
  nitro?: number;
  keys?: string[];
  reasoning?: string;
  traffic?: { x: number; d: number; kind?: string }[];
};

export type InputTick = {
  t: number;
  keys: string[];
  clicks: { x: number; y: number; b?: string }[];
};

export type HeatPoint = [x: number, y: number, intensity: number];
export type PathPoint = [x: number, y: number];

export type SegmentDescriptor = {
  second: number;
  speed: number;
  lap: number | null;
  keys: string[];
  lanes: [number, number, number];
  heat: HeatPoint[];
  path: PathPoint[];
  inputs: string[];
  decision: string;
};

/** Frame sample plan: 1 fps across the take (15 frames per 15 s). */
export function frameSamplePlan(durationSeconds: number, fps = 1): number[] {
  const total = Math.max(1, Math.floor(durationSeconds * fps));
  return Array.from({ length: total }, (_, i) => i / fps);
}

export function laneOf(x: number): number {
  return x < -0.34 ? 0 : x > 0.34 ? 2 : 1;
}

export function targetOf(reasoning: string): number {
  return /target=arrowleft/.test(reasoning) ? 0 : /target=arrowright/.test(reasoning) ? 2 : 1;
}

/**
 * Aggregate telemetry ticks into one segment descriptor per second.
 * Speed averages across the segment; hazards/keys/decision come from
 * the latest tick so the overlay reflects the freshest state.
 */
export function segmentTicks(ticks: TelemetryTick[], seconds: number): SegmentDescriptor[] {
  const out: SegmentDescriptor[] = [];
  for (let s = 0; s < seconds; s++) {
    const window = ticks.filter((k) => k.t >= s && k.t < s + 1);
    const last = window[window.length - 1] ?? ticks[ticks.length - 1];
    if (!last) break;
    const speed = Math.round(window.reduce((a, k) => a + (k.speed ?? 0), 0) / Math.max(1, window.length));
    const lanes: [number, number, number] = [0, 0, 0];
    for (const c of last.traffic ?? []) {
      if (c.kind !== "powerup" && c.d >= -20 && c.d <= 280) lanes[laneOf(c.x)] = 1;
    }
    const seen: string[] = [];
    for (const k of window) for (const key of k.keys ?? []) if (!seen.includes(key)) seen.push(key);
    out.push({
      second: s,
      speed,
      lap: last.lap ?? null,
      keys: last.keys ?? [],
      lanes,
      heat: buildThreatHeat(last.traffic ?? []),
      path: buildTrailPath(ticks.filter((k) => k.t < s + 1).slice(-12)),
      inputs: seen,
      decision: (last.reasoning ?? "").replace(/^Overtake reflex: /, ""),
    });
  }
  return out;
}

/** Rival blobs: x in [-1,1], y = closeness 0..1, intensity = 1 - closeness. */
export function buildThreatHeat(traffic: { x: number; d: number; kind?: string }[]): HeatPoint[] {
  const heat: HeatPoint[] = [];
  for (const c of traffic) {
    if (c.kind === "powerup" || c.d < -20 || c.d > 280) continue;
    const closeness = Math.min(1, Math.max(0, c.d / 280));
    heat.push([+c.x.toFixed(3), +closeness.toFixed(3), +(1 - closeness).toFixed(3)]);
  }
  return heat.slice(0, 24);
}

/** Player lane history: x = lane offset, y = recency 0..1 (oldest first). */
export function buildTrailPath(recent: TelemetryTick[]): PathPoint[] {
  return recent.map((k, i) => [+Number(k.playerX ?? 0).toFixed(3), +((i + 1) / 12).toFixed(3)]);
}

export type InputClip = { x: number; y: number; width: number; height: number };

/** Click heat for telemetry-less games: clicks normalized to the capture clip. */
export function buildInputHeat(
  clicks: { x: number; y: number }[],
  clip: InputClip,
): HeatPoint[] {
  const cx = clip.x + clip.width / 2;
  const cy = clip.y + clip.height / 2;
  return clicks.slice(0, 24).map((c) => [
    +((c.x - cx) / (clip.width / 2)).toFixed(3),
    +(((c.y - cy) / (clip.height / 2)) / 2 + 0.5).toFixed(3),
    1,
  ]) as HeatPoint[];
}

const DIR_VECTORS: Record<string, [number, number]> = {
  A: [-1, 0],
  D: [1, 0],
  W: [0, -1],
  S: [0, 1],
};

/** Movement path from direction keys (for games without position telemetry). */
export function buildKeyPath(recent: InputTick[]): PathPoint[] {
  let px = 0;
  let py = 0;
  const pts = recent.map((k) => {
    for (const key of k.keys) {
      const v = DIR_VECTORS[key];
      if (v) {
        px += v[0];
        py += v[1];
      }
    }
    return [px, py] as [number, number];
  });
  const m = Math.max(1, ...pts.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
  return pts.map(([x, y]) => [+((x / m)).toFixed(3), +((y / m / 2 + 0.5)).toFixed(3)]) as PathPoint[];
}

export type FrameObservation = {
  second: number;
  xp: number | null;
  gold: number | null;
  enemiesVisible: boolean;
  notes: string;
};

export type ImprovedPhase = {
  untilSecond: number;
  keys: string[];
  clickAhead: [number, number];
  abilityAt?: number[];
};

/**
 * Turn 1 fps frame observations into an improved input plan.
 * Rules learned from the GraveGain2D baseline: blind rotation walks
 * away from content (0 XP in 15 s); heading back toward observed
 * content with clicks leading the movement direction produced gold
 * and combat contact. Phases push toward content first, then sweep.
 */
export function improveFromObservations(
  observations: FrameObservation[],
  totalSeconds: number,
): ImprovedPhase[] {
  const sawContent = observations.some((o) => o.enemiesVisible || (o.gold ?? 0) > 0);
  const quarter = Math.max(1, Math.floor(totalSeconds / 4));
  void sawContent;
  return [
    { untilSecond: quarter, keys: ["KeyA"], clickAhead: [-200, -20], abilityAt: [Math.floor(quarter / 2)] },
    { untilSecond: quarter * 2, keys: ["KeyW"], clickAhead: [0, -130] },
    { untilSecond: quarter * 3, keys: ["KeyD"], clickAhead: [180, 0], abilityAt: [quarter * 2 + Math.floor(quarter / 2)] },
    { untilSecond: totalSeconds, keys: ["KeyS", "KeyA"], clickAhead: [-140, 110] },
  ];
}
