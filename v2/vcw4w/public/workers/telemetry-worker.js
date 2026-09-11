// 4weird perf worker: telemetry + leaderboard math.
// Ports the hot loops of lib/vcw-frame-analysis.ts so playtest dashboards,
// buddy scoring, and leaderboard ranking never block the game frame.

function laneOf(x) {
  return x < -0.34 ? 0 : x > 0.34 ? 2 : 1;
}

function buildThreatHeat(traffic) {
  const heat = [];
  for (const c of traffic || []) {
    if (c.kind === "powerup" || c.d < -20 || c.d > 280) continue;
    const closeness = Math.min(1, Math.max(0, c.d / 280));
    heat.push([+Number(c.x).toFixed(3), +closeness.toFixed(3), +(1 - closeness).toFixed(3)]);
  }
  return heat.slice(0, 24);
}

function buildTrailPath(recent) {
  return recent.map((k, i) => [+Number(k.playerX ?? 0).toFixed(3), +((i + 1) / 12).toFixed(3)]);
}

function segmentTicks(ticks, seconds) {
  const out = [];
  const n = Math.max(1, Math.min(120, Math.floor(seconds) || 1));
  for (let s = 0; s < n; s++) {
    const window = [];
    for (let i = 0; i < ticks.length; i++) {
      const k = ticks[i];
      if (k.t >= s && k.t < s + 1) window.push(k);
    }
    const last = window[window.length - 1] || ticks[ticks.length - 1];
    if (!last) break;
    let sum = 0;
    for (const k of window) sum += k.speed || 0;
    const speed = Math.round(sum / Math.max(1, window.length));
    const lanes = [0, 0, 0];
    for (const c of last.traffic || []) {
      if (c.kind !== "powerup" && c.d >= -20 && c.d <= 280) lanes[laneOf(c.x)] = 1;
    }
    const seen = [];
    for (const k of window) {
      for (const key of k.keys || []) {
        if (seen.indexOf(key) === -1) seen.push(key);
      }
    }
    const trail = [];
    for (let i = ticks.length - 1; i >= 0 && trail.length < 12; i--) {
      if (ticks[i].t < s + 1) trail.unshift(ticks[i]);
    }
    out.push({
      second: s,
      speed,
      lap: last.lap == null ? null : last.lap,
      keys: last.keys || [],
      lanes,
      heat: buildThreatHeat(last.traffic || []),
      path: buildTrailPath(trail),
      inputs: seen,
      decision: String(last.reasoning || "").replace(/^Overtake reflex: /, ""),
    });
  }
  return out;
}

function rankRows(rows) {
  const sorted = rows.slice(0, 5000).sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  return sorted.map((r, i) => ({ rank: i + 1, player: String(r.player || "?").slice(0, 40), value: Number(r.value) || 0 }));
}

self.onmessage = function (e) {
  const msg = e.data || {};
  try {
    if (msg.type === "segments") {
      const ticks = Array.isArray(msg.ticks) ? msg.ticks.slice(0, 5000) : [];
      self.postMessage({ ok: true, result: segmentTicks(ticks, msg.seconds || 15) });
    } else if (msg.type === "threat-heat") {
      self.postMessage({ ok: true, result: buildThreatHeat(msg.traffic || []) });
    } else if (msg.type === "rank") {
      const rows = Array.isArray(msg.rows) ? msg.rows : [];
      self.postMessage({ ok: true, result: rankRows(rows) });
    } else {
      self.postMessage({ ok: false, error: "unknown-type" });
    }
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
