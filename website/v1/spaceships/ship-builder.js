// 4weird Games - Ship & Station Procedural Builder
// Assembles spaceships and space stations using modular parts definitions
// Optimized with a shared geometry cache for minimal GPU/memory overhead
// No em-dashes or en-dashes used in comments

import { hulls } from './parts/hulls.js';
import { cockpits } from './parts/cockpits.js';
import { wings } from './parts/wings.js';
import { thrusters } from './parts/thrusters.js';
import { weapons } from './parts/weapons.js';
import { details } from './parts/details.js';

// Import all 20 space station parts
import { part as stationCoreHub } from './parts/stations/core_hub.js';
import { part as stationHabitatRing } from './parts/stations/habitat_ring.js';
import { part as stationDockingBay } from './parts/stations/docking_bay.js';
import { part as stationSolarArray } from './parts/stations/solar_array.js';
import { part as stationSensorSpire } from './parts/stations/sensor_spire.js';
import { part as stationCargoRack } from './parts/stations/cargo_rack.js';
import { part as stationReactorCore } from './parts/stations/reactor_core.js';
import { part as stationShieldPylon } from './parts/stations/shield_pylon.js';
import { part as stationRadiatorWing } from './parts/stations/radiator_wing.js';
import { part as stationDefensePlatform } from './parts/stations/defense_platform.js';
import { part as stationBiodomePod } from './parts/stations/biodome_pod.js';
import { part as stationAntennaMast } from './parts/stations/antenna_mast.js';
import { part as stationFuelTank } from './parts/stations/fuel_tank.js';
import { part as stationObservationDeck } from './parts/stations/observation_deck.js';
import { part as stationConnectingStrut } from './parts/stations/connecting_strut.js';
import { part as stationRefinery } from './parts/stations/refining_refinery.js';
import { part as stationHangarDeck } from './parts/stations/hangar_deck.js';
import { part as stationGravityRing } from './parts/stations/gravity_ring.js';
import { part as stationCommandBridge } from './parts/stations/command_bridge.js';
import { part as stationTurretDefense } from './parts/stations/turret_defense.js';

const stationParts = [
  stationCoreHub, stationHabitatRing, stationDockingBay, stationSolarArray,
  stationSensorSpire, stationCargoRack, stationReactorCore, stationShieldPylon,
  stationRadiatorWing, stationDefensePlatform, stationBiodomePod, stationAntennaMast,
  stationFuelTank, stationObservationDeck, stationConnectingStrut, stationRefinery,
  stationHangarDeck, stationGravityRing, stationCommandBridge, stationTurretDefense
];

// Shared geometry cache to avoid duplicate allocations
const geometryCache = {};

function getSharedGeometry(type, sizeParams = [1, 1, 1, 8]) {
  // Generate a key based on geometry parameters to maximize cache reuse
  const key = `${type}_${sizeParams.join('_')}`;
  if (geometryCache[key]) {
    return geometryCache[key];
  }

  let geom;
  if (type === "box") {
    // sizeParams = [width, height, depth]
    geom = new THREE.BoxGeometry(sizeParams[0], sizeParams[1], sizeParams[2]);
  } else if (type === "sphere") {
    // sizeParams = [radius, widthSegments, heightSegments]
    geom = new THREE.SphereGeometry(sizeParams[0], Math.floor(sizeParams[1]), Math.floor(sizeParams[2]));
  } else if (type === "cylinder") {
    // sizeParams = [radiusTop, radiusBottom, height, radialSegments]
    geom = new THREE.CylinderGeometry(sizeParams[0], sizeParams[1], sizeParams[2], Math.floor(sizeParams[3]));
  } else if (type === "cone") {
    // sizeParams = [radius, height, radialSegments]
    geom = new THREE.ConeGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]));
  } else if (type === "torus") {
    // sizeParams = [radius, tube, radialSegments, tubularSegments]
    geom = new THREE.TorusGeometry(sizeParams[0], sizeParams[1], Math.floor(sizeParams[2]), Math.floor(sizeParams[3]));
  } else {
    geom = new THREE.BoxGeometry(1, 1, 1);
  }

  geometryCache[key] = geom;
  return geom;
}

