// 4weird Games - Space Station Parts: Turret Defense
export const part = {
  id: "station_turret_defense",
  name: "Heavy Laser Turret Mount",
  geometries: [
    { type: "sphere", size: [1.2, 8.0, 8.0], scale: [1.0, 0.6, 1.0], offset: [0.0, 0.0, 0.0] }, // Turret cupola dome
    { type: "cylinder", size: [0.15, 0.15, 2.5, 4.0], offset: [-0.3, 0.3, -1.0], rotation: [1.3, 0.0, 0.0] }, // Left barrel
    { type: "cylinder", size: [0.15, 0.15, 2.5, 4.0], offset: [0.3, 0.3, -1.0], rotation: [1.3, 0.0, 0.0] },  // Right barrel
    { type: "sphere", size: [0.1, 4.0, 4.0], offset: [-0.3, 0.3, -2.25], isGlow: true }, // Barrel tips glow
    { type: "sphere", size: [0.1, 4.0, 4.0], offset: [0.3, 0.3, -2.25], isGlow: true }
  ],
  slots: {
    base: [[0.0, -0.3, 0.0]]
  }
};
