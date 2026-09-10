// 4weird Games - Space Station Parts: Connecting Strut
export const part = {
  id: "station_connecting_strut",
  name: "Structural Connector Strut",
  geometries: [
    { type: "cylinder", size: [0.8, 0.8, 8.0, 4.0], offset: [0.0, 0.0, 0.0] }, // Rectangular-profile hollow passage
    { type: "cylinder", size: [1.2, 1.2, 0.3, 6.0], offset: [0.0, 4.0, 0.0] }, // Flange 1
    { type: "cylinder", size: [1.2, 1.2, 0.3, 6.0], offset: [0.0, -4.0, 0.0] } // Flange 2
  ],
  slots: {
    start: [[0.0, -4.15, 0.0]],
    end: [[0.0, 4.15, 0.0]]
  }
};
