/* GraveGain2dB room client stub (window.GG2Room).
 *
 * Thin WebSocket client for the dedicated authoritative rooms
 * (v2/vcw4w/server/gravegain2dB/room.js). 60Hz intent send, 20Hz snapshot
 * receive. Intents-only: never sends damage/terrain/loot claims.
 *
 * Lobby tickets are unchanged (sibling owner): join with the match/lobby
 * ticket issued by POST /api/matches and POST /api/lobbies; open the room
 * socket with ?match=<uuid>&token=<ticket>. Never touches party SQL.
 *
 * Distinct from window.GraveGainMP (2s relay overlay in
 * public/games/html/gravegain-netplay.js -- do NOT copy its PUT-state or
 * chat/emote/rematch model) and from window.GraveGain2dBNet (co-op demo
 * client in public/games/gravegain2dB/net/). This stub speaks the
 * { t:'in' } / { t:'snap'|'full'|'resync' } room protocol only.
 *
 * Vanilla IIFE, ASCII-only, never throws. Node-requireable.
 */
(function () {
  'use strict';

  var INPUT_HZ = 60;
  var INPUT_MS = 1000 / INPUT_HZ;
  var SNAPSHOT_HZ = 20;
  var RECOVERABLE_MS = 30 * 1000;

  function G() {
    try { if (typeof window !== 'undefined' && window) return window; } catch (e) {}
    try { if (typeof globalThis !== 'undefined' && globalThis) return globalThis; } catch (e2) {}
    return {};
  }

  function clampIntent(f) {
    var o = (f && typeof f === 'object') ? f : {};
    function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
    var mx = Math.max(-1, Math.min(1, num(o.moveX)));
    var my = Math.max(-1, Math.min(1, num(o.moveY)));
    var mag = Math.sqrt(mx * mx + my * my);
    if (mag > 1 && mag > 0) { mx /= mag; my /= mag; }
    return {
      sequence: Math.floor(num(o.sequence)) || 0,
      clientTick: Math.floor(num(o.clientTick)) || 0,
      moveX: mx,
      moveY: my,
      aimAngle: num(o.aimAngle),
      buttons: (Math.floor(num(o.buttons)) || 0) & 0xff
    };
  }

  function GG2Room(opts) {
    var o = opts || {};
    this.url = String(o.url || '');
    this.ticket = o.ticket || null;
    this.sample = typeof o.sample === 'function' ? o.sample : function () { return { moveX: 0, moveY: 0, aimAngle: 0, buttons: 0 }; };
    this.onSnapshot = typeof o.onSnapshot === 'function' ? o.onSnapshot : function () {};
    this.onEvent = typeof o.onEvent === 'function' ? o.onEvent : function () {};
    this.onFullState = typeof o.onFullState === 'function' ? o.onFullState : function () {};
    this.onClose = typeof o.onClose === 'function' ? o.onClose : function () {};
    this.ws = null;
    this.seq = 0;
    this.clientTick = 0;
    this.serverTick = 0;
    this.sendTimer = null;
    this.lastEventSeq = 0;
    this.seenEvents = {};
    this.lastFullTick = 0;
    this.connected = false;
  }

  GG2Room.prototype.connect = function () {
    var self = this;
    try {
      var WS = G().WebSocket;
      if (!WS) return false;
      var url = self.url;
      if (self.ticket && (self.ticket.matchId || self.ticket.token)) {
        var q = 'match=' + encodeURIComponent(self.ticket.matchId || '');
        if (self.ticket.token) q += '&token=' + encodeURIComponent(self.ticket.token);
        url += (url.indexOf('?') >= 0 ? '&' : '?') + q;
      }
      self.ws = new WS(url);
    } catch (e) { return false; }
    try {
      self.ws.onopen = function () {
        self.connected = true;
        // Rejoin bundle: last serverTick + next event seq (no dupes).
        self.sendRaw({ t: 'hello', lastTick: self.serverTick, nextEventSeq: self.lastEventSeq + 1, ticket: self.ticket || {} });
        self.startLoop();
      };
      self.ws.onmessage = function (ev) { self.handleMessage(ev && ev.data); };
      self.ws.onclose = function () { self.handleClose(); };
      self.ws.onerror = function () { /* close follows */ };
    } catch (e) { /* ignore */ }
    return true;
  };

  GG2Room.prototype.startLoop = function () {
    var self = this;
    self.stopLoop();
    self.sendTimer = setInterval(function () {
      try { self.sendOnce(); } catch (e) { /* never throw */ }
    }, INPUT_MS);
  };

  GG2Room.prototype.stopLoop = function () {
    if (this.sendTimer) { try { clearInterval(this.sendTimer); } catch (e) {} }
    this.sendTimer = null;
  };

  /* 60Hz intent send. */
  GG2Room.prototype.sendOnce = function () {
    if (!this.ws || this.ws.readyState !== 1) return false;
    var s = null;
    try { s = this.sample() || {}; } catch (e) { s = {}; }
    this.seq++;
    this.clientTick++;
    var frame = clampIntent({ sequence: this.seq, clientTick: this.clientTick, moveX: s.moveX, moveY: s.moveY, aimAngle: s.aimAngle, buttons: s.buttons });
    return this.sendRaw({ t: 'in', sequence: frame.sequence, clientTick: frame.clientTick, moveX: frame.moveX, moveY: frame.moveY, aimAngle: frame.aimAngle, buttons: frame.buttons });
  };

  GG2Room.prototype.sendRaw = function (obj) {
    try {
      if (!this.ws || this.ws.readyState !== 1) return false;
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch (e) { return false; }
  };

  /* 20Hz receive: deltas applied over baseline, full/resync replaces. */
  GG2Room.prototype.handleMessage = function (data) {
    var msg = null;
    try { msg = typeof data === 'string' ? JSON.parse(data) : data; } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    var t = String(msg.t || msg.type || '');
    var self = this;
    if (t === 'snap' || t === 'delta' || t === 'full' || t === 'baseline') {
      if (typeof msg.tick === 'number') self.serverTick = msg.tick;
      if (t === 'full' || t === 'baseline') self.lastFullTick = self.serverTick;
      var events = Array.isArray(msg.events) ? msg.events : [];
      var fresh = [];
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        var sq = Math.floor(Number(ev && ev.seq)) || 0;
        if (sq > self.lastEventSeq && !self.seenEvents[sq]) {
          self.seenEvents[sq] = 1;
          if (sq > self.lastEventSeq) self.lastEventSeq = sq;
          fresh.push(ev);
        }
      }
      if (t === 'full' || t === 'baseline') {
        try { self.onFullState(msg, fresh); } catch (e) {}
      }
      try { self.onSnapshot(msg, fresh); } catch (e2) {}
      for (var k = 0; k < fresh.length; k++) {
        try { self.onEvent(fresh[k]); } catch (e3) {}
      }
      self.ack();
      // Prune dupe memory.
      var keys = Object.keys(self.seenEvents);
      if (keys.length > 512) {
        for (var p = 0; p < keys.length - 512; p++) delete self.seenEvents[keys[p]];
      }
    } else if (t === 'resync') {
      var evs = Array.isArray(msg.events) ? msg.events : [];
      var fresh2 = [];
      for (var j = 0; j < evs.length; j++) {
        var e2 = evs[j];
        var s2 = Math.floor(Number(e2 && e2.seq)) || 0;
        if (s2 > self.lastEventSeq && !self.seenEvents[s2]) {
          self.seenEvents[s2] = 1;
          if (s2 > self.lastEventSeq) self.lastEventSeq = s2;
          fresh2.push(e2);
        }
      }
      if (typeof msg.tick === 'number') { self.serverTick = msg.tick; self.lastFullTick = msg.tick; }
      try { self.onFullState(msg, fresh2); } catch (e) {}
      for (var m = 0; m < fresh2.length; m++) {
        try { self.onEvent(fresh2[m]); } catch (e2b) {}
      }
      self.ack();
    }
  };

  GG2Room.prototype.ack = function () {
    this.sendRaw({ t: 'ack', eventSeq: this.lastEventSeq });
  };

  GG2Room.prototype.handleClose = function () {
    this.connected = false;
    this.stopLoop();
    try { this.onClose({ recoverableMs: RECOVERABLE_MS }); } catch (e) {}
  };

  GG2Room.prototype.disconnect = function () {
    this.stopLoop();
    try { if (this.ws) this.ws.close(); } catch (e) {}
    this.ws = null;
    this.connected = false;
  };

  GG2Room.INPUT_HZ = INPUT_HZ;
  GG2Room.SNAPSHOT_HZ = SNAPSHOT_HZ;
  GG2Room.RECOVERABLE_MS = RECOVERABLE_MS;

  var g = G();
  try { g.GG2Room = GG2Room; } catch (e) {}
  if (typeof module !== 'undefined' && module.exports) module.exports = { GG2Room: GG2Room };
})();
