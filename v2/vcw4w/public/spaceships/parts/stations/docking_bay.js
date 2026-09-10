// 4weird Games - Space Station Parts: Docking Bay
export const part = {
  id: "station_docking_bay",
  name: "Vessel Docking Bay",
  geometries: [
    { type: "cylinder", size: [3.5, 3.5, 6.0, 8.0], offset: [0.0, 0.0, 0.0] },
    { type: "torus", size: [3.8, 0.4, 6.0, 12.0], offset: [0.0, 3.0, 0.0], rotation: [1.5708, 0.0, 0.0] }, // Landing guide ring
    { type: "box", size: [4.2, 0.2, 0.2], offset: [0.0, 0.0, 0.0] } // Mounting bracket
  ],
  slots: {
    mount: [[0.0, 0.0, -2.1]],
    ports: [[0.0, 3.2, 0.0], [0.0, -3.2, 0.0]]
  }
};
