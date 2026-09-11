/**
 * Shared face-part factories for the Buddy avatars. Every avatar is assembled
 * from these (expressive eyes, waveform mouth, blush, brows) plus its own
 * body geometry in its per-avatar .tsx file.
 */

import type { T3 } from "./types";

export function std(T: T3, color: string, roughness = 0.55): T3 {
  return new T.MeshStandardMaterial({ color: new T.Color(color), roughness, metalness: 0.05 });
}

/** Tag a mesh as body-colored so the avatar repaints live when customized. */
export function markPaint(mesh: T3): T3 {
  try {
    mesh.userData.paint = true;
  } catch {
    /* cosmetic */
  }
  return mesh;
}

function shadowed(mesh: T3): T3 {
  try {
    mesh.castShadow = true;
  } catch {
    /* cosmetic */
  }
  return mesh;
}

export function makeEye(T: T3, r: number): T3 {
  const g = new T.Group();
  const white = shadowed(
    new T.Mesh(new T.SphereGeometry(r, 24, 18), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })),
  );
  const pupil = new T.Mesh(
    new T.SphereGeometry(r * 0.45, 20, 14),
    new T.MeshStandardMaterial({ color: 0x1b1030, roughness: 0.15 }),
  );
  pupil.position.z = r * 0.72;
  const spark = new T.Mesh(
    new T.SphereGeometry(r * 0.13, 10, 8),
    new T.MeshBasicMaterial({ color: 0xffffff }),
  );
  spark.position.set(r * 0.15, r * 0.18, r * 1.05);
  // Second micro-sparkle for a wetter, more alive eye.
  const glint = new T.Mesh(
    new T.SphereGeometry(r * 0.06, 8, 6),
    new T.MeshBasicMaterial({ color: 0xffffff }),
  );
  glint.position.set(-r * 0.18, -r * 0.22, r * 1.0);
  g.add(white, pupil, spark, glint);
  g.userData = { pupil, white };
  return g;
}

/** Expressive brow; the loop tips it with excitement (base pose in userData). */
export function makeBrow(T: T3, w = 0.3): T3 {
  return shadowed(
    new T.Mesh(new T.BoxGeometry(w, 0.07, 0.06), new T.MeshStandardMaterial({ color: 0x2d2440, roughness: 0.5 })),
  );
}

export function placeBrow(brow: T3, x: number, y: number, z: number, baseRotZ: number): T3 {
  brow.position.set(x, y, z);
  brow.rotation.z = baseRotZ;
  try {
    brow.userData.base = baseRotZ;
    brow.userData.baseY = y;
  } catch {
    /* cosmetic */
  }
  return brow;
}

export function makeMouth(T: T3, size = 0.16): T3 {
  const m = shadowed(
    new T.Mesh(
      new T.SphereGeometry(size, 24, 16),
      new T.MeshStandardMaterial({ color: 0x7c2d3e, roughness: 0.5 }),
    ),
  );
  m.scale.set(1.4, 0.18, 0.6);
  return m;
}

export function makeBlush(T: T3, x: number, y = -0.05, z = 0.62): T3 {
  const b = new T.Mesh(
    new T.SphereGeometry(0.09, 14, 10),
    new T.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.8, transparent: true, opacity: 0.85 }),
  );
  b.position.set(x, y, z);
  b.scale.set(1.4, 0.8, 0.4);
  return b;
}

/** Glowing accent star (antenna tips, cloud companions, hairpins). */
export function makeStar(T: T3, r = 0.1): T3 {
  return shadowed(
    new T.Mesh(
      new T.OctahedronGeometry(r),
      new T.MeshStandardMaterial({ color: 0xffe066, emissive: 0xcc9900, emissiveIntensity: 0.7, roughness: 0.3 }),
    ),
  );
}
