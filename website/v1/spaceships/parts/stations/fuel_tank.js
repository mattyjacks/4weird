// 4weird Games - Space Station Parts: Fuel Tank
export const part = {
  id: "station_fuel_tank",
  name: "Liquid Hydrogen Fuel Tank",
  geometries: [
    { type: "cylinder", size: [1.8, 1.8, 5.0, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] }, // Tank body
    { type: "sphere", size: [1.8, 8.0, 8.0], offset: [0.0, 0.0, -2.5] }, // Front dome
    { type: "sphere", size: [1.8, 8.0, 8.0], offset: [0.0, 0.0, 2.5] },  // Rear dome
    { type: "box", size: [0.4, 0.8, 3.0], offset: [0.0, -1.2, 0.0] } // Mounting base
  ],
  slots: {
    mount: [[0.0, -1.6, 0.0]],
    plumbing: [[0.0, 0.0, -4.5], [0.0, 0.0, 4.5]]
  }
};
