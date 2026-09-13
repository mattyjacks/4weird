(function () {
'use strict';
if (window.GraveGainBestiary3D) return;
var BOSSES = { gate_titan: 1, vault_warden: 1, void_herald: 1 };
var VARIANTS = [
  { kind: 'shambler', name: 'Grave Shambler', emoji: '\u{1F9DF}', hp: 30, speed: 2.2, palette: ['#6b8e5a', '#3d5a34'], glow: '#88ff88' },
  { kind: 'skull_swarm', name: 'Skull Swarm', emoji: '\u{1F480}', hp: 15, speed: 4.5, palette: ['#e8e4d8', '#9a9484'], glow: '#ffffff' },
  { kind: 'zed_brute', name: 'Zed Brute', emoji: '\u{1F9B7}', hp: 120, speed: 1.6, palette: ['#7a5c48', '#4a3628'], glow: '#ff8844' },
  { kind: 'array_necromancer', name: 'Array Necromancer', emoji: '\u{1F9D9}', hp: 80, speed: 2.0, palette: ['#5a3d8e', '#2e1f4a'], glow: '#bb66ff' },
  { kind: 'vault_warden', name: 'Vault Warden', emoji: '\u{1F6E1}', hp: 250, speed: 1.4, palette: ['#8e7a3d', '#4a3f1f'], glow: '#ffcc33' },
  { kind: 'blood_berserker', name: 'Blood Berserker', emoji: '\u{1FA78}', hp: 90, speed: 3.4, palette: ['#8e2a2a', '#4a1212'], glow: '#ff3333' },
  { kind: 'gate_titan', name: 'Gate Titan', emoji: '\u{1F9F2}', hp: 500, speed: 1.1, palette: ['#4a4a5e', '#23232e'], glow: '#6644ff' },
  { kind: 'whisper_wisp', name: 'Whisper Wisp', emoji: '\u{1F47B}', hp: 25, speed: 3.8, palette: ['#9adfe8', '#4a7a8e'], glow: '#aaffff' },
  { kind: 'sparkite_golem', name: 'Sparkite Golem', emoji: '\u{1FAA8}', hp: 200, speed: 1.3, palette: ['#7a7a8e', '#3a3a44'], glow: '#ffdd44' },
  { kind: 'ash_revenant', name: 'Ash Revenant', emoji: '\u{1F525}', hp: 60, speed: 2.8, palette: ['#5e5e5e', '#2a2a2a'], glow: '#ff7722' },
  { kind: 'grave_knight', name: 'Grave Knight', emoji: '\u2694', hp: 150, speed: 2.4, palette: ['#3d4a5e', '#1f2530'], glow: '#4488ff' },
  { kind: 'void_herald', name: 'Void Herald', emoji: '\u{1F573}', hp: 320, speed: 1.8, palette: ['#2a1a4a', '#0d0618'], glow: '#aa00ff' }
];
function find(kind) {
  for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].kind === kind) return VARIANTS[i];
  return VARIANTS[0];
}
function hex(h) {
  try { return parseInt(String(h).replace('#', ''), 16); } catch (e) { return 0x888888; }
}
function mat(color, emissive) {
  var m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.1 });
  if (emissive) { try { m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.25; } catch (e) {} }
  return m;
}
function box(w, h, d, m, x, y, z) {
  var g = new THREE.BoxGeometry(w, h, d);
  var mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}
