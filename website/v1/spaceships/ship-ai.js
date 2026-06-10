// Advanced Ship AI System
// Individual ship AI with personalities, tactics, and decision making

class ShipAI {
  constructor(shipId, role, personality) {
    this.shipId = shipId;
    this.role = role; // leader, wingman, support
    this.personality = personality; // cautious, balanced, reckless, tactical, opportunistic
    this.aggression = this.getAggressionLevel();
    this.state = 'patrol'; // patrol, combat, repair, retreat
    this.currentTarget = null;
    this.lastDecision = Date.now();
    this.lastShot = 0;
    this.combatTactics = this.getCombatTactics();
  }

  getAggressionLevel() {
    const baseAggression = {
      'leader': 0.4,
      'wingman': 0.6,
      'support': 0.3
    };
    
    const personalityModifier = {
      'cautious': -0.2,
      'balanced': 0.0,
      'reckless': 0.3,
      'tactical': 0.1,
      'opportunistic': 0.2
    };
    
    return Math.max(0.1, Math.min(1.0, 
      baseAggression[this.role] + personalityModifier[this.personality]
    ));
  }

  getCombatTactics() {
    const tacticsByRole = {
      'leader': ['aggressive', 'tactical'],
      'wingman': ['evasive', 'flanking'],
      'support': ['support', 'evasive']
    };
    
    const roleTactics = tacticsByRole[this.role];
    return roleTactics[Math.floor(Math.random() * roleTactics.length)];
  }

  updateAI(ship, allHumanShips, allAliens, dt) {
    const now = Date.now();
    
    // Make decisions every second
    if (now - this.lastDecision > 1000) {
      this.lastDecision = now;
      this.makeDecision(ship, allHumanShips, allAliens);
    }
    
    // Execute current state behavior
    switch (this.state) {
      case 'combat':
        this.executeCombatTactics(ship, allAliens);
        break;
      case 'repair':
        this.executeRepairBehavior(ship);
        break;
      case 'retreat':
        this.executeRetreatBehavior(ship);
        break;
      default:
        this.executePatrolBehavior(ship);
    }
  }

  makeDecision(ship, allHumanShips, allAliens) {
    const nearestAlien = this.findNearestThreat(ship.position, allAliens);
    const nearestHuman = this.findNearestAlly(ship.position, allHumanShips);
    
    // Combat decision
    if (nearestAlien && nearestAlien.distance < 30) {
      this.state = 'combat';
      this.currentTarget = nearestAlien.ship;
      return;
    }
    
    // Repair decision
    const healthPercent = ship.ai.health / ship.ai.maxHealth;
    if (healthPercent < 0.3) {
      this.state = 'repair';
      this.currentTarget = null;
      return;
    }
    
    // Retreat decision
    if (healthPercent < 0.15) {
      this.state = 'retreat';
      this.currentTarget = null;
      return;
    }
    
    // Default to patrol
    this.state = 'patrol';
    this.currentTarget = null;
  }

  findNearestThreat(position, aliens) {
    let nearest = null;
    let minDist = Infinity;
    
    aliens.forEach((alien, id) => {
      const dist = position.distanceTo(alien.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = { ship: alien, distance: dist, id: id };
      }
    });
    
    return nearest;
  }

  findNearestAlly(position, humans, excludeId) {
    let nearest = null;
    let minDist = Infinity;
    
    humans.forEach((human, id) => {
      if (id !== excludeId) {
        const dist = position.distanceTo(human.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = { ship: human, distance: dist, id: id };
        }
      }
    });
    
    return nearest;
  }

  executeCombatTactics(ship, aliens) {
    if (!this.currentTarget) return;
    
    const target = aliens.get(this.currentTarget.id);
    if (!target) {
      this.state = 'patrol';
      return;
    }
    
    const now = Date.now();
    
    switch (this.combatTactics) {
      case 'evasive':
        this.executeEvasiveTactics(ship, target);
        break;
      case 'aggressive':
        this.executeAggressiveTactics(ship, target);
        break;
      case 'support':
        this.executeSupportTactics(ship, target);
        break;
      case 'flanking':
        this.executeFlankingTactics(ship, target);
        break;
      case 'tactical':
        this.executeTacticalTactics(ship, target);
        break;
    }
    
    // Fire weapon based on aggression
    const fireRate = 2000 - (this.aggression * 1000); // Higher aggression = faster fire rate
    if (now - this.lastShot > fireRate) {
      this.lastShot = now;
      this.fireWeapon(ship, target);
    }
  }

