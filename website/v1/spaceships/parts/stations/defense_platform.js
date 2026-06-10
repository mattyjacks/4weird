// 4weird Games - Space Station Parts: Defense Platform
export const part = {
  id: "station_defense_platform",
  name: "Automated Defense Deck",
  geometries: [
    { type: "cylinder", size: [2.5, 2.5, 0.8, 8.0], offset: [0.0, 0.0, 0.0] },
    { type: "box", size: [0.4, 0.4, 1.8], offset: [-1.0, 0.6, 0.0], rotation: [0.3, 0.0, 0.0] }, // Dual barrels left
    { type: "box", size: [0.4, 0.4, 1.8], offset: [1.0, 0.6, 0.0], rotation: [0.3, 0.0, 0.0] }   // Dual barrels right
  ],
  slots: {
    mount: [[0.0, -0.5, 0.0]],
    sensor: [[0.0, 0.6, 0.0]]
  }
};
