// 4weird Games - Space Station Parts: Command Bridge
export const part = {
  id: "station_command_bridge",
  name: "Station Command Bridge",
  geometries: [
    { type: "box", size: [3.5, 1.2, 2.5], offset: [0.0, 0.0, 0.0] },
    { type: "box", size: [3.2, 0.6, 1.2], offset: [0.0, 0.4, -0.8], isGlass: true }, // Main deck windows
    { type: "cylinder", size: [0.6, 0.6, 1.5, 4.0], offset: [0.0, -1.0, 0.0] }, // Neck stand
    { type: "box", size: [0.1, 1.5, 0.8], offset: [-1.6, 0.0, 0.5] } // Lateral sensor fin
  ],
  slots: {
    base: [[0.0, -1.75, 0.0]]
  }
};
