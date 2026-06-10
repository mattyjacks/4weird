// 4weird Games - Spaceship Parts: Weapons
// Contains 10 unique weapon turret and cannon definitions
// No em-dashes or en-dashes used in comments

export const weapons = [
  {
    id: "weapon_laser",
    name: "Single Laser Emitter",
    geometries: [
      { type: "cylinder", size: [0.12, 0.12, 1.2, 6.0], offset: [0.0, 0.0, -0.4], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [0.25, 0.25, 0.4], offset: [0.0, 0.0, 0.2] },
      { type: "cylinder", size: [0.08, 0.08, 0.1, 6.0], offset: [0.0, 0.0, -1.0], rotation: [1.5708, 0.0, 0.0], isWeaponGlow: true }
    ]
  },
  {
    id: "weapon_double_laser",
    name: "Dual laser Cannon",
    geometries: [
      { type: "cylinder", size: [0.08, 0.08, 1.0, 4.0], offset: [-0.15, 0.0, -0.3], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.08, 0.08, 1.0, 4.0], offset: [0.15, 0.0, -0.3], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [0.45, 0.2, 0.4], offset: [0.0, 0.0, 0.2] },
      { type: "cylinder", size: [0.05, 0.05, 0.05, 4.0], offset: [-0.15, 0.0, -0.8], rotation: [1.5708, 0.0, 0.0], isWeaponGlow: true },
      { type: "cylinder", size: [0.05, 0.05, 0.05, 4.0], offset: [0.15, 0.0, -0.8], rotation: [1.5708, 0.0, 0.0], isWeaponGlow: true }
    ]
  },
  {
    id: "weapon_gatling",
    name: "Rotary Gatling Gun",
    geometries: [
      { type: "cylinder", size: [0.2, 0.2, 0.8, 8.0], offset: [0.0, 0.0, 0.2], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.15, 0.15, 1.4, 6.0], offset: [0.0, 0.0, -0.5], rotation: [1.5708, 0.0, 0.0] } // Barrel cluster bundle
    ]
  },
  {
    id: "weapon_plasma",
    name: "Heavy Plasma Tube",
    geometries: [
      { type: "cylinder", size: [0.22, 0.3, 1.5, 8.0], offset: [0.0, 0.0, -0.4], rotation: [1.5708, 0.0, 0.0] },
      { type: "torus", size: [0.28, 0.06, 6.0, 12.0], offset: [0.0, 0.0, -0.3] },
      { type: "cylinder", size: [0.2, 0.2, 0.1, 8.0], offset: [0.0, 0.0, -1.15], rotation: [1.5708, 0.0, 0.0], isWeaponGlow: true }
    ]
  },
  {
    id: "weapon_missile_pod",
    name: "Rocket Launch Pod",
    geometries: [
      { type: "box", size: [0.6, 0.5, 1.0], offset: [0.0, 0.0, 0.0] },
      { type: "sphere", size: [0.1, 4.0, 4.0], offset: [-0.18, 0.12, -0.5], isWeaponGlow: true },
      { type: "sphere", size: [0.1, 4.0, 4.0], offset: [0.18, 0.12, -0.5], isWeaponGlow: true },
      { type: "sphere", size: [0.1, 4.0, 4.0], offset: [-0.18, -0.12, -0.5], isWeaponGlow: true },
      { type: "sphere", size: [0.1, 4.0, 4.0], offset: [0.18, -0.12, -0.5], isWeaponGlow: true }
    ]
  },
  {
    id: "weapon_railgun",
    name: "Electro Railgun",
    geometries: [
      { type: "box", size: [0.06, 0.15, 2.0], offset: [-0.1, 0.0, -0.8] },
      { type: "box", size: [0.06, 0.15, 2.0], offset: [0.1, 0.0, -0.8] },
      { type: "box", size: [0.4, 0.3, 0.6], offset: [0.0, 0.0, 0.2] },
      { type: "box", size: [0.12, 0.08, 1.5], offset: [0.0, 0.0, -0.6], isWeaponGlow: true } // Charging rail center glow
    ]
  },
  {
    id: "weapon_turret",
    name: "Spherical Swivel turret",
    geometries: [
      { type: "sphere", size: [0.4, 8.0, 8.0], offset: [0.0, 0.0, 0.0] },
      { type: "cylinder", size: [0.06, 0.06, 0.8, 6.0], offset: [0.0, 0.15, -0.4], rotation: [1.3, 0.0, 0.0] }
    ]
  },
  {
    id: "weapon_alien_disruptor",
    name: "Focus Crystal Launcher",
    geometries: [
      { type: "torus", size: [0.3, 0.08, 6.0, 12.0], offset: [0.0, 0.0, -0.2], rotation: [0.0, 1.5708, 0.0] },
      { type: "sphere", size: [0.18, 6.0, 6.0], offset: [0.0, 0.0, -0.2], isWeaponGlow: true } // Floating glowing crystal
    ]
  },
  {
    id: "weapon_beam_emitter",
    name: "Focal Lens Ray Emitter",
    geometries: [
      { type: "cone", size: [0.35, 0.6, 8.0], offset: [0.0, 0.0, -0.2], rotation: [1.5708, 0.0, 0.0] },
      { type: "sphere", size: [0.15, 8.0, 8.0], offset: [0.0, 0.0, -0.5], isWeaponGlow: true }
    ]
  },
  {
    id: "weapon_flak_cannon",
    name: "Heavy Flak Emitter",
    geometries: [
      { type: "cylinder", size: [0.25, 0.18, 0.9, 8.0], offset: [0.0, 0.0, -0.3], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [0.4, 0.4, 0.4], offset: [0.0, 0.0, 0.2] }
    ]
  }
];
