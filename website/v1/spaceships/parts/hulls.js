// 4weird Games - Spaceship Parts: Hulls
// Contains 10 unique hull core definitions
// No em-dashes or en-dashes used in comments

export const hulls = [
  {
    id: "hull_wedge",
    name: "Wedge Hull Core",
    geometries: [
      { type: "box", size: [2.0, 0.8, 3.0], offset: [0.0, 0.0, 0.0] },
      { type: "cone", size: [1.2, 2.0, 4.0], offset: [0.0, 0.0, -1.8], rotation: [1.5708, 0.0, 0.0] }
    ],
    slots: {
      cockpit: [0.0, 0.4, -0.6],
      wings: [[-1.0, 0.0, 0.0], [1.0, 0.0, 0.0]],
      engines: [[0.0, 0.0, 1.5]],
      weapons: [[-0.8, -0.2, -1.2], [0.8, -0.2, -1.2]],
      details: [[0.0, 0.4, 0.8], [0.0, -0.4, 0.8]]
    }
  },
  {
    id: "hull_corvette",
    name: "Corvette Hull Core",
    geometries: [
      { type: "cylinder", size: [0.8, 0.8, 4.5, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [1.4, 0.6, 2.5], offset: [0.0, 0.0, 0.8] }
    ],
    slots: {
      cockpit: [0.0, 0.5, -0.8],
      wings: [[-0.7, 0.0, 0.5], [0.7, 0.0, 0.5]],
      engines: [[0.0, 0.0, 2.25]],
      weapons: [[-0.5, -0.3, -1.5], [0.5, -0.3, -1.5]],
      details: [[0.0, 0.5, 1.2], [0.0, -0.5, 0.0]]
    }
  },
  {
    id: "hull_scout",
    name: "Scout Hull Core",
    geometries: [
      { type: "box", size: [1.2, 0.5, 2.2], offset: [0.0, 0.0, 0.0] },
      { type: "cone", size: [0.8, 1.2, 4.0], offset: [0.0, 0.0, -1.2], rotation: [1.5708, 0.0, 0.0] }
    ],
    slots: {
      cockpit: [0.0, 0.3, -0.4],
      wings: [[-0.6, 0.0, 0.0], [0.6, 0.0, 0.0]],
      engines: [[0.0, 0.0, 1.1]],
      weapons: [[-0.5, -0.15, -0.8], [0.5, -0.15, -0.8]],
      details: [[0.0, 0.3, 0.5]]
    }
  },
  {
    id: "hull_dreadnought",
    name: "Heavy Dreadnought Core",
    geometries: [
      { type: "box", size: [2.8, 1.6, 5.0], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [2.0, 2.2, 2.0], offset: [0.0, 0.3, 1.0] }
    ],
    slots: {
      cockpit: [0.0, 1.2, -0.5],
      wings: [[-1.4, 0.0, 0.0], [1.4, 0.0, 0.0]],
      engines: [[-0.8, 0.0, 2.5], [0.8, 0.0, 2.5], [0.0, 0.5, 2.5]],
      weapons: [[-1.2, 0.5, -1.8], [1.2, 0.5, -1.8], [-1.0, -0.5, -2.0], [1.0, -0.5, -2.0]],
      details: [[0.0, 1.5, 1.5], [-1.2, 0.8, 1.0], [1.2, 0.8, 1.0]]
    }
  },
  {
    id: "hull_carrier",
    name: "Hangar Carrier Core",
    geometries: [
      { type: "box", size: [3.2, 1.2, 6.0], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [1.2, 1.8, 1.8], offset: [1.0, 0.8, 1.5] } // Asymmetric command tower block
    ],
    slots: {
      cockpit: [1.0, 1.8, 1.5],
      wings: [[-1.6, 0.0, -1.0], [1.6, 0.0, -1.0]],
      engines: [[-1.0, 0.0, 3.0], [1.0, 0.0, 3.0]],
      weapons: [[-1.2, -0.4, -2.0], [1.2, -0.4, -2.0]],
      details: [[-1.0, 0.7, 0.0], [0.0, 0.7, -1.5]]
    }
  },
  {
    id: "hull_cruiser",
    name: "Strike Cruiser Core",
    geometries: [
      { type: "cylinder", size: [1.2, 1.2, 5.0, 6.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "box", size: [1.8, 0.8, 2.0], offset: [0.0, 0.0, -1.0] }
    ],
    slots: {
      cockpit: [0.0, 0.6, -1.5],
      wings: [[-0.9, 0.0, 0.0], [0.9, 0.0, 0.0]],
      engines: [[0.0, 0.0, 2.5]],
      weapons: [[-0.8, -0.4, -2.0], [0.8, -0.4, -2.0], [0.0, 0.7, -0.5]],
      details: [[0.0, 0.7, 1.5], [0.0, -0.7, -0.5]]
    }
  },
  {
    id: "hull_interceptor",
    name: "Dual-Boom Interceptor Core",
    geometries: [
      { type: "box", size: [1.0, 0.6, 2.8], offset: [0.0, 0.0, 0.0] },
      { type: "cylinder", size: [0.3, 0.3, 3.5, 4.0], offset: [-0.9, 0.0, 0.4], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.3, 0.3, 3.5, 4.0], offset: [0.9, 0.0, 0.4], rotation: [1.5708, 0.0, 0.0] }
    ],
    slots: {
      cockpit: [0.0, 0.35, -0.6],
      wings: [[-1.0, 0.0, 0.0], [1.0, 0.0, 0.0]],
      engines: [[-0.9, 0.0, 2.15], [0.9, 0.0, 2.15], [0.0, 0.0, 1.4]],
      weapons: [[-0.9, -0.2, -1.4], [0.9, -0.2, -1.4], [0.0, -0.2, -1.2]],
      details: [[0.0, 0.4, 0.5]]
    }
  },
  {
    id: "hull_stealth",
    name: "Stealth Diamond Core",
    geometries: [
      { type: "cone", size: [2.2, 1.0, 2.5], offset: [0.0, 0.0, -0.8], rotation: [1.5708, 0.0, 0.0] },
      { type: "cone", size: [2.2, 1.0, 2.5], offset: [0.0, 0.0, 0.8], rotation: [-1.5708, 0.0, 0.0] }
    ],
    slots: {
      cockpit: [0.0, 0.3, -0.2],
      wings: [[-1.1, 0.0, 0.0], [1.1, 0.0, 0.0]],
      engines: [[0.0, 0.0, 2.05]],
      weapons: [[-0.6, -0.15, -1.0], [0.6, -0.15, -1.0]],
      details: [[0.0, 0.35, 0.4]]
    }
  },
  {
    id: "hull_heavy",
    name: "Hexagonal Armored Core",
    geometries: [
      { type: "cylinder", size: [1.6, 1.6, 4.0, 6.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 3.14159 / 6] },
      { type: "box", size: [2.4, 1.0, 1.8], offset: [0.0, 0.0, 0.8] }
    ],
    slots: {
      cockpit: [0.0, 0.9, -0.5],
      wings: [[-1.2, 0.0, 0.2], [1.2, 0.0, 0.2]],
      engines: [[-0.6, 0.0, 2.0], [0.6, 0.0, 2.0]],
      weapons: [[-1.0, -0.5, -1.2], [1.0, -0.5, -1.2], [-0.5, 0.9, -1.5], [0.5, 0.9, -1.5]],
      details: [[0.0, 0.9, 1.2]]
    }
  },
  {
    id: "hull_saucer",
    name: "Saucer Disc Core",
    geometries: [
      { type: "cylinder", size: [2.5, 2.5, 0.8, 12.0], offset: [0.0, 0.0, 0.0] },
      { type: "sphere", size: [1.2, 8.0, 8.0], offset: [0.0, 0.4, 0.0] }
    ],
    slots: {
      cockpit: [0.0, 0.5, -0.8],
      wings: [[-2.5, 0.0, 0.0], [2.5, 0.0, 0.0]],
      engines: [[0.0, 0.0, 1.25], [-0.8, 0.0, 1.0], [0.8, 0.0, 1.0]],
      weapons: [[-1.5, -0.2, -0.8], [1.5, -0.2, -0.8]],
      details: [[0.0, 0.8, 0.0], [0.0, -0.4, 0.0]]
    }
  }
];
