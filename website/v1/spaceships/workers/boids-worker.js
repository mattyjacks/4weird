// 4weird Games - Web Worker: Boids Flocking AI
// Calculates separation, alignment, cohesion, and wander vectors.
// Optimized for speed and minimal memory allocations.
// No em-dashes or en-dashes used in comments.

self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === "calculate_flocking") {
    const { humans, aliens, wanderTarget, dt, bounds } = data;
    const results = [];

    // Helper functions for 3D vector math to avoid object creation
    function limit(v, max) {
      const lenSq = v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
      if (lenSq > max * max) {
        const len = Math.sqrt(lenSq);
        v[0] = (v[0] / len) * max;
        v[1] = (v[1] / len) * max;
        v[2] = (v[2] / len) * max;
      }
    }

    // Process humans
    for (let i = 0; i < humans.length; i++) {
      const ship = humans[i];
      const pos = ship.position;
      const vel = ship.velocity;

      // Force accumulators
      let sepX = 0.0, sepY = 0.0, sepZ = 0.0;
      let aliX = 0.0, aliY = 0.0, aliZ = 0.0;
      let cohX = 0.0, cohY = 0.0, cohZ = 0.0;

      let sepCount = 0;
      let neighborCount = 0;

      // Separation, Alignment, Cohesion distances (squared for speed)
      const sepDistSq = 2.2 * 2.2;
      const neighborDistSq = 12.0 * 12.0;

      for (let j = 0; j < humans.length; j++) {
        if (i === j) continue;
        const other = humans[j];
        const dx = pos[0] - other.position[0];
        const dy = pos[1] - other.position[1];
        const dz = pos[2] - other.position[2];
        const dSq = dx*dx + dy*dy + dz*dz;

        if (dSq > 0.0 && dSq < sepDistSq) {
          const d = Math.sqrt(dSq);
          sepX += dx / d;
          sepY += dy / d;
          sepZ += dz / d;
          sepCount++;
        }

        if (dSq > 0.0 && dSq < neighborDistSq) {
          aliX += other.velocity[0];
          aliY += other.velocity[1];
          aliZ += other.velocity[2];

          cohX += other.position[0];
          cohY += other.position[1];
          cohZ += other.position[2];
          neighborCount++;
        }
      }

      // Calculate boid steering
      let steerX = 0.0, steerY = 0.0, steerZ = 0.0;

      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
        sepZ /= sepCount;
        // Limit separation steering
        steerX += sepX * 2.0;
        steerY += sepY * 2.0;
        steerZ += sepZ * 2.0;
      }

      if (neighborCount > 0) {
        aliX /= neighborCount;
        aliY /= neighborCount;
        aliZ /= neighborCount;
        // Steering = Desired - Velocity
        steerX += (aliX - vel[0]) * 0.15;
        steerY += (aliY - vel[1]) * 0.15;
        steerZ += (aliZ - vel[2]) * 0.15;

        cohX /= neighborCount;
        cohY /= neighborCount;
        cohZ /= neighborCount;
        // Steering to target
        steerX += (cohX - pos[0]) * 0.08;
        steerY += (cohY - pos[1]) * 0.08;
        steerZ += (cohZ - pos[2]) * 0.08;
      }

      // Wander/Target seek force (leads the fleet towards background, i.e., -z direction)
      const tx = wanderTarget[0] + (ship.wanderOffset ? ship.wanderOffset[0] : 0.0);
      const ty = wanderTarget[1] + (ship.wanderOffset ? ship.wanderOffset[1] : 0.0);
      const tz = wanderTarget[2] + (ship.wanderOffset ? ship.wanderOffset[2] : 0.0);

      const dx = tx - pos[0];
      const dy = ty - pos[1];
      const dz = tz - pos[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1.0;
      
      // Strong pull forward (always moving along -z direction)
      steerX += (dx / dist) * 0.65;
      steerY += (dy / dist) * 0.65;
      steerZ += (dz / dist) * 0.65;

      // Obstacle avoidance for boundaries
      if (pos[0] < -bounds.width) steerX += 1.5;
      if (pos[0] > bounds.width) steerX -= 1.5;
      if (pos[1] < -bounds.height) steerY += 1.5;
      if (pos[1] > bounds.height) steerY -= 1.5;

      // If aliens are present, humans apply minor evasive wander logic or steer slightly
      if (aliens && aliens.length > 0) {
        const nearestAlien = getNearest(pos, aliens);
        if (nearestAlien && nearestAlien.distSq < 15.0 * 15.0) {
          const aPos = nearestAlien.pos;
          const adx = pos[0] - aPos[0];
          const ady = pos[1] - aPos[1];
          const adz = pos[2] - aPos[2];
          const aDist = Math.sqrt(adx*adx + ady*ady + adz*adz) || 1.0;
          steerX += (adx / aDist) * 0.8;
          steerY += (ady / aDist) * 0.8;
          steerZ += (adz / aDist) * 0.8;
        }
      }

      // Apply steer force to velocity
      const maxForce = 2.5;
      let f = [steerX, steerY, steerZ];
      limit(f, maxForce);

      const newVel = [
        vel[0] + f[0] * dt,
        vel[1] + f[1] * dt,
        vel[2] + f[2] * dt
      ];

      // Limit speed
      const maxSpeed = ship.maxSpeed || 8.0;
      limit(newVel, maxSpeed);

      // Maintain forward momentum (make sure z velocity stays negative/moving forward)
      if (newVel[2] > -2.0) {
        newVel[2] = -2.0;
      }

      // Update positions
      const newPos = [
        pos[0] + newVel[0] * dt,
        pos[1] + newVel[1] * dt,
        pos[2] + newVel[2] * dt
      ];

      results.push({
        id: ship.id,
        position: newPos,
        velocity: newVel
      });
    }

    // Process aliens (Chase and evade behavior)
    const alienResults = [];
    for (let i = 0; i < aliens.length; i++) {
      const alien = aliens[i];
      const pos = alien.position;
      const vel = alien.velocity;

      let steerX = 0.0, steerY = 0.0, steerZ = 0.0;

      // Aliens seek the center of the human fleet or a random human target
      if (humans.length > 0) {
        // Lock on to target
        let targetPos = [0.0, 0.0, 0.0];
        let targetFound = false;

        // Try to find targeted ship
        for (let j = 0; j < humans.length; j++) {
          if (humans[j].id === alien.targetId) {
            targetPos = humans[j].position;
            targetFound = true;
            break;
          }
        }

        // If no target, seek the first human
        if (!targetFound) {
          targetPos = humans[0].position;
        }

        const dx = targetPos[0] - pos[0];
        const dy = targetPos[1] - pos[1];
        const dz = targetPos[2] - pos[2];
        const distSq = dx*dx + dy*dy + dz*dz;
        const dist = Math.sqrt(distSq) || 1.0;

        if (dist > 8.0) {
          // Pursue human
          steerX += (dx / dist) * 3.5;
          steerY += (dy / dist) * 3.5;
          steerZ += (dz / dist) * 3.5;
        } else {
          // Break off / Evasive maneuver if too close to humans
          steerX += (pos[0] - targetPos[0]) * 1.5;
          steerY += (pos[1] - targetPos[1]) * 1.5 + 2.0; // Fly up
          steerZ += -2.0; // Speed ahead
        }

        // Add small corkscrew wander to make alien motion organic
        const timeFactor = Date.now() * 0.003;
        steerX += Math.sin(timeFactor + i) * 0.5;
        steerY += Math.cos(timeFactor * 0.8 + i) * 0.5;
      } else {
        // Just fly forward if no humans
        steerZ -= 1.0;
      }

      // Limit forces
      let f = [steerX, steerY, steerZ];
      limit(f, 6.0);

      const newVel = [
        vel[0] + f[0] * dt,
        vel[1] + f[1] * dt,
        vel[2] + f[2] * dt
      ];

      // Limit speed
      const maxSpeed = alien.maxSpeed || 10.0;
      limit(newVel, maxSpeed);

      // Move alien
      const newPos = [
        pos[0] + newVel[0] * dt,
        pos[1] + newVel[1] * dt,
        pos[2] + newVel[2] * dt
      ];

      alienResults.push({
        id: alien.id,
        position: newPos,
        velocity: newVel
      });
    }

    self.postMessage({
      type: "flocking_results",
      data: {
        humans: results,
        aliens: alienResults
      }
    });
  }
};

function getNearest(pos, targets) {
  let nearest = null;
  let minDistSq = Infinity;
  for (let i = 0; i < targets.length; i++) {
    const tPos = targets[i].position;
    const dx = pos[0] - tPos[0];
    const dy = pos[1] - tPos[1];
    const dz = pos[2] - tPos[2];
    const dSq = dx*dx + dy*dy + dz*dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      nearest = { pos: tPos, distSq: dSq };
    }
  }
  return nearest;
}
