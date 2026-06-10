// 4weird Games - Spaceship Parts: Cockpits
// Contains 10 unique cockpit and bridge definitions
// No em-dashes or en-dashes used in comments

export const cockpits = [
  {
    id: "cockpit_fighter",
    name: "Bubble Fighter Canopy",
    geometries: [
      { type: "sphere", size: [0.5, 8.0, 8.0], scale: [1.0, 0.7, 1.6], offset: [0.0, 0.0, 0.0], isGlass: true }
    ]
  },
  {
    id: "cockpit_strut",
    name: "Angular Industrial Cabin",
    geometries: [
      { type: "box", size: [0.8, 0.6, 1.2], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [0.7, 0.5, 0.4], offset: [0.0, 0.0, -0.6], isGlass: true }
    ]
  },
  {
    id: "cockpit_bridge",
    name: "Raised Commander Bridge",
    geometries: [
      { type: "box", size: [1.6, 0.8, 1.0], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [1.4, 0.4, 0.5], offset: [0.0, 0.2, -0.6], isGlass: true }
    ]
  },
  {
    id: "cockpit_sensor",
    name: "Spherical Sensor Dome",
    geometries: [
      { type: "sphere", size: [0.6, 10.0, 10.0], offset: [0.0, 0.0, 0.0], isGlass: false }
    ]
  },
  {
    id: "cockpit_stealth",
    name: "Low-Profile Visor",
    geometries: [
      { type: "box", size: [0.9, 0.3, 1.4], offset: [0.0, 0.0, 0.0] },
      { type: "cone", size: [0.8, 0.6, 3.0], offset: [0.0, 0.05, -0.6], rotation: [1.5708, 0.0, 0.0], isGlass: true }
    ]
  },
  {
    id: "cockpit_cargo",
    name: "Forward Extended Deck",
    geometries: [
      { type: "cylinder", size: [0.7, 0.9, 1.8, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [1.1, 0.3, 0.8], offset: [0.0, 0.4, -0.3], isGlass: true }
    ]
  },
  {
    id: "cockpit_twin",
    name: "Dual separated Pods",
    geometries: [
      { type: "sphere", size: [0.35, 8.0, 8.0], scale: [1.0, 1.0, 1.4], offset: [-0.4, 0.0, 0.0], isGlass: true },
      { type: "sphere", size: [0.35, 8.0, 8.0], scale: [1.0, 1.0, 1.4], offset: [0.4, 0.0, 0.0], isGlass: true }
    ]
  },
  {
    id: "cockpit_alien_eye",
    name: "Glowing Central Orb",
    geometries: [
      { type: "sphere", size: [0.8, 12.0, 12.0], offset: [0.0, 0.0, 0.0], isGlow: true } // Glow color based on faction
    ]
  },
  {
    id: "cockpit_interceptor",
    name: "Elongated Fighter Visor",
    geometries: [
      { type: "cone", size: [0.4, 1.6, 4.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0], isGlass: true }
    ]
  },
  {
    id: "cockpit_heavy",
    name: "Recessed Viewport Command",
    geometries: [
      { type: "box", size: [1.4, 1.0, 1.4], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [1.0, 0.2, 0.2], offset: [0.0, 0.2, -0.72], isGlass: true }
    ]
  }
];
