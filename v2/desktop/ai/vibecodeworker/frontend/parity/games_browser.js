/* VCW desktop parity — games browser (catalog fetch + cache + offline fallback). */
(function () {
  "use strict";
  var CACHE_KEY = "vcw_games_catalog_v1";
  // Offline floor: mirrors modules/data_store.js gamesCatalogue ids.
  var BUNDLED = [
    "orbitaldrift",
    "lastwordszombies",
    "serversavershield",
    "overtake",
    "assassinanimals",
    "battlesharks2",
    "gravegain2d",
    "gravegain3d",
    "aiwhackamole",
    "soundpainter2",
  ];
  function readCache() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(CACHE_KEY) : null;
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || !p.games) return null;
      return p;
    } catch (e) {
      return null;
    }
  }
  function writeCache(games) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ fetched_at: new Date().toISOString(), games: games }));
      }
    } catch (e) {}
  }
  function ttlMs() {
    try {
      if (window.VCWParity && window.VCWParity.config) {
        return window.VCWParity.config.getConfig().catalogTtlMs;
      }
    } catch (e) {}
    return 24 * 60 * 60 * 1000;
  }
  function fetchCatalog(force) {
    var cached = readCache();
    if (cached && !force) {
      var age = Date.now() - Date.parse(cached.fetched_at || 0);
      if (age >= 0 && age < ttlMs()) return Promise.resolve({ ok: true, games: cached.games, source: "cache" });
    }
    var api = window.VCWParity && window.VCWParity.api ? window.VCWParity.api : null;
    if (!api) return Promise.resolve({ ok: true, games: [], source: "bundled", bundled: BUNDLED });
    return api.apiFetch("/api/games/catalog", { method: "GET", timeoutMs: 10000 }).then(function (r) {
      if (r.ok && r.data && r.data.games) {
        writeCache(r.data.games);
        return { ok: true, games: r.data.games, source: "live" };
      }
      if (cached) return { ok: true, games: cached.games, source: "cache-stale" };
      return { ok: true, games: [], source: "bundled", bundled: BUNDLED };
    });
  }
  function filterGames(games, q, genre) {
    var query = String(q || "").toLowerCase().trim();
    var g = String(genre || "").toLowerCase().trim();
    return (games || []).filter(function (x) {
      if (g && String((x.genre || "")).toLowerCase() !== g) return false;
      if (!query) return true;
      var hay = (x.slug + " " + x.title + " " + (x.description || "") + " " + (x.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(query) !== -1;
    });
  }
  function resolveRuntimeUrl(game, apiBase) {
    var base = apiBase || "https://4weird.com";
    if (game && game.runtime_path) return base + game.runtime_path;
    if (game && game.slug) return base + "/games/" + game.slug + "/index.html";
    return base + "/games";
  }
  window.VCWParity = window.VCWParity || {};
  window.VCWParity.games = {
    fetchCatalog: fetchCatalog,
    filterGames: filterGames,
    resolveRuntimeUrl: resolveRuntimeUrl,
    bundled: BUNDLED,
  };
})();
