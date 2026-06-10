// 4weird Games - Space Station Parts: Solar Array
export const part = {
  id: "station_solar_array",
  name: "Giga Solar Panels",
  geometries: [
    { type: "cylinder", size: [0.3, 0.3, 12.0, 6.0], offset: [0.0, 0.0, 0.0] }, // Long spine
    { type: "box", size: [4.0, 0.05, 5.0], offset: [-2.2, 0.0, 2.0] }, // Panel 1
    { type: "box", size: [4.0, 0.05, 5.0], offset: [2.2, 0.0, 2.0] },  // Panel 2
    { type: "box", size: [4.0, 0.05, 5.0], offset: [-2.2, 0.0, -2.0] }, // Panel 3
    { type: "box", size: [4.0, 0.05, 5.0], offset: [2.2, 0.0, -2.0] }   // Panel 4
  ],
  slots: {
    mount: [[0.0, 0.0, 0.0]]
  }
};
