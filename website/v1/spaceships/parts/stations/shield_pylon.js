// 4weird Games - Space Station Parts: Shield Pylon
export const part = {
  id: "station_shield_pylon",
  name: "Shield Pylon Projector",
  geometries: [
    { type: "cylinder", size: [0.4, 0.4, 6.0, 4.0], offset: [0.0, 0.0, 0.0] },
    { type: "torus", size: [1.2, 0.25, 4.0, 8.0], offset: [0.0, 2.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
    { type: "sphere", size: [0.6, 6.0, 6.0], offset: [0.0, 3.2, 0.0], isGlow: true }
  ],
  slots: {
    base: [[0.0, -3.0, 0.0]]
  }
};
