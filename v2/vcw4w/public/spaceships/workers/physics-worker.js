// 4weird Games - Web Worker: Physics, Collisions & Gravity Beam
// Handles laser movement, collision checks, and gravity tractor beam logic.
// Optimized for speed and low CPU utilization.
// No em-dashes or en-dashes used in comments.

self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === "simulate_physics") {
    const { projectiles, aliens, humans, debris, dt, fleetZ } = data;

    const hitEvents = [];
    const collectEvents = [];
    const beamLines = []; // visual coordinates for tractor beams

    // 1. Move Projectiles and Check Collisions with Aliens
    const activeProjectiles = [];
    const activeAliens = [...aliens];

    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      // Update projectile position
      p.position[0] += p.velocity[0] * dt;
      p.position[1] += p.velocity[1] * dt;
      p.position[2] += p.velocity[2] * dt;

      // Check lifetime or out-of-bounds (z range is usually 250 units)
      p.life = (p.life || 0.0) + dt;
      const distSqFromOrigin = p.position[0]*p.position[0] + p.position[1]*p.position[1];

      let isDestroyed = p.life > 4.0 || distSqFromOrigin > 200.0 * 200.0;

      if (!isDestroyed && p.owner === "human") {
        // Check collision against all aliens
        for (let j = activeAliens.length - 1; j >= 0; j--) {
          const a = activeAliens[j];
          if (a.health <= 0) continue;

          const dx = p.position[0] - a.position[0];
          const dy = p.position[1] - a.position[1];
          const dz = p.position[2] - a.position[2];
          const distSq = dx*dx + dy*dy + dz*dz;

          // Alien collision radius (typically 3.0 to 4.0 units depending on size)
          const collisionRadius = a.radius || 3.0;

          if (distSq < collisionRadius * collisionRadius) {
            // Hit detected!
            hitEvents.push({
              alienId: a.id,
              projectileId: p.id,
              damage: p.damage || 1,
              hitPos: [...p.position]
            });
            a.health -= p.damage || 1;
            isDestroyed = true;
            break;
          }
        }
      } else if (!isDestroyed && p.owner === "alien") {
        // Check collision against all humans
        for (let j = 0; j < humans.length; j++) {
          const h = humans[j];
          const dx = p.position[0] - h.position[0];
          const dy = p.position[1] - h.position[1];
          const dz = p.position[2] - h.position[2];
          const distSq = dx*dx + dy*dy + dz*dz;
          const collisionRadius = h.radius || 2.0;

          if (distSq < collisionRadius * collisionRadius) {
            // Hit detected on human! Humans always win, so we just register minor shield impacts
            hitEvents.push({
              humanId: h.id,
              projectileId: p.id,
              damage: 0, // Human shields take 0 permanent damage for visual story
              hitPos: [...p.position]
            });
            isDestroyed = true;
            break;
          }
        }
      }

      if (!isDestroyed) {
        activeProjectiles.push(p);
      }
    }

    // 2. Process Debris and Gravity Tractor Beams
    const activeDebris = [];
    const gravityStrength = 80.0; // Strong enough to pull scrap against its scatter velocity
    const pullDistanceSq = 50.0 * 50.0; // Distance to engage gravity beam
    const collectDistanceSq = 3.5 * 3.5; // Distance to collect scrap

    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];
      let isCollected = false;

      // Find nearest human ship
      let nearestHuman = null;
      let minHDistSq = Infinity;

      for (let j = 0; j < humans.length; j++) {
        const h = humans[j];
        const dx = h.position[0] - d.position[0];
        const dy = h.position[1] - d.position[1];
        const dz = h.position[2] - d.position[2];
        const hDistSq = dx*dx + dy*dy + dz*dz;

        if (hDistSq < minHDistSq) {
          minHDistSq = hDistSq;
          nearestHuman = h;
        }
      }

      if (nearestHuman && minHDistSq < pullDistanceSq) {
        // Gravity beam is active!
        const hPos = nearestHuman.position;
        const dx = hPos[0] - d.position[0];
        const dy = hPos[1] - d.position[1];
        const dz = hPos[2] - d.position[2];
        const hDist = Math.sqrt(minHDistSq) || 1.0;

        // Visual beam data
        beamLines.push({
          humanId: nearestHuman.id,
          debrisId: d.id,
          start: [...hPos],
          end: [...d.position]
        });

        if (minHDistSq < collectDistanceSq) {
          // Debris is collected!
          collectEvents.push({
            humanId: nearestHuman.id,
            debrisId: d.id,
            partType: d.partType,
            value: d.value || 100
          });
          isCollected = true;
        } else {
          // Pull towards ship (gravity acceleration)
          const pullForce = gravityStrength / hDist;
          d.velocity[0] += (dx / hDist) * pullForce * dt;
          d.velocity[1] += (dy / hDist) * pullForce * dt;
          d.velocity[2] += (dz / hDist) * pullForce * dt;
        }
      }

      if (!isCollected) {
        // Apply normal velocity and drag
        d.position[0] += d.velocity[0] * dt;
        d.position[1] += d.velocity[1] * dt;
        d.position[2] += d.velocity[2] * dt;

        // Apply friction/drag in space to stabilize scrap movement
        d.velocity[0] *= 0.98;
        d.velocity[1] *= 0.98;
        d.velocity[2] *= 0.98;

        // Drift debris along with the fleet so it doesn't get left behind
        // Fleet typical speed is 5-7 units/sec in negative Z
        d.position[2] += -5.5 * dt;

        // Discard debris that is more than 80 units behind the fleet
        const debrisRelativeToFleet = (fleetZ || 0) - d.position[2];
        if (debrisRelativeToFleet > 80.0 || debrisRelativeToFleet < -200.0) {
          isCollected = true; // Discard as out of range
        }

        if (!isCollected) {
          activeDebris.push(d);
        }
      }
    }

    self.postMessage({
      type: "physics_results",
      data: {
        projectiles: activeProjectiles,
        debris: activeDebris,
        hitEvents: hitEvents,
        collectEvents: collectEvents,
        beamLines: beamLines
      }
    });
  }
};
