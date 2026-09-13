/* GraveGain 2D arsenal + bestiary sprites (A5) — pure canvas helpers, no DOM/events/fetch/eval. */
(function () {
'use strict';
if (window.GraveGainArsenal2D) return;

var ICONS = [
  { id: 'longsword',        emoji: '\u2694\uFE0F', c1: '#C9D4E3', c2: '#5B6B85' },
  { id: 'arcane_staff',     emoji: '\u{1FA84}',    c1: '#B388FF', c2: '#4A2B9D' },
  { id: 'warhammer',        emoji: '\u{1F528}',    c1: '#E0A458', c2: '#7A4A1E' },
  { id: 'chem_gun',         emoji: '\u{1F9EA}',    c1: '#7CFFB2', c2: '#0E7A4C' },
  { id: 'runeblade',        emoji: '\u{1F5E1}\uFE0F', c1: '#8EFBFF', c2: '#1F5F8B' },
  { id: 'dawnbreaker_mace', emoji: '\u2600\uFE0F', c1: '#FFE082', c2: '#C46A1B' },
  { id: 'hexbow',           emoji: '\u{1F3F9}',    c1: '#D1A6FF', c2: '#5E2B97' },
  { id: 'bonecleaver_axe',  emoji: '\u{1FA93}',    c1: '#EDE6D6', c2: '#8A7B5C' },
  { id: 'grave_scythe',     emoji: '\u{1F319}',    c1: '#9FB3C8', c2: '#334155' },
  { id: 'orb_launcher',     emoji: '\u{1F52E}',    c1: '#B3E5FC', c2: '#3D5AFE' },
  { id: 'frostbrand',       emoji: '\u2744\uFE0F', c1: '#E1F5FE', c2: '#0288D1' },
  { id: 'emberfang_dagger', emoji: '\u{1F525}',    c1: '#FFAB91', c2: '#B71C1C' },
  { id: 'void_repeater',    emoji: '\u{1F300}',    c1: '#CE93D8', c2: '#311B92' },
  { id: 'thorn_whip',       emoji: '\u{1F33F}',    c1: '#A5D6A7', c2: '#1B5E20' },
  { id: 'storm_hammer',     emoji: '\u26C8\uFE0F', c1: '#BBDEFB', c2: '#37474F' },
  { id: 'soul_lantern',     emoji: '\u{1F3EE}',    c1: '#FFF9C4', c2: '#7A5C00' },
  { id: 'plague_flask',     emoji: '\u2623\uFE0F', c1: '#C5E1A5', c2: '#33691E' },
  { id: 'star_cannon',      emoji: '\u{1F4AB}',    c1: '#FFF3E0', c2: '#E65100' },
  { id: 'warden_shield',    emoji: '\u{1F6E1}\uFE0F', c1: '#90A4AE', c2: '#263238' },
  { id: 'blood_talon',      emoji: '\u{1FA78}',    c1: '#EF9A9A', c2: '#7F0000' }
];

var ENEMIES = {
  shambler:          { e: '\u{1F9DF}', t: '#9DB38A', b: '#3E5233' },
  skull_swarm:       { e: '\u{1F480}', t: '#E8E8E8', b: '#616161' },
  zed_brute:         { e: '\u{1F479}', t: '#A5D6A7', b: '#1B5E20' },
  array_necromancer: { e: '\u{1F9D9}', t: '#CE93D8', b: '#4A148C' },
  vault_warden:      { e: '\u{1F5FF}', t: '#B0BEC5', b: '#37474F' },
  blood_berserker:   { e: '\u{1F47A}', t: '#EF9A9A', b: '#7F0000' },
  gate_titan:        { e: '\u{1F98D}', t: '#FFCC80', b: '#5D4037' },
  whisper_wisp:      { e: '\u{1F47B}', t: '#E1F5FE', b: '#546E7A' },
  sparkite_golem:    { e: '\u26A1',    t: '#FFF59D', b: '#F57F17' },
  ash_revenant:      { e: '\u{1F32B}\uFE0F', t: '#BCAAA4', b: '#3E2723' },
  grave_knight:      { e: '\u2694\uFE0F', t: '#90A4AE', b: '#212121' },
  void_herald:       { e: '\u{1F30C}', t: '#7E57C2', b: '#0D0D2B' }
};

var FALLBACK_ICON = { emoji: '\u2B50', c1: '#BDBDBD', c2: '#616161' };
var FALLBACK_ENEMY = { e: '\u{1F480}', t: '#9E9E9E', b: '#424242' };

function findIcon(id) {
  for (var i = 0; i < ICONS.length; i++) {
    if (ICONS[i].id === id) return ICONS[i];
  }
  return FALLBACK_ICON;
}

function num(v, d) {
  v = Number(v);
  return (typeof v === 'number' && isFinite(v)) ? v : d;
}

function clamp01(v) {
  v = Number(v);
  if (!(typeof v === 'number' && isFinite(v))) return 1;
  return v < 0 ? 0 : (v > 1 ? 1 : v);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function hpColor(t) {
  var r = Math.round(46 + (235 - 46) * (1 - t));
  var g = Math.round(204 + (64 - 204) * (1 - t));
  return 'rgb(' + r + ',' + g + ',70)';
}

function drawIcon(ctx, id, x, y, size, angle) {
  if (!ctx || typeof ctx.save !== 'function') return;
  try {
    var s = num(size, 48);
    if (s <= 0) return;
    var icon = findIcon(id);
    ctx.save();
    ctx.translate(num(x, 0), num(y, 0));
    ctx.rotate(num(angle, 0));
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.42, s * 0.36, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    var g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    g.addColorStop(0, icon.c1);
    g.addColorStop(1, icon.c2);
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.22);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    ctx.font = (s * 0.62) + 'px "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon.emoji, 0, s * 0.04);
    ctx.restore();
  } catch (err) { try { ctx.restore(); } catch (ignore) {} }
}

function drawEnemy(ctx, kind, x, y, size, hp01) {
  if (!ctx || typeof ctx.save !== 'function') return;
  try {
    var s = num(size, 48);
    if (s <= 0) return;
    var pal = ENEMIES[kind] || FALLBACK_ENEMY;
    var hp = clamp01(hp01);
    var cx = num(x, 0), cy = num(y, 0);
    var r = s * 0.44;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    var g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, pal.t);
    g.addColorStop(1, pal.b);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    ctx.font = (s * 0.58) + 'px "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pal.e, cx, cy + s * 0.03);
    if (hp < 1) {
      var hr = r + s * 0.09;
      ctx.beginPath();
      ctx.arc(cx, cy, hr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, hr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp);
      ctx.strokeStyle = hpColor(hp);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  } catch (err) { try { ctx.restore(); } catch (ignore) {} }
}

window.GraveGainArsenal2D = {
  VERSION: '1.0.0',
  drawIcon: drawIcon,
  drawEnemy: drawEnemy,
  ICONS: ICONS
};
})();
