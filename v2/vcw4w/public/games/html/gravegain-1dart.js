(function () {
'use strict';
try {
if (window.GraveGain1DArt) return;
var VERSION = '1.0.0';
var OVERLAY_ID = 'gg1dArtOverlay';
var SECTORS = [
  { name: 'Crash Flats', far: ['\u2601\uFE0F', '\uD83D\uDEB8'], near: ['\u2601\uFE0F', '\uD83B\uDEEB', '\u2728'], tint: 'rgba(140,180,220,0.18)', rune: '\u25CB' },
  { name: 'Whisper Groves', far: ['\uD83C\uDF32', '\u2728'], near: ['\uD83C\uDF32', '\u2728', '\uD83E\uDDDD'], tint: 'rgba(60,160,90,0.20)', rune: '\u16B9' },
  { name: 'Sparkite Cut', far: ['\u26A1', '\u2728'], near: ['\u26A1', '\uD83D\uDD25', '\u26CF\uFE0F'], tint: 'rgba(255,210,80,0.16)', rune: '\u16CB' },
  { name: 'Ash Gate', far: ['\uD83C\uDF0B', '\u2601\uFE0F'], near: ['\uD83C\uDF0B', '\uD83D\uDC80', '\uD83D\uDD25'], tint: 'rgba(200,80,40,0.20)', rune: '\u16A0' },
  { name: 'Relay Approach', far: ['\uD83C\uDF0C', '\u2728'], near: ['\uD83C\uDF0C', '\uD83D\uDEB8', '\uD83D\uDC7E'], tint: 'rgba(90,80,200,0.22)', rune: '\u16E6' }
];
var SPARKLES = ['\u2728', '\uD83C\uDF08', '\u2B50', '\uD83C\uDF1F', '\uD83D\uDCAB'];
var st = { canvas: null, ctx: null, raf: 0, running: false, last: 0, farX: 0, nearX: 0, parts: [], lastKills: -1, hasKills: false, amb: 0 };
function sectorIndex() {
  try {
    var g = window.GraveGain1D;
    if (g) {
      var cands = [g.sector, g.sectorIndex, g.currentSector, g.sectorId];
      for (var i = 0; i < cands.length; i++) {
        if (typeof cands[i] === 'number' && isFinite(cands[i])) return ((cands[i] % 5) + 5) % 5;
      }
      if (g.state) {
        var s2 = g.state.sector !== undefined ? g.state.sector : g.state.sectorIndex;
        if (typeof s2 === 'number' && isFinite(s2)) return ((s2 % 5) + 5) % 5;
      }
      if (g.run) {
        var s3 = g.run.sector !== undefined ? g.run.sector : g.run.sectorIndex;
        if (typeof s3 === 'number' && isFinite(s3)) return ((s3 % 5) + 5) % 5;
      }
    }
  } catch (e) {}
  try { return Math.floor(Date.now() / 15000) % 5; } catch (e2) { return 0; }
}
function readKills() {
  try {
    var g = window.GraveGain1D;
    var cands = [];
    if (g) {
      cands.push(g.kills, g.totalKills, g.killCount);
      if (g.run) cands.push(g.run.kills, g.run.totalKills, g.run.killCount);
      if (g.state) cands.push(g.state.kills, g.state.totalKills, g.state.killCount);
      if (g.stats) cands.push(g.stats.kills, g.stats.totalKills);
    }
    try {
      if (typeof window.GG1D_KILLS === 'number') cands.push(window.GG1D_KILLS);
      if (window.GG1D && typeof window.GG1D.kills === 'number') cands.push(window.GG1D.kills);
    } catch (e) {}
    for (var i = 0; i < cands.length; i++) {
      if (typeof cands[i] === 'number' && isFinite(cands[i]) && cands[i] >= 0) return cands[i];
    }
  } catch (e2) {}
  return -1;
}
function spawn(x, y, n, big) {
  try {
    for (var i = 0; i < n; i++) {
      if (st.parts.length > 120) st.parts.shift();
      st.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 70, life: 0.9 + Math.random() * 0.7, age: 0, ch: SPARKLES[(Math.random() * SPARKLES.length) | 0], sz: big ? 16 + Math.random() * 10 : 11 + Math.random() * 7 });
    }
  } catch (e) {}
}
function fit() {
  try {
    if (!st.canvas) return;
    var base = null;
    try { base = document.getElementById('gg1dCanvas'); } catch (e) {}
    var w = 640, h = 360;
    try {
      if (base) { w = base.clientWidth || base.width || w; h = base.clientHeight || base.height || h; }
      else if (st.canvas.parentNode) { w = st.canvas.parentNode.clientWidth || w; h = st.canvas.parentNode.clientHeight || h; }
    } catch (e2) {}
    w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    if (st.canvas.width !== w || st.canvas.height !== h) { st.canvas.width = w; st.canvas.height = h; }
  } catch (e3) {}
}
function drawEmoji(ch, x, y, sz, alpha) {
  try {
    st.ctx.save();
    st.ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    st.ctx.font = sz + 'px serif';
    st.ctx.textBaseline = 'middle';
    st.ctx.fillText(ch, x, y);
    st.ctx.restore();
  } catch (e) {}
}
function frame(t) {
  try {
    if (!st.running) return;
    st.raf = requestAnimationFrame(frame);
    try { if (document.hidden) { st.last = t; return; } } catch (e) {}
    var dt = 0.016;
    try { if (st.last && t > st.last) dt = Math.min(0.05, (t - st.last) / 1000); } catch (e2) {}
    st.last = t;
    fit();
    var W = st.canvas.width, H = st.canvas.height;
    var si = sectorIndex();
    var sec = SECTORS[si] || SECTORS[0];
    st.ctx.clearRect(0, 0, W, H);
    try { st.ctx.fillStyle = sec.tint; st.ctx.fillRect(0, 0, W, H * 0.7); } catch (e3) {}
    st.farX -= 12 * dt; st.nearX -= 30 * dt;
    var i, x, step;
    try {
      step = 90; x = st.farX % step;
      st.ctx.font = '20px serif'; st.ctx.textBaseline = 'middle';
      for (; x < W + step; x += step) {
        for (i = 0; i < sec.far.length; i++) drawEmoji(sec.far[i], x + i * 26, H * 0.12 + (i % 2) * 26, 20, 0.75);
      }
      step = 70; x = st.nearX % step;
      for (; x < W + step; x += step) {
        for (i = 0; i < sec.near.length; i++) drawEmoji(sec.near[i], x + i * 22, H * 0.32 + (i % 2) * 30, 24, 0.95);
      }
    } catch (e4) {}
    try {
      var gy = H * 0.7, gr = st.ctx.createLinearGradient(0, gy - 14, 0, gy + 14);
      gr.addColorStop(0, 'rgba(255,215,0,0)');
      gr.addColorStop(0.5, 'rgba(255,215,0,0.85)');
      gr.addColorStop(1, 'rgba(255,215,0,0)');
      st.ctx.fillStyle = gr; st.ctx.fillRect(0, gy - 14, W, 28);
      st.ctx.fillStyle = 'rgba(255,240,180,0.9)'; st.ctx.font = '11px monospace'; st.ctx.textBaseline = 'middle';
      var glyphs = '', n = Math.ceil(W / 18) + 1;
      for (i = 0; i < n; i++) glyphs += sec.rune + ' ';
      st.ctx.fillText(glyphs, 0, gy + 22);
    } catch (e5) {}
    try {
      var k = readKills();
      if (k >= 0) {
        st.hasKills = true;
        if (st.lastKills >= 0 && k > st.lastKills) spawn(W * (0.2 + Math.random() * 0.6), H * 0.55, Math.min(10, 2 + (k - st.lastKills) * 2), true);
        st.lastKills = k;
      } else if (!st.hasKills) {
        st.amb += dt;
        if (st.amb >= 0.5) { st.amb = 0; spawn(Math.random() * W, H * (0.15 + Math.random() * 0.5), 1, false); }
      }
    } catch (e6) {}
    try {
      for (i = st.parts.length - 1; i >= 0; i--) {
        var p = st.parts[i];
        p.age += dt;
        if (p.age >= p.life) { st.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt;
        drawEmoji(p.ch, p.x, p.y, p.sz, 1 - p.age / p.life);
      }
    } catch (e7) {}
  } catch (e8) {}
}
function install() {
  try {
    if (st.running && st.canvas) return st.canvas;
    var base = null;
    try { base = document.getElementById('gg1dCanvas'); } catch (e) { base = null; }
    if (!base || !base.parentNode) return null;
    var old = null;
    try { old = document.getElementById(OVERLAY_ID); } catch (e2) {}
    try { if (old && old.parentNode) old.parentNode.removeChild(old); } catch (e3) {}
    var c = null;
    try {
      c = document.createElement('canvas');
      c.id = OVERLAY_ID;
      var cs = c.style;
      cs.position = 'absolute'; cs.left = '0'; cs.top = '0'; cs.width = '100%'; cs.height = '100%';
      cs.pointerEvents = 'none'; cs.zIndex = '5';
      var ps = base.parentNode.style;
      try { if (ps.position !== 'absolute' && ps.position !== 'relative' && ps.position !== 'fixed') ps.position = 'relative'; } catch (e4) {}
      base.parentNode.appendChild(c);
    } catch (e5) { return null; }
    st.canvas = c;
    try { st.ctx = c.getContext('2d'); } catch (e6) { st.ctx = null; }
    if (!st.ctx) return null;
    fit();
    st.running = true; st.last = 0; st.parts = []; st.amb = 0;
    try { st.raf = requestAnimationFrame(frame); } catch (e7) { st.running = false; return null; }
    return c;
  } catch (e8) { return null; }
}
function uninstall() {
  try {
    st.running = false;
    try { if (st.raf) cancelAnimationFrame(st.raf); } catch (e) {}
    st.raf = 0;
    try {
      var old = document.getElementById(OVERLAY_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e2) {}
    st.canvas = null; st.ctx = null; st.parts = [];
  } catch (e3) {}
}
window.GraveGain1DArt = { VERSION: VERSION, install: install, uninstall: uninstall };
} catch (e) { try { window.GraveGain1DArt = window.GraveGain1DArt || { VERSION: '1.0.0', install: function () { return null; }, uninstall: function () {} }; } catch (e2) {} }
})();
