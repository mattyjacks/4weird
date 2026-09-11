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

/* ---------------------------------------------------------------------------
 * Wardrobe: purchasable cosmetics rendered onto any rig. Anchors are
 * per-avatar-kind (heads sit at different heights); each item is primitives
 * only so the whole wardrobe stays dependency-free. Outfits repaint through
 * the widget (outfit color wins over the free color picker); here outfits
 * only add their chest emblem.
 * ------------------------------------------------------------------------- */

import type { AvatarKind } from "./types";
import type { AvatarLoadout } from "../../../lib/cosmetics";

type Anchors = {
  hatY: number; faceZ: number; eyeY: number; eyeDX: number;
  neckY: number; backZ: number; chestY: number; chestZ: number; s: number;
};

const ANCHORS: Record<AvatarKind, Anchors> = {
  cube: { hatY: 1.04, faceZ: 0.8, eyeY: 0.2, eyeDX: 0.29, neckY: -0.62, backZ: -0.8, chestY: -0.32, chestZ: 0.78, s: 1 },
  cloud: { hatY: 1.14, faceZ: 0.6, eyeY: 0.14, eyeDX: 0.27, neckY: -0.5, backZ: -0.4, chestY: -0.12, chestZ: 0.58, s: 0.95 },
  anime: { hatY: 1.02, faceZ: 0.48, eyeY: 0.16, eyeDX: 0.22, neckY: -0.3, backZ: -0.42, chestY: -0.52, chestZ: 0.36, s: 0.9 },
};

function hatBase(T: T3, a: Anchors): T3 {
  const g = new T.Group();
  g.position.y = a.hatY;
  return g;
}

