// 4weird Games - Space Station Parts: Gravity Ring
export const part = {
  id: "station_gravity_ring",
  name: "Gravity Stabilizer Ring",
  geometries: [
    { type: "torus", size: [5.0, 0.5, 6.0, 16.0], offset: [0.0, 0.0, 0.0] },
    { type: "cylinder", size: [0.2, 0.2, 5.0, 4.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] }, // Cross spoke
    { type: "sphere", size: [1.0, 8.0, 8.0], offset: [0.0, 0.0, 0.0], isGlow: true } // Gravity emitter core
  ],
  slots: {
    hub: [[0.0, 0.0, 0.0]],
    sides: [[5.5, 0.0, 0.0], [-5.5, 0.0, 0.0]]
  }
};