export const ShipBuilder = {
  // Create modular spaceship
  buildShip: function(faction, seedVal = Math.random()) {
    const isAlien = faction === "alien";
    
    // Seeded random helper for reproducible ships
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    // Harmonized Color Palette Setup
    let baseColor, stripeColor, trimColor, emissiveColor;
    if (isAlien) {
      // Alien: dark, ominous greens, purples, oranges
      const baseOptions = [0x150b24, 0x0c150c, 0x18181a];
      const stripeOptions = [0x39ff14, 0xda70d6, 0xff007f];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0x111111;
      emissiveColor = 0xd800ff; // Magenta/purple flames
    } else {
      // Humans: clean steels, white, neon blue/orange accents
      const baseOptions = [0xdddddd, 0x8f9ca6, 0x5a636a];
      const stripeOptions = [0x00d2ff, 0xff6c00, 0x00ffaa];
      baseColor = baseOptions[Math.floor(random() * baseOptions.length)];
      stripeColor = stripeOptions[Math.floor(random() * stripeOptions.length)];
      trimColor = 0xffd700; // Gold trim
      emissiveColor = 0x00f6ff; // Cyan/blue flames
    }

    // Material definitions (pooled/shared locally for this ship instance)
    const baseMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true
    });

    const stripeMat = new THREE.MeshStandardMaterial({
      color: stripeColor,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      metalness: 0.9,
      roughness: 0.15,
      flatShading: true
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: isAlien ? 0xff0055 : 0x00ffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.9
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: emissiveColor
    });

    const weaponGlowMat = new THREE.MeshBasicMaterial({
      color: isAlien ? 0x39ff14 : 0xff3300 // Alien green, human red
    });

    const rootGroup = new THREE.Group();
    rootGroup.name = "ship_" + faction;

    // Pick parts
    const hullDef = hulls[Math.floor(random() * hulls.length)];
    const cockpitDef = cockpits[Math.floor(random() * cockpits.length)];
    const wingDef = wings[Math.floor(random() * wings.length)];
    const thrusterDef = thrusters[Math.floor(random() * thrusters.length)];
    const weaponDef = weapons[Math.floor(random() * weapons.length)];
    const detailDef = details[Math.floor(random() * details.length)];

    // 1. Build Hull Core
    const hullGroup = new THREE.Group();
    hullDef.geometries.forEach(g => {
      const geom = getSharedGeometry(g.type, g.size);
      const mesh = new THREE.Mesh(geom, random() > 0.4 ? baseMat : stripeMat);
      
      mesh.position.fromArray(g.offset || [0,0,0]);
      if (g.rotation) mesh.rotation.fromArray(g.rotation);
      if (g.scale) mesh.scale.fromArray(g.scale);
      hullGroup.add(mesh);
    });
    rootGroup.add(hullGroup);

    // Helper for applying geometries to a specific attachment slot
    function attachPart(partDef, slotCoords, forceMaterial = null) {
      if (!slotCoords) return;
      
      const buildGeom = (coords, isMirrored = false) => {
        const partGroup = new THREE.Group();
        partGroup.position.fromArray(coords);
        
        if (isMirrored) {
          partGroup.scale.set(-1.0, 1.0, 1.0); // Mirror along X-axis
        }

        partDef.geometries.forEach(g => {
          let mat = forceMaterial;
          if (!mat) {
            if (g.isGlass) mat = glassMat;
            else if (g.isGlow) mat = glowMat;
            else if (g.isWeaponGlow) mat = weaponGlowMat;
            else mat = random() > 0.6 ? stripeMat : (random() > 0.8 ? trimMat : baseMat);
          }

          const geom = getSharedGeometry(g.type, g.size);
          const mesh = new THREE.Mesh(geom, mat);
          
          mesh.position.fromArray(g.offset || [0,0,0]);
          if (g.rotation) mesh.rotation.fromArray(g.rotation);
          if (g.scale) mesh.scale.fromArray(g.scale);
          partGroup.add(mesh);
        });

        rootGroup.add(partGroup);
      };

      // Handle arrays of coordinates (for symmetric wings, weapons, engines)
      if (Array.isArray(slotCoords[0])) {
        slotCoords.forEach((coords, idx) => {
          // If X coordinate is negative, mirror it
          const mirror = coords[0] > 0.0;
          buildGeom(coords, mirror);
        });
      } else {
        buildGeom(slotCoords);
      }
    }

    // 2. Attach Cockpit
    attachPart(cockpitDef, hullDef.slots.cockpit);

    // 3. Attach Wings (Mirrored symmetrically)
    attachPart(wingDef, hullDef.slots.wings);

    // 4. Attach Thrusters/Engines
    // Capture engine positions for particle positioning in the rendering loop
    const enginePositions = [];
    if (Array.isArray(hullDef.slots.engines[0])) {
      hullDef.slots.engines.forEach(e => enginePositions.push([...e]));
    } else {
      enginePositions.push([...hullDef.slots.engines]);
    }
    attachPart(thrusterDef, hullDef.slots.engines);

    // 5. Attach Weapons
    attachPart(weaponDef, hullDef.slots.weapons);

    // 6. Attach Details
    attachPart(detailDef, hullDef.slots.details);

    // Store attributes on the Three.js group for reference during runtime animations
    rootGroup.userData = {
      faction: faction,
      enginePositions: enginePositions,
      thrusterGlowColor: emissiveColor,
      collisionRadius: isAlien ? 3.0 : 2.0
    };

    // Apply slight random scaling to the overall ship group for variation
    const overallScale = 0.85 + random() * 0.3;
    rootGroup.scale.set(overallScale, overallScale, overallScale);

    return rootGroup;
  },

  // Create modular space station (human faction only)
  buildStation: function(seedVal = Math.random()) {
    let seed = seedVal;
    function random() {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const stationGroup = new THREE.Group();
    stationGroup.name = "space_station";

    // Standard high-tech grey industrial theme colors
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x5a6066,
      metalness: 0.8,
      roughness: 0.3,
      flatShading: true
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4c00, // Warning orange accents
      metalness: 0.5,
      roughness: 0.4,
      flatShading: true
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });

    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f6ff // Fusion core light
    });

    const blinkers = []; // Track blinking navigation light meshes

    // Recursive assembler helper that snaps modules to slot coordinates
    function assembleModule(partDef, position, rotation = [0,0,0], scale = [1,1,1]) {
      const moduleGroup = new THREE.Group();
      moduleGroup.position.fromArray(position);
      moduleGroup.rotation.fromArray(rotation);
      moduleGroup.scale.fromArray(scale);

      partDef.geometries.forEach(g => {
        let mat = metalMat;
        if (g.isGlass) mat = glassMat;
        else if (g.isGlow) mat = coreGlowMat;
        else if (random() > 0.75) mat = trimMat;

        const geom = getSharedGeometry(g.type, g.size);
        const mesh = new THREE.Mesh(geom, mat);
        
        mesh.position.fromArray(g.offset || [0,0,0]);
        if (g.rotation) mesh.rotation.fromArray(g.rotation);
        if (g.scale) mesh.scale.fromArray(g.scale);
        moduleGroup.add(mesh);

        // Blinking beacon light helper
        if (g.isGlow || random() > 0.95) {
          const beaconGeom = getSharedGeometry("sphere", [0.15, 4, 4]);
          const beaconMat = new THREE.MeshBasicMaterial({ color: random() > 0.5 ? 0xff0000 : 0x00ff00 });
          const beacon = new THREE.Mesh(beaconGeom, beaconMat);
          beacon.position.copy(mesh.position).add(new THREE.Vector3(0, g.size ? g.size[1]*0.6 : 0.5, 0));
          moduleGroup.add(beacon);
          blinkers.push(beacon);
        }
      });

      // Slowly rotate some rings or hubs for visual depth
      if (partDef.id === "station_habitat_ring" || partDef.id === "station_gravity_ring") {
        moduleGroup.userData = { rotateSpeed: 0.15 + random() * 0.2 };
      }

      stationGroup.add(moduleGroup);
      return moduleGroup;
    }

    // 1. Build Center Core
    const core = assembleModule(stationCoreHub, [0, 0, 0]);

    // 2. Attach Primary Modules (top and bottom)
    const topStrut = assembleModule(stationConnectingStrut, [0, 6, 0]);
    assembleModule(stationCommandBridge, [0, 11.2, 0]);

    const bottomStrut = assembleModule(stationConnectingStrut, [0, -6, 0]);
    assembleModule(stationReactorCore, [0, -11.5, 0]);

    // 3. Attach Radial Modules
    // Left: Habitat Ring
    assembleModule(stationHabitatRing, [-10, 0, 0], [0, 0, 1.5708]);
    
    // Right: Hangar Deck
    assembleModule(stationHangarDeck, [8, 0, 0], [0, 0, -1.5708]);
    assembleModule(stationDockingBay, [12.5, 0, 0], [0, 0, -1.5708]);

    // Front: Cargo & Refinery
    assembleModule(stationCargoRack, [0, 0, 8], [1.5708, 0, 0]);
    assembleModule(stationRefinery, [0, 0, 13.5], [1.5708, 0, 0]);

    // Back: Solar Panel array
    assembleModule(stationSolarArray, [0, 0, -9], [1.5708, 0, 0]);

    // 4. Attach detail extensions to modular slots
    // Top Spire
    assembleModule(stationSensorSpire, [0, 13.5, 0]);
    assembleModule(stationAntennaMast, [0, 17.5, 0]);

    // Bottom Defense and Shield Pylons
    assembleModule(stationDefensePlatform, [0, -15.5, 0], [3.14159, 0, 0]);
    assembleModule(stationShieldPylon, [-3.5, -12, 0], [0, 0, 0.5]);
    assembleModule(stationShieldPylon, [3.5, -12, 0], [0, 0, -0.5]);

    // Fuel and Radiators on the sides
    assembleModule(stationFuelTank, [-6.5, 6, 0], [0, 0, 1.5708]);
    assembleModule(stationFuelTank, [6.5, 6, 0], [0, 0, -1.5708]);
    assembleModule(stationRadiatorWing, [-12.5, -6, 0], [0, 0, 1.5708]);
    assembleModule(stationRadiatorWing, [12.5, -6, 0], [0, 0, -1.5708]);

    // Store references
    stationGroup.userData = {
      blinkers: blinkers,
      dockingPositions: [[8.0, 0.0, 0.0], [12.5, 0.0, 0.0]],
      collisionRadius: 20.0
    };

    // Scale up the space station to make it feel massive
    stationGroup.scale.set(1.5, 1.5, 1.5);

    return stationGroup;
  }
};