const HATS: Record<string, (T: T3, a: Anchors) => T3> = {
  "hat-cap": (T, a) => {
    const g = hatBase(T, a);
    const dome = shadowed(new T.Mesh(new T.SphereGeometry(0.42 * a.s, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), std(T, "#ff5c7a", 0.5)));
    const brim = shadowed(new T.Mesh(new T.BoxGeometry(0.5 * a.s, 0.07 * a.s, 0.42 * a.s), std(T, "#ff5c7a", 0.5)));
    brim.position.set(0, -0.02, 0.5 * a.s);
    const button = makeStar(T, 0.07 * a.s);
    button.position.y = 0.42 * a.s;
    g.add(dome, brim, button);
    return g;
  },
  "hat-crown": (T, a) => {
    const g = hatBase(T, a);
    const band = shadowed(new T.Mesh(new T.CylinderGeometry(0.34 * a.s, 0.36 * a.s, 0.22 * a.s, 16), std(T, "#f4c542", 0.35)));
    g.add(band);
    for (let i = 0; i < 5; i += 1) {
      const spike = shadowed(new T.Mesh(new T.ConeGeometry(0.08 * a.s, 0.24 * a.s, 8), std(T, "#f4c542", 0.35)));
      const ang = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(ang) * 0.3 * a.s, 0.22 * a.s, Math.sin(ang) * 0.3 * a.s);
      g.add(spike);
    }
    return g;
  },
  "hat-tophat": (T, a) => {
    const g = hatBase(T, a);
    const top = shadowed(new T.Mesh(new T.CylinderGeometry(0.26 * a.s, 0.26 * a.s, 0.5 * a.s, 18), std(T, "#2d2440", 0.5)));
    top.position.y = 0.25 * a.s;
    const brim = shadowed(new T.Mesh(new T.CylinderGeometry(0.44 * a.s, 0.44 * a.s, 0.06 * a.s, 20), std(T, "#2d2440", 0.5)));
    const band = new T.Mesh(new T.CylinderGeometry(0.27 * a.s, 0.27 * a.s, 0.1 * a.s, 18), std(T, "#ff5c7a", 0.5));
    band.position.y = 0.06 * a.s;
    g.add(top, brim, band);
    return g;
  },
  "hat-halo": (T, a) => {
    const g = hatBase(T, a);
    const halo = new T.Mesh(
      new T.TorusGeometry(0.34 * a.s, 0.05 * a.s, 10, 28),
      new T.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xddaa33, emissiveIntensity: 1.1, roughness: 0.3 }),
    );
    halo.rotation.x = Math.PI / 2 - 0.15;
    halo.position.y = 0.42 * a.s;
    g.add(halo);
    return g;
  },
  "hat-headphones": (T, a) => {
    const g = hatBase(T, a);
    const band = shadowed(new T.Mesh(new T.TorusGeometry(0.5 * a.s, 0.07 * a.s, 10, 22, Math.PI), std(T, "#8b7cf6", 0.4)));
    band.position.y = 0.1 * a.s;
    g.add(band);
    for (const sx of [-1, 1]) {
      const cup = shadowed(new T.Mesh(new T.CylinderGeometry(0.14 * a.s, 0.14 * a.s, 0.12 * a.s, 14), std(T, "#3a2d5c", 0.4)));
      cup.rotation.z = Math.PI / 2;
      cup.position.set(sx * 0.5 * a.s, 0.02, 0);
      g.add(cup);
    }
    return g;
  },
  "hat-wizard": (T, a) => {
    const g = hatBase(T, a);
    const brim = shadowed(new T.Mesh(new T.CylinderGeometry(0.48 * a.s, 0.52 * a.s, 0.07 * a.s, 20), std(T, "#5b4a8a", 0.6)));
    const cone = shadowed(new T.Mesh(new T.ConeGeometry(0.3 * a.s, 0.62 * a.s, 16), std(T, "#5b4a8a", 0.6)));
    cone.position.y = 0.33 * a.s;
    cone.rotation.z = 0.12;
    const tip = makeStar(T, 0.07 * a.s);
    tip.position.set(-0.07 * a.s, 0.66 * a.s, 0);
    g.add(brim, cone, tip);
    return g;
  },
  "hat-beanie": (T, a) => {
    const g = hatBase(T, a);
    const dome = shadowed(new T.Mesh(new T.SphereGeometry(0.44 * a.s, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), std(T, "#38e1c6", 0.7)));
    const rim = shadowed(new T.Mesh(new T.CylinderGeometry(0.45 * a.s, 0.46 * a.s, 0.14 * a.s, 20), std(T, "#ffffff", 0.7)));
    rim.position.y = -0.04;
    const pom = shadowed(new T.Mesh(new T.SphereGeometry(0.11 * a.s, 12, 10), std(T, "#ffffff", 0.8)));
    pom.position.y = 0.48 * a.s;
    g.add(dome, rim, pom);
    return g;
  },
  "hat-viking": (T, a) => {
    const g = hatBase(T, a);
    const dome = shadowed(new T.Mesh(new T.SphereGeometry(0.44 * a.s, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), std(T, "#9aa3b2", 0.35)));
    g.add(dome);
    for (const sx of [-1, 1]) {
      const horn = shadowed(new T.Mesh(new T.ConeGeometry(0.09 * a.s, 0.34 * a.s, 10), std(T, "#f3ead8", 0.5)));
      horn.position.set(sx * 0.44 * a.s, 0.18, 0);
      horn.rotation.z = sx * -1.1;
      g.add(horn);
    }
    return g;
  },
};

const GLASSES: Record<string, (T: T3, a: Anchors) => T3> = {
  "glasses-shades": (T, a) => {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: 0x14101f, roughness: 0.2 });
    for (const sx of [-1, 1]) {
      const lens = shadowed(new T.Mesh(new T.BoxGeometry(0.3 * a.s, 0.2 * a.s, 0.06), mat));
      lens.position.set(sx * a.eyeDX, a.eyeY, a.faceZ + 0.06);
      g.add(lens);
    }
    const bridge = new T.Mesh(new T.BoxGeometry(0.12, 0.05, 0.05), mat);
    bridge.position.set(0, a.eyeY + 0.04, a.faceZ + 0.06);
    g.add(bridge);
    return g;
  },
  "glasses-round": (T, a) => {
    const g = new T.Group();
    const mat = std(T, "#c9973f", 0.3);
    for (const sx of [-1, 1]) {
      const rim = shadowed(new T.Mesh(new T.TorusGeometry(0.15 * a.s, 0.028 * a.s, 8, 22), mat));
      rim.position.set(sx * a.eyeDX, a.eyeY, a.faceZ + 0.06);
      g.add(rim);
    }
    const bridge = new T.Mesh(new T.BoxGeometry(0.14, 0.03, 0.03), mat);
    bridge.position.set(0, a.eyeY + 0.05, a.faceZ + 0.06);
    g.add(bridge);
    return g;
  },
  "glasses-star": (T, a) => {
    const g = new T.Group();
    const mat = std(T, "#ff9db0", 0.4);
    for (const sx of [-1, 1]) {
      const star = shadowed(new T.Mesh(new T.OctahedronGeometry(0.16 * a.s), mat));
      star.scale.z = 0.3;
      star.position.set(sx * a.eyeDX, a.eyeY, a.faceZ + 0.06);
      g.add(star);
    }
    return g;
  },
  "glasses-monocle": (T, a) => {
    const g = new T.Group();
    const rim = shadowed(new T.Mesh(new T.TorusGeometry(0.15 * a.s, 0.028 * a.s, 8, 22), std(T, "#c9973f", 0.3)));
    rim.position.set(a.eyeDX, a.eyeY, a.faceZ + 0.06);
    g.add(rim);
    return g;
  },
};

