// Realistic Spaceship Generator
// Creates authentic spaceship designs based on aerospace engineering principles
// with proper constraints and realistic component placement

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class RealisticShipGenerator {
  constructor() {
    this.shipBlueprints = this.createRealisticBlueprints();
    this.materialSchemes = this.createAuthenticMaterials();
    this.componentLibrary = this.createRealisticComponents();
  }

  createRealisticBlueprints() {
    return {
      // Light Fighter - Based on modern fighter jets
      lightFighter: {
        length: 12.0,
        width: 8.0,
        height: 3.0,
        mass: 15000,
        role: 'interceptor',
        crew: 1,
        engineConfig: { count: 2, type: 'turbojet', position: 'rear' },
        wingConfig: { type: 'delta', span: 8.0, sweep: 45, thickness: 0.8 },
        cockpitConfig: { type: 'bubble', position: 'front', visibility: 'high' },
        weaponConfig: { hardpoints: 4, primary: 'cannon', secondary: 'missiles' },
        structure: { frame: 'titanium', armor: 'light', shielding: 'minimal' }
      },
      
      // Heavy Fighter - Based on attack aircraft
      heavyFighter: {
        length: 16.0,
        width: 12.0,
        height: 4.0,
        mass: 25000,
        role: 'assault',
        crew: 1,
        engineConfig: { count: 2, type: 'afterburner', position: 'rear' },
        wingConfig: { type: 'straight', span: 12.0, sweep: 15, thickness: 1.2 },
        cockpitConfig: { type: 'armored', position: 'front', visibility: 'medium' },
        weaponConfig: { hardpoints: 6, primary: 'gatling', secondary: 'rockets' },
        structure: { frame: 'steel', armor: 'medium', shielding: 'light' }
      },
      
      // Bomber - Based on strategic bombers
      bomber: {
        length: 24.0,
        width: 20.0,
        height: 6.0,
        mass: 45000,
        role: 'bombardment',
        crew: 2,
        engineConfig: { count: 4, type: 'turbofan', position: 'wing' },
        wingConfig: { type: 'swept', span: 20.0, sweep: 35, thickness: 2.0 },
        cockpitConfig: { type: 'dual', position: 'front', visibility: 'medium' },
        weaponConfig: { hardpoints: 8, primary: 'bombs', secondary: 'defensive' },
        structure: { frame: 'aluminum', armor: 'heavy', shielding: 'medium' }
      },
      
      // Corvette - Small military vessel
      corvette: {
        length: 40.0,
        width: 15.0,
        height: 8.0,
        mass: 80000,
        role: 'patrol',
        crew: 4,
        engineConfig: { count: 3, type: 'ion', position: 'rear' },
        wingConfig: { type: 'fixed', span: 15.0, sweep: 0, thickness: 3.0 },
        cockpitConfig: { type: 'bridge', position: 'upper', visibility: 'high' },
        weaponConfig: { hardpoints: 12, primary: 'turrets', secondary: 'missiles' },
        structure: { frame: 'titanium', armor: 'medium', shielding: 'heavy' }
      },
      
      // Frigate - Medium warship
      frigate: {
        length: 60.0,
        width: 20.0,
        height: 12.0,
        mass: 150000,
        role: 'escort',
        crew: 8,
        engineConfig: { count: 4, type: 'fusion', position: 'rear' },
        wingConfig: { type: 'none', span: 0, sweep: 0, thickness: 0 },
        cockpitConfig: { type: 'command', position: 'central', visibility: 'high' },
        weaponConfig: { hardpoints: 16, primary: 'cannons', secondary: 'torpedoes' },
        structure: { frame: 'composite', armor: 'heavy', shielding: 'heavy' }
      }
    };
  }

  createAuthenticMaterials() {
    return {
      military: {
        primary: 0x2c3e50,      // Dark slate blue
        secondary: 0x34495e,    // Dark blue-gray
        accent: 0xe74c3c,        // Military red
        metallic: 0x95a5a6,      // Silver-gray
        cockpit: 0x1abc9c,       // Teal glass
        engine: 0xe67e22,        // Orange glow
        warning: 0xf39c12        // Yellow warning stripes
      },
      
      stealth: {
        primary: 0x1a1a1a,      // Matte black
        secondary: 0x2d2d2d,    // Dark gray
        accent: 0x0f0f0f,        // Ultra black
        metallic: 0x3a3a3a,      // Dark metallic
        cockpit: 0x0a0a0a,       // Black glass
        engine: 0x1a1a1a,        // Hidden engines
        warning: 0x2c2c2c        // Subtle warnings
      },
      
      corporate: {
        primary: 0xffffff,       // White
        secondary: 0xecf0f1,     // Light gray
        accent: 0x3498db,        // Corporate blue
        metallic: 0xbdc3c7,      // Light silver
        cockpit: 0x2980b9,       // Blue glass
        engine: 0xe74c3c,        // Red engines
        warning: 0xf1c40f        // Yellow warnings
      },
      
      pirate: {
        primary: 0x8b4513,       // Brown
        secondary: 0x654321,     // Dark brown
        accent: 0xffd700,        // Gold trim
        metallic: 0xcd853f,      // Peru metallic
        cockpit: 0x4b4b4b,       // Dark glass
        engine: 0xff4500,        // Orange-red engines
        warning: 0xffd700        // Gold warnings
      },
      
      explorer: {
        primary: 0x16a085,       // Turquoise
        secondary: 0x138d75,     // Dark turquoise
        accent: 0xf39c12,        // Orange accent
        metallic: 0x7f8c8d,      // Gray metallic
        cockpit: 0x3498db,       // Blue glass
        engine: 0xe67e22,        // Orange engines
        warning: 0xf1c40f        // Yellow warnings
      }
    };
  }

  createRealisticComponents() {
    return {
      engines: {
        turbojet: {
          diameter: 1.2,
          length: 4.0,
          thrust: 50000,
          color: 0xe67e22,
          glowIntensity: 0.8,
          exhaustLength: 8.0
        },
        afterburner: {
          diameter: 1.5,
          length: 5.0,
          thrust: 80000,
          color: 0xff6b6b,
          glowIntensity: 1.0,
          exhaustLength: 12.0
        },
        turbofan: {
          diameter: 2.0,
          length: 6.0,
          thrust: 60000,
          color: 0x3498db,
          glowIntensity: 0.6,
          exhaustLength: 10.0
        },
        ion: {
          diameter: 1.8,
          length: 8.0,
          thrust: 40000,
          color: 0x9b59b6,
          glowIntensity: 0.9,
          exhaustLength: 15.0
        },
        fusion: {
          diameter: 2.5,
          length: 10.0,
          thrust: 120000,
          color: 0x3498db,
          glowIntensity: 1.0,
          exhaustLength: 20.0
        }
      },
      
      cockpits: {
        bubble: {
          shape: 'hemisphere',
          width: 2.0,
          height: 1.5,
          visibility: 0.9,
          armor: 'light'
        },
        armored: {
          shape: 'truncated',
          width: 2.2,
          height: 1.8,
          visibility: 0.6,
          armor: 'heavy'
        },
        dual: {
          shape: 'tandem',
          width: 2.5,
          height: 2.0,
          visibility: 0.7,
          armor: 'medium'
        },
        bridge: {
          shape: 'rectangular',
          width: 4.0,
          height: 3.0,
          visibility: 0.8,
          armor: 'medium'
        },
        command: {
          shape: 'pyramid',
          width: 6.0,
          height: 4.0,
          visibility: 0.85,
          armor: 'heavy'
        }
      },
      
      weapons: {
        cannon: {
          caliber: 20,
          length: 3.0,
          fireRate: 600,
          damage: 25,
          color: 0xff6b6b
        },
        gatling: {
          caliber: 30,
          length: 4.0,
          fireRate: 1200,
          damage: 15,
          color: 0xff4444
        },
        missiles: {
          caliber: 15,
          length: 2.5,
          fireRate: 2,
          damage: 100,
          color: 0xffd700
        },
        rockets: {
          caliber: 70,
          length: 2.0,
          fireRate: 4,
          damage: 75,
          color: 0xff8c00
        },
        turrets: {
          caliber: 40,
          length: 5.0,
          fireRate: 180,
          damage: 50,
          color: 0xff6347
        },
        torpedoes: {
          caliber: 50,
          length: 6.0,
          fireRate: 1,
          damage: 200,
          color: 0x00ffff
        }
      }
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

  generateFuselage(shipGroup, voxels, blueprint, materials) {
    const { length, width, height } = blueprint;
    const voxelSize = 0.3;
    
    // Create streamlined fuselage using aerodynamic principles
    for (let z = -length/2; z <= length/2; z += voxelSize) {
      // Calculate fuselage cross-section at this position
      const normalizedZ = z / (length/2);
      
      // Fuselage profile - thicker in middle, tapered at ends
      const widthProfile = this.getFuselageProfile(normalizedZ, width);
      const heightProfile = this.getFuselageProfile(normalizedZ, height);
      
      for (let x = -widthProfile/2; x <= widthProfile/2; x += voxelSize) {
        for (let y = -heightProfile/2; y <= heightProfile/2; y += voxelSize) {
          // Create elliptical cross-section
          const normalizedX = x / (widthProfile/2);
          const normalizedY = y / (heightProfile/2);
          
          if (normalizedX * normalizedX + normalizedY * normalizedY <= 1.0) {
            const voxel = this.createVoxel('hull', materials.primary, x, y, z);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  getFuselageProfile(normalizedZ, maxDimension) {
    // Realistic fuselage profile based on aircraft design
    const absZ = Math.abs(normalizedZ);
    
    if (absZ < 0.3) {
      // Mid-section - full width
      return maxDimension;
    } else if (absZ < 0.7) {
      // Transition zone
      return maxDimension * (1 - (absZ - 0.3) * 0.3);
    } else {
      // Nose/tail - tapered
      return maxDimension * 0.4 * (1 - absZ);
    }
  }

  generateWings(shipGroup, voxels, blueprint, materials) {
    const { length, width, wingConfig } = blueprint;
    const voxelSize = 0.3;
    
    if (wingConfig.type === 'none') {
      // No wings for large ships
      return;
    }
    
    const { span, sweep, thickness } = wingConfig;
    
    // Generate wings using realistic aerodynamic principles
    for (let side = -1; side <= 1; side += 2) {
      for (let x = 0; x <= span/2; x += voxelSize) {
        for (let z = -length/4; z <= length/4; z += voxelSize) {
          // Wing sweep calculation
          const sweepOffset = z * Math.tan(sweep * Math.PI / 180);
          const actualX = side * (x + sweepOffset);
          
          // Wing thickness profile - thicker at root, thinner at tip
          const thicknessProfile = thickness * (1 - x / (span/2) * 0.5);
          
          for (let y = -thicknessProfile/2; y <= thicknessProfile/2; y += voxelSize) {
            // Check if within wing boundaries
            if (x <= span/2 * (1 - Math.abs(z) / (length/4) * 0.3)) {
              const color = Math.random() > 0.8 ? materials.accent : materials.secondary;
              const voxel = this.createVoxel('structure', color, actualX, y, z);
              shipGroup.add(voxel);
              voxels.push(voxel);
            }
          }
        }
      }
    }
  }

  generateEngines(shipGroup, voxels, blueprint, materials) {
    const { length, engineConfig } = blueprint;
    const voxelSize = 0.3;
    
    const { count, type, position } = engineConfig;
    const engineSpec = this.componentLibrary.engines[type];
    
    for (let i = 0; i < count; i++) {
      let engineX, engineZ, engineY;
      
      if (position === 'rear') {
        engineX = (i - (count - 1) / 2) * 2.0;
        engineZ = length/2;
        engineY = 0;
      } else if (position === 'wing') {
        engineX = (i % 2 === 0 ? -1 : 1) * (blueprint.width/2 - 2);
        engineZ = -length/4 + Math.floor(i/2) * 2;
        engineY = -1;
      }
      
      // Create engine housing
      for (let x = -engineSpec.diameter/2; x <= engineSpec.diameter/2; x += voxelSize) {
        for (let y = -engineSpec.diameter/2; y <= engineSpec.diameter/2; y += voxelSize) {
          for (let z = -engineSpec.length/2; z <= engineSpec.length/2; z += voxelSize) {
            // Cylindrical engine shape
            const radius = Math.sqrt(x*x + y*y);
            if (radius <= engineSpec.diameter/2) {
              const voxel = this.createVoxel('engine', materials.engine, engineX + x, engineY + y, engineZ + z);
              shipGroup.add(voxel);
              voxels.push(voxel);
            }
          }
        }
      }
      
      // Add exhaust glow
      const exhaustGlow = this.createVoxel('engine', engineSpec.color, engineX, engineY, engineZ + engineSpec.length/2);
      exhaustGlow.material.emissive = new THREE.Color(engineSpec.color);
      exhaustGlow.material.emissiveIntensity = engineSpec.glowIntensity;
      shipGroup.add(exhaustGlow);
      voxels.push(exhaustGlow);
    }
  }

  generateCockpit(shipGroup, voxels, blueprint, materials) {
    const { length, cockpitConfig } = blueprint;
    const voxelSize = 0.3;
    
    const { type, position, visibility } = cockpitConfig;
    const cockpitSpec = this.componentLibrary.cockpits[type];
    
    let cockpitX, cockpitY, cockpitZ;
    
    if (position === 'front') {
      cockpitX = 0;
      cockpitY = cockpitSpec.height/2;
      cockpitZ = -length/2 + 2;
    } else if (position === 'upper') {
      cockpitX = 0;
      cockpitY = blueprint.height/2;
      cockpitZ = 0;
    } else if (position === 'central') {
      cockpitX = 0;
      cockpitY = 0;
      cockpitZ = 0;
    }
    
    // Create cockpit based on shape
    if (cockpitSpec.shape === 'hemisphere') {
      // Bubble canopy
      for (let x = -cockpitSpec.width/2; x <= cockpitSpec.width/2; x += voxelSize) {
        for (let y = 0; y <= cockpitSpec.height; y += voxelSize) {
          for (let z = -cockpitSpec.width/2; z <= cockpitSpec.width/2; z += voxelSize) {
            // Hemispherical shape
            const radius = Math.sqrt(x*x + y*y + z*z);
            if (radius <= cockpitSpec.width/2) {
              const voxel = this.createVoxel('cockpit', materials.cockpit, cockpitX + x, cockpitY + y, cockpitZ + z);
              voxel.material.transparent = true;
              voxel.material.opacity = visibility;
              shipGroup.add(voxel);
              voxels.push(voxel);
            }
          }
        }
      }
    } else if (cockpitSpec.shape === 'rectangular') {
      // Bridge structure
      for (let x = -cockpitSpec.width/2; x <= cockpitSpec.width/2; x += voxelSize) {
        for (let y = 0; y <= cockpitSpec.height; y += voxelSize) {
          for (let z = -cockpitSpec.width/2; z <= cockpitSpec.width/2; z += voxelSize) {
            const voxel = this.createVoxel('cockpit', materials.cockpit, cockpitX + x, cockpitY + y, cockpitZ + z);
            voxel.material.transparent = true;
            voxel.material.opacity = visibility;
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
  }

  generateWeapons(shipGroup, voxels, blueprint, materials) {
    const { length, width, weaponConfig } = blueprint;
    const voxelSize = 0.3;
    
    const { hardpoints, primary, secondary } = weaponConfig;
    const primarySpec = this.componentLibrary.weapons[primary];
    const secondarySpec = this.componentLibrary.weapons[secondary];
    
    // Distribute weapons logically on the ship
    const weaponPositions = this.calculateWeaponPositions(blueprint, hardpoints);
    
    weaponPositions.forEach((pos, index) => {
      const weaponType = index < hardpoints/2 ? primary : secondary;
      const weaponSpec = weaponType === primary ? primarySpec : secondarySpec;
      
      // Create weapon housing
      for (let x = -0.3; x <= 0.3; x += voxelSize) {
        for (let y = -0.3; y <= 0.3; y += voxelSize) {
          for (let z = -weaponSpec.length/2; z <= weaponSpec.length/2; z += voxelSize) {
            const voxel = this.createVoxel('weapon', materials.accent, pos.x + x, pos.y + y, pos.z + z);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    });
  }

  calculateWeaponPositions(blueprint, hardpoints) {
    const positions = [];
    const { length, width } = blueprint;
    
    // Distribute weapons strategically
    for (let i = 0; i < hardpoints; i++) {
      let x, y, z;
      
      if (i < 2) {
        // Forward weapons
        x = (i === 0 ? -1 : 1) * width/4;
        y = 0;
        z = -length/2 + 1;
      } else if (i < 4) {
        // Wing weapons
        x = (i === 2 ? -1 : 1) * width/2;
        y = -1;
        z = 0;
      } else {
        // Rear/Side weapons
        x = (i % 2 === 0 ? -1 : 1) * width/3;
        y = 1;
        z = length/4;
      }
      
      positions.push({ x, y, z });
    }
    
    return positions;
  }

  generateStructure(shipGroup, voxels, blueprint, materials) {
    const { length, width, height } = blueprint;
    const voxelSize = 0.3;
    
    // Add structural beams and supports
    const beamCount = Math.floor(length / 4);
    
    for (let i = 0; i < beamCount; i++) {
      const beamZ = -length/2 + (i + 1) * length / (beamCount + 1);
      
      // Longitudinal beams
      for (let x = -width/2; x <= width/2; x += voxelSize * 4) {
        for (let y = -height/2; y <= height/2; y += voxelSize * 4) {
          const voxel = this.createVoxel('structure', materials.metallic, x, y, beamZ);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
  }

  addRealisticDetails(shipGroup, voxels, blueprint, materials) {
    const { length, width } = blueprint;
    const voxelSize = 0.3;
    
    // Add access panels, hatches, and maintenance points
    const detailCount = 8 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < detailCount; i++) {
      const detailX = (Math.random() - 0.5) * width * 0.8;
      const detailY = (Math.random() - 0.5) * blueprint.height * 0.8;
      const detailZ = (Math.random() - 0.5) * length * 0.8;
      
      // Small detail voxel
      const voxel = this.createVoxel('hull', materials.warning, detailX, detailY, detailZ);
      voxel.scale.set(0.5, 0.5, 0.5);
      shipGroup.add(voxel);
      voxels.push(voxel);
    }
    
    // Add communication antennas
    for (let i = 0; i < 2; i++) {
      const antennaX = (i === 0 ? -1 : 1) * width/4;
      const antennaY = blueprint.height/2;
      const antennaZ = -length/4;
      
      const antenna = this.createVoxel('structure', materials.metallic, antennaX, antennaY, antennaZ);
      antenna.scale.set(0.2, 2.0, 0.2);
      shipGroup.add(antenna);
      voxels.push(antenna);
    }
  }

  createVoxel(type, color, x, y, z) {
    // Temporarily disabled performance manager to fix loading
    // if (window.performanceManager) {
    //   return window.performanceManager.createOptimizedVoxel(type, color, x, y, z);
    // }
    
    // Fallback to original voxel creation
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    
    let emissiveColor = 0x000000;
    let emissiveIntensity = 0;
    let health = 100;
    let metalness = 0.8;
    let roughness = 0.3;
    
    switch (type) {
      case 'hull':
        health = 100;
        break;
      case 'cockpit':
        emissiveColor = color;
        emissiveIntensity = 0.2;
        health = 150;
        break;
      case 'engine':
        emissiveColor = color;
        emissiveIntensity = 0.4;
        health = 80;
        break;
      case 'weapon':
        emissiveColor = color;
        emissiveIntensity = 0.1;
        health = 60;
        break;
      case 'structure':
        metalness = 0.9;
        roughness = 0.2;
        health = 120;
        break;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: metalness,
      roughness: roughness,
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

export { RealisticShipGenerator };
