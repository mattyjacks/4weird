// 4weird Games - Spaceship Parts: Wings
// Contains 10 unique wing and stabilizer definitions
// No em-dashes or en-dashes used in comments

export const wings = [
  {
    id: "wing_swept",
    name: "Swept-Back Wings",
    geometries: [
      { type: "box", size: [2.5, 0.1, 1.2], offset: [1.25, 0.0, 0.2], rotation: [0.0, -0.3, 0.0] }
    ]
  },
  {
    id: "wing_delta",
    name: "Large Delta Wings",
    geometries: [
      { type: "box", size: [2.0, 0.12, 2.2], offset: [1.0, 0.0, -0.4], rotation: [0.0, -0.2, 0.0] },
      { type: "box", size: [0.4, 0.8, 1.0], offset: [2.0, 0.3, -0.8], rotation: [0.0, 0.0, 0.0] } // End stabilizers
    ]
  },
  {
    id: "wing_forward",
    name: "Forward-Swept Blades",
    geometries: [
      { type: "box", size: [2.8, 0.08, 0.8], offset: [1.4, 0.0, -0.4], rotation: [0.0, 0.4, 0.0] }
    ]
  },
  {
    id: "wing_xwing",
    name: "X-Fighter Double Wings",
    geometries: [
      { type: "box", size: [2.2, 0.06, 0.9], offset: [1.1, 0.4, 0.0], rotation: [0.2, -0.15, 0.0] },
      { type: "box", size: [2.2, 0.06, 0.9], offset: [1.1, -0.4, 0.0], rotation: [-0.2, -0.15, 0.0] }
    ]
  },
  {
    id: "wing_circular",
    name: "Stabilizer Ring",
    geometries: [
      { type: "torus", size: [1.6, 0.12, 8.0, 16.0], offset: [1.6, 0.0, 0.0], rotation: [0.0, 1.5708, 0.0] },
      { type: "box", size: [1.6, 0.2, 0.2], offset: [0.8, 0.0, 0.0] }
    ]
  },
  {
    id: "wing_stubby",
    name: "Short Thrust Fins",
    geometries: [
      { type: "box", size: [1.0, 0.15, 1.4], offset: [0.5, 0.0, 0.0] }
    ]
  },
  {
    id: "wing_solar",
    name: "Flat Solar Collectors",
    geometries: [
      { type: "box", size: [0.8, 0.05, 3.5], offset: [1.6, 0.0, 0.0] }, // Large panel
      { type: "cylinder", size: [0.1, 0.1, 1.2, 6.0], offset: [0.6, 0.0, 0.0], rotation: [0.0, 0.0, 1.5708] } // Connecting arm
    ]
  },
  {
    id: "wing_bat",
    name: "Alien Ribbed Wings",
    geometries: [
      { type: "cone", size: [0.15, 2.8, 8.0], offset: [1.4, 0.0, -0.4], rotation: [0.0, 0.0, -1.3], isRib: true },
      { type: "box", size: [2.2, 0.02, 1.8], offset: [1.1, 0.0, -0.2], rotation: [0.1, 0.2, 0.0], isWeb: true }
    ]
  },
  {
    id: "wing_polyhedral",
    name: "Multi-Angled Space Wings",
    geometries: [
      { type: "box", size: [1.4, 0.08, 1.0], offset: [0.7, 0.0, 0.0] },
      { type: "box", size: [1.2, 0.08, 1.0], offset: [1.8, 0.5, 0.0], rotation: [0.0, 0.0, 0.5] } // Angled tip
    ]
  },
  {
    id: "wing_blade",
    name: "Vertical Stabilizer Fins",
    geometries: [
      { type: "box", size: [0.1, 1.8, 1.2], offset: [0.2, 0.9, 0.2], rotation: [-0.2, 0.0, 0.0] }
    ]
  }
];