const ACCESSORIES: Record<string, (T: T3, a: Anchors) => T3> = {
  "acc-scarf": (T, a) => {
    const g = new T.Group();
    const ring = shadowed(new T.Mesh(new T.TorusGeometry(0.42 * a.s, 0.13 * a.s, 12, 24), std(T, "#ff5c7a", 0.7)));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = a.neckY;
    const tail = shadowed(new T.Mesh(new T.BoxGeometry(0.2 * a.s, 0.5 * a.s, 0.06), std(T, "#ff5c7a", 0.7)));
    tail.position.set(0.3 * a.s, a.neckY - 0.3 * a.s, 0.25);
    tail.rotation.z = -0.15;
    g.add(ring, tail);
    return g;
  },
  "acc-bowtie": (T, a) => {
    const g = new T.Group();
    for (const sx of [-1, 1]) {
      const wing = shadowed(new T.Mesh(new T.ConeGeometry(0.11 * a.s, 0.2 * a.s, 4), std(T, "#2d2440", 0.5)));
      wing.rotation.z = sx * (Math.PI / 2);
      wing.position.set(sx * 0.12 * a.s, a.neckY + 0.12 * a.s, a.faceZ - 0.25);
      g.add(wing);
    }
    const knot = shadowed(new T.Mesh(new T.SphereGeometry(0.06 * a.s, 10, 8), std(T, "#ff5c7a", 0.5)));
    knot.position.set(0, a.neckY + 0.12 * a.s, a.faceZ - 0.22);
    g.add(knot);
    return g;
  },
  "acc-backpack": (T, a) => {
    const g = new T.Group();
    const pack = shadowed(new T.Mesh(new T.BoxGeometry(0.5 * a.s, 0.6 * a.s, 0.3 * a.s), std(T, "#38e1c6", 0.6)));
    pack.position.set(0, a.neckY - 0.1, a.backZ);
    const flap = shadowed(new T.Mesh(new T.BoxGeometry(0.52 * a.s, 0.18 * a.s, 0.32 * a.s), std(T, "#2d8a76", 0.6)));
    flap.position.set(0, a.neckY + 0.14, a.backZ);
    const bud = makeStar(T, 0.06 * a.s);
    bud.position.set(0, a.neckY - 0.1, a.backZ - 0.17 * a.s);
    g.add(pack, flap, bud);
    return g;
  },
  "acc-medal": (T, a) => {
    const g = new T.Group();
    const ribbon = new T.Mesh(new T.BoxGeometry(0.12 * a.s, 0.22 * a.s, 0.03), std(T, "#2244cc", 0.6));
    ribbon.position.set(-0.2 * a.s, a.chestY + 0.22 * a.s, a.chestZ);
    const medal = shadowed(new T.Mesh(new T.CylinderGeometry(0.1 * a.s, 0.1 * a.s, 0.04, 16), std(T, "#f4c542", 0.3)));
    medal.rotation.x = Math.PI / 2 - 0.1;
    medal.position.set(-0.2 * a.s, a.chestY + 0.05 * a.s, a.chestZ + 0.02);
    g.add(ribbon, medal);
    return g;
  },
  "acc-flower": (T, a) => {
    const g = new T.Group();
    const stem = new T.Mesh(new T.CylinderGeometry(0.025 * a.s, 0.025 * a.s, 0.3 * a.s, 8), std(T, "#2d8a3c", 0.7));
    stem.position.set(0.52 * a.s, a.hatY - 0.1, 0.1);
    stem.rotation.z = -0.3;
    for (let i = 0; i < 5; i += 1) {
      const petal = shadowed(new T.Mesh(new T.SphereGeometry(0.07 * a.s, 10, 8), std(T, "#ffffff", 0.6)));
      const ang = (i / 5) * Math.PI * 2;
      petal.position.set(0.6 * a.s + Math.cos(ang) * 0.09 * a.s, a.hatY + 0.05 + Math.sin(ang) * 0.09 * a.s, 0.14);
      g.add(petal);
    }
    const heart = new T.Mesh(new T.SphereGeometry(0.05 * a.s, 10, 8), std(T, "#ffd94d", 0.5));
    heart.position.set(0.6 * a.s, a.hatY + 0.05, 0.16);
    g.add(stem, heart);
    return g;
  },
};

