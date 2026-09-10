// 4weird Games - Space Station Parts: Biodome Pod
export const part = {
  id: "station_biodome_pod",
  name: "Agricultural Biodome Pod",
  geometries: [
    { type: "sphere", size: [2.5, 12.0, 12.0], offset: [0.0, 0.0, 0.0], isGlass: true }, // Glass dome
    { type: "cylinder", size: [2.6, 2.6, 0.4, 12.0], offset: [0.0, -0.6, 0.0] }, // Base ring
    { type: "box", size: [1.2, 0.6, 1.2], offset: [0.0, -0.3, 0.0] } // Internal garden patch block
  ],
  slots: {
    base: [[0.0, -0.8, 0.0]],
    top: [[0.0, 2.5, 0.0]]
  }
};
