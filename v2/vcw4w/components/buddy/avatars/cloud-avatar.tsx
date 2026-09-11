/**
 * Buddy cloud; a soft seven-puff sky buddy with flapping wings, a floating
 * star companion, and sleepy-happy brows. userData carries { eyeL, eyeR,
 * mouth, browL, browR, wingL, wingR, star, starBaseY, kind: "cloud" }.
 */

import { makeBlush, makeBrow, makeEye, makeMouth, makeStar, markPaint, placeBrow } from "./parts";
import type { T3 } from "./types";

export const CLOUD_LABEL = "Buddy cloud";

export function buildCloudAvatar(T: T3, color: string): T3 {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({
    color: new T.Color(color),
    roughness: 0.95,
    metalness: 0,
    emissive: new T.Color(color),
    emissiveIntensity: 0.14,
  });

  // Seven puffs: crowned top, wide middle, squashed sunny bottom.
  const puffs: Array<[number, number, number, number, number]> = [
    [0, 0.08, 0, 0.72, 1],
    [-0.62, -0.02, 0.04, 0.5, 0.92],
    [0.62, -0.02, 0.04, 0.52, 0.92],
    [-0.3, 0.5, -0.04, 0.5, 1],
    [0.3, 0.52, -0.04, 0.48, 1],
    [0, 0.62, -0.1, 0.44, 1],
    [0, -0.34, 0.02, 0.58, 0.8],
  ];
  for (const [x, y, z, r, squash] of puffs) {
    const p = new T.Mesh(new T.SphereGeometry(r, 26, 20), mat);
    p.position.set(x, y, z);
    p.scale.y = squash;
    p.castShadow = true;
    p.receiveShadow = true;
    markPaint(p);
    g.add(p);
  }

  // Flappy wings (loop flaps them; bases stored for mirroring).
  const wingGeo = new T.SphereGeometry(0.3, 18, 14);
  const wingL = new T.Mesh(wingGeo, mat);
  wingL.scale.set(1.15, 0.32, 0.55);
  wingL.position.set(-1.0, 0.02, -0.05);
  wingL.rotation.z = 0.45;
  wingL.castShadow = true;
  const wingR = new T.Mesh(wingGeo, mat);
  wingR.scale.set(1.15, 0.32, 0.55);
  wingR.position.set(1.0, 0.02, -0.05);
  wingR.rotation.z = -0.45;
  wingR.castShadow = true;
  markPaint(wingL);
  markPaint(wingR);
  wingL.userData.base = 0.45;
  wingR.userData.base = -0.45;
  g.add(wingL, wingR);

  const eyeL = makeEye(T, 0.165);
  const eyeR = makeEye(T, 0.165);
  eyeL.position.set(-0.27, 0.14, 0.6);
  eyeR.position.set(0.27, 0.14, 0.6);
  const browL = placeBrow(makeBrow(T, 0.26), -0.28, 0.42, 0.6, 0.1);
  const browR = placeBrow(makeBrow(T, 0.26), 0.28, 0.42, 0.6, -0.1);
  const mouth = makeMouth(T, 0.15);
  mouth.scale.set(1.1, 0.18, 0.6);
  mouth.position.set(0, -0.26, 0.6);
  g.add(eyeL, eyeR, browL, browR, mouth, makeBlush(T, -0.5, -0.08, 0.55), makeBlush(T, 0.5, -0.08, 0.55));

  // Floating star companion.
  const star = makeStar(T, 0.12);
  star.position.set(1.05, 0.62, 0.25);
  g.add(star);

  // Rain-gem belly button: one glossy droplet.
  const drop = new T.Mesh(
    new T.SphereGeometry(0.09, 14, 10),
    new T.MeshStandardMaterial({ color: 0x9be8ff, roughness: 0.1, metalness: 0.1 }),
  );
  drop.scale.set(1, 1.35, 0.7);
  drop.position.set(0, -0.42, 0.5);
  g.add(drop);

  g.userData = { eyeL, eyeR, mouth, browL, browR, wingL, wingR, star, starBaseY: 0.62, kind: "cloud" };
  return g;
}
