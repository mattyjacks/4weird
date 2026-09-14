// 4weird Games - Space Station Parts: Habitat Ring
export const part = {
  id: "station_habitat_ring",
  name: "Spinning Habitat Ring",
  geometries: [
    { type: "torus", size: [8.0, 1.2, 8.0, 32.0], offset: [0.0, 0.0, 0.0] },
    { type: "box", size: [16.0, 0.4, 0.4], offset: [0.0, 0.0, 0.0] }, // Strut 1
    { type: "box", size: [0.4, 0.4, 16.0], offset: [0.0, 0.0, 0.0] }  // Strut 2
  ],
  slots: {
    hub: [[0.0, 0.0, 0.0]],
    docking: [[0.0, 1.2, 8.0], [0.0, 1.2, -8.0]]
  }
};
