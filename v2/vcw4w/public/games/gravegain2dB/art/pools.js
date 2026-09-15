'use strict';
/* GraveGain2dB emoji art — fixed-cap object pools for 60fps carnage.
 * Budgets follow the spec performance targets: <=250 live debris
 * particles, <=80 live projectiles. When debris overflows, the oldest
 * fragment merges into a static decal instead of vanishing (no pop).
 * Global: window.GraveGain2dBArtPools
 */
(function (root) {
  var BUDGETS = {
    projectiles: 80,
    debris: 250,
    particles: 160,
    damageNumbers: 32,
    decals: 120,
    emitters: 24
  };

  // Ring pool: spawn reuses the oldest dead slot, never allocates hot.
  function createPool(cap, reset) {
    var slots = new Array(cap);
    for (var i = 0; i < cap; i++) slots[i] = { alive: false, data: {} };
    var cursor = 0;
    return {
      cap: cap,
      slots: slots,
      live: 0,
      spawn: function (init) {
        // Prefer a dead slot; else steal the oldest (cursor) slot.
        for (var n = 0; n < cap; n++) {
          var idx = (cursor + n) % cap;
          if (!slots[idx].alive) {
            cursor = (idx + 1) % cap;
            slots[idx].alive = true;
            this.live++;
            if (reset) reset(slots[idx].data);
            if (init) init(slots[idx].data);
            return slots[idx].data;
          }
        }
        var victim = slots[cursor];
        cursor = (cursor + 1) % cap;
        if (reset) reset(victim.data);
        if (init) init(victim.data);
        return victim.data; // stolen: live count unchanged
      },
      kill: function (data) {
        for (var i = 0; i < cap; i++) {
          if (slots[i].data === data && slots[i].alive) {
            slots[i].alive = false;
            this.live--;
            return true;
          }
        }
        return false;
      },
      update: function (fn, dt) {
        for (var i = 0; i < cap; i++) {
          if (slots[i].alive && fn(slots[i].data, dt) === false) {
            slots[i].alive = false;
            this.live--;
          }
        }
      },
      clear: function () {
        for (var i = 0; i < cap; i++) slots[i].alive = false;
        this.live = 0;
      }
    };
  }

  function resetProjectile(d) {
    d.x = 0; d.y = 0; d.vx = 0; d.vy = 0; d.angle = 0;
    d.power = 1; d.ttl = 3; d.weapon = 'sidearm'; d.friendly = true;
  }
  function resetDebris(d) {
    d.x = 0; d.y = 0; d.vx = 0; d.vy = 0; d.rot = 0; d.vr = 0;
    d.emoji = '🪨'; d.size = 22; d.ttl = 1.1; d.maxTtl = 1.1;
  }
  function resetParticle(d) {
    d.x = 0; d.y = 0; d.vx = 0; d.vy = 0;
    d.emoji = '✨'; d.size = 16; d.ttl = 0.4; d.maxTtl = 0.4;
  }
  function resetNumber(d) {
    d.x = 0; d.y = 0; d.vy = -60; d.text = ''; d.ttl = 0.8; d.color = '#fff';
  }
  function resetDecal(d) {
    d.x = 0; d.y = 0; d.emoji = '🪨'; d.size = 20; d.rot = 0; d.alpha = 0.7;
  }
  function resetEmitter(d) {
    d.x = 0; d.y = 0; d.rate = 10; d.acc = 0; d.ttl = 1;
    d.emoji = '💨'; d.spread = 120; d.ttlMax = 1;
  }

  function createWorldPools() {
    return {
      projectiles: createPool(BUDGETS.projectiles, resetProjectile),
      debris: createPool(BUDGETS.debris, resetDebris),
      particles: createPool(BUDGETS.particles, resetParticle),
      damageNumbers: createPool(BUDGETS.damageNumbers, resetNumber),
      decals: createPool(BUDGETS.decals, resetDecal),
      emitters: createPool(BUDGETS.emitters, resetEmitter)
    };
  }

  function spawnDebris(pools, emoji, x, y, vx, vy, size, ttl) {
    if (pools.debris.live >= pools.debris.cap) {
      // Adaptive cull: oldest fragment settles into a decal, no pop.
      mergeOldestToDecal(pools);
    }
    return pools.debris.spawn(function (d) {
      d.emoji = emoji; d.x = x; d.y = y; d.vx = vx; d.vy = vy;
      d.size = size || 22; d.ttl = ttl || 1.1; d.maxTtl = d.ttl;
      d.rot = Math.random() * 6.28; d.vr = (Math.random() - 0.5) * 12;
    });
  }

  function mergeOldestToDecal(pools) {
    var slots = pools.debris.slots;
    var oldest = null;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].alive && (!oldest || slots[i].data.ttl < oldest.ttl)) oldest = slots[i].data;
    }
    if (!oldest) return;
    pools.debris.kill(oldest);
    pools.decals.spawn(function (d) {
      d.x = oldest.x; d.y = oldest.y; d.emoji = oldest.emoji;
      d.size = oldest.size * 0.8; d.rot = oldest.rot; d.alpha = 0.55;
    });
  }

  function spawnDamageNumber(pools, x, y, text, color) {
    return pools.damageNumbers.spawn(function (d) {
      d.x = x; d.y = y; d.vy = -70; d.text = String(text);
      d.color = color || '#fff'; d.ttl = 0.8;
    });
  }

  function stats(pools) {
    return {
      projectiles: pools.projectiles.live,
      debris: pools.debris.live,
      particles: pools.particles.live,
      damageNumbers: pools.damageNumbers.live,
      decals: pools.decals.live,
      emitters: pools.emitters.live
    };
  }

  root.GraveGain2dBArtPools = {
    BUDGETS: BUDGETS,
    createPool: createPool,
    createWorldPools: createWorldPools,
    spawnDebris: spawnDebris,
    mergeOldestToDecal: mergeOldestToDecal,
    spawnDamageNumber: spawnDamageNumber,
    stats: stats
  };
})(typeof window !== 'undefined' ? window : globalThis);