const EFFECTS: Record<string, (T: T3, a: Anchors) => T3> = {
  "fx-sparkles": (T) => {
    const g = new T.Group();
    for (let i = 0; i < 3; i += 1) {
      const s = makeStar(T, 0.07);
      const ang = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(ang) * 1.25, 0.1 + (i % 2) * 0.35, Math.sin(ang) * 1.25);
      g.add(s);
    }
    g.userData.spin = true;
    return g;
  },
  "fx-halo-ring": (T) => {
    const g = new T.Group();
    const ring = new T.Mesh(
      new T.TorusGeometry(1.0, 0.05, 10, 40),
      new T.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xddaa33, emissiveIntensity: 1, roughness: 0.3 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.15;
    g.add(ring);
    return g;
  },
  "fx-bubbles": (T) => {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: 0x9be8ff, roughness: 0.1, transparent: true, opacity: 0.55 });
    for (const [x, y] of [[-1.15, 0.5], [1.15, 0.75]] as Array<[number, number]>) {
      const b = new T.Mesh(new T.SphereGeometry(0.14, 14, 10), mat);
      b.position.set(x, y, 0.2);
      g.add(b);
    }
    g.userData.spin = true;
    return g;
  },
};

/**
 * Dress a rig with an equipped loadout. Removes the previous cosmetics group
 * first (idempotent). Outfit bodies repaint via the widget's effective color;
 * here outfits only add their chest emblem.
 */
export function applyCosmetics(
  T: T3,
  rig: T3,
  loadout: AvatarLoadout,
  kind: AvatarKind,
): void {
  try {
    const old = rig.userData?.cosmetics as T3 | undefined;
    if (old) rig.remove(old);
  } catch {
    /* first dress has nothing to remove */
  }
  const a = ANCHORS[kind] ?? ANCHORS.cube;
  const group = new T.Group();
  group.name = "cosmetics";
  let spin: T3 | undefined;
  const add = (node: T3 | undefined): void => {
    if (!node) return;
    group.add(node);
    try {
      if (node.userData?.spin) spin = node;
    } catch {
      /* spin flag is cosmetic */
    }
  };
  try {
    if (loadout.hat && HATS[loadout.hat]) add(HATS[loadout.hat](T, a));
    if (loadout.glasses && GLASSES[loadout.glasses]) add(GLASSES[loadout.glasses](T, a));
    if (loadout.accessory && ACCESSORIES[loadout.accessory]) add(ACCESSORIES[loadout.accessory](T, a));
    if (loadout.effect && EFFECTS[loadout.effect]) add(EFFECTS[loadout.effect](T, a));
    if (loadout.outfit && loadout.outfit.startsWith("outfit-")) {
      const emblem = makeStar(T, 0.09 * a.s);
      emblem.position.set(0.22 * a.s, a.chestY + 0.1, a.chestZ + 0.02);
      group.add(emblem);
    }
    rig.add(group);
    try {
      rig.userData.cosmetics = group;
      rig.userData.effectSpin = spin ?? null;
    } catch {
      /* userData bookkeeping is cosmetic */
    }
  } catch {
    /* a broken cosmetic never sinks the avatar */
  }
}

