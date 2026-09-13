// Green Guy per-load randomized camo generator (dependency-free).
// Builds one giant viewport-sized inline SVG of organic amoeba blobs —
// no tiling, no repeat, no seams by construction. Seed fresh per page load.

export type CamoMode = "light" | "dark";

interface BlobSpec {
  fill: string;
  opacity: number;
}

/** Seeded PRNG so light/dark variants share shapes but reshuffle per load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  } catch {
    return (Date.now() * 2654435761) >>> 0;
  }
}

const LIGHT_PALETTE: BlobSpec[] = [
  { fill: "#a8a06a", opacity: 0.55 }, // sage
  { fill: "#5c6b2f", opacity: 0.6 }, // olive
  { fill: "#4a5228", opacity: 0.65 }, // olive-deep
  { fill: "#8a6b46", opacity: 0.5 }, // bark
  { fill: "#7c8448", opacity: 0.45 }, // edge
];

const DARK_PALETTE: BlobSpec[] = [
  { fill: "#10130a", opacity: 0.8 }, // olive-black
  { fill: "#262e14", opacity: 0.75 }, // moss
  { fill: "#4e5a26", opacity: 0.6 }, // drab
  { fill: "#5d4c30", opacity: 0.55 }, // bark-night
  { fill: "#6d7f36", opacity: 0.5 }, // highlight
  { fill: "#3a4420", opacity: 0.45 }, // fleck
];

function catmullRomToBezier(
  pts: ReadonlyArray<readonly [number, number]>,
): string {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

/** Wobbly closed amoeba blob centered at (cx,cy) with radius r. */
function amoebaPath(
  cx: number,
  cy: number,
  r: number,
  rng: () => number,
): string {
  const n = 8 + Math.floor(rng() * 5);
  const pts: Array<[number, number]> = [];
  const wobbleSeed = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Multi-frequency wobble so blobs never read as ellipses/stars.
    const w =
      0.72 +
      0.28 * Math.sin(a * 2 + wobbleSeed) * rng() +
      0.3 * Math.sin(a * 3 + wobbleSeed * 1.7) +
      0.22 * (rng() - 0.5);
    const rr = Math.max(8, r * (0.62 + rng() * 0.75) * (0.75 + Math.abs(w) * 0.5));
    const squashX = 0.8 + rng() * 0.45;
    const squashY = 0.8 + rng() * 0.45;
    pts.push([cx + Math.cos(a) * rr * squashX, cy + Math.sin(a) * rr * squashY]);
  }
  return catmullRomToBezier(pts);
}

function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)];
}

export interface CamoSvgOptions {
  width: number;
  height: number;
  seed: number;
  mode: CamoMode;
}

/**
 * Build a full-viewport camo SVG string. Layers go large->small so small dark
 * blobs sit on top of big soft washes, ~55-70% non-base coverage.
 * Blobs overscan past edges (negative coords allowed) so nothing clips.
 */
export function buildCamoSVG({ width, height, seed, mode }: CamoSvgOptions): string {
  const w = Math.max(320, Math.min(Math.round(width) || 1920, 2560));
  const h = Math.max(320, Math.min(Math.round(height) || 1080, 1440));
  const rng = mulberry32(seed);
  const palette = mode === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  const base = mode === "light" ? "#e9e2c6" : "#090c04";
  const minDim = Math.min(w, h);

  // Layer plan scales with viewport: [count, rMin, rMax] fractions of minDim.
  const layers: Array<{ count: [number, number]; r: [number, number] }> = [
    { count: [7, 10], r: [0.16, 0.3] }, // big soft washes
    { count: [10, 15], r: [0.09, 0.2] }, // mid blobs
    { count: [10, 16], r: [0.05, 0.12] }, // small darks on top
    { count: [22, 34], r: [0.008, 0.03] }, // micro-fleck
  ];

  const paths: string[] = [];
  for (const layer of layers) {
    const count = layer.count[0] + Math.floor(rng() * (layer.count[1] - layer.count[0]));
    for (let i = 0; i < count; i++) {
      const r = minDim * (layer.r[0] + rng() * (layer.r[1] - layer.r[0]));
      // Overscan by r so blobs bleed off every edge — no seam, no clip line.
      const cx = -r + rng() * (w + r * 2);
      const cy = -r + rng() * (h + r * 2);
      const spec = pick(rng, palette);
      const rot = Math.floor(rng() * 360);
      const op = Math.max(
        0.15,
        Math.min(0.9, spec.opacity + (rng() - 0.5) * 0.16),
      );
      const d = amoebaPath(cx, cy, r, rng);
      paths.push(
        `<path d="${d}" fill="${spec.fill}" fill-opacity="${op.toFixed(2)}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`,
      );
    }
  }

  // Two huge ultra-soft wash ellipses for tonal drift (never a hard edge).
  const washA = mode === "light" ? "#a3a35c" : "#4d7c0f";
  const washB = mode === "light" ? "#65a30d" : "#a3a35c";
  const washes = [
    `<ellipse cx="${(w * (0.08 + rng() * 0.2)).toFixed(1)}" cy="${(h * rng() * 0.3).toFixed(1)}" rx="${(w * (0.3 + rng() * 0.2)).toFixed(1)}" ry="${(h * (0.25 + rng() * 0.2)).toFixed(1)}" fill="${washA}" opacity="${mode === "light" ? 0.22 : 0.28}"/>`,
    `<ellipse cx="${(w * (0.65 + rng() * 0.25)).toFixed(1)}" cy="${(h * (0.5 + rng() * 0.4)).toFixed(1)}" rx="${(w * (0.28 + rng() * 0.2)).toFixed(1)}" ry="${(h * (0.3 + rng() * 0.2)).toFixed(1)}" fill="${washB}" opacity="${mode === "light" ? 0.14 : 0.2}"/>`,
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true"><rect width="${w}" height="${h}" fill="${base}"/>${washes.join("")}${paths.join("")}</svg>`;
}
