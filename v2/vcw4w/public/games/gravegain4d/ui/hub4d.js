/* GraveGain4D LuckyStarShip hub (DS-GRAV4D-08, lane games).
 * window.GraveGain4DHub — reskins the 3D hub-quarters economy for 4D with the
 * same copy (Gold <-> $UUSD at 10:1, 6 quarters levels, botany plant/harvest,
 * repair minigame award, armory rank costs) plus 4D ship upgrades:
 * W-Stabilizer, Fold Compass, Mulligan Capacitor.
 * DOM-guarded: builds its own modal when shell IDs are absent; every method
 * null-safe and callable without a game object.
 */
(function () {
  'use strict';

  var NS = (window.GraveGain4DHub = window.GraveGain4DHub || {});
  if (NS.__loaded) return;
  NS.__loaded = true;

  // Same economy copy as 3D hub-quarters.js.
  NS.GOLD_PER_UUSD = 10; // 10 Gold = 1 $UUSD (both directions).
  NS.PLANT_COST = 25;    // $UUSD per seed (3D parity).
  NS.REPAIR_AWARD = 50;  // $UUSD repair minigame award (3D parity).

  NS.QUARTERS = [
    { level: 1, size: 'Bunk Nook', capacity: 2, cost: 0 },
    { level: 2, size: 'Crew Cabin', capacity: 3, cost: 100 },
    { level: 3, size: 'Officer Suite', capacity: 4, cost: 250 },
    { level: 4, size: 'Starboard Loft', capacity: 6, cost: 500 },
    { level: 5, size: 'Captain Deck', capacity: 8, cost: 1000 },
    { level: 6, size: 'LuckyStar Penthouse', capacity: 12, cost: 2000 }
  ];

  NS.SEEDS = [
    { id: 'starleaf', name: 'Starleaf', emoji: '🌿', time: 60, yield: 2, value: 15 },
    { id: 'voidbloom', name: 'Voidbloom', emoji: '🌸', time: 120, yield: 2, value: 30 },
    { id: 'chronofern', name: 'Chronofern', emoji: '🌾', time: 240, yield: 3, value: 45 }
  ];

  NS.ARMORY = [
    { id: 'putter', name: 'Moonrock Putter', icon: '🏌️', desc: '+10% putt accuracy per rank.', baseCost: 80, mult: 1.8, maxRank: 5 },
    { id: 'wedges', name: 'Fold Wedges', icon: '🛠️', desc: '+8% W-slice stability per rank.', baseCost: 120, mult: 1.9, maxRank: 5 },
    { id: 'plating', name: 'Starship Plating', icon: '🛡️', desc: '+15 max HP per rank.', baseCost: 100, mult: 1.7, maxRank: 5 }
  ];

  // 4D-only ship systems (spend $UUSD; ranks persist on the state object).
  NS.SHIP4D = [
    { id: 'w_stabilizer', name: 'W-Stabilizer', icon: '🌀', desc: 'Dampens W-drift: -12% ana/kata slide per rank.', baseCost: 150, mult: 2.0, maxRank: 4, effect: 'wDrift' },
    { id: 'fold_compass', name: 'Fold Compass', icon: '🧭', desc: '+1 radar range step and exit ping per rank.', baseCost: 120, mult: 1.8, maxRank: 4, effect: 'radar' },
    { id: 'mulligan_cap', name: 'Mulligan Capacitor', icon: '🔋', desc: '+1 free rewind charge per rank per hole.', baseCost: 200, mult: 2.2, maxRank: 3, effect: 'rewind' }
  ];

  NS.TABS = ['quarters', 'botany', 'repair', 'armory', 'exchange', 'lore'];

  var S = {
    open: false, tab: 'quarters',
    root: null, body: null, tabRow: null,
    state: null // external game state (or detached default below)
  };

  function defaultState() {
    return {
      gold: 0, uusd: 0, quartersLevel: 1,
      armoryRanks: {}, ship4dRanks: {},
      botanyCrops: [{}, {}, {}],
      repairCalibrated: false,
      loreSeen: {}
    };
  }

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function rankCost(u, rank) {
    return Math.round(u.baseCost * Math.pow(u.mult, rank || 0));
  }

  function ensureRoot() {
    if (S.root) return S.root;
    var mount = $('g4d-stage') || document.body;
    if (!mount) return null;
    var root = document.createElement('div');
    root.id = 'g4d-hub4d';
    root.style.cssText = 'position:absolute;inset:0;display:none;z-index:60;' +
      'align-items:center;justify-content:center;background:rgba(4,6,14,.72);' +
      'font-family:Outfit,Inter,system-ui,sans-serif;color:#e8f4ff;';
    var card = document.createElement('div');
    card.style.cssText = 'width:min(680px,92vw);max-height:86%;overflow:auto;' +
      'background:rgba(10,16,30,.96);border:1px solid rgba(120,200,255,.35);border-radius:12px;padding:14px 16px;';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
    head.innerHTML = '<div><div style="font-weight:800;letter-spacing:.06em;">🚀 LUCKYSTARSHIP — 4D REFIT</div>' +
      '<div class="g4d-hub-econ" style="font-size:12px;opacity:.85;"></div></div>';
    var close = document.createElement('button');
    close.textContent = 'Close ✕';
    close.style.cssText = 'pointer-events:auto;cursor:pointer;background:#1b2a44;color:#e8f4ff;border:1px solid rgba(120,200,255,.4);border-radius:8px;padding:8px 12px;min-height:44px;';
    close.addEventListener('click', function () { NS.close(); });
    head.appendChild(close);
    var tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;';
    var body = document.createElement('div');
    body.style.cssText = 'font-size:13px;line-height:1.5;';
    card.appendChild(head); card.appendChild(tabs); card.appendChild(body);
    root.appendChild(card);
    try { mount.appendChild(root); } catch (e) { return null; }
    S.root = root; S.body = body; S.tabRow = tabs; S.headEcon = head.querySelector('.g4d-hub-econ');
    return root;
  }

  function econLine(st) {
    return 'Gold ' + st.gold + ' · $UUSD ' + st.uusd +
      ' · Exchange 10 Gold ⇄ 1 $UUSD · Quarters Lv ' + st.quartersLevel;
  }

  function renderTabs() {
    if (!S.tabRow) return;
    S.tabRow.innerHTML = '';
    NS.TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.textContent = t[0].toUpperCase() + t.slice(1);
      b.style.cssText = 'pointer-events:auto;cursor:pointer;border-radius:8px;padding:8px 12px;min-height:44px;' +
        'border:1px solid rgba(120,200,255,.4);background:' + (S.tab === t ? '#274b73' : '#16233a') + ';color:#e8f4ff;';
      b.addEventListener('click', function () { NS.render(t); });
      S.tabRow.appendChild(b);
    });
  }

  function renderQuarters(st) {
    var cur = NS.QUARTERS[st.quartersLevel - 1] || NS.QUARTERS[0];
    var next = NS.QUARTERS[st.quartersLevel] || null;
    return '<h3>🛏️ Ship Quarters — Level ' + st.quartersLevel + '</h3>' +
      '<p>Size: <b>' + esc(cur.size) + '</b> · Capacity: <b>' + cur.capacity + ' Space</b></p>' +
      (next
        ? '<p>Next: ' + esc(next.size) + ' (' + next.capacity + ' Space) — <b>' + next.cost + ' $UUSD</b> ' +
          '<button data-hub="buy-quarters" style="pointer-events:auto;cursor:pointer;">Upgrade Quarters</button></p>'
        : '<p><b>MAX LEVEL REACHED</b> — the LuckyStarship is home.</p>') +
      '<h4>🌀 4D Ship Systems</h4>' +
      NS.SHIP4D.map(function (u) {
        var r = st.ship4dRanks[u.id] || 0;
        var maxed = r >= u.maxRank;
        var cost = rankCost(u, r);
        return '<div style="border:1px solid rgba(120,200,255,.25);border-radius:8px;padding:8px;margin:6px 0;">' +
          '<b>' + u.icon + ' ' + esc(u.name) + '</b> — Rank ' + r + ' / ' + u.maxRank + '<br>' +
          '<span style="opacity:.85;">' + esc(u.desc) + '</span><br>' +
          (maxed ? '<b>MAX RANK</b>'
            : '<span>' + cost + ' $UUSD </span><button data-hub="buy-ship4d" data-id="' + u.id + '" style="pointer-events:auto;cursor:pointer;">Upgrade</button>') +
          '</div>';
      }).join('');
  }

  function renderBotany(st) {
    var now = Math.floor(Date.now() / 1000);
    return '<h3>🌱 Botany Bay</h3><p>Plant for 25 $UUSD (3D parity). Harvest pays yield × value in $UUSD.</p>' +
      st.botanyCrops.map(function (crop, i) {
        if (!crop || !crop.seedId) {
          return '<div style="border:1px dashed rgba(120,200,255,.3);border-radius:8px;padding:8px;margin:6px 0;">' +
            '<b>[Empty Hydroponic Slot ' + (i + 1) + ']</b><br>' +
            NS.SEEDS.map(function (s) {
              return '<button data-hub="plant" data-slot="' + i + '" data-seed="' + s.id + '" style="pointer-events:auto;cursor:pointer;margin:2px;">' +
                'Plant ' + s.emoji + ' ' + esc(s.name) + ' (25 $UUSD)</button>';
            }).join('') + '</div>';
        }
        var seed = NS.SEEDS.find(function (x) { return x.id === crop.seedId; }) || NS.SEEDS[0];
        var elapsed = now - (crop.startTime || now);
        var pc = Math.min(100, Math.floor((elapsed / seed.time) * 100));
        var ready = pc >= 100;
        return '<div style="border:1px solid rgba(120,200,255,.25);border-radius:8px;padding:8px;margin:6px 0;">' +
          seed.emoji + ' ' + esc(seed.name) + ' — <b>' + pc + '%</b>' +
          (ready
            ? '<br><button data-hub="harvest" data-slot="' + i + '" style="pointer-events:auto;cursor:pointer;">🌾 Harvest (+' + (seed.yield * seed.value) + ' $UUSD)</button>'
            : '<br><span style="opacity:.75;">Matures in ' + Math.max(0, seed.time - elapsed) + 's</span>') +
          '</div>';
      }).join('');
  }

  function renderRepair(st) {
    return '<h3>🔧 Repair Bay</h3>' +
      '<p>Calibrate the Fold circuit. 3D parity: success awards <b>+' + NS.REPAIR_AWARD + ' $UUSD</b>.</p>' +
      '<p>Status: <b>' + (st.repairCalibrated ? 'Circuit calibrated! ✔' : 'Misaligned — run calibration') + '</b></p>' +
      '<button data-hub="repair" style="pointer-events:auto;cursor:pointer;">Calibrate Circuit</button>';
  }

  function renderArmory(st) {
    return '<h3>⚔️ Armory</h3>' +
      NS.ARMORY.map(function (u) {
        var r = st.armoryRanks[u.id] || 0;
        var maxed = r >= u.maxRank;
        var cost = rankCost(u, r);
        return '<div style="border:1px solid rgba(120,200,255,.25);border-radius:8px;padding:8px;margin:6px 0;">' +
          '<b>' + u.icon + ' ' + esc(u.name) + '</b> — Rank ' + r + ' / ' + u.maxRank + '<br>' +
          '<span style="opacity:.85;">' + esc(u.desc) + '</span><br>' +
          (maxed ? '<b>MAX RANK</b>'
            : '<span>' + cost + ' $UUSD </span><button data-hub="buy-armory" data-id="' + u.id + '" style="pointer-events:auto;cursor:pointer;">Upgrade</button>') +
          '</div>';
      }).join('');
  }

  function renderExchange(st) {
    return '<h3>💱 Exchange — Gold ⇄ $UUSD (10:1)</h3>' +
      '<p>Same rate as 3D: <b>10 Gold = 1 $UUSD</b>. Quarters, seeds, and 4D systems all price in $UUSD.</p>' +
      '<p>Balance: <b>' + st.gold + ' Gold</b> · <b>' + st.uusd + ' $UUSD</b></p>' +
      '<button data-hub="to-uusd" style="pointer-events:auto;cursor:pointer;">Convert 100 Gold → 10 $UUSD</button> ' +
      '<button data-hub="to-gold" style="pointer-events:auto;cursor:pointer;">Convert 10 $UUSD → 100 Gold</button>';
  }

  function renderLore(st) {
    var entries = [
      ['luckystar', '🚀 The LuckyStarShip', 'MoonRock colony ferry turned 4D surveyor. Her Fold drive skips ana/kata across 10 holes of time.'],
      ['waxis', '🌀 The W Axis', 'Ana (+) runs sunward of the ball; kata (−) runs widdershins. The W-meter is your fourth compass.'],
      ['mulligan', '🔋 Mulligan Doctrine', 'Rewinds are legal salvage: every capacitor charge is one erased stroke.']
    ];
    return '<h3>📖 Ship Log</h3>' + entries.map(function (e) {
      var seen = st.loreSeen[e[0]];
      return '<div style="border:1px solid rgba(120,200,255,.25);border-radius:8px;padding:8px;margin:6px 0;">' +
        '<b>' + esc(e[1]) + '</b><br><span style="opacity:.85;">' + esc(e[2]) + '</span><br>' +
        (seen ? '<span>✔ Logged</span>' : '<button data-hub="lore" data-id="' + e[0] + '" style="pointer-events:auto;cursor:pointer;">Log Entry (+5 Gold)</button>') +
        '</div>';
    }).join('');
  }

  NS.bind = function (gameOrState) {
    // Accept a live game (3D shape: {gold,uusd,quartersLevel,...}) or a plain state.
    if (gameOrState && typeof gameOrState === 'object') {
      if (gameOrState.gold != null || gameOrState.uusd != null) S.state = gameOrState;
      else if (gameOrState.state) S.state = gameOrState.state;
    }
    if (!S.state) S.state = defaultState();
    ['armoryRanks', 'ship4dRanks', 'botanyCrops', 'loreSeen'].forEach(function (k) {
      if (!S.state[k]) S.state[k] = defaultState()[k];
    });
    if (!S.state.quartersLevel) S.state.quartersLevel = 1;
    return S.state;
  };

  NS.open = function (tab) {
    NS.bind();
    if (!ensureRoot()) return false;
    S.open = true;
    S.root.style.display = 'flex';
    NS.render(tab || S.tab);
    return true;
  };

  NS.close = function () {
    S.open = false;
    try { if (S.root) S.root.style.display = 'none'; } catch (e) {}
  };

  NS.isOpen = function () { return S.open; };

  NS.render = function (tab) {
    NS.bind();
    if (!ensureRoot()) return '';
    if (tab) S.tab = tab;
    if (NS.TABS.indexOf(S.tab) < 0) S.tab = 'quarters';
    renderTabs();
    var st = S.state;
    try { S.headEcon.textContent = econLine(st); } catch (e) {}
    var html = S.tab === 'quarters' ? renderQuarters(st)
      : S.tab === 'botany' ? renderBotany(st)
      : S.tab === 'repair' ? renderRepair(st)
      : S.tab === 'armory' ? renderArmory(st)
      : S.tab === 'exchange' ? renderExchange(st)
      : renderLore(st);
    try { S.body.innerHTML = html; } catch (e) {}
    return html;
  };

  // Delegated clicks (single listener, attached lazily, null-safe).
  function onClick(ev) {
    var t = ev && ev.target && ev.target.closest ? ev.target.closest('[data-hub]') : null;
    if (!t || !S.open) return;
    var act = t.getAttribute('data-hub');
    var id = t.getAttribute('data-id');
    var slot = t.getAttribute('data-slot');
    if (act === 'buy-quarters') NS.buyQuarters();
    else if (act === 'buy-armory' && id) NS.buyArmory(id);
    else if (act === 'buy-ship4d' && id) NS.buyShip4D(id);
    else if (act === 'plant') NS.plantSeed(Number(slot), t.getAttribute('data-seed'));
    else if (act === 'harvest') NS.harvestCrop(Number(slot));
    else if (act === 'repair') NS.calibrate();
    else if (act === 'to-uusd') NS.exchangeToUUSD();
    else if (act === 'to-gold') NS.exchangeToGold();
    else if (act === 'lore' && id) NS.logLore(id);
    NS.render();
    try { if (window.GraveGain4DUI) window.GraveGain4DUI.update(S.state); } catch (e) {}
  }
  try { document.addEventListener('click', onClick); } catch (e) {}

  NS.buyQuarters = function () {
    NS.bind();
    var st = S.state;
    var next = NS.QUARTERS[st.quartersLevel]; // index = current level (0-based next)
    if (!next || st.uusd < next.cost) return false;
    st.uusd -= next.cost;
    st.quartersLevel = next.level;
    return true;
  };

  NS.buyArmory = function (uid) {
    NS.bind();
    var u = NS.ARMORY.find(function (x) { return x.id === uid; });
    if (!u) return false;
    var st = S.state, r = st.armoryRanks[uid] || 0;
    if (r >= u.maxRank) return false;
    var cost = rankCost(u, r);
    if (st.uusd < cost) return false;
    st.uusd -= cost;
    st.armoryRanks[uid] = r + 1;
    return true;
  };

  NS.buyShip4D = function (uid) {
    NS.bind();
    var u = NS.SHIP4D.find(function (x) { return x.id === uid; });
    if (!u) return false;
    var st = S.state, r = st.ship4dRanks[uid] || 0;
    if (r >= u.maxRank) return false;
    var cost = rankCost(u, r);
    if (st.uusd < cost) return false;
    st.uusd -= cost;
    st.ship4dRanks[uid] = r + 1;
    return true;
  };

  NS.plantSeed = function (slot, seedId) {
    NS.bind();
    var st = S.state;
    var seed = NS.SEEDS.find(function (x) { return x.id === seedId; });
    if (!seed || slot == null || !st.botanyCrops[slot] && slot !== 0) return false;
    if (st.botanyCrops[slot] && st.botanyCrops[slot].seedId) return false;
    if ((st.uusd || 0) < NS.PLANT_COST) return false;
    st.uusd -= NS.PLANT_COST;
    st.botanyCrops[slot] = { seedId: seed.id, startTime: Math.floor(Date.now() / 1000), growthTime: seed.time };
    return true;
  };

  NS.harvestCrop = function (slot) {
    NS.bind();
    var st = S.state, crop = st.botanyCrops[slot];
    if (!crop || !crop.seedId) return false;
    var seed = NS.SEEDS.find(function (x) { return x.id === crop.seedId; });
    if (!seed) return false;
    var elapsed = Math.floor(Date.now() / 1000) - (crop.startTime || 0);
    if (elapsed < seed.time) return false;
    st.uusd = (st.uusd || 0) + seed.yield * seed.value;
    st.botanyCrops[slot] = {};
    return true;
  };

  NS.calibrate = function () {
    NS.bind();
    S.state.repairCalibrated = true;
    S.state.uusd = (S.state.uusd || 0) + NS.REPAIR_AWARD;
    return true;
  };

  NS.exchangeToUUSD = function () {
    NS.bind();
    var st = S.state;
    if ((st.gold || 0) < 100) return false;
    st.gold -= 100; st.uusd = (st.uusd || 0) + 10;
    return true;
  };

  NS.exchangeToGold = function () {
    NS.bind();
    var st = S.state;
    if ((st.uusd || 0) < 10) return false;
    st.uusd -= 10; st.gold = (st.gold || 0) + 100;
    return true;
  };

  NS.logLore = function (id) {
    NS.bind();
    if (!id || S.state.loreSeen[id]) return false;
    S.state.loreSeen[id] = true;
    S.state.gold = (S.state.gold || 0) + 5;
    return true;
  };

})(typeof window !== 'undefined' ? window : this);
