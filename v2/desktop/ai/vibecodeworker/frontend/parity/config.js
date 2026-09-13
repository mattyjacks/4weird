/* VCW desktop parity — config (plain script, no imports; node --check clean). */
(function () {
  "use strict";
  var DEFAULTS = {
    apiBase: "https://4weird.com",
    siteUrl: "https://4weird.com",
    catalogTtlMs: 24 * 60 * 60 * 1000,
  };
  function readStore() {
    try {
      var raw = window.sessionStorage
        ? window.sessionStorage.getItem("vcw_parity_config")
        : null;
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function getConfig() {
    var w = window.__VCW_CONFIG__ || {};
    var s = readStore();
    var apiBase = w.apiBase || s.apiBase || DEFAULTS.apiBase;
    var siteUrl = w.siteUrl || s.siteUrl || DEFAULTS.siteUrl;
    // Allow http only for loopback (dev); never ship http prod.
    if (/^http:\/\//i.test(apiBase) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(apiBase)) {
      apiBase = DEFAULTS.apiBase;
    }
    return { apiBase: apiBase, siteUrl: siteUrl, catalogTtlMs: DEFAULTS.catalogTtlMs };
  }
  function setConfig(patch) {
    var cur = readStore();
    var next = {};
    for (var k in cur) next[k] = cur[k];
    for (var j in (patch || {})) next[j] = patch[j];
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem("vcw_parity_config", JSON.stringify(next));
      }
    } catch (e) {}
    return getConfig();
  }
  window.VCWParity = window.VCWParity || {};
  window.VCWParity.config = { getConfig: getConfig, setConfig: setConfig, defaults: DEFAULTS };
})();
