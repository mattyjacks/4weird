/**
 * Oso cube — the default Buddy avatar. A soft round-cornered bot: glowing
 * face plate, expressive brows, springy antenna star, glossy top light,
 * stubby blob feet. userData carries { eyeL, eyeR, mouth, browL, browR,
 * star, starBaseY, kind: "cube" } for the animation loop.
 */

import { makeBlush, makeBrow, makeEye, makeMouth, makeStar, markPaint, placeBrow, std } from "./parts";
import type { T3 } from "./types";

export const CUBE_LABEL = "oso cube";

export function buildCubeAvatar(T: T3, color: string): T3 {
  const g = new T.Group();
  const bodyMat = std(T, color, 0.38);
  const body = new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  markPaint(body);
  g.add(body);

  // Rounded corners: color-matched spheres sunk into each vertex.
  const cornerGeo = new T.SphereGeometry(0.24, 16, 12);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const c = new T.Mesh(cornerGeo, bodyMat);
        c.position.set(sx * 0.62, sy * 0.62, sz * 0.62);
        c.castShadow = true;
        markPaint(c);
        g.add(c);
      }
    }
  }

  // Glowing face plate the features sit on.
  const plateColor = new T.Color(color).lerp(new T.Color(0xffffff), 0.28);
  const plate = new T.Mesh(
    new T.BoxGeometry(1.08, 0.92, 0.08),
    new T.MeshStandardMaterial({ color: plateColor, roughness: 0.35, emissive: plateColor, emissiveIntensity: 0.12 }),
  );
  plate.position.set(0, 0.02, 0.73);
  g.add(plate);

  const eyeL = makeEye(T, 0.19);
  const eyeR = makeEye(T, 0.19);
  eyeL.position.set(-0.29, 0.2, 0.8);
  eyeR.position.set(0.29, 0.2, 0.8);
  const browL = placeBrow(makeBrow(T, 0.3), -0.3, 0.5, 0.8, 0.12);
  const browR = placeBrow(makeBrow(T, 0.3), 0.3, 0.5, 0.8, -0.12);
  const mouth = makeMouth(T, 0.16);
  mouth.position.set(0, -0.3, 0.8);
  g.add(eyeL, eyeR, browL, browR, mouth, makeBlush(T, -0.52, -0.06, 0.78), makeBlush(T, 0.52, -0.06, 0.78));

  // Glossy top-light streak.
  const gloss = new T.Mesh(
    new T.PlaneGeometry(0.85, 0.4),
    new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 }),
  );
  gloss.rotation.x = -Math.PI / 2;
  gloss.position.set(-0.15, 0.756, 0.1);
  g.add(gloss);

  // Blob feet + springy antenna with a spinning star tip.
  const footGeo = new T.SphereGeometry(0.24, 18, 14);
  for (const sx of [-1, 1]) {
    const foot = new T.Mesh(footGeo, bodyMat);
    foot.scale.set(1, 0.62, 1.35);
    foot.position.set(sx * 0.42, -0.86, 0.12);
    foot.castShadow = true;
    markPaint(foot);
    g.add(foot);
  }
  const ant = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.5, 10), std(T, "#8b7cf6", 0.4));
  ant.position.set(0.34, 1.0, 0);
  ant.castShadow = true;
  const star = makeStar(T, 0.11);
  star.position.set(0.34, 1.32, 0);
  g.add(ant, star);

  g.userData = { eyeL, eyeR, mouth, browL, browR, star, starBaseY: 1.32, kind: "cube" };
  return g;
}
