/* ============================================================================
 * hud.js — B8 4-player-readable HUD for GraveGain2dB: Breach MoonRock.
 * Vanilla JS, no imports, idempotent. Reads sim state, writes pixels only.
 *
 * Layout (teach-by-placement: glyphs sit where the action is, no long pauses):
 *   top-left    : per-player strip (emoji / HP / armor / cooldowns / weapon+ammo)
 *   top-center  : objective / boss bar / extract countdown
 *   top-right   : rescue + revive + off-screen direction pips
 *   near-player : ammo / cooldown flash / damage-direction / collapse warn / interact
 *   world       : markers for civilian / support / objective / revive / extract / breach
 * Exposes window.GraveGain2DB_HUD + pushes to window.GraveGainMods.
 * ========================================================================== */
(function () {
'use strict';
if (window.GraveGain2DB_HUD) return; // idempotent

var VERSION = '1.0.0-b8';
var MARKERS = {
  civilian:  '🧍', support: '➕', objective: '❗',
  revive:    '💚', extract:  '🚁', breach:   '🕳️'
};
var DIR8 = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
function dirGlyph(dx, dy) {
  var a = Math.atan2(dy, dx); // -PI..PI, 0 = east
  var i = Math.round(a / 0.785398) & 7;
  // order from east going clockwise in screen space (y down): E SE S SW W NW N NE
  var map = [2, 3, 4, 5, 6, 7, 0, 1];
  return DIR8[map[(i + 8) & 7]];
}

function font(px) {
  return 'bold ' + px + 'px "Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
}
function panel(g, x, y, w, h) {
  g.save(); g.globalAlpha = 0.72; g.fillStyle = '#0b0e1a';
  g.fillRect(x, y, w, h); g.restore();
}
function bar(g, x, y, w, h, frac, color) {
  g.save();
  g.fillStyle = '#222'; g.fillRect(x, y, w, h);
  g.fillStyle = color; g.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  g.restore();
}

/* Top-left: up to 4 player strips. p = {emoji,hp,maxHp,armor,cools,weapon,ammo}. */
function drawPlayers(g, players) {
  g.save(); g.font = font(15); g.textAlign = 'left'; g.textBaseline = 'top';
  var list = (players || []).slice(0, 4);
  for (var i = 0; i < list.length; i++) {
    var p = list[i], y = 8 + i * 52;
    panel(g, 8, y, 228, 48);
    g.fillStyle = '#fff';
    g.fillText((p.emoji || '🧑‍🚀') + ' P' + (i + 1), 14, y + 3);
    bar(g, 14, y + 22, 110, 8, (p.hp || 0) / (p.maxHp || 100), '#4caf50');
    bar(g, 128, y + 22, 60, 8, (p.armor || 0) / 100, '#42a5f5');
    var cools = p.cools || {};
    var ck = Object.keys(cools), cx = 14;
    for (var c = 0; c < ck.length; c++) {
      var cd = cools[ck[c]];
      g.fillStyle = cd <= 0 ? '#8f8' : '#fa0';
      g.fillText((cd <= 0 ? '🟢' : '🟡') + ck[c], cx, y + 33);
      cx += 72;
    }
    g.fillStyle = '#ffd54a';
    g.fillText('🔫 ' + (p.weapon || 'pick') + ' ' + (p.ammo === undefined ? '∞' : p.ammo), 192 - 60, y + 3);
  }
  g.restore();
}

/* Top-center: objective text / boss bar / extract countdown. */
function drawObjective(g, w, state) {
  state = state || {};
  g.save(); g.font = font(15); g.textAlign = 'center'; g.textBaseline = 'top';
  panel(g, w / 2 - 220, 8, 440, 30);
  g.fillStyle = '#ffe082';
  g.fillText('🎯 ' + (state.objective || 'Breach the MoonRock'), w / 2, 12);
  if (state.boss) {
    panel(g, w / 2 - 220, 42, 440, 22);
    g.fillStyle = '#fff';
    g.fillText('👑 ' + (state.boss.name || 'MOONROCK TYRANT'), w / 2, 43);
    bar(g, w / 2 - 200, 58, 400, 5, (state.boss.hp || 0) / (state.boss.maxHp || 1), '#e53935');
  }
  if (state.extractIn !== undefined && state.extractIn !== null) {
    panel(g, w / 2 - 110, state.boss ? 68 : 42, 220, 26);
    g.fillStyle = '#80deea';
    g.fillText('🚁 EXTRACT ' + Math.ceil(state.extractIn) + 's', w / 2, (state.boss ? 71 : 45));
  }
  g.restore();
}

/* Top-right: rescue / revive counts + off-screen direction pips. */
function drawRight(g, w, state) {
  state = state || {};
  g.save(); g.font = font(15); g.textAlign = 'right'; g.textBaseline = 'top';
  panel(g, w - 208, 8, 200, 48);
  g.fillStyle = '#fff';
  g.fillText('🧍 ' + (state.rescued || 0) + '  💚 ' + (state.revives || 0), w - 14, 12);
  var pips = state.pips || []; // [{dx,dy,glyph}]
  for (var i = 0; i < Math.min(6, pips.length); i++) {
    g.fillText((pips[i].glyph || '❗') + dirGlyph(pips[i].dx || 1, pips[i].dy || 0), w - 14, 31 + 0);
    break; // one compact line; extra pips collapse into world markers
  }
  if (pips.length > 1) g.fillText('+' + (pips.length - 1) + ' ➡️', w - 14, 31);
  g.restore();
}

/* Near-player: ammo / cooldown flash / damage direction / collapse / interact. */
function drawNearPlayer(g, cam, p) {
  if (!p) return;
  var sx = (p.x || 0) - (cam.x || 0), sy = (p.y || 0) - (cam.y || 0);
  g.save(); g.font = font(16); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (p.ammo !== undefined && p.ammo <= 5) {
    g.fillStyle = p.ammo <= 0 ? '#f66' : '#fc3';
    g.fillText('🔫 ' + (p.ammo <= 0 ? 'RELOAD!' : p.ammo + ' R!'), sx, sy - 44);
  }
  if (p.coolReady) { g.fillStyle = '#8f8'; g.fillText('✨ READY', sx, sy - 62); }
  if (p.dmgDx !== undefined) {
    g.fillStyle = '#f66';
    g.fillText(dirGlyph(p.dmgDx, p.dmgDy || 0) + ' 💥', sx + p.dmgDx * 40, sy + (p.dmgDy || 0) * 40);
  }
  if (p.collapseWarn) { g.fillStyle = '#f90'; g.fillText('⚠️ COLLAPSE — MOVE!', sx, sy + 44); }
  if (p.interact) { g.fillStyle = '#fff'; g.fillText('❓ E: ' + p.interact, sx, sy + 62); }
  g.restore();
}

/* World markers: screen-space icons for off-screen points of interest. */
function drawMarkers(g, cam, w, h, marks) {
  marks = marks || [];
  g.save(); g.font = font(18); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (var i = 0; i < marks.length; i++) {
    var mk = marks[i];
    var sx = (mk.x || 0) - (cam.x || 0), sy = (mk.y || 0) - (cam.y || 0);
    var edge = 26;
    var cx = Math.max(edge, Math.min(w - edge, sx));
    var cy = Math.max(edge, Math.min(h - edge, sy));
    var off = sx !== cx || sy !== cy;
    g.fillStyle = '#fff';
    g.fillText((MARKERS[mk.kind] || '❗') + (off ? dirGlyph(sx - cx || 1, sy - cy || 0) : ''), cx, cy);
  }
  g.restore();
}

var HUD = {
  VERSION: VERSION, MARKERS: MARKERS, dirGlyph: dirGlyph,
  drawPlayers: drawPlayers, drawObjective: drawObjective, drawRight: drawRight,
  drawNearPlayer: drawNearPlayer, drawMarkers: drawMarkers,
  drawAll: function (g, w, h, cam, world) {
    world = world || {};
    drawPlayers(g, world.players);
    drawObjective(g, w, world);
    drawRight(g, w, world);
    var ps = world.players || [];
    for (var i = 0; i < Math.min(4, ps.length); i++) drawNearPlayer(g, cam || { x: 0, y: 0 }, ps[i]);
    drawMarkers(g, cam || { x: 0, y: 0 }, w, h, world.marks);
  }
};
window.GraveGain2DB_HUD = HUD;
window.GraveGainMods = window.GraveGainMods || [];
window.GraveGainMods.push({ name: 'gravegain2dB-hud', version: VERSION });
})();
