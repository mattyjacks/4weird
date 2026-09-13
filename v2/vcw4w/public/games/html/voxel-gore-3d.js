/* =========================================================================
 * Voxel Gore 3D — G1 lane (slug: gravegain3d ONLY)
 * -------------------------------------------------------------------------
 * Over-the-top ADULT-only voxel gore for GraveGain3D. Runtime overlay:
 * never edits the engine tree, never touches input/pointer-lock.
 *
 * Mode contract (mirrors gore-gravegain3d.js, the base blood layer):
 *   ?content=<kid|teen|all>  >  localStorage "4weird-content-mode:gravegain3d"
 *   / "FourweirdContentMode"  >  window.FourweirdContentMode = { mode }  >
 *   "fourweird-content-mode" CustomEvent (detail = { mode } or string).
 *   Default: "teen".
 *   kid  (children) : do NOTHING — no voxels, no hooks fired.
 *   teen (teens)    : defer to base blood — no voxels, base file owns blood.
 *   all  (adults)   : full voxel dismemberment bursts + damage states.
 *
 * Tech: THREE r128 InstancedMesh cube voxels, pooled <= 300, gravity +
 * ground bounce + shrink-fade. Chunked dismember bursts on kill, fed by
 * wrapping window.GraveGain3DGore.spawnKill / window.FourweirdGore.spawn
 * plus a kill-counter poll fallback for 3D world placement. Entity damage
 * states: hit-flash (emissive pulse), stagger tick (rotation jolt), death
 * burst scaled by enemy maxHP.
 *
 * Perf: zero per-frame allocation (preallocated Float32Arrays, one reused
 * dummy Object3D, for-loops, swap-remove freelist). Best-effort when THREE
 * is absent: hooks + registry still install, voxel side stays parked.
 * Exposes window.VoxelGore3D and pushes { name, version } to
 * window.GraveGainMods.
 * ========================================================================= */
