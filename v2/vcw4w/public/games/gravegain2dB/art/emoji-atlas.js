'use strict';
/* GraveGain2dB emoji art — glyph atlas. Emoji ARE the art style: every
 * actor, prop, pickup, projectile and effect is a large high-contrast
 * glyph plus outline/shadow/transform. Content-mode overrides keep the
 * same collision/tactical information in Kid / Teen / Adults modes.
 * Global: window.GraveGain2dBArtAtlas
 */
(function (root) {
  var CONTENT_MODES = ['kid', 'teen', 'adults'];

  var HEROES = {
    lisa: '🧑‍🚀', arty: '👨‍🔧', groknak: '👹',
    aelindra: '🧝', borin: '🧔‍♂️', valley: '🤖'
  };

  var RACES = { human: '👩‍🚀', elf: '🧝‍♀️', dwarf: '⛏️', orc: '👹' };

  var ENEMIES = {
    zed: '🧟', boneRifle: '💀', burrower: '🍄',
    sapper: '🧌', wisp: '👻', warden: '🛡️'
  };

  var PICKUPS = {
    rifle: '🔫', scatter: '💥', launcher: '🚀', beam: '⚡',
    saw: '🪚', cryo: '❄️', sun: '☀️', beacon: '📡'
  };

  // Material -> debris fragment glyphs (matches breaching material tags).
  var MATERIAL_DEBRIS = {
    wood: ['🪵', '🌿'],
    stone: ['🪨', '🧱'],
    metal: ['⚙️', '🔩'],
    crystal: ['💎', '🔷'],
    necro: ['🫀', '🦠'],
    barrier: ['🟪', '🛡️']
  };

  var PROJECTILES = {
    bullet: '▪️', pellet: '•', rocket: '🚀', beam: '⚡',
    grenade: '🔮', saw: '🪚', enemyBullet: '🔴'
  };

  var EFFECTS = {
    muzzle: '💥', poof: '🌫️', star: '⭐', spark: '✨',
    dust: '💨', boom: '💥', warning: '⚠️', skull: '💀',
    heal: '💚', shield: '🛡️', arrow: '➡️'
  };

  // Same meaning, different treatment per content mode.
  var MODE_OVERRIDES = {
    kid:   { blood: '🌫️', corpse: '🌫️', explosion: '🌟', hit: '⭐' },
    teen:  { blood: '💨', corpse: '💀', explosion: '💥', hit: '✨' },
    adults:{ blood: '🩸', corpse: '💀', explosion: '💥', hit: '💥' }
  };

  function effectFor(mode, key) {
    var table = MODE_OVERRIDES[mode] || MODE_OVERRIDES.teen;
    if (table[key] !== undefined) return table[key];
    return EFFECTS[key] || '✨';
  }

  function debrisFor(material) {
    return MATERIAL_DEBRIS[material] || MATERIAL_DEBRIS.stone;
  }

  // Canvas glyph draw with outline + shadow + squash/stretch transform.
  // opts: { size, outline, outlineColor, alpha, rotation, scaleX, scaleY }
  function drawGlyph(ctx, emoji, x, y, opts) {
    opts = opts || {};
    var size = opts.size || 28;
    ctx.save();
    ctx.globalAlpha = (opts.alpha == null ? 1 : opts.alpha);
    ctx.translate(x, y);
    if (opts.rotation) ctx.rotate(opts.rotation);
    ctx.scale(opts.scaleX || 1, opts.scaleY || 1);
    ctx.font = size + 'px "Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (opts.shadow !== false) {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.max(2, size * 0.12);
      ctx.shadowOffsetY = 2;
    }
    if (opts.outline !== false) {
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.strokeStyle = opts.outlineColor || 'rgba(10,8,20,0.9)';
      ctx.strokeText(emoji, 0, 0);
    }
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  root.GraveGain2dBArtAtlas = {
    CONTENT_MODES: CONTENT_MODES,
    HEROES: HEROES,
    RACES: RACES,
    ENEMIES: ENEMIES,
    PICKUPS: PICKUPS,
    MATERIAL_DEBRIS: MATERIAL_DEBRIS,
    PROJECTILES: PROJECTILES,
    EFFECTS: EFFECTS,
    MODE_OVERRIDES: MODE_OVERRIDES,
    effectFor: effectFor,
    debrisFor: debrisFor,
    drawGlyph: drawGlyph
  };
})(typeof window !== 'undefined' ? window : globalThis);
