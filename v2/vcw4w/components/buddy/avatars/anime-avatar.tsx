/**
 * Anime girl — a chibi companion: layered glossy hair with fringe, side
 * locks and a springy ahoge, sailor collar with star hairpin, waving arms,
 * big sparkly eyes and thin brows. userData carries { eyeL, eyeR, mouth,
 * browL, browR, armL, armR, star, starBaseY, kind: "anime" }.
 */

import { makeBlush, makeBrow, makeEye, makeMouth, makeStar, markPaint, placeBrow, std } from "./parts";
import type { T3 } from "./types";

export const ANIME_LABEL = "Anime girl";

export function buildAnimeAvatar(T: T3, color: string): T3 {
  const g = new T.Group();
  const skin = std(T, "#ffd9c4", 0.6);
  const dressM = std(T, color, 0.6);
  const hairM = std(T, "#5b4a8a", 0.42);
  const sockM = std(T, "#ffffff", 0.7);
  const shoeM = std(T, "#3a2d5c", 0.5);

  // Shoes + socks peeking under the dress.
  for (const sx of [-1, 1]) {
    const sock = new T.Mesh(new T.CylinderGeometry(0.09, 0.1, 0.3, 12), sockM);
    sock.position.set(sx * 0.18, -1.28, 0.02);
    const shoe = new T.Mesh(new T.SphereGeometry(0.15, 16, 12), shoeM);
    shoe.scale.set(1, 0.65, 1.4);
    shoe.position.set(sx * 0.18, -1.46, 0.08);
    shoe.castShadow = true;
    g.add(sock, shoe);
  }

  // Dress cone with a lighter petticoat rim.
  const dress = new T.Mesh(new T.CylinderGeometry(0.32, 0.62, 0.9, 24), dressM);
  dress.position.y = -0.78;
  dress.castShadow = true;
  markPaint(dress);
  const rim = new T.Mesh(new T.TorusGeometry(0.6, 0.055, 10, 28), std(T, "#ffffff", 0.6));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.2;
  g.add(dress, rim);

  // Sailor collar + neckerchief.
  const collar = new T.Mesh(new T.CylinderGeometry(0.3, 0.42, 0.22, 24), std(T, "#ffffff", 0.6));
  collar.position.y = -0.28;
  const knot = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 0.08), std(T, "#ff5c7a", 0.5));
  knot.position.set(0, -0.38, 0.34);
  g.add(collar, knot);

  // Waving arms (loop waves them; bases stored for mirroring).
  const mkArm = (sx: number): T3 => {
    const arm = new T.Group();
    const upper = new T.Mesh(new T.CylinderGeometry(0.085, 0.075, 0.5, 12), dressM);
    upper.position.y = -0.22;
    upper.castShadow = true;
    markPaint(upper);
    const hand = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), skin);
    hand.position.y = -0.5;
    hand.castShadow = true;
    arm.add(upper, hand);
    arm.position.set(sx * 0.42, -0.42, 0);
    arm.rotation.z = sx * -0.35;
    arm.userData.base = sx * -0.35;
    return arm;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  g.add(armL, armR);

  // Head.
  const head = new T.Mesh(new T.SphereGeometry(0.55, 30, 24), skin);
  head.position.y = 0.12;
  head.castShadow = true;
  g.add(head);

  // Back hair mass + glossy shine streak.
  const backHair = new T.Mesh(new T.SphereGeometry(0.64, 30, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM);
  backHair.position.set(0, 0.24, -0.1);
  backHair.castShadow = true;
  const shine = new T.Mesh(
    new T.SphereGeometry(0.2, 14, 10),
    new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
  );
  shine.scale.set(0.5, 1.4, 0.4);
  shine.position.set(-0.38, 0.52, 0.28);
  g.add(backHair, shine);

  // Fringe: five tapered tufts across the forehead.
  const fringeGeo = new T.ConeGeometry(0.13, 0.34, 10);
  [-0.4, -0.2, 0, 0.2, 0.4].forEach((x, i) => {
    const tuft = new T.Mesh(fringeGeo, hairM);
    tuft.position.set(x, 0.52 - Math.abs(x) * 0.18, 0.42);
    tuft.rotation.x = Math.PI;
    tuft.rotation.z = x * (i % 2 === 0 ? 0.35 : -0.2);
    tuft.castShadow = true;
    g.add(tuft);
  });

  // Side locks + springy ahoge.
  const lockGeo = new T.CylinderGeometry(0.1, 0.06, 0.85, 12);
  const lockL = new T.Mesh(lockGeo, hairM);
  lockL.position.set(-0.58, -0.28, 0.08);
  lockL.rotation.z = 0.1;
  const lockR = new T.Mesh(lockGeo, hairM);
  lockR.position.set(0.58, -0.28, 0.08);
  lockR.rotation.z = -0.1;
  lockL.castShadow = lockR.castShadow = true;
  const ahoge = new T.Mesh(new T.TorusGeometry(0.13, 0.028, 8, 14, Math.PI * 1.25), hairM);
  ahoge.position.set(0.05, 0.82, 0);
  ahoge.rotation.z = -0.5;
  g.add(lockL, lockR, ahoge);

  // Star hairpin.
  const pin = makeStar(T, 0.1);
  pin.position.set(-0.44, 0.6, 0.3);
  g.add(pin);

  // Big sparkly eyes, thin high brows, small mouth, blush.
  const eyeL = makeEye(T, 0.165);
  const eyeR = makeEye(T, 0.165);
  eyeL.position.set(-0.22, 0.16, 0.48);
  eyeR.position.set(0.22, 0.16, 0.48);
  const browL = placeBrow(makeBrow(T, 0.24), -0.22, 0.44, 0.48, 0.08);
  const browR = placeBrow(makeBrow(T, 0.24), 0.22, 0.44, 0.48, -0.08);
  const mouth = makeMouth(T, 0.11);
  mouth.scale.set(0.85, 0.2, 0.5);
  mouth.position.set(0, -0.18, 0.5);
  g.add(eyeL, eyeR, browL, browR, mouth, makeBlush(T, -0.4, -0.02, 0.44), makeBlush(T, 0.4, -0.02, 0.44));

  g.userData = { eyeL, eyeR, mouth, browL, browR, armL, armR, star: pin, starBaseY: 0.6, kind: "anime" };
  return g;
}
