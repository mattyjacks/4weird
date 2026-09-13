/* VCW desktop parity — unified auth store (plain script, node --check clean). */
(function () {
  "use strict";
  var BOT_RE = /^bot4weird_[A-Za-z0-9]{20}$|^bot4weird_[A-Za-z0-9]{32}$/;
  var GATEWAY_RE = /^vcw_live_[A-Za-z0-9]{32}$/;
  var KEYS = { bot: "vcw_parity_bot", gateway: "vcw_parity_gateway", fal: "vcw_fal_key", runpod: "vibe_runpod_key" };

  function readMem(k) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(k) : null;
    } catch (e) {
      return null;
    }
  }
  function writeMem(k, v) {
    try {
      if (!window.sessionStorage) return;
      if (v == null) window.sessionStorage.removeItem(k);
      else window.sessionStorage.setItem(k, v);
    } catch (e) {}
  }
  function fingerprint(s) {
    if (!s || s.length < 8) return "unset";
    return s.slice(0, 6) + "..." + s.slice(-4);
  }
  function isBotShape(s) {
    return typeof s === "string" && BOT_RE.test(s.trim());
  }
  function isGatewayShape(s) {
    return typeof s === "string" && GATEWAY_RE.test(s.trim());
  }
  function save(slot, value) {
    var v = String(value == null ? "" : value).trim();
    if (slot === "bot" && v && !isBotShape(v)) return { ok: false, error: "Bot key shape must be bot4weird_ + 20 or 32 alphanumerics." };
    if (slot === "gateway" && v && !isGatewayShape(v)) return { ok: false, error: "Gateway key shape must be vcw_live_ + 32 alphanumerics." };
    // Migrate legacy localStorage keys away on save.
    try {
      if (window.localStorage) {
        if (slot === "bot") window.localStorage.removeItem("vcw_bot_token");
      }
    } catch (e) {}
    writeMem(KEYS[slot] || slot, v || null);
    return { ok: true, fingerprint: v ? fingerprint(v) : "cleared" };
  }
  function get(slot) {
    var v = readMem(KEYS[slot] || slot);
    return v ? v.trim() : "";
  }
  function status() {
    var b = get("bot");
    var g = get("gateway");
    return {
      bot: b ? fingerprint(b) : "unset",
      gateway: g ? fingerprint(g) : "unset",
      botValid: isBotShape(b),
      gatewayValid: isGatewayShape(g),
    };
  }
  // Header preference matches server resolveVcwCaller order: gateway, then bot.
  function authHeaders(opts) {
    var h = {};
    var needWrite = opts && opts.write;
    var g = get("gateway");
    var b = get("bot");
    if (g && isGatewayShape(g)) h["x-vcw-key"] = g;
    else if (b && isBotShape(b)) h["x-bot-key"] = b;
    if (needWrite && !h["x-vcw-key"] && !h["x-bot-key"]) return { error: "Write needs a gateway (vcw:write) or bot (vcw:write) key." };
    return { headers: h };
  }
  window.VCWParity = window.VCWParity || {};
  window.VCWParity.auth = {
    save: save,
    get: get,
    status: status,
    authHeaders: authHeaders,
    isBotShape: isBotShape,
    isGatewayShape: isGatewayShape,
  };
})();
