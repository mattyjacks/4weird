'use strict';
/* GraveGain2dB net-fault injector (test/QA only, never in prod path).
 *
 * Wraps a send/receive pair with latency/jitter/loss/duplication so the
 * 60Hz-input/20Hz-snapshot contract and the 30s shield/reconnect path can
 * be exercised deterministically. Pure timer-based; no sockets here.
 *
 * ASCII-only, dependency-free. CommonJS + browser compatible.
 */

var PRESETS = {
  good: { latencyMs: 20, jitterMs: 5, loss: 0, dup: 0 },
  wifi: { latencyMs: 80, jitterMs: 30, loss: 0.02, dup: 0 },
  lossy: { latencyMs: 120, jitterMs: 60, loss: 0.1, dup: 0.01 },
  bad: { latencyMs: 250, jitterMs: 120, loss: 0.2, dup: 0.02 }
};

function pickPreset(name) {
  if (name && PRESETS[name]) return PRESETS[name];
  return PRESETS.good;
}

function rand() {
  return Math.random();
}

/* Schedule delivery of one packet with delay; drops on loss roll. */
function deliverWithFaults(packet, opts, deliver) {
  var o = opts || {};
  var loss = typeof o.loss === 'number' ? o.loss : 0;
  var dup = typeof o.dup === 'number' ? o.dup : 0;
  var latency = typeof o.latencyMs === 'number' ? o.latencyMs : 20;
  var jitter = typeof o.jitterMs === 'number' ? o.jitterMs : 0;
  if (rand() < loss) return { delivered: false, reason: 'loss' };
  var delay = latency + (jitter > 0 ? (rand() * 2 - 1) * jitter : 0);
  if (!(delay >= 0)) delay = 0;
  var timers = [];
  timers.push(setTimeout(function () {
    try { deliver(packet); } catch (e) { /* never throw */ }
  }, delay));
  if (dup > 0 && rand() < dup) {
    timers.push(setTimeout(function () {
      try { deliver(packet); } catch (e) { /* never throw */ }
    }, delay + 5));
  }
  return { delivered: true, timers: timers };
}

/*
 * Wrap a transport: link.send(packet) faults toward onDeliver; link.test
 * helpers allow scripted partitions. opts: preset name string or object.
 */
function withFaults(onDeliver, opts) {
  var cfg = typeof opts === 'string' ? pickPreset(opts) : (opts || pickPreset('good'));
  var enabled = true;
  var stats = { sent: 0, dropped: 0 };
  function send(packet) {
    stats.sent++;
    if (!enabled) return { delivered: false, reason: 'partition' };
    var r = deliverWithFaults(packet, cfg, onDeliver);
    if (!r.delivered) stats.dropped++;
    return r;
  }
  return {
    send: send,
    setPreset: function (name) { cfg = pickPreset(name); },
    setConfig: function (c) { cfg = c || cfg; },
    partition: function (on) { enabled = !on; },
    getStats: function () { return { sent: stats.sent, dropped: stats.dropped }; }
  };
}

var api = { PRESETS: PRESETS, pickPreset: pickPreset, withFaults: withFaults, deliverWithFaults: deliverWithFaults };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
