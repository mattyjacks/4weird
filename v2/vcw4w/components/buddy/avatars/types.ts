/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared types for the Buddy 3D avatars. `T3` is the three.js namespace
 * (loaded lazily from CDN; see buddy-avatar.tsx), kept as `any` behind one
 * alias so no three.js dependency or @types/three is ever required to build.
 */

export type T3 = any;

export type AvatarKind = "cube" | "cloud" | "anime";

/** Refs every avatar rig exposes through group.userData for animation. */
export type RigUserData = {
  eyeL: T3;
  eyeR: T3;
  mouth: T3;
  kind: AvatarKind;
  browL?: T3;
  browR?: T3;
  wingL?: T3;
  wingR?: T3;
  armL?: T3;
  armR?: T3;
  /** Spinning accent star, if the rig has one. */
  star?: T3;
  starBaseY?: number;
};
