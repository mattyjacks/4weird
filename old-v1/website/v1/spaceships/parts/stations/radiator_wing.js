// 4weird Games - Space Station Parts: Radiator Wing
export const part = {
  id: "station_radiator_wing",
  name: "Thermal Dissipation Radiator",
  geometries: [
    { type: "cylinder", size: [0.25, 0.25, 8.0, 4.0], offset: [0.0, 0.0, 0.0] }, // Support spar
    { type: "box", size: [3.5, 0.04, 7.0], offset: [2.0, 0.0, 0.0], rotation: [0.0, 0.0, 0.1] } // Thin radiator plate
  ],
  slots: {
    mount: [[0.0, 0.0, 0.0]]
  }
};
