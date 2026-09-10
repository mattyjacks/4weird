// 4weird Games - Space Station Parts: Core Hub
export const part = {
  id: "station_core_hub",
  name: "Central Core Hub",
  geometries: [
    { type: "cylinder", size: [4.0, 4.0, 10.0, 8.0], offset: [0.0, 0.0, 0.0] },
    { type: "cylinder", size: [4.5, 4.5, 1.2, 8.0], offset: [0.0, -4.0, 0.0] },
    { type: "cylinder", size: [4.5, 4.5, 1.2, 8.0], offset: [0.0, 4.0, 0.0] }
  ],
  slots: {
    primary: [[0.0, 5.0, 0.0], [0.0, -5.0, 0.0]],
    radial: [[-4.0, 0.0, 0.0], [4.0, 0.0, 0.0], [0.0, 0.0, -4.0], [0.0, 0.0, 4.0]]
  }
};
