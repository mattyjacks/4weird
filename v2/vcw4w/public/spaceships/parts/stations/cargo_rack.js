// 4weird Games - Space Station Parts: Cargo Rack
export const part = {
  id: "station_cargo_rack",
  name: "Structural Cargo Hold",
  geometries: [
    { type: "box", size: [5.0, 1.0, 5.0], offset: [0.0, 0.0, 0.0] }, // Rack platform
    { type: "box", size: [1.8, 1.8, 1.8], offset: [-1.4, 1.2, -1.4] }, // Cargo pod 1
    { type: "box", size: [1.8, 1.8, 1.8], offset: [1.4, 1.2, -1.4] },  // Cargo pod 2
    { type: "box", size: [1.8, 1.8, 1.8], offset: [-1.4, 1.2, 1.4] },  // Cargo pod 3
    { type: "box", size: [1.8, 1.8, 1.8], offset: [1.4, 1.2, 1.4] }    // Cargo pod 4
  ],
  slots: {
    mount: [[0.0, -0.6, 0.0]],
    side: [[2.6, 0.0, 0.0], [-2.6, 0.0, 0.0]]
  }
};
