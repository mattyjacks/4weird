// 4weird Games - Space Station Parts: Reactor Core
export const part = {
  id: "station_reactor_core",
  name: "Antimatter Fusion Reactor",
  geometries: [
    { type: "sphere", size: [3.0, 12.0, 12.0], offset: [0.0, 0.0, 0.0], isGlow: true }, // Main glowing sphere
    { type: "torus", size: [3.8, 0.3, 8.0, 16.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] }, // Stabilizer ring 1
    { type: "torus", size: [3.8, 0.3, 8.0, 16.0], offset: [0.0, 0.0, 0.0], rotation: [0.0, 1.5708, 0.0] }  // Stabilizer ring 2
  ],
  slots: {
    hub: [[0.0, 0.0, 0.0]],
    mount: [[0.0, -3.2, 0.0], [0.0, 3.2, 0.0]]
  }
};
