// 4weird Games - Space Station Parts: Refinery Module
export const part = {
  id: "station_refinery",
  name: "Ore Refinery Processor",
  geometries: [
    { type: "box", size: [4.0, 3.0, 4.0], offset: [0.0, 0.0, 0.0] },
    { type: "cone", size: [1.8, 2.5, 6.0], offset: [0.0, 2.75, 0.0] }, // Processing stack
    { type: "torus", size: [1.2, 0.2, 4.0, 8.0], offset: [0.0, 4.0, 0.0], rotation: [1.5708, 0.0, 0.0] }, // Flange stack ring
    { type: "box", size: [1.2, 2.0, 1.2], offset: [2.5, -0.5, 0.0] } // Aux compressor box
  ],
  slots: {
    mount: [[0.0, -1.6, 0.0]],
    intake: [[2.5, 0.5, 0.0]]
  }
};