  executeEvasiveTactics(ship, target) {
    const evadeDir = new THREE.Vector3().subVectors(ship.position, target.position).normalize();
    const lateralOffset = new THREE.Vector3(evadeDir.z, 0, -evadeDir.x).multiplyScalar(0.3);
    
    ship.position.add(evadeDir.multiplyScalar(0.5));
    ship.position.add(lateralOffset);
    
    // Fire weapons while evading (less frequent)
    const now = Date.now();
    if (now - this.lastShot > 2500) { // Fire every 2.5 seconds
      this.fireWeapon(ship, target);
      this.lastShot = now;
    }
  }

  executeAggressiveTactics(ship, target) {
    const attackDir = new THREE.Vector3().subVectors(target.position, ship.position).normalize();
    ship.position.add(attackDir.multiplyScalar(0.4));
    
    // Fire weapons aggressively
    const now = Date.now();
    if (now - this.lastShot > 1500) { // Fire every 1.5 seconds
      this.fireWeapon(ship, target);
      this.lastShot = now;
    }
  }

  executeSupportTactics(ship, target) {
    const supportDist = 25;
    const supportDir = new THREE.Vector3().subVectors(ship.position, target.position).normalize();
    const idealPos = new THREE.Vector3().subVectors(target.position, supportDir.multiplyScalar(supportDist));
    
    ship.position.lerp(idealPos, 0.1);
    
    // Fire weapons to support allies
    const now = Date.now();
    if (now - this.lastShot > 2000) { // Fire every 2 seconds
      this.fireWeapon(ship, target);
      this.lastShot = now;
    }
  }

  executeFlankingTactics(ship, target) {
    const flankAngle = Date.now() * 0.002;
    const flankRadius = 20;
    
    const flankX = target.position.x + Math.cos(flankAngle) * flankRadius;
    const flankZ = target.position.z + Math.sin(flankAngle) * flankRadius;
    
    const targetPos = new THREE.Vector3(flankX, ship.position.y, flankZ);
    ship.position.lerp(targetPos, 0.05);
    
    // Fire weapons from flanking position
    const now = Date.now();
    if (now - this.lastShot > 1800) { // Fire every 1.8 seconds
      this.fireWeapon(ship, target);
      this.lastShot = now;
    }
  }

  executeTacticalTactics(ship, target) {
    // Analyze target movement and predict position
    const predictedPos = new THREE.Vector3().addVectors(
      target.position,
      new THREE.Vector3(...target.velocity).multiplyScalar(2)
    );
    
    const interceptDir = new THREE.Vector3().subVectors(predictedPos, ship.position).normalize();
    ship.position.add(interceptDir.multiplyScalar(0.3));
    
    // Fire weapons with tactical precision
    const now = Date.now();
    if (now - this.lastShot > 2200) { // Fire every 2.2 seconds
      this.fireWeapon(ship, target);
      this.lastShot = now;
    }
  }

  executePatrolBehavior(ship) {
    const time = Date.now() * 0.001;
    const offset = ship.wanderOffset || [0, 0, 0];
    
    ship.position.x = offset[0] + Math.sin(time * 0.5 + this.shipId.length) * 5;
    ship.position.y = offset[1] + Math.cos(time * 0.3 + this.shipId.length) * 2;
    ship.position.z = offset[2] - time * 2;
  }

  executeRepairBehavior(ship) {
    // Move away from combat and attempt repairs
    ship.position.z += 0.8; // Retreat
    
    // Request repair from repair system
    if (window.repairSystem) {
      window.repairSystem.repairShip(ship);
    }
  }

  executeRetreatBehavior(ship) {
    // Full retreat - move away from all threats
    ship.position.z += 1.2;
    ship.position.x += (Math.random() - 0.5) * 2;
    ship.position.y += (Math.random() - 0.5) * 1;
  }

  fireWeapon(ship, target) {
    if (window.weaponSystem) {
      window.weaponSystem.fireWeapon(ship, target, {
        damage: 20 + (this.aggression * 15),
        speed: 50 + (this.aggression * 20),
        color: this.personality === 'reckless' ? 0xff0000 : 0x00ff00
      });
    }
  }
}

export { ShipAI };