function build(kind, opts) {
  try {
    if (typeof THREE === 'undefined' || !THREE) return null;
    if (!THREE.BoxGeometry || !THREE.MeshStandardMaterial) return null;
    var v = find(kind);
    var o = opts || {};
    var s = (typeof o.hpScale === 'number' && o.hpScale > 0) ? o.hpScale : 1;
    if (s > 3) s = 3;
    var boss = !!BOSSES[kind];
    var big = boss ? 1.6 : 1;
    var c0 = hex(v.palette[0]), c1 = hex(v.palette[1]);
    var mBody = mat(c0, false), mDark = mat(c1, false);
    var group = new THREE.Group();
    var torso = box(0.9, 1.1, 0.55, mBody, 0, 1.45, 0);
    group.add(torso);
    var belt = box(0.94, 0.18, 0.59, mDark, 0, 0.95, 0);
    group.add(belt);
    var head = box(0.55, 0.55, 0.55, mDark, 0, 2.3, 0);
    group.add(head);
    try {
      var eyeM = new THREE.MeshBasicMaterial({ color: hex(v.glow) });
      var eL = box(0.11, 0.11, 0.06, eyeM, -0.14, 2.32, 0.29);
      var eR = box(0.11, 0.11, 0.06, eyeM, 0.14, 2.32, 0.29);
      group.add(eL); group.add(eR);
    } catch (e) {}
    var armL = box(0.28, 1.0, 0.28, mBody, -0.62, 1.45, 0);
    var armR = box(0.28, 1.0, 0.28, mBody, 0.62, 1.45, 0);
    armL.userData.limb = 'armL'; armR.userData.limb = 'armR';
    group.add(armL); group.add(armR);
    var handL = box(0.3, 0.28, 0.3, mDark, -0.62, 0.85, 0);
    var handR = box(0.3, 0.28, 0.3, mDark, 0.62, 0.85, 0);
    group.add(handL); group.add(handR);
    var legL = box(0.32, 0.9, 0.32, mDark, -0.22, 0.45, 0);
    var legR = box(0.32, 0.9, 0.32, mDark, 0.22, 0.45, 0);
    legL.userData.limb = 'legL'; legR.userData.limb = 'legR';
    group.add(legL); group.add(legR);
    try {
      if (boss && THREE.CylinderGeometry) {
        var cg = new THREE.CylinderGeometry(0.16, 0.24, 0.9, 6);
        var hornM = mat(c1, true);
        var h1 = new THREE.Mesh(cg, hornM); h1.position.set(-0.32, 2.7, 0); h1.rotation.z = 0.35;
        var h2 = new THREE.Mesh(cg, hornM); h2.position.set(0.32, 2.7, 0); h2.rotation.z = -0.35;
        group.add(h1); group.add(h2);
      } else if (kind === 'whisper_wisp' && THREE.SphereGeometry) {
        var sg = new THREE.SphereGeometry(0.5, 8, 6);
        var orb = new THREE.Mesh(sg, mat(c0, true));
        orb.position.set(0, 1.45, 0);
        group.add(orb);
      } else if (kind === 'skull_swarm' && THREE.SphereGeometry) {
        var sk = new THREE.SphereGeometry(0.34, 7, 6);
        var skm = new THREE.Mesh(sk, mat(c0, false));
        skm.position.set(0, 2.3, 0); skm.scale.set(1, 1.15, 1);
        group.add(skm);
      }
    } catch (e) {}
    group.scale.setScalar(big * s);
    group.userData.kind = kind;
    group.userData.hp = v.hp;
    group.userData.speed = v.speed;
    group.userData.isBoss = boss;
    return group;
  } catch (e) { return null; }
}
function decorate(group, kind) {
  try {
    if (!group) return;
    var v = find(kind);
    var PT = null;
    try { PT = window.GraveGainProceduralTextures || null; } catch (e) { PT = null; }
    if (!PT) return;
    try {
      if (PT.createEmojiSprite && v.emoji) {
        var spr = PT.createEmojiSprite(v.emoji, 128);
        if (spr) { spr.position.set(0, 3.4 * (group.scale ? group.scale.x : 1), 0); try { spr.scale.set(0.9, 0.9, 1); } catch (e) {} group.add(spr); }
      }
    } catch (e) {}
    try {
      if (BOSSES[kind] && PT.createGlowSprite) {
        var g = PT.createGlowSprite(v.glow || '#ffffff', 2.2);
        if (g) { g.position.set(0, 1.5, 0); group.add(g); }
      }
    } catch (e) {}
  } catch (e) {}
}
window.GraveGainBestiary3D = { VERSION: '1.0.0', VARIANTS: VARIANTS, build: build, decorate: decorate };
})();
