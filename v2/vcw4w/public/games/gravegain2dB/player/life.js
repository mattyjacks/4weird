'use strict';
/* GraveGain2dB movement lab — damage / downed / death / checkpoint restart.
 * Standard difficulty rule from spec: explosions knock players down rather
 * than instantly killing them; repeated reckless damage reduces rescue score
 * (scored by the campaign layer, which reads reviveCount).
 * Global: window.GraveGain2dBPlayerLife
 */
(function (root) {
  var DOWNED_REVIVE_MS = 8000;

  function createVitals(opts) {
    opts = opts || {};
    return {
      hp: opts.hpMax || 100, hpMax: opts.hpMax || 100,
      armor: opts.armorMax || 0, armorMax: opts.armorMax || 0,
      downed: false, dead: false,
      downedAt: 0, downedUntil: 0,
      reviveCount: 0, deaths: 0,
      lastSrc: null
    };
  }

  function createParty(n) {
    var out = [];
    for (var i = 0; i < (n || 4); i++) out.push(createVitals());
    return out;
  }

  // Returns an event descriptor (or null when nothing changed).
  function damage(v, amount, src, nowMs, movement, body) {
    if (v.dead) return null;
    if (movement && body && movement.invulnerable(body, nowMs)) {
      return { kind: 'dodged', src: src || null };
    }
    var remaining = Math.max(0, amount);
    if (v.armor > 0) {
      var soaked = Math.min(v.armor, remaining);
      v.armor -= soaked;
      remaining -= soaked;
    }
    v.hp -= remaining;
    v.lastSrc = src || null;
    if (v.hp <= 0) {
      if (src === 'blast') {
        // Forgiving: blasts knock down instead of killing outright.
        v.hp = 1;
        return knockDown(v, src, nowMs);
      }
      v.hp = 0;
      v.dead = true;
      v.downed = false;
      v.deaths += 1;
      return { kind: 'died', src: v.lastSrc };
    }
    return { kind: 'hurt', hp: v.hp, armor: v.armor, src: v.lastSrc };
  }

  function knockDown(v, src, nowMs) {
    if (v.dead || v.downed) return null;
    v.downed = true;
    v.downedAt = nowMs;
    v.downedUntil = nowMs + DOWNED_REVIVE_MS;
    return { kind: 'downed', src: src || null, reviveMs: DOWNED_REVIVE_MS };
  }

  // West-button / E rescue: any standing ally revives the downed player.
  function revive(v, nowMs) {
    if (!v.downed || v.dead) return null;
    v.downed = false;
    v.hp = Math.max(v.hp, Math.round(v.hpMax * 0.4));
    v.reviveCount += 1;
    return { kind: 'revived', at: nowMs, count: v.reviveCount };
  }

  function heal(v, amount) {
    if (v.dead || v.downed) return null;
    v.hp = Math.min(v.hpMax, v.hp + Math.max(0, amount));
    return { kind: 'healed', hp: v.hp };
  }

  function respawn(v, checkpoint) {
    v.hp = v.hpMax;
    v.armor = v.armorMax;
    v.downed = false;
    v.dead = false;
    return { kind: 'respawned', checkpoint: checkpoint || null };
  }

  // Full-mission restart: every slot back to spawn-ready.
  function restartMission(party) {
    for (var i = 0; i < party.length; i++) {
      party[i].hp = party[i].hpMax;
      party[i].armor = party[i].armorMax;
      party[i].downed = false;
      party[i].dead = false;
    }
    return { kind: 'restarted', slots: party.length };
  }

  function updateDowned(v, nowMs) {
    if (v.downed && !v.dead && nowMs >= v.downedUntil) {
      v.downed = false;
      v.dead = true;
      v.hp = 0;
      v.deaths += 1;
      return { kind: 'bledOut' };
    }
    return null;
  }

  root.GraveGain2dBPlayerLife = {
    DOWNED_REVIVE_MS: DOWNED_REVIVE_MS,
    createVitals: createVitals,
    createParty: createParty,
    damage: damage,
    knockDown: knockDown,
    revive: revive,
    heal: heal,
    respawn: respawn,
    restartMission: restartMission,
    updateDowned: updateDowned
  };
})(typeof window !== 'undefined' ? window : globalThis);
