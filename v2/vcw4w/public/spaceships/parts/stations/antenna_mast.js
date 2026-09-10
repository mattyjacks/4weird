// 4weird Games - Space Station Parts: Antenna Mast
export const part = {
  id: "station_antenna_mast",
  name: "Comms Antenna Mast",
  geometries: [
    { type: "cylinder", size: [0.15, 0.15, 6.0, 4.0], offset: [0.0, 3.0, 0.0] },
    { type: "cylinder", size: [0.05, 0.05, 3.0, 4.0], offset: [0.0, 6.5, 0.0] },
    { type: "box", size: [2.0, 0.2, 0.2], offset: [0.0, 4.5, 0.0] }, // Crossbar
    { type: "sphere", size: [0.15, 4.0, 4.0], offset: [-1.0, 4.7, 0.0], isGlow: true },
    { type: "sphere", size: [0.15, 4.0, 4.0], offset: [1.0, 4.7, 0.0], isGlow: true }
  ],
  slots: {
    base: [[0.0, 0.0, 0.0]]
  }
};