(function () {
    'use strict';
    if(window.VoxelGore3D)return;

    var VERSION = '1.0.0';
    var MOD_NAME = 'voxel-gore-3d';
    var SLUG = 'gravegain3d';
    var MODES = ['kid', 'teen', 'all'];
    var LS_KEY = 'FourweirdContentMode';
    var LS_SLUG_KEY = '4weird-content-mode:' + SLUG;
    var EVENT_NAME = 'fourweird-content-mode';

    var MAX_VOXELS = 300;
    var GRAVITY = -26;
    var BOUNCE = 0.45;
    var GROUND_FRICTION = 0.72;
    var REST_SPEED = 1.2;
    var GROUND_Y = 0.35; // voxel rest height (half cube + skim)
    var FADE_FRAC = 0.35; // last 35% of life shrinks out

    // Adult palettes: arterial reds, dark clots, bone, flesh, organ.
    var PALETTE = [
        0xc1121f, 0xc1121f, 0xa30f1b, 0xe5383b,
        0x7a0c10, 0x5c090d,
        0xe8dcc8, 0xe8dcc8, // bone chips
        0xc96a5a, // flesh
        0x6d1a36  // organ purple
    ];

    function normMode(v) {
        if (v === undefined || v === null) return null;
        var s = String(v).toLowerCase().trim();
        if (s.charAt(0) === '{') {
            try {
                var o = JSON.parse(s);
                if (o && o.mode) return normMode(o.mode);
            } catch (_) { return null; }
        }
        return MODES.indexOf(s) !== -1 ? s : null;
    }

    function readMode() {
        try {
            var q = new URLSearchParams(window.location.search).get('content');
            var m = normMode(q);
            if (m) return m;
        } catch (_) {}
        try {
            if (window.localStorage) {
                var m2 = normMode(window.localStorage.getItem(LS_SLUG_KEY)) ||
                    normMode(window.localStorage.getItem(LS_KEY));
                if (m2) return m2;
            }
        } catch (_) {}
        try {
            if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                var m3 = normMode(window.FourweirdContentMode.mode);
                if (m3) return m3;
            }
        } catch (_) {}
        return 'teen';
    }

    function isAdult() { return state.mode === 'all'; }

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function game() {
        try { return window.GraveGainGame || window.gg || null; }
        catch (_) { return null; }
    }

    function findScene(g) {
        if (!g) return null;
        var keys = ['scene3d', 'scene', 'world', 'threeScene', 'three_scene'];
        for (var i = 0; i < keys.length; i++) {
            try {
                var s = g[keys[i]];
                if (s && typeof s.add === 'function') return s;
            } catch (_) {}
        }
        return null;
    }

    // Enemy maxHP lookup. NOTE: gravegain3d/engine/game-data.js carries
    // Race/Class tables only (no enemy table as of 2026-09-13), so resolve
    // per-entity fields first, then the shared data tables, then default.
    function enemyMaxHP(e) {
        try {
            if (!e) return 40;
            if (typeof e.maxHp === 'number' && e.maxHp > 0) return e.maxHp;
            if (typeof e.maxHP === 'number' && e.maxHP > 0) return e.maxHP;
            if (typeof e.hpMax === 'number' && e.hpMax > 0) return e.hpMax;
            if (typeof e.maxHealth === 'number' && e.maxHealth > 0) return e.maxHealth;
            var gd = window.GraveGainGameData;
            if (gd && e.type && gd.Enemies && gd.Enemies[e.type] &&
                typeof gd.Enemies[e.type].maxHp === 'number') {
                return gd.Enemies[e.type].maxHp;
            }
        } catch (_) {}
        return 40;
    }

    function deathBurstSize(maxHP) {
        // Scale chunk count by toughness: chaff pops, bruisers erupt.
        var n = 14 + Math.round(maxHP / 5);
        if (n < 14) n = 14;
        if (n > 64) n = 64;
        return n;
    }

    var state = {
        mode: readMode(),
        mesh: null,      // InstancedMesh
        dummy: null,     // reused Object3D for matrix composition
        colorTmp: null,  // reused Color
        active: 0,       // live voxel count (swap-remove packed)
        cursor: 0,       // ring cursor for steal-oldest recycle
        lastKills: null,
        quality: 1,      // 1 = full, 0.5 = degraded (autodegrade event)
        raf: 0,
        lastT: 0,
        hookedBase: false,
        hookedBus: false,
        // Preallocated pool (zero per-frame allocation):
        px: new Float32Array(MAX_VOXELS),
        py: new Float32Array(MAX_VOXELS),
        pz: new Float32Array(MAX_VOXELS),
        vx: new Float32Array(MAX_VOXELS),
        vy: new Float32Array(MAX_VOXELS),
        vz: new Float32Array(MAX_VOXELS),
        sz: new Float32Array(MAX_VOXELS),
        life: new Float32Array(MAX_VOXELS),
        maxLife: new Float32Array(MAX_VOXELS),
        spin: new Float32Array(MAX_VOXELS),
        rot: new Float32Array(MAX_VOXELS),
        settled: new Uint8Array(MAX_VOXELS),
        // Scratch (module-level, never allocated in loop):
        scratchPos: { x: 0, y: 10, z: 0 },
        enemySeen: null // WeakMap<enemy, {hp, flashUntil, staggerT, dead}>
    };

    try { state.enemySeen = (typeof WeakMap !== 'undefined') ? new WeakMap() : null; }
    catch (_) { state.enemySeen = null; }

    function trackRecord(e) {
        if (!state.enemySeen) return null;
        var rec = state.enemySeen.get(e);
        if (!rec) {
            rec = { hp: null, flashUntil: 0, staggerT: 0, dead: false };
            try { state.enemySeen.set(e, rec); } catch (_) { return null; }
        }
        return rec;
    }

    // -- voxel pool ----------------------------------------------------------
    function ensureMesh() {
        if (state.mesh || !window.THREE) return state.mesh;
        var g = game();
        var scene = findScene(g);
        if (!scene) return null;
        try {
            var THREE = window.THREE;
            var geo = new THREE.BoxGeometry(1, 1, 1);
            var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            var mesh = new THREE.InstancedMesh(geo, mat, MAX_VOXELS);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.frustumCulled = false;
            state.dummy = new THREE.Object3D();
            state.colorTmp = new THREE.Color();
            var i;
            for (i = 0; i < MAX_VOXELS; i++) {
                state.dummy.position.set(0, -1000, 0);
                state.dummy.scale.set(0.0001, 0.0001, 0.0001);
                state.dummy.rotation.set(0, 0, 0);
                state.dummy.updateMatrix();
                mesh.setMatrixAt(i, state.dummy.matrix);
                mesh.setColorAt(i, state.colorTmp.setHex(0xc1121f));
            }
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            mesh.instanceMatrix.needsUpdate = true;
            scene.add(mesh);
            state.mesh = mesh;
            return mesh;
        } catch (_) { return null; }
    }

    function parkSlot(mesh, i) {
        state.dummy.position.set(0, -1000, 0);
        state.dummy.scale.set(0.0001, 0.0001, 0.0001);
        state.dummy.rotation.set(0, 0, 0);
        state.dummy.updateMatrix();
        mesh.setMatrixAt(i, state.dummy.matrix);
    }

    function spawnOne(x, y, z, spread, up, size, colorHex, lifeS) {
        var mesh = state.mesh;
        if (!mesh) return;
        var i;
        if (state.active < MAX_VOXELS) {
            i = state.active;
            state.active++;
        } else {
            // Pool full: steal oldest via ring cursor (no alloc, no splice).
            i = state.cursor;
            state.cursor++;
            if (state.cursor >= MAX_VOXELS) state.cursor = 0;
        }
        state.px[i] = x + rnd(-spread, spread);
        state.py[i] = y + rnd(-spread * 0.6, spread);
        state.pz[i] = z + rnd(-spread, spread);
        state.vx[i] = rnd(-spread * 3, spread * 3);
        state.vy[i] = rnd(up * 0.35, up);
        state.vz[i] = rnd(-spread * 3, spread * 3);
        state.sz[i] = size * rnd(0.6, 1.5);
        state.maxLife[i] = lifeS * rnd(0.7, 1.3);
        state.life[i] = state.maxLife[i];
        state.spin[i] = rnd(-7, 7);
        state.rot[i] = rnd(0, 6.2832);
        state.settled[i] = 0;
        try { mesh.setColorAt(i, state.colorTmp.setHex(colorHex)); } catch (_) {}
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Chunked dismember burst: 3–5 limb clusters flung from the kill point.
    // count scales with enemy maxHP (see deathBurstSize).
    function burst(x, y, z, count, big) {
        if (!isAdult()) return; // kid: nothing. teen: base blood owns it.
        if (!ensureMesh()) return;
        var n = Math.round(count * state.quality);
        if (n < 1) return;
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            var g0 = game();
            x = 0; y = 10; z = 0;
            try {
                if (g0 && g0.player) { x = g0.player.x || 0; z = g0.player.y || 0; }
            } catch (_) {}
        }
        var chunks = big ? 5 : 3 + ((Math.random() * 2) | 0);
        var per = Math.max(2, Math.round(n / chunks));
        var c, k;
        for (c = 0; c < chunks; c++) {
            var cx = x + rnd(-2.2, 2.2);
            var cy = y + rnd(4, 14);
            var cz = z + rnd(-2.2, 2.2);
            var boneHeavy = (c === 0); // one bony core chunk per burst
            for (k = 0; k < per; k++) {
                var pick = Math.random();
                var col;
                if (boneHeavy && pick < 0.45) col = 0xe8dcc8;
                else if (pick < 0.12) col = 0x6d1a36;
                else if (pick < 0.25) col = 0xc96a5a;
                else col = PALETTE[(Math.random() * 7) | 0];
                spawnOne(cx, cy, cz,
                    big ? 2.4 : 1.5,
                    big ? 20 : 14,
                    big ? 1.15 : 0.85,
                    col, big ? 6 : 4.5);
            }
        }
        // Hot red mist core: small bright cubes straight up.
        var mist = Math.round(n * 0.25);
        for (k = 0; k < mist; k++) {
            spawnOne(x, y + 8, z, 1.2, 24, 0.55, 0xe5383b, 2.5);
        }
    }

    function clearPool() {
        if (!state.mesh) { state.active = 0; return; }
        var i;
        for (i = 0; i < state.active; i++) parkSlot(state.mesh, i);
        state.mesh.instanceMatrix.needsUpdate = true;
        state.active = 0;
        state.cursor = 0;
    }

    // -- per-frame update (zero allocation: for-loops, scratch only) ---------
    function step(dt) {
        var mesh = state.mesh;
        if (!mesh || state.active === 0) return;
        var d = state.dummy;
        var i = 0;
        while (i < state.active) {
            state.life[i] -= dt;
            if (state.life[i] <= 0) {
                // Swap-remove with last live slot (copies fields, no alloc).
                var last = state.active - 1;
                parkSlot(mesh, last);
                if (i !== last) {
                    state.px[i] = state.px[last]; state.py[i] = state.py[last]; state.pz[i] = state.pz[last];
                    state.vx[i] = state.vx[last]; state.vy[i] = state.vy[last]; state.vz[i] = state.vz[last];
                    state.sz[i] = state.sz[last];
                    state.life[i] = state.life[last]; state.maxLife[i] = state.maxLife[last];
                    state.spin[i] = state.spin[last]; state.rot[i] = state.rot[last];
                    state.settled[i] = state.settled[last];
                    try {
                        var cbuf = mesh.instanceColor.array;
                        cbuf[i * 3] = cbuf[last * 3];
                        cbuf[i * 3 + 1] = cbuf[last * 3 + 1];
                        cbuf[i * 3 + 2] = cbuf[last * 3 + 2];
                        mesh.instanceColor.needsUpdate = true;
                    } catch (_) {}
                }
                state.active = last;
                continue; // reprocess swapped-in slot
            }
            if (!state.settled[i]) {
                state.vy[i] += GRAVITY * dt;
                state.px[i] += state.vx[i] * dt;
                state.py[i] += state.vy[i] * dt;
                state.pz[i] += state.vz[i] * dt;
                state.rot[i] += state.spin[i] * dt;
                if (state.py[i] <= GROUND_Y) {
                    state.py[i] = GROUND_Y;
                    if (state.vy[i] < -REST_SPEED) {
                        state.vy[i] = -state.vy[i] * BOUNCE;
                        state.vx[i] *= GROUND_FRICTION;
                        state.vz[i] *= GROUND_FRICTION;
                        state.spin[i] *= GROUND_FRICTION;
                    } else {
                        state.settled[i] = 1;
                        state.vx[i] = 0; state.vy[i] = 0; state.vz[i] = 0;
                        state.spin[i] = 0;
                    }
                }
            }
            var frac = state.life[i] / state.maxLife[i];
            var s = state.sz[i];
            if (frac < FADE_FRAC) s *= (frac / FADE_FRAC);
            d.position.set(state.px[i], state.py[i], state.pz[i]);
            d.scale.set(s, s, s);
            d.rotation.set(state.rot[i], state.rot[i] * 0.7, 0);
            d.updateMatrix();
            mesh.setMatrixAt(i, d.matrix);
            i++;
        }
        mesh.instanceMatrix.needsUpdate = true;
    }

    function frame(t) {
        state.raf = requestAnimationFrame(frame);
        var dt = (t - state.lastT) / 1000;
        state.lastT = t;
        if (!(dt > 0) || dt > 0.05) dt = 0.016;
        if (document.hidden) return;
        step(dt);
    }

    // -- entity damage states --------------------------------------------------
    // Hit-flash: emissive pulse on enemy meshes. Stagger tick: brief rotation
    // jolt decaying over ~120ms. Death: voxel burst scaled by maxHP.
    // All guarded: unknown enemy shapes degrade to burst-only.
    function applyHitFlash(e, rec, now) {
        rec.flashUntil = now + 90;
        try {
            var meshes = e.meshes || e.parts || (e.mesh ? [e.mesh] : null);
            if (!meshes) {
                var g = game();
                if (g && g.scene3d && e.id !== undefined) {
                    var found = null;
                    try {
                        g.scene3d.traverse(function (o) {
                            if (!found && o && o.userData && o.userData.enemyId === e.id) found = o;
                        });
                    } catch (_) {}
                    meshes = found ? [found] : null;
                }
            }
            if (!meshes) return;
            for (var i = 0; i < meshes.length; i++) {
                var m = meshes[i];
                if (!m || !m.material || !m.material.emissive) continue;
                if (rec.savedEmissive === undefined) {
                    try { rec.savedEmissive = m.material.emissive.getHex(); } catch (_) {}
                }
                try { m.material.emissive.setHex(0xff2222); } catch (_) {}
            }
            rec.flashMeshes = meshes;
        } catch (_) {}
    }

    function restoreFlash(rec) {
        try {
            var meshes = rec.flashMeshes;
            if (!meshes) return;
            for (var i = 0; i < meshes.length; i++) {
                var m = meshes[i];
                if (!m || !m.material || !m.material.emissive) continue;
                try {
                    if (rec.savedEmissive !== undefined) m.material.emissive.setHex(rec.savedEmissive);
                    else m.material.emissive.setHex(0x000000);
                } catch (_) {}
            }
        } catch (_) {}
        rec.flashMeshes = null;
        rec.savedEmissive = undefined;
    }

    function applyStagger(e, rec) {
        rec.staggerT = 0.12; // seconds of wobble
        try {
            var target = e.mesh || (e.meshes && e.meshes[0]) || null;
            if (target && target.rotation) {
                target.rotation.z += rnd(-0.28, 0.28);
                rec.staggerTarget = target;
            }
        } catch (_) {}
    }

    function decayStagger(rec, dt) {
        if (rec.staggerT <= 0) return;
        rec.staggerT -= dt;
        if (rec.staggerT <= 0) {
            try {
                var t = rec.staggerTarget;
                if (t && t.rotation) t.rotation.z *= 0.4;
            } catch (_) {}
            rec.staggerTarget = null;
        }
    }

    function onEnemyDeath(e, rec) {
        var maxHP = enemyMaxHP(e);
        var ex = 0, ey = 10, ez = 0;
        try {
            if (typeof e.x === 'number') ex = e.x;
            if (typeof e.z === 'number') ex = e.x; // world x from logic x
            if (typeof e.y === 'number') ez = e.y; // world z from logic y
            if (e.mesh && e.mesh.position) {
                ex = e.mesh.position.x; ey = e.mesh.position.y + 6; ez = e.mesh.position.z;
            }
        } catch (_) {}
        burst(ex, ey, ez, deathBurstSize(maxHP), maxHP >= 120);
    }

    function pollEnemies() {
        if (!isAdult()) return;
        var now = 0;
        try { now = performance.now(); } catch (_) {}
        var g = game();
        if (!g) return;
        var list = null;
        try { list = g.enemies || g.foes || null; } catch (_) {}
        if (!list || typeof list.length !== 'number') return;
        var dt = 0.15; // poll cadence ~150ms; stagger decay uses fixed step
        var i, e, rec, hp;
        for (i = 0; i < list.length; i++) {
            e = list[i];
            if (!e) continue;
            rec = trackRecord(e);
            if (!rec) continue;
            try { hp = e.hp; } catch (_) { continue; }
            if (typeof hp !== 'number') continue;
            if (rec.hp === null) { rec.hp = hp; continue; }
            if (hp < rec.hp) {
                // Damaged: flash + stagger + small chip spray at wound.
                applyHitFlash(e, rec, now);
                applyStagger(e, rec);
                if (hp <= 0 && !rec.dead) {
                    rec.dead = true;
                    onEnemyDeath(e, rec);
                } else if (hp > 0) {
                    try {
                        var wx = (e.mesh && e.mesh.position) ? e.mesh.position.x : (e.x || 0);
                        var wy = (e.mesh && e.mesh.position) ? e.mesh.position.y + 8 : 10;
                        var wz = (e.mesh && e.mesh.position) ? e.mesh.position.z : (e.y || 0);
                        burst(wx, wy, wz, 5, false);
                    } catch (_) {}
                }
            } else if (hp > rec.hp && rec.dead && hp > 0) {
                rec.dead = false; // respawned / recycled entity object
            }
            rec.hp = hp;
            if (rec.flashUntil && now > rec.flashUntil) {
                restoreFlash(rec);
                rec.flashUntil = 0;
            }
            decayStagger(rec, dt);
        }
    }

    // -- kill intake: hooks + counter poll ------------------------------------
    function killWorldPos() {
        // Prefer the most recently hurt enemy, else nearest corpse, else
        // a point in front of the player. Writes into scratchPos (no alloc).
        var s = state.scratchPos;
        s.x = 0; s.y = 10; s.z = 0;
        try {
            var g = game();
            if (!g) return s;
            var list = g.enemies || [];
            var i, e, best = null, bestDmg = -1;
            for (i = 0; i < list.length; i++) {
                e = list[i];
                if (!e) continue;
                var rec = state.enemySeen ? state.enemySeen.get(e) : null;
                if (rec && rec.dead && !rec.burstSited) {
                    rec.burstSited = true;
                    if (e.mesh && e.mesh.position) {
                        s.x = e.mesh.position.x; s.y = e.mesh.position.y + 6; s.z = e.mesh.position.z;
                    } else {
                        s.x = e.x || 0; s.y = 10; s.z = e.y || 0;
                    }
                    return s;
                }
                if (e.hp > 0 && rec && rec.hp !== null) {
                    var maxHP = enemyMaxHP(e);
                    var dmg = maxHP - e.hp;
                    if (dmg > bestDmg) { bestDmg = dmg; best = e; }
                }
            }
            if (best) {
                if (best.mesh && best.mesh.position) {
                    s.x = best.mesh.position.x; s.y = best.mesh.position.y + 6; s.z = best.mesh.position.z;
                } else {
                    s.x = best.x || 0; s.y = 10; s.z = best.y || 0;
                }
                return s;
            }
            if (g.player) {
                s.x = g.player.x || 0; s.y = 10; s.z = (g.player.y || 0) + 14;
            }
        } catch (_) {}
        return s;
    }

    function voxelKill(count, maxHPHint) {
        if (!isAdult()) return;
        var s = killWorldPos();
        var n = count > 1 ? deathBurstSize(60) + 8 * count : deathBurstSize(maxHPHint || 60);
        burst(s.x, s.y, s.z, n, (maxHPHint || 0) >= 120 || count > 1);
    }

    function hookBaseGore() {
        if (state.hookedBase) return;
        var base = null;
        try { base = window.GraveGain3DGore || null; } catch (_) {}
        if (!base || typeof base.spawnKill !== 'function') return;
        try {
            var orig = base.spawnKill;
            base.spawnKill = function (nx, ny, count) {
                try { orig.call(base, nx, ny, count); } catch (_) {}
                // Teen/kid path stays with base blood; voxels are adult-only.
                try { voxelKill(Math.max(1, count | 0 || 1), 0); } catch (_) {}
            };
            state.hookedBase = true;
        } catch (_) {}
    }

    function hookSharedBus() {
        if (state.hookedBus) return;
        var bus = null;
        try { bus = window.FourweirdGore || null; } catch (_) {}
        if (!bus || typeof bus.spawn !== 'function') return;
        try {
            var orig = bus.spawn;
            bus.spawn = function (a, b, c) {
                try {
                    if (arguments.length >= 3) orig.call(bus, a, b, c);
                    else if (arguments.length === 1) orig.call(bus, a);
                    else orig.apply(bus, arguments);
                } catch (_) {}
                try {
                    var detail = (arguments.length >= 3) ? c : a;
                    var slug = detail && detail.game;
                    var kills = detail && detail.kills;
                    if (slug && slug !== SLUG) return; // not our game
                    if (detail && detail.mode && detail.mode !== 'all') return;
                    voxelKill(Math.max(1, (kills | 0) || 1), 0);
                } catch (_) {}
            };
            state.hookedBus = true;
        } catch (_) {}
    }

    function pollKills() {
        if (!isAdult()) {
            try {
                var g0 = game();
                if (g0 && typeof g0.kills === 'number') state.lastKills = g0.kills;
            } catch (_) {}
            return;
        }
        var g = game();
        if (!g || typeof g.kills !== 'number') return;
        try {
            if (state.lastKills === null) { state.lastKills = g.kills; return; }
            if (g.kills > state.lastKills) {
                var delta = g.kills - state.lastKills;
                state.lastKills = g.kills;
                if (delta > 5) delta = 5;
                voxelKill(delta, 0);
            } else {
                state.lastKills = g.kills;
            }
        } catch (_) {}
    }

    // -- mode + boot -----------------------------------------------------------
    function setMode(m) {
        var n = normMode(m);
        if (!n) return false;
        var wasAdult = (state.mode === 'all');
        state.mode = n;
        if (wasAdult && n !== 'all') clearPool(); // leaving adult: park voxels
        return true;
    }

    try {
        window.addEventListener(EVENT_NAME, function (e) {
            var d = e && e.detail;
            setMode(d && typeof d === 'object' ? d.mode : d);
        });
    } catch (_) {}

    try {
        // Sustained-slow-frames autodegrade (see performance-manager.js):
        // halve burst volume instead of dropping frames.
        window.addEventListener('gravegain-graphics-autodegrade', function () {
            state.quality = 0.5;
        });
    } catch (_) {}

    window.VoxelGore3D = {
        VERSION: VERSION,
        getMode: function () { return state.mode; },
        isActive: function () { return isAdult() && !!state.mesh; },
        burst: function (x, y, z, count, big) { burst(x, y, z, count || 20, !!big); },
        spawnKill: function (count, maxHP) { voxelKill(count || 1, maxHP || 0); },
        clear: function () { clearPool(); }
    };

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: MOD_NAME, version: VERSION });
    } catch (_) {}

    function boot() {
        try { ensureMesh(); } catch (_) {}
        try { hookBaseGore(); } catch (_) {}
        try { hookSharedBus(); } catch (_) {}
        try {
            var g = game();
            if (g && typeof g.kills === 'number' && state.lastKills === null) {
                state.lastKills = g.kills;
            }
        } catch (_) {}
    }

    state.lastT = 0;
    try {
        if (typeof requestAnimationFrame === 'function') {
            state.raf = requestAnimationFrame(function (t) {
                state.lastT = t || 0;
                state.raf = requestAnimationFrame(frame);
            });
        }
    } catch (_) {}

    // Slow polls (fully guarded, never throw): mesh attach + hook install,
    // kill counter, enemy damage states. Stops re-attaching once settled.
    try {
        var ticks = 0;
        var timer = setInterval(function () {
            ticks++;
            try {
                if (!state.mesh) ensureMesh();
                if (!state.hookedBase) hookBaseGore();
                if (!state.hookedBus) hookSharedBus();
                pollKills();
                pollEnemies();
                if (state.mesh && state.hookedBase && state.hookedBus && ticks > 40) {
                    // Keep polling kills/damage (cheap) but drop to slow cadence.
                    clearInterval(timer);
                    setInterval(function () {
                        try { pollKills(); } catch (_) {}
                        try { pollEnemies(); } catch (_) {}
                    }, 600);
                }
            } catch (_) {}
        }, 400);
    } catch (_) {}

    try { boot(); } catch (_) {}
})();
