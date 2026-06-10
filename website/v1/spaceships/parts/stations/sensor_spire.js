// 4weird Games - Space Station Parts: Sensor Spire
export const part = {
  id: "station_sensor_spire",
  name: "Deep Space Sensor Spire",
  geometries: [
    { type: "cone", size: [0.8, 8.0, 4.0], offset: [0.0, 4.0, 0.0] },
    { type: "cylinder", size: [1.2, 1.2, 2.0, 6.0], offset: [0.0, 0.0, 0.0] },
    { type: "sphere", size: [0.4, 6.0, 6.0], offset: [0.0, 8.0, 0.0], isGlow: true } // Sensor orb
  ],
  slots: {
    base: [[0.0, -1.0, 0.0]]
  }
};
