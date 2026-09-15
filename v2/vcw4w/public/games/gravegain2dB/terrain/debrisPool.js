"use strict";
// GraveGain2dB Terrain — pooled debris descriptors (no GC churn in collapse paths).
(function (global) {
  function createPool(maxSize) {
    return { max: maxSize || 256, items: [], acquired: 0 };
  }

  function acquire(pool, kind, x, y) {
    var d = pool.items.pop() || {};
    d.kind = kind; d.x = x; d.y = y; d.pooled = true; d.active = true;
    pool.acquired += 1;
    return d;
  }

  function release(pool, d) {
    if (!d) return;
    d.active = false;
    if (pool.items.length < pool.max) pool.items.push(d);
  }

  function releaseAll(pool, list) {
    (list || []).forEach(function (d) { release(pool, d); });
  }

  var api = { createPool: createPool, acquire: acquire, release: release, releaseAll: releaseAll };

  global.GraveGain2dBTerrainDebris = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
