// 4weird Games - Spaceship Parts: Thrusters
// Contains 10 unique engine nozzle and thruster definitions
// No em-dashes or en-dashes used in comments

export const thrusters = [
  {
    id: "thruster_main",
    name: "Heavy Heavy Nozzle",
    geometries: [
      { type: "cylinder", size: [0.5, 0.7, 1.0, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.45, 0.45, 0.1, 8.0], offset: [0.0, 0.0, 0.5], rotation: [1.5708, 0.0, 0.0], isGlow: true } // Glow exhaust
    ]
  },
  {
    id: "thruster_dual",
    name: "Dual Engine Tubes",
    geometries: [
      { type: "cylinder", size: [0.25, 0.35, 1.2, 6.0], offset: [-0.3, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.25, 0.35, 1.2, 6.0], offset: [0.3, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.22, 0.22, 0.1, 6.0], offset: [-0.3, 0.0, 0.6], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.22, 0.22, 0.1, 6.0], offset: [0.3, 0.0, 0.6], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_quad",
    name: "Quad Exhaust Cluster",
    geometries: [
      { type: "cylinder", size: [0.18, 0.25, 0.8, 6.0], offset: [-0.25, 0.25, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.18, 0.25, 0.8, 6.0], offset: [0.25, 0.25, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.18, 0.25, 0.8, 6.0], offset: [-0.25, -0.25, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.18, 0.25, 0.8, 6.0], offset: [0.25, -0.25, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.15, 0.15, 0.08, 6.0], offset: [-0.25, 0.25, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.15, 0.15, 0.08, 6.0], offset: [0.25, 0.25, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.15, 0.15, 0.08, 6.0], offset: [-0.25, -0.25, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.15, 0.15, 0.08, 6.0], offset: [0.25, -0.25, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_ion",
    name: "Flat Glowing Ion Grid",
    geometries: [
      { type: "box", size: [1.2, 0.3, 0.6], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [1.1, 0.22, 0.1], offset: [0.0, 0.0, 0.3], isGlow: true }
    ]
  },
  {
    id: "thruster_radial",
    name: "Circular Cluster Nozzle",
    geometries: [
      { type: "cylinder", size: [0.65, 0.65, 0.8, 12.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.12, 0.12, 0.1, 6.0], offset: [0.0, 0.3, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.12, 0.12, 0.1, 6.0], offset: [-0.26, -0.15, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.12, 0.12, 0.1, 6.0], offset: [0.26, -0.15, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true },
      { type: "cylinder", size: [0.12, 0.12, 0.1, 6.0], offset: [0.0, 0.0, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_hyper",
    name: "Hyperspace Warp Tube",
    geometries: [
      { type: "cylinder", size: [0.3, 0.4, 2.0, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "torus", size: [0.45, 0.1, 6.0, 12.0], offset: [0.0, 0.0, -0.3], rotation: [0.0, 0.0, 0.0] },
      { type: "cylinder", size: [0.25, 0.25, 0.1, 8.0], offset: [0.0, 0.0, 1.0], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_alien_core",
    name: "Alien Ring Engine Core",
    geometries: [
      { type: "torus", size: [0.8, 0.12, 8.0, 16.0], offset: [0.0, 0.0, 0.0], rotation: [0.0, 0.0, 0.0] },
      { type: "sphere", size: [0.4, 8.0, 8.0], offset: [0.0, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_cone",
    name: "Chemical Thruster Cone",
    geometries: [
      { type: "cone", size: [0.4, 0.8, 6.0], offset: [0.0, 0.0, 0.0], rotation: [-1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.2, 0.2, 0.1, 6.0], offset: [0.0, 0.0, 0.4], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  },
  {
    id: "thruster_stealth",
    name: "Low-Observable Slit Nozzle",
    geometries: [
      { type: "box", size: [1.0, 0.15, 0.8], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [0.9, 0.08, 0.05], offset: [0.0, 0.0, 0.4], isGlow: true }
    ]
  },
  {
    id: "thruster_rotor",
    name: "Vectored Vector Exhaust",
    geometries: [
      { type: "cylinder", size: [0.4, 0.4, 0.6, 8.0], offset: [0.0, 0.0, -0.2], rotation: [1.5708, 0.0, 0.0] },
      { type: "sphere", size: [0.35, 8.0, 8.0], offset: [0.0, 0.0, 0.1] },
      { type: "cylinder", size: [0.25, 0.25, 0.3, 6.0], offset: [0.0, 0.0, 0.3], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.2, 0.2, 0.05, 6.0], offset: [0.0, 0.0, 0.45], rotation: [1.5708, 0.0, 0.0], isGlow: true }
    ]
  }
];
