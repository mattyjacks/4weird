// 4weird Games - Spaceship Parts: Details
// Contains 10 unique decorative detail definitions
// No em-dashes or en-dashes used in comments

export const details = [
  {
    id: "detail_antenna_long",
    name: "Needle Sensor Antenna",
    geometries: [
      { type: "cylinder", size: [0.03, 0.03, 1.5, 4.0], offset: [0.0, 0.75, 0.0] },
      { type: "sphere", size: [0.08, 4.0, 4.0], offset: [0.0, 1.5, 0.0], isGlow: true }
    ]
  },
  {
    id: "detail_sensor_dish",
    name: "Parabolic Sensor Dish",
    geometries: [
      { type: "cone", size: [0.5, 0.2, 8.0], offset: [0.0, 0.1, 0.0], rotation: [3.14159, 0.0, 0.0] }, // Shallow dish
      { type: "cylinder", size: [0.05, 0.05, 0.4, 4.0], offset: [0.0, -0.2, 0.0] } // Mast
    ]
  },
  {
    id: "detail_solar_vent",
    name: "Slatted Radiator Panels",
    geometries: [
      { type: "box", size: [0.7, 0.05, 1.0], offset: [0.0, 0.02, 0.0] },
      { type: "box", size: [0.6, 0.08, 0.1], offset: [0.0, 0.04, -0.3] },
      { type: "box", size: [0.6, 0.08, 0.1], offset: [0.0, 0.04, 0.0] },
      { type: "box", size: [0.6, 0.08, 0.1], offset: [0.0, 0.04, 0.3] }
    ]
  },
  {
    id: "detail_armor_plate",
    name: "Reinforced Armor Plate",
    geometries: [
      { type: "box", size: [0.8, 0.15, 0.8], offset: [0.0, 0.0, 0.0] },
      { type: "cylinder", size: [0.4, 0.4, 0.2, 6.0], offset: [0.0, 0.05, 0.0] }
    ]
  },
  {
    id: "detail_fin_small",
    name: "Small Guidance Fin",
    geometries: [
      { type: "box", size: [0.05, 0.6, 0.6], offset: [0.0, 0.3, -0.1], rotation: [-0.4, 0.0, 0.0] }
    ]
  },
  {
    id: "detail_shield_dome",
    name: "Shield Emitter Dome",
    geometries: [
      { type: "sphere", size: [0.3, 8.0, 8.0], offset: [0.0, 0.0, 0.0], isGlow: true } // Glow dome
    ]
  },
  {
    id: "detail_intake_scoop",
    name: "Angular Coolant Scoop",
    geometries: [
      { type: "box", size: [0.4, 0.3, 0.8], offset: [0.0, 0.0, 0.0] },
      { type: "box", size: [0.32, 0.22, 0.1], offset: [0.0, 0.0, -0.41], isGlass: true } // Front dark opening intake
    ]
  },
  {
    id: "detail_light_bar",
    name: "Navigational Light Bar",
    geometries: [
      { type: "box", size: [0.8, 0.1, 0.2], offset: [0.0, 0.0, 0.0] },
      { type: "sphere", size: [0.06, 4.0, 4.0], offset: [-0.3, 0.0, 0.11], isGlow: true },
      { type: "sphere", size: [0.06, 4.0, 4.0], offset: [0.0, 0.0, 0.11], isGlow: true },
      { type: "sphere", size: [0.06, 4.0, 4.0], offset: [0.3, 0.0, 0.11], isGlow: true }
    ]
  },
  {
    id: "detail_docking_ring",
    name: "Circular Dock Hatch",
    geometries: [
      { type: "torus", size: [0.35, 0.08, 6.0, 12.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cylinder", size: [0.28, 0.28, 0.08, 8.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] }
    ]
  },
  {
    id: "detail_warp_nacelle",
    name: "Aux Warp Nacelle Pod",
    geometries: [
      { type: "cylinder", size: [0.2, 0.2, 1.6, 6.0], offset: [0.0, 0.0, 0.0], rotation: [1.5708, 0.0, 0.0] },
      { type: "cone", size: [0.2, 0.4, 6.0], offset: [0.0, 0.0, -1.0], rotation: [1.5708, 0.0, 0.0], isGlow: true } // Glowing nose cap
    ]
  }
];
