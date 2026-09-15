'use strict';
/* GraveGain2dB HUD — readable 4-player co-op overlay + world markers.
 * Layout contract (from spec HUD section):
 *  top-left    hero emoji, health/armor, weapon, alt-fire (x4 stacked)
 *  top-center  primary objective (one line) / boss bar / extraction
 *  top-right   rescue count + waypoint direction, revive prompts
 *  near-player compact ammo/cooldown + collapse danger indicator
 *  world       ⚠️ UNSTABLE tags + objective/rescue/extraction markers,
 *              clamped to screen edges with direction + distance.
 * Pure view-model builder (testable, no DOM) + canvas renderer.
 * Global: window.GraveGain2dBHud
 */
(function (root) {
  var SLOT_COLORS = ['#7fd4ff', '#a8ff7f', '#ffd47f', '#ff9fd4'];

  // game = { players:[{emoji,hp,hpMax,armor,armorMax,weapon,altKey,ammo,
  //          dashReady,altReady,x,y,downed,dead,collapseDanger}],
  //   objective, boss:{name,hp,hpMax}|null, extraction:{state,label}|null,
  //   rescue:{saved,total,dirX,dirY,revive:[slotIdx]}, markers:[{x,y,emoji,label}] }
  function buildViewModel(game) {
    var players = (game.players || []).slice(0, 4).map(function (p, i) {
      return {
        slot: i,
        emoji: p.emoji || '🧑‍🚀',
        color: SLOT_COLORS[i],
        hp: p.hp, hpMax: p.hpMax || 100,
        armor: p.armor || 0, armorMax: p.armorMax || 0,
        weapon: p.weapon || 'sidearm',
        altKey: p.altKey || 'grenade',
        ammo: (p.ammo == null ? '∞' : p.ammo),
        dashReady: p.dashReady !== false,
        altReady: p.altReady !== false,
        x: p.x || 0, y: p.y || 0,
        downed: !!p.downed, dead: !!p.dead,
        collapseDanger: !!p.collapseDanger
      };
    });
    return {
      players: players,
      objective: game.objective || '',
      boss: game.boss || null,
      extraction: game.extraction || null,
      rescue: game.rescue || { saved: 0, total: 0, dirX: 1, dirY: 0, revive: [] },
      markers: game.markers || [],
      unstable: game.unstable || [] // [{x,y,label}]
    };
  }

  function hpColor(frac) {
    if (frac > 0.55) return '#7fff9f';
    if (frac > 0.28) return '#ffd47f';
    return '#ff7f7f';
  }

  function drawBar(ctx, x, y, w, h, frac, color, back) {
    ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  // view = { w, h }; toScreen = fn(worldX, worldY) -> {x, y} CSS px.
  function drawHud(ctx, vm, view, toScreen) {
    ctx.save();
    ctx.font = '14px system-ui,sans-serif';
    ctx.textBaseline = 'middle';
    drawSlots(ctx, vm);
    drawTopCenter(ctx, vm, view);
    drawTopRight(ctx, vm, view);
    drawNearPlayer(ctx, vm, toScreen);
    drawMarkers(ctx, vm, view, toScreen);
    ctx.restore();
  }

  function drawSlots(ctx, vm) {
    for (var i = 0; i < vm.players.length; i++) {
      (function (p, i) {
        var x = 10, y = 10 + i * 56, w = 210;
        ctx.globalAlpha = p.dead ? 0.45 : 1;
        ctx.fillStyle = 'rgba(8,8,16,0.62)';
        ctx.fillRect(x, y, w, 48);
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, 3, 48);
        ctx.font = '22px "Segoe UI Emoji",sans-serif';
        ctx.fillText(p.emoji, x + 12, y + 24);
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillStyle = '#fff';
        var frac = p.hpMax ? p.hp / p.hpMax : 0;
        drawBar(ctx, x + 40, y + 8, 120, 10, frac, hpColor(frac));
        if (p.armorMax > 0) {
          drawBar(ctx, x + 40, y + 21, 120, 5, p.armor / p.armorMax, '#7fd4ff');
        }
        ctx.fillStyle = '#fff';
        ctx.fillText(p.weapon + '  [' + p.ammo + ']', x + 40, y + 38);
        // cooldown pips: dash + alt
        ctx.fillStyle = p.dashReady ? '#7fff9f' : '#555';
        ctx.fillRect(x + 166, y + 8, 16, 16);
        ctx.fillStyle = p.altReady ? '#ffd47f' : '#555';
        ctx.fillRect(x + 186, y + 8, 16, 16);
        ctx.fillStyle = '#000';
        ctx.fillText('»', x + 170, y + 16);
        ctx.fillText('✸', x + 189, y + 16);
        if (p.downed) {
          ctx.fillStyle = '#ffb020';
          ctx.font = 'bold 12px system-ui,sans-serif';
          ctx.fillText('DOWN — revive!', x + 40, y + 38);
          ctx.font = '12px system-ui,sans-serif';
        }
        ctx.globalAlpha = 1;
      })(vm.players[i], i);
    }
  }

  function drawTopCenter(ctx, vm, view) {
    var cx = view.w / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,8,16,0.62)';
    var label = vm.objective || '';
    var w = Math.max(200, ctx.measureText(label).width + 28);
    ctx.fillRect(cx - w / 2, 8, w, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui,sans-serif';
    ctx.fillText(label, cx, 21);
    var y = 36;
    if (vm.boss) {
      var bf = vm.boss.hpMax ? vm.boss.hp / vm.boss.hpMax : 0;
      ctx.fillStyle = 'rgba(8,8,16,0.62)';
      ctx.fillRect(cx - 160, y, 320, 16);
      ctx.fillStyle = '#ff5f7f';
      ctx.fillRect(cx - 160, y, 320 * Math.max(0, Math.min(1, bf)), 16);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui,sans-serif';
      ctx.fillText('☠️ ' + (vm.boss.name || 'BOSS'), cx, y + 8);
      y += 20;
    }
    if (vm.extraction) {
      ctx.fillStyle = '#7fff9f';
      ctx.font = 'bold 12px system-ui,sans-serif';
      ctx.fillText('🛸 ' + (vm.extraction.label || 'EXTRACT'), cx, y + 8);
    }
    ctx.textAlign = 'left';
    ctx.font = '14px system-ui,sans-serif';
  }

  function dirArrow(dx, dy) {
    var a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a >= -45 && a < 45) return '➡️';
    if (a >= 45 && a < 135) return '⬇️';
    if (a >= -135 && a < -45) return '⬆️';
    return '⬅️';
  }

  function drawTopRight(ctx, vm, view) {
    var r = vm.rescue;
    var x = view.w - 220;
    ctx.fillStyle = 'rgba(8,8,16,0.62)';
    ctx.fillRect(x, 8, 210, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillText('📡 ' + r.saved + '/' + r.total + ' rescued', x + 10, 22);
    ctx.fillText(dirArrow(r.dirX || 1, r.dirY || 0) + ' waypoint', x + 10, 42);
    if (r.revive && r.revive.length) {
      ctx.fillStyle = '#ffb020';
      ctx.font = 'bold 12px system-ui,sans-serif';
      ctx.fillText('✚ REVIVE P' + (r.revive[0] + 1) + ' (E)', x + 10, 62);
      ctx.font = '13px system-ui,sans-serif';
    }
  }

  function drawNearPlayer(ctx, vm, toScreen) {
    if (typeof toScreen !== 'function') return;
    ctx.font = '12px system-ui,sans-serif';
    for (var i = 0; i < vm.players.length; i++) {
      var p = vm.players[i];
      if (p.dead) continue;
      var s = toScreen(p.x, p.y - 30);
      ctx.fillStyle = p.color;
      ctx.fillText('[' + p.ammo + ']' + (p.dashReady ? '' : ' …'), s.x - 18, s.y - 14);
      if (p.collapseDanger) {
        ctx.fillStyle = '#ff5f5f';
        ctx.font = 'bold 12px system-ui,sans-serif';
        ctx.fillText('⚠️ GET CLEAR', s.x - 34, s.y - 30);
        ctx.font = '12px system-ui,sans-serif';
      }
    }
    // on-structure instability tags live in world space
    var Atlas = root.GraveGain2dBArtAtlas;
    var Fx = root.GraveGain2dBArtFx;
    for (var k = 0; k < vm.unstable.length; k++) {
      var u = vm.unstable[k];
      var su = toScreen(u.x, u.y);
      if (Fx && Atlas) Fx.drawWarningTag(ctx, Atlas, su.x, su.y, u.label);
    }
  }

  function drawMarkers(ctx, vm, view, toScreen) {
    if (typeof toScreen !== 'function') return;
    ctx.font = '12px system-ui,sans-serif';
    for (var i = 0; i < vm.markers.length; i++) {
      var m = vm.markers[i];
      var s = toScreen(m.x, m.y);
      var cx = Math.max(24, Math.min(view.w - 24, s.x));
      var cy = Math.max(24, Math.min(view.h - 24, s.y));
      var offscreen = (cx !== s.x || cy !== s.y);
      ctx.fillStyle = offscreen ? '#ffd47f' : '#fff';
      ctx.textAlign = 'center';
      ctx.fillText((m.emoji || '◆') + (m.label ? ' ' + m.label : ''), cx, cy - (offscreen ? 10 : 0));
      if (offscreen) {
        var dx = s.x - cx, dy = s.y - cy;
        ctx.fillText(dirArrow(dx, dy), cx, cy + 12);
      }
    }
    ctx.textAlign = 'left';
  }

  root.GraveGain2dBHud = {
    SLOT_COLORS: SLOT_COLORS,
    buildViewModel: buildViewModel,
    drawHud: drawHud,
    dirArrow: dirArrow
  };
})(typeof window !== 'undefined' ? window : globalThis);
