// Realistic Spaceship Generator
// Creates authentic spaceship designs based on aerospace engineering principles
// with proper constraints and realistic component placement

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class ShipGenerator {
  constructor() {
    this.shipBlueprints = this.createRealisticBlueprints();
    this.materialSchemes = this.createAuthenticMaterials();
    this.componentLibrary = this.createRealisticComponents();
  }

  generateShipTemplates() {
    return {
      fighter: {
        baseSize: { x: 3, y: 2, z: 4 },
        coreShape: 'diamond',
        wingStyle: 'swept',
        engineCount: 2,
        weaponCount: 2,
        health: 150
      },
      bomber: {
        baseSize: { x: 4, y: 3, z: 5 },
        coreShape: 'blocky',
        wingStyle: 'straight',
        engineCount: 3,
        weaponCount: 4,
        health: 250
      },
      scout: {
        baseSize: { x: 2, y: 1, z: 3 },
        coreShape: 'streamlined',
        wingStyle: 'delta',
        engineCount: 1,
        weaponCount: 1,
        health: 100
      },
      cruiser: {
        baseSize: { x: 5, y: 4, z: 6 },
        coreShape: 'angular',
        wingStyle: 'heavy',
        engineCount: 4,
        weaponCount: 6,
        health: 400
      },
      interceptor: {
        baseSize: { x: 2.5, y: 1.5, z: 4.5 },
        coreShape: 'needle',
        wingStyle: 'variable',
        engineCount: 2,
        weaponCount: 2,
        health: 120
      }
    };
  }

  generateColorSchemes() {
    return [
      {
        primary: 0x4a90e2,    // Blue
        secondary: 0x2c5aa0,  // Dark blue
        accent: 0x87ceeb,     // Sky blue
        engine: 0xff6600,     // Orange
        weapon: 0x00ff00      // Green
      },
      {
        primary: 0xe74c3c,    // Red
        secondary: 0xc0392b,  // Dark red
        accent: 0xff6b6b,     // Light red
        engine: 0x00ffff,     // Cyan
        weapon: 0xffff00      // Yellow
      },
      {
        primary: 0x2ecc71,    // Green
        secondary: 0x27ae60,  // Dark green
        accent: 0x58d68d,     // Light green
        engine: 0xff00ff,     // Magenta
        weapon: 0xff9900      // Orange
      },
      {
        primary: 0x9b59b6,    // Purple
        secondary: 0x8e44ad,  // Dark purple
        accent: 0xbb8fce,     // Light purple
        engine: 0x00ff00,     // Green
        weapon: 0xff0000      // Red
      },
      {
        primary: 0xf39c12,    // Gold
        secondary: 0xd68910,  // Dark gold
        accent: 0xf4d03f,     // Yellow
        engine: 0x0099ff,     // Light blue
        weapon: 0xff3366      // Pink
      },
      {
        primary: 0x95a5a6,    // Silver
        secondary: 0x7f8c8d,  // Gray
        accent: 0xbdc3c7,     // Light gray
        engine: 0xff6600,     // Orange
        weapon: 0x00ccff      // Light blue
      }
    ];
  }

  generateComponentLibrary() {
    return {
      engines: [
        { type: 'standard', size: 0.4, power: 1.0 },
        { type: 'turbo', size: 0.5, power: 1.5 },
        { type: 'heavy', size: 0.6, power: 1.2 },
        { type: 'micro', size: 0.3, power: 0.8 }
      ],
      weapons: [
        { type: 'laser', size: 0.3, damage: 1.0 },
        { type: 'plasma', size: 0.4, damage: 1.5 },
        { type: 'cannon', size: 0.5, damage: 2.0 },
        { type: 'missile', size: 0.6, damage: 2.5 }
      ],
      cockpits: [
        { type: 'bubble', shape: 'sphere' },
        { type: 'angular', shape: 'box' },
        { type: 'streamlined', shape: 'wedge' },
        { type: 'armored', shape: 'hexagon' }
      ]
    };
  }

  generateRealisticShip(shipId, faction = 'human') {
    // Select realistic ship blueprint
    const blueprintNames = Object.keys(this.shipBlueprints);
    const blueprintName = blueprintNames[Math.floor(Math.random() * blueprintNames.length)];
    const blueprint = this.shipBlueprints[blueprintName];
    
    // Select appropriate material scheme
    const materialSchemeNames = Object.keys(this.materialSchemes);
    const materialName = materialSchemeNames[Math.floor(Math.random() * materialSchemeNames.length)];
    const materials = this.materialSchemes[materialName];
    
    // Create ship group
    const shipGroup = new THREE.Group();
    const voxels = [];
    
    // Generate fuselage (main body)
    this.generateFuselage(shipGroup, voxels, blueprint, materials);
    
    // Generate wings or stabilizers
    this.generateWings(shipGroup, voxels, blueprint, materials);
    
    // Generate engine assembly
    this.generateEngines(shipGroup, voxels, blueprint, materials);
    
    // Generate cockpit/bridge
    this.generateCockpit(shipGroup, voxels, blueprint, materials);
    
    // Generate weapon systems
    this.generateWeapons(shipGroup, voxels, blueprint, materials);
    
    // Generate structural elements
    this.generateStructure(shipGroup, voxels, blueprint, materials);
    
    // Add realistic details
    this.addRealisticDetails(shipGroup, voxels, blueprint, materials);
    
    // Set ship data
    shipGroup.userData = {
      voxels: voxels,
      faction: faction,
      shipId: shipId,
      shipClass: blueprintName,
      blueprint: blueprint,
      materials: materials,
      collisionRadius: Math.max(blueprint.width, blueprint.height) * 0.5,
      totalHealth: blueprint.mass / 100, // Health based on mass
      maxTotalHealth: blueprint.mass / 100,
      functionalVoxels: {
        engines: voxels.filter(v => v.userData.type === 'engine').length,
        weapons: voxels.filter(v => v.userData.type === 'weapon').length,
        cockpit: voxels.filter(v => v.userData.type === 'cockpit').length,
        hull: voxels.filter(v => v.userData.type === 'hull').length,
        structure: voxels.filter(v => v.userData.type === 'structure').length
      }
    };
    
    return shipGroup;
  }

  generateCoreStructure(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize, coreShape } = template;
    const voxelSize = 0.3;
    
    // Generate different core shapes
    switch (coreShape) {
      case 'diamond':
        this.generateDiamondCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'blocky':
        this.generateBlockyCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'streamlined':
        this.generateStreamlinedCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'angular':
        this.generateAngularCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'needle':
        this.generateNeedleCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      default:
        this.generateDiamondCore(shipGroup, voxels, baseSize, colorScheme, voxelSize);
    }
  }

  generateDiamondCore(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Create diamond-shaped core
    for (let x = -baseSize.x; x <= baseSize.x; x++) {
      for (let y = -baseSize.y; y <= baseSize.y; y++) {
        for (let z = -baseSize.z; z <= baseSize.z; z++) {
          // Diamond shape equation
          const normalizedDist = (Math.abs(x) / baseSize.x) + 
                                (Math.abs(y) / baseSize.y) + 
                                (Math.abs(z) / baseSize.z);
          
          if (normalizedDist <= 1.2) {
            const voxel = this.createVoxel('hull', colorScheme.primary, x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateBlockyCore(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Create rectangular block core
    for (let x = -baseSize.x; x <= baseSize.x; x++) {
      for (let y = -baseSize.y; y <= baseSize.y; y++) {
        for (let z = -baseSize.z; z <= baseSize.z; z++) {
          if (Math.abs(x) <= baseSize.x * 0.8 && 
              Math.abs(y) <= baseSize.y * 0.8 && 
              Math.abs(z) <= baseSize.z * 0.8) {
            const voxel = this.createVoxel('hull', colorScheme.primary, x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateStreamlinedCore(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Create streamlined, teardrop-shaped core
    for (let x = -baseSize.x; x <= baseSize.x; x++) {
      for (let y = -baseSize.y; y <= baseSize.y; y++) {
        for (let z = -baseSize.z; z <= baseSize.z; z++) {
          // Teardrop shape - wider at back, narrow at front
          const widthFactor = 1 - (z + baseSize.z) / (baseSize.z * 2) * 0.5;
          const normalizedDist = (Math.abs(x) / (baseSize.x * widthFactor)) + 
                                (Math.abs(y) / (baseSize.y * widthFactor)) + 
                                (Math.abs(z) / baseSize.z);
          
          if (normalizedDist <= 1.1) {
            const voxel = this.createVoxel('hull', colorScheme.primary, x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateAngularCore(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Create angular, geometric core
    for (let x = -baseSize.x; x <= baseSize.x; x++) {
      for (let y = -baseSize.y; y <= baseSize.y; y++) {
        for (let z = -baseSize.z; z <= baseSize.z; z++) {
          // Angular shape with flat facets
          const facetDist = Math.max(
            Math.abs(x) / baseSize.x,
            Math.abs(y) / baseSize.y,
            Math.abs(z) / baseSize.z
          );
          
          if (facetDist <= 1.0) {
            const color = Math.random() > 0.7 ? colorScheme.secondary : colorScheme.primary;
            const voxel = this.createVoxel('hull', color, x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateNeedleCore(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Create thin, needle-like core
    for (let x = -baseSize.x; x <= baseSize.x; x++) {
      for (let y = -baseSize.y; y <= baseSize.y; y++) {
        for (let z = -baseSize.z; z <= baseSize.z; z++) {
          // Needle shape - very thin width, long length
          const widthFactor = 0.3 + Math.abs(z) / baseSize.z * 0.2;
          const normalizedDist = (Math.abs(x) / (baseSize.x * widthFactor)) + 
                                (Math.abs(y) / (baseSize.y * widthFactor));
          
          if (normalizedDist <= 1.0 && Math.abs(z) <= baseSize.z) {
            const voxel = this.createVoxel('hull', colorScheme.primary, x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateWings(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize, wingStyle } = template;
    const voxelSize = 0.3;
    
    switch (wingStyle) {
      case 'swept':
        this.generateSweptWings(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'straight':
        this.generateStraightWings(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'delta':
        this.generateDeltaWings(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'heavy':
        this.generateHeavyWings(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
      case 'variable':
        this.generateVariableWings(shipGroup, voxels, baseSize, colorScheme, voxelSize);
        break;
    }
  }

  generateSweptWings(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Swept-back wings
    const wingSpan = baseSize.x * 2.5;
    const wingLength = baseSize.z * 0.8;
    
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= wingSpan; x++) {
        for (let z = -wingLength; z <= 0; z++) {
          // Wing gets narrower as it goes back
          const wingWidth = 1 - (z / wingLength) * 0.5;
          if (x <= wingSpan * wingWidth) {
            const y = Math.sin(x / wingSpan * Math.PI) * 0.5;
            const voxel = this.createVoxel('hull', colorScheme.secondary, 
              side * x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateStraightWings(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Straight, rectangular wings
    const wingSpan = baseSize.x * 2;
    const wingLength = baseSize.z * 0.6;
    
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= wingSpan; x++) {
        for (let z = -wingLength; z <= 0; z++) {
          const voxel = this.createVoxel('hull', colorScheme.secondary, 
            side * x * voxelSize, 0, z * voxelSize);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
  }

  generateDeltaWings(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Delta-shaped wings (triangle)
    const wingSpan = baseSize.x * 2;
    const wingLength = baseSize.z * 0.8;
    
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= wingSpan; x++) {
        for (let z = -wingLength; z <= 0; z++) {
          // Delta wing shape - wide at back, point at front
          const wingWidth = 1 - Math.abs(z) / wingLength;
          if (x <= wingSpan * wingWidth) {
            const voxel = this.createVoxel('hull', colorScheme.accent, 
              side * x * voxelSize, 0, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateHeavyWings(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Heavy, thick wings
    const wingSpan = baseSize.x * 1.8;
    const wingLength = baseSize.z * 0.7;
    const wingThickness = 2;
    
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= wingSpan; x++) {
        for (let y = -wingThickness; y <= wingThickness; y++) {
          for (let z = -wingLength; z <= 0; z++) {
            const voxel = this.createVoxel('hull', colorScheme.secondary, 
              side * x * voxelSize, y * voxelSize, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateVariableWings(shipGroup, voxels, baseSize, colorScheme, voxelSize) {
    // Variable geometry wings (random shape)
    const wingSpan = baseSize.x * (1.5 + Math.random());
    const wingLength = baseSize.z * (0.5 + Math.random() * 0.5);
    
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= wingSpan; x++) {
        for (let z = -wingLength; z <= 0; z++) {
          // Random wing shape
          const noise = Math.sin(x * 0.5) * Math.cos(z * 0.3);
          if (noise > 0.2) {
            const voxel = this.createVoxel('hull', colorScheme.accent, 
              side * x * voxelSize, 0, z * voxelSize);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateEngines(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize, engineCount } = template;
    const voxelSize = 0.3;
    
    // Select random engine types
    const engineTypes = this.componentLibrary.engines;
    
    for (let i = 0; i < engineCount; i++) {
      const engineType = engineTypes[Math.floor(Math.random() * engineTypes.length)];
      const engineX = (i - (engineCount - 1) / 2) * (baseSize.x / engineCount);
      const engineZ = baseSize.z + 1;
      
      // Create engine block
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 0; y++) {
          const voxel = this.createVoxel('engine', colorScheme.engine, 
            (engineX + x) * voxelSize, y * voxelSize, engineZ * voxelSize);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
  }

  generateWeapons(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize, weaponCount } = template;
    const voxelSize = 0.3;
    
    // Select random weapon types
    const weaponTypes = this.componentLibrary.weapons;
    
    for (let i = 0; i < weaponCount; i++) {
      const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      
      // Position weapons on wings or front
      let weaponX, weaponZ;
      if (i % 2 === 0) {
        weaponX = -baseSize.x - 1;
      } else {
        weaponX = baseSize.x + 1;
      }
      weaponZ = -baseSize.z * 0.5;
      
      // Create weapon block
      for (let y = 0; y <= 1; y++) {
        const voxel = this.createVoxel('weapon', colorScheme.weapon, 
          weaponX * voxelSize, y * voxelSize, weaponZ * voxelSize);
        shipGroup.add(voxel);
        voxels.push(voxel);
      }
    }
  }

  generateCockpit(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize } = template;
    const voxelSize = 0.3;
    
    // Select random cockpit type
    const cockpitTypes = this.componentLibrary.cockpits;
    const cockpitType = cockpitTypes[Math.floor(Math.random() * cockpitTypes.length)];
    
    // Create cockpit at front of ship
    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        for (let z = -baseSize.z - 1; z <= -baseSize.z + 1; z++) {
          const voxel = this.createVoxel('cockpit', colorScheme.accent, 
            x * voxelSize, y * voxelSize, z * voxelSize);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
  }

  generateDetails(shipGroup, voxels, template, colorScheme, faction) {
    const { baseSize } = template;
    const voxelSize = 0.3;
    
    // Add random details and greebles
    const detailCount = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < detailCount; i++) {
      const detailX = (Math.random() - 0.5) * baseSize.x * 2;
      const detailY = (Math.random() - 0.5) * baseSize.y * 2;
      const detailZ = (Math.random() - 0.5) * baseSize.z * 2;
      
      // Small detail voxel
      const voxel = this.createVoxel('hull', colorScheme.secondary, 
        detailX * voxelSize, detailY * voxelSize, detailZ * voxelSize);
      voxel.scale.set(0.5, 0.5, 0.5);
      shipGroup.add(voxel);
      voxels.push(voxel);
    }
  }

  createVoxel(type, color, x, y, z) {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    
    let emissiveColor = 0x000000;
    let emissiveIntensity = 0;
    let health = 100;
    
    switch (type) {
      case 'hull':
        health = 100;
        break;
      case 'cockpit':
        emissiveColor = color;
        emissiveIntensity = 0.3;
        health = 150;
        break;
      case 'engine':
        emissiveColor = color;
        emissiveIntensity = 0.5;
        health = 80;
        break;
      case 'weapon':
        emissiveColor = color;
        emissiveIntensity = 0.2;
        health = 60;
        break;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.3,
      emissive: emissiveColor,
      emissiveIntensity: emissiveIntensity
    });
    
    const voxel = new THREE.Mesh(geometry, material);
    voxel.position.set(x, y, z);
    voxel.userData = {
      health: health,
      maxHealth: health,
      type: type,
      originalColor: color,
      originalEmissive: emissiveColor
    };
    
    return voxel;
  }
}

export { ShipGenerator };
