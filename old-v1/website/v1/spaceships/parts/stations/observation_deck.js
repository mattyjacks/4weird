// 4weird Games - Space Station Parts: Observation Deck
export const part = {
  id: "station_observation_deck",
  name: "Cupola Observation Deck",
  geometries: [
    { type: "cylinder", size: [2.0, 1.4, 1.2, 8.0], offset: [0.0, 0.0, 0.0] },
    { type: "sphere", size: [1.3, 8.0, 8.0], offset: [0.0, 0.6, 0.0], isGlass: true }, // Window cupola dome
    { type: "box", size: [0.4, 0.8, 0.4], offset: [0.0, -0.6, 0.0] } // Connect neck
  ],
  slots: {
    base: [[0.0, -1.0, 0.0]]
  }
};
