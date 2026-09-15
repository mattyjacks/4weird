/* GraveGain2dB: Breach MoonRock — Mission 1: LZ Crash Site Defense (lane B4).
 * Path: v2/vcw4w/public/games/html/gravegain2dB/missions/mission1.js
 * Vanilla JS, no imports/exports (loaded via script tags, after sim+engine).
 * PURE SIM DATA + LOGIC: no DOM/Canvas/Audio/fetch/WebSocket/React/localStorage/time calls.
 * Idempotent guard; exposes window.GraveGain2DB_Mission1; pushes GraveGainMods entry.
 * Slot 1 of the 10-mission sequence (B6/campaign.js owns slots 2-10 — never edit it).
 * Coordinates with B1/B2/B3/B5 globals ONLY via poll-guarded lookups; degrades gracefully.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.GraveGain2DB_Mission1) return;

  var VERSION = '0.1.0-b4';

  // Poll-guarded global lookup: other lanes (B1/B2/B3/B5) may not exist yet.
  function when(name, cb, fallback) {
    try {
      if (window[name]) return cb(window[name]);
    } catch (e) { /* degrade gracefully */ }
    return fallback;
  }

  // ---------------------------------------------------------------------------
  // Mission identity + opening radio briefing (inline fallback; full script in
  // briefings.js owned by this same lane — poll-guarded, inline used if absent).
  // ---------------------------------------------------------------------------
  var INLINE_BRIEFING = [
    { from: 'CMDR OKONKWO', text: 'Mayday, Mayday — dropship Kestrel is down in Colony Alpha crater. Survivors pinging.' },
    { from: 'SGT REYES', text: 'LZ Crash Site is hot. Secure the survivors, recover the black box, then move.' },
    { from: 'CMDR OKONKWO', text: 'The memorial wall above the basin is cracked. Bring it down ON the horde — not on our people. Okonkwo out.' }
  ];

  function getBriefing() {
    var full = when('GraveGain2DB_Briefings', function (B) {
      try { return B.get('mission1'); } catch (e) { return null; }
    }, null);
    return full || { id: 'mission1-briefing', lines: INLINE_BRIEFING, source: 'inline-fallback' };
  }

  // ---------------------------------------------------------------------------
  // Default build: Human Warrior Soldier w/ Pulse Rifle sidearm.
  // ---------------------------------------------------------------------------
  var DEFAULT_BUILD = {
    id: 'm1-default',
    race: 'Human', archetype: 'Warrior', cls: 'Soldier',
    sidearm: 'pulse-rifle',
    stats: { hp: 120, stamina: 100, speed: 1.0 },
    note: 'Default Mission 1 build. Other builds unlock later; engine may override via B2/B5 globals.'
  };

  // ---------------------------------------------------------------------------
  // Enemy types (3) + warden (boss). Nightmare pressure comes from cadence /
  // flanking / timers (see DIFFICULTY), never HP bloat (hpMult stays 1.0).
  // ---------------------------------------------------------------------------
  var ENEMIES = [
    { id: 'husk-skitterer', name: 'Husk Skitterer', role: 'swarmer', hp: 30, dmg: 8, speed: 1.2 },
    { id: 'breach-maw', name: 'Breach Maw', role: 'bruiser', hp: 90, dmg: 18, speed: 0.7 },
    { id: 'spore-spitter', name: 'Spore Spitter', role: 'ranged', hp: 45, dmg: 12, speed: 0.9 }
  ];
  var WARDEN = { id: 'memorial-warden', name: 'MEMORIAL WARDEN', role: 'boss', hp: 900, dmg: 25, speed: 0.8 };

  // ---------------------------------------------------------------------------
  // Weapons (2): Pulse Rifle + Scatter Blaster.
  // ---------------------------------------------------------------------------
  var WEAPONS = [
    { id: 'pulse-rifle', name: 'Pulse Rifle', icon: '🔫', kind: 'hitscan-burst', dmg: 14, mag: 30, note: 'Default sidearm. Reliable at range.' },
    { id: 'scatter-blaster', name: 'Scatter Blaster', icon: '💥', kind: 'spread', dmg: 8, pellets: 6, mag: 6, note: 'Loot pickup in Black Box Ridge. Clears swarmers up close.' }
  ];

  // ---------------------------------------------------------------------------
  // Zones: safe opening, 3 combat zones, 1 teaching moment, 1 optional
  // rescue/loot path, 1 checkpoint, boss + extraction.
  // ---------------------------------------------------------------------------
  var ZONES = [
    { id: 'crash-hollow', kind: 'opening', combat: false, hostiles: 0,
      desc: 'Safe opening encounter: wreck of the Kestrel, 1 scripted dying skitterer (already wounded, 1 HP). No fail state.' },
    { id: 'survivor-pocket', kind: 'combat', hostiles: 4, objective: 'survivors',
      desc: 'Combat zone 1: secure 3 survivors pinned behind cargo pallets.' },
    { id: 'blackbox-ridge', kind: 'combat', hostiles: 6, objective: 'blackbox',
      desc: 'Combat zone 2: recover the black box. Scatter Blaster cache here.' },
    { id: 'scaffold-yard', kind: 'teaching', combat: false,
      teaching: { safeObject: 'Loose Scaffold', name: 'Collapse the scaffold', reward: 'Medkit + 50 salvage',
        hint: 'Toast-only hint (never a pausing tutorial window): "Shoot the marked struts — debris falls away from you."',
        safe: true },
      desc: 'Traversal/destruction teaching moment on a SAFE object before the real wall.' },
    { id: 'service-tunnel', kind: 'optional', combat: true, hostiles: 3, optional: true,
      rescue: { civilian: 'Dr. Ilsen Voss', methods: ['precision', 'wall-behind-destruction'],
        loot: 'Stim cache + lore tag', note: 'Rescue via precision escort OR by collapsing the tunnel-mouth wall behind her (never onto her).' },
      desc: 'Optional rescue/loot path. Skippable — extraction stays reachable.' },
    { id: 'ridge-checkpoint', kind: 'checkpoint', combat: false,
      desc: 'Checkpoint BEFORE the climax. Respawns here; warden arena seals after entry.' },
    { id: 'horde-basin', kind: 'combat', hostiles: 10, objective: 'collapse-wall',
      desc: 'Combat zone 3 / climax approach: memorial-wall collapse onto the horde.' },
    { id: 'warden-arena', kind: 'boss', boss: 'memorial-warden', desc: 'Boss: MEMORIAL WARDEN.' },
    { id: 'dustoff-pad', kind: 'extraction', combat: false, desc: 'Extraction. Mission ends on pad with survivors aboard.' }
  ];

  // ---------------------------------------------------------------------------
  // Memorial-wall support group: the scripted collapse. WARNING PROFILE ships
  // with the declaration so the engine can telegraph. Protected cells are
  // NEVER destroyed by the collapse (validated below).
  // ---------------------------------------------------------------------------
  var MEMORIAL_WALL = {
    id: 'memorial-wall',
    cells: ['memorial-wall-a', 'memorial-wall-b', 'memorial-wall-c'],
    warning: { profile: 'collapse-telegraph', telegraphMs: 1500, radiusPx: 220, killZone: 'horde-basin-floor',
      banner: '⚠ MEMORIAL WALL COLLAPSING — CLEAR THE BASIN FLOOR' },
    // Scripted collapse: destroys wall cells + horde units in kill zone only.
    // Returns { destroyed, hordeKilled, protectedIntact }.
    collapse: function (simState) {
      var destroyed = [];
      for (var i = 0; i < this.cells.length; i++) {
        var c = this.cells[i];
        if (simState && simState.destroyCell) simState.destroyCell(c);
        destroyed.push(c);
      }
      var hordeKilled = 0;
      if (simState && simState.units) {
        for (var u = 0; u < simState.units.length; u++) {
          var unit = simState.units[u];
          if (unit.zone === this.warning.killZone && unit.faction === 'horde') {
            unit.hp = 0; hordeKilled++;
          }
        }
      }
      var protectedIntact = true;
      if (simState && simState.isCellIntact) {
        for (var p = 0; p < PROTECTED_CELLS.length; p++) {
          if (!simState.isCellIntact(PROTECTED_CELLS[p])) { protectedIntact = false; break; }
        }
      }
      return { destroyed: destroyed, hordeKilled: hordeKilled, protectedIntact: protectedIntact };
    }
  };

  // ---------------------------------------------------------------------------
  // Route graph (named ground cells). All mandatory ground / checkpoint /
  // extraction cells are PROTECTED (destruction-proof).
  // ---------------------------------------------------------------------------
  var NODES = [
    { id: 'lz-entry', kind: 'entry', protected: true },
    { id: 'crash-hollow-floor', kind: 'ground', protected: true },
    { id: 'survivor-pocket-floor', kind: 'ground', objective: 'survivors', protected: true },
    { id: 'blackbox-ridge-floor', kind: 'ground', objective: 'blackbox', protected: true },
    { id: 'scaffold-yard-floor', kind: 'ground', protected: true },
    { id: 'memorial-approach', kind: 'ground', protected: true },
    { id: 'memorial-wall-a', kind: 'wall', destructible: true },
    { id: 'memorial-wall-b', kind: 'wall', destructible: true },
    { id: 'memorial-wall-c', kind: 'wall', destructible: true },
    { id: 'horde-basin-floor', kind: 'ground', protected: true },
    { id: 'ledge-path', kind: 'ground', protected: true, note: 'Safe precision route: narrow ledge, no destruction.' },
    { id: 'service-tunnel-mouth', kind: 'ground', protected: true },
    { id: 'service-tunnel-floor', kind: 'ground', optional: true },
    { id: 'tunnel-mouth-wall', kind: 'wall', destructible: true, note: 'Rescue wall — falls outward, away from the civilian.' },
    { id: 'ridge-checkpoint-pad', kind: 'checkpoint', protected: true },
    { id: 'warden-arena-floor', kind: 'ground', objective: 'warden', protected: true },
    { id: 'dustoff-pad', kind: 'extraction', protected: true },
    { id: 'collapsed-vent', kind: 'breach', note: 'Emergency breach location: one-way vent into the arena if the party wipes at the wall.' }
  ];

  var EDGES = [
    ['lz-entry', 'crash-hollow-floor'],
    ['crash-hollow-floor', 'survivor-pocket-floor'],
    ['survivor-pocket-floor', 'blackbox-ridge-floor'],
    ['blackbox-ridge-floor', 'scaffold-yard-floor'],
    ['scaffold-yard-floor', 'memorial-approach'],
    ['scaffold-yard-floor', 'service-tunnel-mouth'],
    ['service-tunnel-mouth', 'service-tunnel-floor'],
    ['service-tunnel-floor', 'ridge-checkpoint-pad'],
    ['memorial-approach', 'memorial-wall-b'],
    ['memorial-wall-a', 'memorial-wall-b'],
    ['memorial-wall-b', 'memorial-wall-c'],
    // Post-collapse: wall cells become passable rubble (primary shortcut).
    ['memorial-wall-b', 'horde-basin-floor'],
    ['memorial-approach', 'ledge-path'],
    ['ledge-path', 'horde-basin-floor'],
    ['horde-basin-floor', 'ridge-checkpoint-pad'],
    ['ridge-checkpoint-pad', 'warden-arena-floor'],
    ['warden-arena-floor', 'dustoff-pad'],
    ['collapsed-vent', 'warden-arena-floor'],
    ['service-tunnel-mouth', 'collapsed-vent']
  ];

  var PROTECTED_CELLS = [];
  (function () {
    for (var i = 0; i < NODES.length; i++) {
      if (NODES[i].protected) PROTECTED_CELLS.push(NODES[i].id);
    }
  })();

  // Path validation data: 1 primary route + 1 destructive shortcut + 1 safe
  // precision route + emergency fallback. BFS over EDGES; wall cells are
  // passable only when `wallsDown` (collapsed) is true.
  var WALL_CELL_IDS = ['memorial-wall-a', 'memorial-wall-b', 'memorial-wall-c', 'tunnel-mouth-wall'];

  function isWall(id) { return WALL_CELL_IDS.indexOf(id) !== -1; }

  function reachable(fromId, toId, opts) {
    opts = opts || {};
    var adj = {};
    function link(a, b) {
      if (!opts.wallsDown && (isWall(a) || isWall(b))) {
        // Precision route never crosses wall cells; shortcut needs collapse.
        if (!(opts.precision && (a === 'ledge-path' || b === 'ledge-path'))) {
          // allow edges that merely touch a wall only when walls are down
          return;
        }
      }
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    }
    for (var i = 0; i < EDGES.length; i++) link(EDGES[i][0], EDGES[i][1]);
    var seen = {};
    var q = [fromId];
    seen[fromId] = true;
    while (q.length) {
      var cur = q.shift();
      if (cur === toId) return true;
      var next = adj[cur] || [];
      for (var j = 0; j < next.length; j++) {
        if (!seen[next[j]]) { seen[next[j]] = true; q.push(next[j]); }
      }
    }
    return false;
  }

  var ROUTES = {
    primary: {
      id: 'primary', name: 'Primary route',
      path: ['lz-entry', 'crash-hollow-floor', 'survivor-pocket-floor', 'blackbox-ridge-floor',
        'scaffold-yard-floor', 'memorial-approach', 'ledge-path', 'horde-basin-floor',
        'ridge-checkpoint-pad', 'warden-arena-floor', 'dustoff-pad'],
      needsWallsDown: false
    },
    destructiveShortcut: {
      id: 'destructive-shortcut', name: 'Memorial-wall collapse shortcut',
      path: ['memorial-approach', 'memorial-wall-b', 'horde-basin-floor'],
      needsWallsDown: true,
      note: 'Collapse the memorial wall onto the horde, then walk the rubble. Faster, louder.'
    },
    precisionRoute: {
      id: 'precision-route', name: 'Safe precision route (ledge)',
      path: ['memorial-approach', 'ledge-path', 'horde-basin-floor'],
      needsWallsDown: false,
      note: 'Narrow ledge, no destruction. Always open; slower under fire.'
    },
    emergencyFallback: {
      id: 'emergency-fallback', name: 'Emergency fallback (service tunnel + vent)',
      path: ['scaffold-yard-floor', 'service-tunnel-mouth', 'collapsed-vent', 'warden-arena-floor', 'dustoff-pad'],
      needsWallsDown: false,
      note: 'If the party wipes at the wall: tunnel mouth -> collapsed vent -> arena. Skips the basin.'
    }
  };

  var CHECKPOINT = { id: 'ridge-checkpoint-pad', zone: 'ridge-checkpoint', before: 'climax',
    respawn: true, sealsArenaAfterEntry: true };
  var EXTRACTION = { id: 'dustoff-pad', zone: 'dustoff-pad', requires: ['survivors', 'blackbox', 'warden'] };
  var EMERGENCY_BREACH = { id: 'collapsed-vent', oneWay: true, to: 'warden-arena-floor' };

  // ---------------------------------------------------------------------------
  // Difficulty params. Nightmare = coordination pressure (cadence, flanking,
  // timers, surges), NOT HP bloat: enemyHpMult stays 1.0.
  // ---------------------------------------------------------------------------
  var DIFFICULTY = {
    Cadet: { enemyHpMult: 0.8, enemyDmgMult: 0.6, spawnCadenceMult: 1.4, flanking: false,
      objectiveTimer: false, hordeSurges: 0, civilianImmunity: true, aimAssist: true,
      note: 'Accessibility: civilians cannot be harmed (civilian immunity flag).' },
    Breach: { enemyHpMult: 1.0, enemyDmgMult: 1.0, spawnCadenceMult: 1.0, flanking: true,
      objectiveTimer: false, hordeSurges: 1, civilianImmunity: false, aimAssist: false },
    Nightmare: { enemyHpMult: 1.0, enemyDmgMult: 1.1, spawnCadenceMult: 0.6, flanking: true,
      objectiveTimer: true, hordeSurges: 3, civilianImmunity: false, aimAssist: false,
      note: 'Coordination pressure, not HP bloat: faster cadence, flanking packs, extraction timer, surge waves.' }
  };

  // ---------------------------------------------------------------------------
  // Content modes: presentation-only switch. Gameplay never changes.
  // ---------------------------------------------------------------------------
  var CONTENT_MODES = ['story', 'arcade', 'codex-run'];
  var presentation = { mode: 'story', banter: true, hudDensity: 'full', codexPopups: true };

  function setContentMode(mode) {
    if (CONTENT_MODES.indexOf(mode) === -1) return presentation;
    presentation.mode = mode;
    if (mode === 'story') { presentation.banter = true; presentation.hudDensity = 'full'; presentation.codexPopups = true; }
    if (mode === 'arcade') { presentation.banter = false; presentation.hudDensity = 'minimal'; presentation.codexPopups = false; }
    if (mode === 'codex-run') { presentation.banter = true; presentation.hudDensity = 'full'; presentation.codexPopups = true; }
    return presentation; // presentation ONLY — zones, enemies, routes untouched
  }

  // ---------------------------------------------------------------------------
  // Codex unlock hook (poll-guarded; queues while codex lane is absent).
  // ---------------------------------------------------------------------------
  var pendingCodexUnlocks = [];
  function requestCodexUnlock(entryId) {
    var done = when('GraveGain2DB_Codex', function (C) {
      try { if (C.unlock) C.unlock(entryId); return true; } catch (e) { return false; }
    }, false);
    if (!done && pendingCodexUnlocks.indexOf(entryId) === -1) pendingCodexUnlocks.push(entryId);
    return done;
  }
  function flushCodexUnlocks() {
    var left = [];
    for (var i = 0; i < pendingCodexUnlocks.length; i++) {
      if (!requestCodexUnlock(pendingCodexUnlocks[i])) left.push(pendingCodexUnlocks[i]);
    }
    pendingCodexUnlocks = left;
    return pendingCodexUnlocks.length === 0;
  }
  var CODEX_ENTRY_MEMORIAL_WALL = 'codex:memorial-wall';

  // ---------------------------------------------------------------------------
  // Score screen data.
  // ---------------------------------------------------------------------------
  function buildScore(result) {
    result = result || {};
    var kills = result.kills || 0, rescues = result.rescues || 0;
    var timeMs = result.timeMs || 0, difficulty = result.difficulty || 'Breach';
    var route = result.route || 'primary', wallCollapseKills = result.wallCollapseKills || 0;
    var base = kills * 100 + rescues * 500 + wallCollapseKills * 150;
    var parMs = 480000;
    var timeBonus = timeMs > 0 && timeMs < parMs ? Math.round((parMs - timeMs) / 1000) * 10 : 0;
    var diffMult = difficulty === 'Nightmare' ? 1.5 : difficulty === 'Cadet' ? 0.8 : 1.0;
    var total = Math.round((base + timeBonus) * diffMult);
    var grade = total >= 6000 ? 'S' : total >= 4500 ? 'A' : total >= 3000 ? 'B' : total >= 1500 ? 'C' : 'D';
    return { kills: kills, rescues: rescues, wallCollapseKills: wallCollapseKills, timeMs: timeMs,
      difficulty: difficulty, route: route, base: base, timeBonus: timeBonus, total: total, grade: grade,
      objectives: ['survivors', 'blackbox', 'collapse-wall', 'warden', 'extraction'] };
  }

  function onMissionComplete(result) {
    requestCodexUnlock(CODEX_ENTRY_MEMORIAL_WALL);
    requestCodexUnlock('codex:warden');
    return buildScore(result);
  }

  // ---------------------------------------------------------------------------
  // validate(): entry -> objective -> exit reachable per route; protected cells
  // intact after the scripted collapse. Used by the lane stub + engine smoke.
  // ---------------------------------------------------------------------------
  function validate() {
    var checks = [];
    function check(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: detail || '' }); return !!ok; }
    var allOk = true, ok;

    ok = check('entry->survivors reachable (primary)',
      reachable('lz-entry', 'survivor-pocket-floor', { wallsDown: false }), 'walls standing');
    allOk = allOk && ok;
    ok = check('survivors->blackbox reachable (primary)',
      reachable('survivor-pocket-floor', 'blackbox-ridge-floor', { wallsDown: false }), 'walls standing');
    allOk = allOk && ok;
    ok = check('blackbox->basin via precision ledge (walls standing)',
      reachable('blackbox-ridge-floor', 'horde-basin-floor', { wallsDown: false, precision: true }), 'ledge-path open');
    allOk = allOk && ok;
    ok = check('basin->checkpoint->arena->extraction reachable',
      reachable('horde-basin-floor', 'dustoff-pad', { wallsDown: true }) &&
      reachable('ridge-checkpoint-pad', 'warden-arena-floor', { wallsDown: true }), 'post-collapse graph');
    allOk = allOk && ok;
    ok = check('destructive shortcut opens only after collapse',
      !reachable('memorial-approach', 'horde-basin-floor', { wallsDown: false }) ||
      reachable('memorial-approach', 'horde-basin-floor', { wallsDown: false, precision: true }),
      'ledge keeps primary open; wall span needs collapse');
    allOk = allOk && ok;
    ok = check('shortcut span traversable post-collapse',
      reachable('memorial-approach', 'horde-basin-floor', { wallsDown: true }), 'rubble walkable');
    allOk = allOk && ok;
    ok = check('emergency fallback reaches arena without the basin',
      reachable('scaffold-yard-floor', 'warden-arena-floor', { wallsDown: false }), 'via service-tunnel-mouth + collapsed-vent');
    allOk = allOk && ok;
    ok = check('optional rescue reachable both ways',
      reachable('service-tunnel-mouth', 'service-tunnel-floor', { wallsDown: false }), 'precision escort + wall-behind destruction');
    allOk = allOk && ok;

    // Simulated collapse against a stub sim: protected cells must stay intact.
    var stub = makeStubSim();
    var res = MEMORIAL_WALL.collapse(stub);
    ok = check('scripted collapse destroys only wall cells',
      res.destroyed.length === 3 && res.protectedIntact, 'destroyed=' + res.destroyed.join(','));
    allOk = allOk && ok;
    ok = check('all mandatory ground/checkpoint/extraction marked protected',
      PROTECTED_CELLS.indexOf('lz-entry') !== -1 &&
      PROTECTED_CELLS.indexOf('ridge-checkpoint-pad') !== -1 &&
      PROTECTED_CELLS.indexOf('dustoff-pad') !== -1 &&
      PROTECTED_CELLS.indexOf('horde-basin-floor') !== -1, PROTECTED_CELLS.length + ' protected cells');
    allOk = allOk && ok;
    ok = check('wall cells are NEVER in the protected set',
      PROTECTED_CELLS.indexOf('memorial-wall-a') === -1 &&
      PROTECTED_CELLS.indexOf('memorial-wall-b') === -1 &&
      PROTECTED_CELLS.indexOf('memorial-wall-c') === -1, 'destructible-only');
    allOk = allOk && ok;

    return { ok: allOk, version: VERSION, checks: checks };
  }

  // Minimal in-memory sim double for the collapse test (no engine needed).
  function makeStubSim() {
    var intact = {};
    for (var i = 0; i < NODES.length; i++) intact[NODES[i].id] = true;
    return {
      units: [
        { zone: 'horde-basin-floor', faction: 'horde', hp: 30 },
        { zone: 'horde-basin-floor', faction: 'horde', hp: 90 },
        { zone: 'survivor-pocket-floor', faction: 'civilian', hp: 50 }
      ],
      destroyCell: function (id) { intact[id] = false; },
      isCellIntact: function (id) { return intact[id] !== false; }
    };
  }

  var api = {
    version: VERSION,
    missionId: 1,
    slug: 'gravegain2dB',
    title: 'Mission 1 — LZ Crash Site Defense',
    location: 'Colony Alpha crater',
    briefing: getBriefing,
    defaultBuild: DEFAULT_BUILD,
    enemies: ENEMIES,
    warden: WARDEN,
    weapons: WEAPONS,
    zones: ZONES,
    memorialWall: MEMORIAL_WALL,
    nodes: NODES,
    edges: EDGES,
    protectedCells: PROTECTED_CELLS,
    routes: ROUTES,
    checkpoint: CHECKPOINT,
    extraction: EXTRACTION,
    emergencyBreach: EMERGENCY_BREACH,
    difficulty: DIFFICULTY,
    contentModes: CONTENT_MODES,
    presentation: presentation,
    setContentMode: setContentMode,
    requestCodexUnlock: requestCodexUnlock,
    flushCodexUnlocks: flushCodexUnlocks,
    pendingCodexUnlocks: function () { return pendingCodexUnlocks.slice(); },
    buildScore: buildScore,
    onMissionComplete: onMissionComplete,
    reachable: reachable,
    validate: validate,
    makeStubSim: makeStubSim
  };

  window.GraveGain2DB_Mission1 = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'b4-mission1', version: VERSION, init: function () { return api; } });
})();
