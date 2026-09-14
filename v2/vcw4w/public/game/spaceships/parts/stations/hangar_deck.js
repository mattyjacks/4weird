// 4weird Games - Space Station Parts: Hangar Deck
export const part = {
  id: "station_hangar_deck",
  name: "Launch Hangar Deck",
  geometries: [
    { type: "box", size: [6.0, 3.5, 5.0], offset: [0.0, 0.0, 0.0] }, // Hangar block
    { type: "box", size: [5.2, 2.7, 0.2], offset: [0.0, 0.0, -2.52], isGlass: true }, // Magnetic force shield entry door
    { type: "box", size: [6.4, 0.4, 0.4], offset: [0.0, 1.85, -2.5] }, // Shield frame top
    { type: "box", size: [6.4, 0.4, 0.4], offset: [0.0, -1.85, -2.5] } // Shield frame bottom
  ],
  slots: {
    mount: [[0.0, 0.0, 2.6]],
    side: [[3.1, 0.0, 0.0], [-3.1, 0.0, 0.0]]
  }
};
