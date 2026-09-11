// 4weird perf worker: search + sort.
// Static, dependency-free, long-cached. Mirrors lib/perf-client.ts fallbacks.
// Never throws to the caller: every reply is { ok: true, result } or { ok: false, error }.

function filterGames(items, query, genre) {
  const q = String(query ?? "").trim().toLowerCase();
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const g = items[i];
    if (genre !== "All" && g.genre !== genre) continue;
    if (q && String(g.haystack || "").toLowerCase().indexOf(q) === -1) continue;
    out.push(g.slug);
  }
  return out;
}

function sortPing(rows) {
  return rows
    .slice(0, 2000)
    .sort((a, b) => (Number(a.ping) || 999) - (Number(b.ping) || 999));
}

self.onmessage = function (e) {
  const msg = e.data || {};
  try {
    if (msg.type === "filter-games") {
      const items = Array.isArray(msg.items) ? msg.items.slice(0, 2000) : [];
      self.postMessage({ ok: true, result: filterGames(items, msg.query, msg.genre || "All") });
    } else if (msg.type === "sort-ping") {
      const rows = Array.isArray(msg.rows) ? msg.rows.slice(0, 2000) : [];
      self.postMessage({ ok: true, result: sortPing(rows) });
    } else {
      self.postMessage({ ok: false, error: "unknown-type" });
    }
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
