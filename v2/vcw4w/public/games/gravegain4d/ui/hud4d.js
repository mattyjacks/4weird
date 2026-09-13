/* GraveGain4D HUD shell bridge (DS-GRAV4D-08, lane games).
 * Extends window.GraveGain4DUI ADDITIVELY (hud-4d.js owns the trippy W-slice
 * overlay; this module owns the 3D-shell stat bridge + strokes/par/W-meter /
 * timeline/world badges + boss bar + combat text + notifications + 4D->2D
 * radar + mobile mini-HUD). All DOM lookups are null-guarded: if the 3D
 * shell IDs are absent (4D index.html only mounts #g4d-hud), this module
 * builds its own lightweight overlay and keeps every method a safe no-op
 * rather than throwing.
 */
(function () {
  'use strict';

  var NS = (window.GraveGain4DUI = window.GraveGain4DUI || {});
  if (NS.__shellLoaded) return;
  NS.__shellLoaded = true;

  // 3D shell IDs we mirror when present (see gravegain3d/index.html L63-115).
  var SHELL_IDS = {
    hpBar: 'hudHpBar', hpText: 'hudHpText',
    staminaBar: 'hudStaminaBar', staminaText: 'hudStaminaText',
    resBar: 'hudResourceBar', resText: 'hudResourceText', resLabel: 'hudResourceLabel',
    xpBar: 'hudXpBar', xpText: 'hudXpText', levelBadge: 'hudLevelBadge',
    gold: 'hudGoldText', uusd: 'hudUusdText', floor: 'hudFloorText',
    potions: 'hudPotionCount'
  };

  var S = {
    bound: false,
    shell: {},          // cached shell elements (may be empty)
    root: null,         // own overlay root (built only if needed)
    els: {},            // own overlay elements
    radar: null, radarCtx: null,
    boss: null, bossEls: {},
    combatLayer: null, notifyLayer: null, miniHud: null,
    state: {
      hp: 100, hpMax: 100, stamina: 100, staminaMax: 100,
      resource: 0, resourceMax: 100, resourceName: 'W-Echo',
      xp: 0, xpMax: 100, level: 1, gold: 0, uusd: 0,
      floor: 'Hole 1', strokes: 0, par: 3,
      w: 0, wMin: -2, wMax: 2, timeline: 'Prime', world: 'MoonRock'
    }
  };

  function $(id) {
    if (!id) return null;
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function mk(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function pct(a, b) {
    b = b || 0;
    if (!b || b <= 0) return 0;
    return Math.max(0, Math.min(100, (a / b) * 100));
  }

  function setBar(elm, v, max) {
    if (!elm) return;
    try { elm.style.width = pct(v, max) + '%'; } catch (e) {}
  }

  function setText(elm, t) {
    if (!elm) return;
    try { elm.textContent = t; } catch (e) {}
  }

  function ensureRoot() {
    if (S.root) return S.root;
    var mount = $('g4d-hud') || $('g4d-stage') || document.body;
    if (!mount) return null;
    var root = mk('div', 'g4d-shell-hud');
    root.id = 'g4d-shell-hud';
    root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:30;' +
      'font-family:Outfit,Inter,system-ui,sans-serif;color:#e8f4ff;font-size:12px;';
    try { mount.appendChild(root); } catch (e) { return null; }
    S.root = root;

    // Top stat strip (own overlay; shell IDs take precedence when present).
    var strip = mk('div', 'g4d-stat-strip', root);
    strip.style.cssText = 'position:absolute;top:8px;left:8px;right:8px;display:flex;gap:8px;flex-wrap:wrap;';
    S.els.strip = strip;
    ['hp', 'stamina', 'resource', 'xp'].forEach(function (k) {
      var card = mk('div', 'g4d-stat-card', strip);
      card.style.cssText = 'background:rgba(8,12,24,.72);border:1px solid rgba(120,200,255,.25);' +
        'border-radius:8px;padding:4px 8px;min-width:130px;pointer-events:none;';
      var label = mk('div', 'g4d-stat-label', card);
      label.style.cssText = 'opacity:.75;font-size:10px;letter-spacing:.08em;text-transform:uppercase;';
      var bar = mk('div', 'g4d-stat-bar', card);
      bar.style.cssText = 'height:6px;background:rgba(255,255,255,.12);border-radius:4px;margin:3px 0;overflow:hidden;';
      var fill = mk('div', 'g4d-stat-fill', bar);
      fill.style.cssText = 'height:100%;width:50%;background:#5ec8ff;border-radius:4px;';
      var val = mk('div', 'g4d-stat-val', card);
      S.els[k + 'Card'] = card; S.els[k + 'Label'] = label;
      S.els[k + 'Fill'] = fill; S.els[k + 'Val'] = val;
    });

    // Economy / mission strip: gold, uusd, floor, strokes/par, W-meter, badges.
    var meta = mk('div', 'g4d-meta-strip', root);
    meta.style.cssText = 'position:absolute;top:8px;right:8px;display:flex;gap:6px;align-items:center;' +
      'background:rgba(8,12,24,.72);border:1px solid rgba(120,200,255,.25);border-radius:8px;padding:4px 8px;';
    S.els.meta = meta;
    ['gold', 'uusd', 'floor', 'strokes', 'wmeter', 'timeline', 'world'].forEach(function (k) {
      var s = mk('span', 'g4d-meta-' + k, meta);
      s.style.cssText = 'margin:0 4px;white-space:nowrap;';
      S.els['meta_' + k] = s;
    });

    // Layers: boss bar, combat text, notifications, radar, mini-HUD.
    var boss = mk('div', 'g4d-boss-bar', root);
    boss.style.cssText = 'position:absolute;top:64px;left:50%;transform:translateX(-50%);width:min(520px,80%);' +
      'display:none;background:rgba(8,12,24,.8);border:1px solid rgba(255,90,120,.5);border-radius:8px;padding:4px 10px;';
    var bossName = mk('div', 'g4d-boss-name', boss);
    bossName.style.cssText = 'font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#ffb3c2;';
    var bossTrack = mk('div', 'g4d-boss-track', boss);
    bossTrack.style.cssText = 'height:8px;background:rgba(255,255,255,.12);border-radius:4px;overflow:hidden;margin:3px 0;';
    var bossFill = mk('div', 'g4d-boss-fill', bossTrack);
    bossFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#ff5a78,#ff9a5a);';
    var bossPhase = mk('div', 'g4d-boss-phase', boss);
    bossPhase.style.cssText = 'font-size:10px;opacity:.8;';
    S.boss = boss; S.bossEls = { name: bossName, fill: bossFill, phase: bossPhase };

    S.combatLayer = mk('div', 'g4d-combat-layer', root);
    S.combatLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
    S.notifyLayer = mk('div', 'g4d-notify-layer', root);
    S.notifyLayer.style.cssText = 'position:absolute;left:8px;bottom:8px;display:flex;flex-direction:column;gap:6px;max-width:min(360px,80vw);';

    var radar = document.createElement('canvas');
    radar.id = 'g4d-radar';
    radar.width = 132; radar.height = 132;
    radar.style.cssText = 'position:absolute;right:8px;bottom:8px;width:132px;height:132px;border-radius:50%;' +
      'background:rgba(6,10,20,.78);border:1px solid rgba(120,200,255,.35);';
    try { root.appendChild(radar); } catch (e) {}
    S.radar = radar;
    try { S.radarCtx = radar.getContext('2d'); } catch (e) { S.radarCtx = null; }

    var mini = mk('div', 'g4d-mini-hud', root);
    mini.id = 'g4d-mini-hud';
    mini.style.cssText = 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:none;' +
      'background:rgba(8,12,24,.8);border:1px solid rgba(120,200,255,.3);border-radius:10px;padding:4px 10px;gap:8px;';
    S.miniHud = mini;
    return root;
  }

  /** Bind 3D-shell IDs when present. Safe to call repeatedly; never throws. */
  NS.bindShell = function () {
    Object.keys(SHELL_IDS).forEach(function (k) { S.shell[k] = $(SHELL_IDS[k]); });
    S.bound = true;
    return S.shell;
  };

  /** Push a full state snapshot into shell IDs (if present) + own overlay. */
  NS.update = function (patch) {
    if (patch && typeof patch === 'object') {
      Object.keys(patch).forEach(function (k) { S.state[k] = patch[k]; });
    }
    if (!S.bound) NS.bindShell();
    var st = S.state, sh = S.shell;
    setBar(sh.hpBar, st.hp, st.hpMax);
    setText(sh.hpText, st.hp + '/' + st.hpMax);
    setBar(sh.staminaBar, st.stamina, st.staminaMax);
    setText(sh.staminaText, st.stamina + '/' + st.staminaMax);
    setBar(sh.resBar, st.resource, st.resourceMax);
    setText(sh.resText, st.resource + '/' + st.resourceMax);
    if (sh.resLabel) setText(sh.resLabel, st.resourceName || 'W-Echo');
    setBar(sh.xpBar, st.xp, st.xpMax);
    setText(sh.xpText, st.xp + '/' + st.xpMax);
    setText(sh.levelBadge, 'LV ' + st.level);
    setText(sh.gold, String(st.gold));
    setText(sh.uusd, String(st.uusd));
    setText(sh.floor, st.floor);

    // Own overlay mirrors (built lazily; skipped if no mount exists).
    if (!ensureRoot()) return st;
    var E = S.els;
    var rows = [
      ['hp', 'HP', st.hp + '/' + st.hpMax, st.hp, st.hpMax, '#ff6b81'],
      ['stamina', 'STAMINA', st.stamina + '/' + st.staminaMax, st.stamina, st.staminaMax, '#ffd35e'],
      ['resource', st.resourceName || 'W-ECHO', st.resource + '/' + st.resourceMax, st.resource, st.resourceMax, '#b48cff'],
      ['xp', 'XP LV ' + st.level, st.xp + '/' + st.xpMax, st.xp, st.xpMax, '#5eff9a']
    ];
    rows.forEach(function (r) {
      setText(E[r[0] + 'Label'], r[1]);
      setText(E[r[0] + 'Val'], r[2]);
      if (E[r[0] + 'Fill']) {
        try {
          E[r[0] + 'Fill'].style.width = pct(r[3], r[4]) + '%';
          E[r[0] + 'Fill'].style.background = r[5];
        } catch (e) {}
      }
    });
    setText(E.meta_gold, 'Gold ' + st.gold);
    setText(E.meta_uusd, '$UUSD ' + st.uusd);
    setText(E.meta_floor, String(st.floor));
    setText(E.meta_strokes, 'Strokes ' + st.strokes + ' / Par ' + st.par);
    setText(E.meta_wmeter, 'W ' + st.w + ' [' + st.wMin + '..' + st.wMax + ']');
    setText(E.meta_timeline, 'Timeline ' + st.timeline);
    setText(E.meta_world, 'World ' + st.world);
    NS.updateMiniHud(st);
    return st;
  };

  NS.getState = function () { return Object.assign({}, S.state); };

  // ---- Boss bar (phased) ----
  NS.bossBar = function (opts) {
    opts = opts || {};
    if (!ensureRoot()) return;
    var name = opts.name || 'Warden of the Fold';
    var hp = (opts.hp != null ? opts.hp : 100);
    var max = (opts.max != null ? opts.max : 100);
    var phase = (opts.phase != null ? opts.phase : 1);
    var phases = (opts.phases != null ? opts.phases : 3);
    try {
      S.boss.style.display = (opts.hide ? 'none' : 'block');
      S.bossEls.name.textContent = name;
      S.bossEls.fill.style.width = pct(hp, max) + '%';
      S.bossEls.phase.textContent = 'Phase ' + phase + ' / ' + phases + ' — ' + hp + '/' + max;
    } catch (e) {}
  };
  NS.hideBoss = function () { NS.bossBar({ hide: true }); };

  // ---- Combat text ----
  NS.combatText = function (text, kind, x, y) {
    if (!ensureRoot() || text == null) return;
    var colors = { dmg: '#ff7a8a', heal: '#6dffa8', w: '#c9a6ff', gold: '#ffd35e', info: '#9adcff' };
    var n = mk('div', 'g4d-combat-text', S.combatLayer);
    n.textContent = String(text);
    n.style.cssText = 'position:absolute;left:' + (x != null ? x : 50) + '%;top:' + (y != null ? y : 42) +
      '%;transform:translate(-50%,-50%);font-weight:800;font-size:15px;color:' + (colors[kind] || colors.info) +
      ';text-shadow:0 2px 6px #000;transition:all .9s ease-out;';
    try {
      requestAnimationFrame(function () {
        n.style.transform = 'translate(-50%,-160%)';
        n.style.opacity = '0';
      });
    } catch (e) {}
    setTimeout(function () { try { n.remove(); } catch (e) {} }, 950);
  };

  // ---- Notifications ----
  NS.notify = function (msg, kind) {
    if (!ensureRoot() || msg == null) return;
    var n = mk('div', 'g4d-notify g4d-notify-' + (kind || 'info'), S.notifyLayer);
    n.textContent = String(msg);
    n.style.cssText = 'background:rgba(8,12,24,.85);border:1px solid rgba(120,200,255,.35);' +
      'border-left:3px solid ' + (kind === 'warn' ? '#ff9a5a' : kind === 'bad' ? '#ff5a78' : '#5ec8ff') + ';' +
      'border-radius:6px;padding:5px 9px;font-size:12px;';
    setTimeout(function () { try { n.remove(); } catch (e) {} }, 4200);
  };

  // ---- Radar: project 4D -> 2D (x/z plane, w as ring radius + hue) ----
  NS.radar = function (player, entities) {
    if (!ensureRoot() || !S.radarCtx) return;
    var ctx = S.radarCtx, W = S.radar.width, H = S.radar.height;
    var cx = W / 2, cy = H / 2, R = W / 2 - 6;
    var range = 40; // world units mapped to edge
    function proj(p) {
      var dx = ((p && p.x) || 0) - (((player && player.x) || 0));
      var dz = ((p && p.z) || 0) - (((player && player.z) || 0));
      return { dx: dx, dz: dz, w: (p && p.w) || 0 };
    }
    function dot(q, color, ring) {
      var sx = cx + (q.dx / range) * R;
      var sy = cy + (q.dz / range) * R;
      var d = Math.hypot(sx - cx, sy - cy);
      if (d > R) { sx = cx + ((sx - cx) / d) * R; sy = cy + ((sy - cy) / d) * R; }
      try {
        if (ring) {
          var wSpan = (S.state.wMax - S.state.wMin) || 1;
          var wn = ((q.w - S.state.wMin) / wSpan);
          ctx.beginPath();
          ctx.strokeStyle = 'hsla(' + Math.round(200 + wn * 100) + ',90%,65%,.9)';
          ctx.lineWidth = 2;
          ctx.arc(sx, sy, 4 + wn * 6, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.fillStyle = color || '#fff';
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } catch (e) {}
    }
    try {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath(); ctx.strokeStyle = 'rgba(120,200,255,.25)';
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = 'rgba(120,200,255,.4)';
      ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      (entities || []).forEach(function (e) {
        if (!e) return;
        var kind = e.kind || e.type || 'mob';
        var col = kind === 'exit' || kind === 'hole' ? '#6dffa8'
          : kind === 'boss' ? '#ff5a78' : kind === 'loot' ? '#ffd35e' : '#9adcff';
        dot(proj(e), col, true);
      });
      dot({ dx: 0, dz: 0, w: (player && player.w) || 0 }, '#ffffff', false);
      // North tick = -z.
      ctx.beginPath(); ctx.strokeStyle = '#5ec8ff'; ctx.lineWidth = 2;
      ctx.moveTo(cx, cy - R - 2); ctx.lineTo(cx, cy - R + 6); ctx.stroke();
    } catch (e) {}
  };

  // ---- Mobile mini-HUD ----
  NS.updateMiniHud = function (st) {
    if (!ensureRoot()) return;
    st = st || S.state;
    var small = false;
    try { small = window.innerWidth < 760 || !!window.GraveGain4DInput?.touchMode; } catch (e) {}
    try {
      S.miniHud.style.display = small ? 'flex' : 'none';
      if (small) S.miniHud.textContent = 'HP ' + st.hp + '/' + st.hpMax + ' · W ' + st.w +
        ' · Strokes ' + st.strokes + '/' + st.par + ' · ' + st.floor;
      if (S.els.strip) S.els.strip.style.display = small ? 'none' : 'flex';
    } catch (e) {}
  };

  // Keep mini-HUD responsive without a game-loop dependency.
  try {
    window.addEventListener('resize', function () { NS.updateMiniHud(); });
  } catch (e) {}

})(typeof window !== 'undefined' ? window : this);
