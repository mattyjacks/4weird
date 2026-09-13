(function () {
'use strict';
if (window.GraveGainArsenal3D) return;
var IDS = ['longsword','arcane_staff','warhammer','chem_gun','runeblade','dawnbreaker_mace','hexbow','bonecleaver_axe','grave_scythe','orb_launcher','frostbrand','emberfang_dagger','void_repeater','thorn_whip','storm_hammer','soul_lantern','plague_flask','star_cannon','warden_shield','blood_talon'];
var PAL = {
longsword:[0xe2e8f0,0xd4af37],arcane_staff:[0x2d1a38,0xa855f7],warhammer:[0x374151,0x1f2937],
chem_gun:[0x1e293b,0x22c55e],runeblade:[0x1e1b4b,0x8b5cf6],dawnbreaker_mace:[0xd4af37,0xfff7cc],
hexbow:[0x3d271d,0x22d3ee],bonecleaver_axe:[0xe8e0d0,0x801020],grave_scythe:[0x111827,0x34d399],
orb_launcher:[0x1f2937,0xf97316],frostbrand:[0xbae6fd,0x0284c7],emberfang_dagger:[0x431407,0xfb923c],
void_repeater:[0x0b0713,0xc026d3],thorn_whip:[0x14532d,0x4ade80],storm_hammer:[0x334155,0xfacc15],
soul_lantern:[0x1f2937,0x5eead4],plague_flask:[0x22c55e,0xa3e635],star_cannon:[0x27272a,0xfde047],
warden_shield:[0x1e3a8a,0xd4af37],blood_talon:[0x7f1d1d,0xef4444]
};
function M(color, emissive, opacity) {
var o = { color: color, roughness: 0.45, metalness: 0.55 };
if (emissive) { o.emissive = emissive; o.emissiveIntensity = 0.7; }
if (opacity !== undefined) { o.transparent = true; o.opacity = opacity; }
return new THREE.MeshStandardMaterial(o);
}
function P(inner, geo, m, x, y, z, rx, rz) {
var ms = new THREE.Mesh(geo, m);
ms.position.set(x || 0, y || 0, z || 0);
if (rx) ms.rotation.x = rx;
if (rz) ms.rotation.z = rz;
inner.add(ms);
return ms;
}
function BX(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
function CY(rt, rb, h) { return new THREE.CylinderGeometry(rt, rb, h, 8); }
function OC(r) { return new THREE.OctahedronGeometry(r, 0); }
function SP(r) { return new THREE.SphereGeometry(r, 8, 6); }
var PI = Math.PI;
var B = {
longsword: function (q) {
P(q, CY(0.5, 0.6, 4), M(0x3d271d), 0, -2, 0);
P(q, BX(4.2, 0.8, 1.2), M(0xd4af37), 0, 0, 0);
P(q, BX(1.0, 14, 0.3), M(0xe2e8f0), 0, 7, 0);
P(q, OC(0.9), M(0xe2e8f0), 0, 14.4, 0);
},
arcane_staff: function (q) {
P(q, CY(0.4, 0.5, 18), M(0x2d1a38), 0, 0, 0);
P(q, BX(2.2, 0.6, 2.2), M(0xd4af37), 0, 8.2, 0);
P(q, OC(1.6), M(0xa855f7, 0x7e22ce), 0, 10, 0);
P(q, SP(0.7), M(0xe9d5ff, 0xa855f7), 0, 10, 0);
},
warhammer: function (q) {
P(q, CY(0.6, 0.7, 12), M(0x1f2937), 0, -3, 0);
P(q, BX(4, 4, 6), M(0x374151), 0, 4, 0);
P(q, OC(1.1), M(0x9ca3af), 0, 4, 3.6);
P(q, BX(1.2, 1.2, 1.6), M(0x111827), 0, 4, -3.4);
},
chem_gun: function (q) {
P(q, CY(0.8, 1.0, 10), M(0x1e293b), 0, 0, 0, PI / 2, 0);
P(q, BX(2.2, 2.2, 4), M(0x0f172a), 0, -1.2, 1.5);
P(q, CY(1.2, 1.2, 4), M(0x22c55e, 0x16a34a, 0.8), 0, 1.4, -1);
P(q, OC(0.6), M(0x4ade80, 0x16a34a), 0, 1.4, 1.6);
},
runeblade: function (q) {
P(q, CY(0.5, 0.55, 3.6), M(0x0f0a2e), 0, -1.8, 0);
P(q, BX(3.8, 0.7, 1.1), M(0x8b5cf6, 0x5b21b6), 0, 0, 0);
P(q, BX(1.2, 13, 0.35), M(0x312e81), 0, 6.5, 0);
P(q, OC(0.7), M(0xc4b5fd, 0x8b5cf6), 0, 6.5, 0.3);
P(q, OC(0.8), M(0x8b5cf6, 0x5b21b6), 0, 13.4, 0);
},
dawnbreaker_mace: function (q) {
P(q, CY(0.55, 0.65, 10), M(0x3d271d), 0, -3, 0);
P(q, SP(2.2), M(0xd4af37), 0, 4.5, 0);
P(q, OC(0.8), M(0xfff7cc, 0xd4af37), 0, 4.5, 2.2);
P(q, OC(0.8), M(0xfff7cc, 0xd4af37), 0, 4.5, -2.2);
P(q, OC(0.8), M(0xfff7cc, 0xd4af37), 2.2, 4.5, 0);
},
hexbow: function (q) {
P(q, CY(0.45, 0.45, 5), M(0x3d271d), 0, 0, 0);
P(q, BX(0.9, 7, 0.7), M(0x78350f), 0, 6, 0, 0, 0.35);
P(q, BX(0.9, 7, 0.7), M(0x78350f), 0, -6, 0, 0, -0.35);
P(q, BX(0.15, 15, 0.15), M(0x22d3ee, 0x0e7490), 0, 0, 0.9);
P(q, OC(0.6), M(0x22d3ee, 0x0e7490), 0, 0, 0.9);
},
bonecleaver_axe: function (q) {
P(q, CY(0.55, 0.65, 12), M(0x2b2118), 0, -3, 0);
P(q, BX(0.6, 5, 4.2), M(0xe8e0d0), 0, 3.5, 2);
P(q, BX(0.7, 1.4, 1.4), M(0x801020), 0, 3.5, -0.4);
P(q, OC(0.9), M(0x801020, 0x7f1d1d), 0, 3.5, -1.8);
},
grave_scythe: function (q) {
P(q, CY(0.4, 0.45, 16), M(0x1c1917), 0, -2, 0);
P(q, BX(7, 1, 0.3), M(0x34d399), 3, 6.5, 0, 0, 0.25);
P(q, OC(0.8), M(0xa7f3d0, 0x059669), 6.4, 7.4, 0);
P(q, SP(0.8), M(0x111827, 0x34d399), 0, -9.5, 0);
},
orb_launcher: function (q) {
P(q, BX(2.5, 2.5, 8), M(0x1f2937), 0, 0, 0);
P(q, CY(1.1, 1.3, 4), M(0x374151), 0, 0, -5.5, PI / 2, 0);
P(q, SP(1.4), M(0xf97316, 0xc2410c), 0, 0, -3.2);
P(q, BX(1.4, 1.4, 2), M(0x0f172a), 0, 1.8, 2);
},
frostbrand: function (q) {
P(q, CY(0.45, 0.55, 3.4), M(0x0c4a6e), 0, -1.7, 0);
P(q, BX(3.4, 0.7, 1), M(0x0284c7), 0, 0, 0);
P(q, BX(1.0, 12.5, 0.3), M(0xbae6fd), 0, 6.2, 0);
P(q, OC(0.7), M(0xe0f2fe, 0x0284c7), 0.6, 9, 0.2);
P(q, SP(0.6), M(0xe0f2fe, 0x0284c7), 0, -3.8, 0);
},
emberfang_dagger: function (q) {
P(q, CY(0.4, 0.45, 2.6), M(0x431407), 0, -1.3, 0);
P(q, BX(2.4, 0.6, 0.9), M(0x78350f), 0, 0, 0);
P(q, BX(0.8, 7, 0.25), M(0xfdba74), 0, 3.5, 0);
P(q, OC(0.55), M(0xfb923c, 0xea580c), 0, 7.2, 0);
},
void_repeater: function (q) {
P(q, BX(2.2, 2.6, 6), M(0x0b0713), 0, 0, 1);
P(q, CY(0.4, 0.4, 7), M(0x3b0764), -0.6, 0.4, -3.5, PI / 2, 0);
P(q, CY(0.4, 0.4, 7), M(0x3b0764), 0.6, 0.4, -3.5, PI / 2, 0);
P(q, OC(0.9), M(0xc026d3, 0x701a75), 0, -1.6, 1);
},
thorn_whip: function (q) {
P(q, CY(0.5, 0.6, 3), M(0x14532d), 0, -3.5, 0);
P(q, OC(0.9), M(0x16a34a), 0, -1.4, 0);
P(q, OC(0.7), M(0x4ade80, 0x15803d), 0.7, 0.4, 0);
P(q, OC(0.55), M(0x4ade80, 0x15803d), 1.6, 2, 0);
P(q, OC(0.4), M(0xbbf7d0, 0x16a34a), 2.4, 3.4, 0);
},
storm_hammer: function (q) {
P(q, CY(0.55, 0.65, 11), M(0x1e293b), 0, -3, 0);
P(q, BX(5, 3, 3), M(0x334155), 0, 4, 0);
P(q, OC(0.9), M(0xfacc15, 0xa16207), -3, 4, 0);
P(q, OC(0.9), M(0xfacc15, 0xa16207), 3, 4, 0);
P(q, SP(0.8), M(0xfde047, 0xeab308), 0, 4, 0);
},
soul_lantern: function (q) {
P(q, CY(0.35, 0.35, 2.4), M(0x111827), 0, -4.4, 0);
P(q, BX(2.6, 3.6, 2.6), M(0x1f2937), 0, -1.4, 0);
P(q, BX(1.6, 2.2, 1.6), M(0x5eead4, 0x0d9488, 0.75), 0, -1.4, 0);
P(q, SP(0.7), M(0x99f6e4, 0x14b8a6), 0, -1.2, 0);
P(q, BX(3, 0.6, 3), M(0x111827), 0, 0.7, 0);
},
plague_flask: function (q) {
P(q, BX(2.4, 0.8, 2.4), M(0x3f6212), 0, -2.6, 0);
P(q, SP(1.8), M(0x22c55e, 0x16a34a, 0.85), 0, -0.6, 0);
P(q, CY(0.6, 0.9, 2), M(0x365314), 0, 1.6, 0);
P(q, SP(0.5), M(0xa3e635, 0x4d7c0f), -0.5, -0.3, 0.8);
P(q, SP(0.35), M(0xecfccb, 0x65a30d), 0.5, -1, 0.6);
},
star_cannon: function (q) {
P(q, CY(1.3, 1.6, 9), M(0x27272a), 0, 0, -1, PI / 2, 0);
P(q, BX(3, 3, 3.4), M(0x18181b), 0, -0.4, 4.4);
P(q, OC(1.2), M(0xfde047, 0xa16207), 0, 0, -6);
P(q, SP(0.7), M(0x713f12), 1.9, -0.4, 4.4);
P(q, SP(0.7), M(0x713f12), -1.9, -0.4, 4.4);
},
warden_shield: function (q) {
P(q, BX(5.5, 9, 0.8), M(0x1e3a8a), 0, 0, 0);
P(q, BX(5.9, 9.4, 0.4), M(0xd4af37), 0, 0, -0.3);
P(q, SP(1.1), M(0xd4af37), 0, 0, 0.7);
P(q, OC(0.7), M(0x93c5fd, 0x1d4ed8), 0, 3.2, 0.6);
},
blood_talon: function (q) {
P(q, CY(0.55, 0.6, 3.4), M(0x1c1917), 0, -2.6, 0);
P(q, SP(1.2), M(0x7f1d1d, 0x991b1b), 0, -0.4, 0);
P(q, BX(0.7, 6.5, 0.5), M(0xef4444), -1, 3, 0, 0, 0.3);
P(q, BX(0.7, 7.5, 0.5), M(0xb91c1c), 0, 3.4, 0);
P(q, BX(0.7, 6.5, 0.5), M(0xef4444), 1, 3, 0, 0, -0.3);
}
};
function build(id) {
if (!window.THREE) return null;
try {
var fn = B[id];
if (!fn) return null;
var g = new THREE.Group();
var inner = new THREE.Group();
inner.position.set(2.8, -2.8, -6.5);
inner.rotation.set(-PI / 4, 0, -PI / 7);
g.add(inner);
fn(inner);
g.userData.weaponId = id;
g.mainHand = inner;
return g;
} catch (e) { return null; }
}
function ids() { return IDS.slice(); }
function palette(id) {
var p = PAL[id];
if (!p) return { primary: 0x9ca3af, accent: 0x374151 };
return { primary: p[0], accent: p[1] };
}
window.GraveGainArsenal3D = { VERSION: '1.0.0', ids: ids, build: build, palette: palette };
})();
