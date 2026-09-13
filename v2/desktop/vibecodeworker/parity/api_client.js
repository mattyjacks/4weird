/* VCW desktop parity — API client (plain script, node --check clean). */
(function () {
  "use strict";
  function base() {
    try {
      if (window.VCWParity && window.VCWParity.config) {
        return window.VCWParity.config.getConfig().apiBase;
      }
    } catch (e) {}
    return "https://4weird.com";
  }
  function withTimeout(ms) {
    if (typeof AbortController === "undefined") {
      return { signal: undefined, cancel: function () {} };
    }
    var c = new AbortController();
    var t = setTimeout(function () {
      try {
        c.abort();
      } catch (e) {}
    }, ms || 10000);
    return {
      signal: c.signal,
      cancel: function () {
        clearTimeout(t);
      },
    };
  }
  function apiFetch(path, opts) {
    var o = opts || {};
    var method = (o.method || "GET").toUpperCase();
    var url = base() + path;
    var headers = { "Content-Type": "application/json" };
    var ah = { headers: {} };
    try {
      if (window.VCWParity && window.VCWParity.auth) {
        ah = window.VCWParity.auth.authHeaders({ write: method !== "GET" });
      }
    } catch (e) {
      ah = { headers: {} };
    }
    if (ah.error && method !== "GET") return Promise.resolve({ ok: false, status: 0, error: ah.error });
    for (var k in ah.headers) headers[k] = ah.headers[k];
    var t = withTimeout(o.timeoutMs || 10000);
    var body;
    if (o.body !== undefined) {
      try {
        body = JSON.stringify(o.body);
      } catch (e) {
        t.cancel();
        return Promise.resolve({ ok: false, status: 0, error: "Unserializable body." });
      }
    }
    return fetch(url, { method: method, headers: headers, body: body, signal: t.signal, credentials: "omit" })
      .then(function (r) {
        t.cancel();
        var retry = r.headers ? r.headers.get("Retry-After") : null;
        return r
          .text()
          .then(function (txt) {
            var data = null;
            try {
              data = txt ? JSON.parse(txt) : null;
            } catch (e) {
              data = { raw: txt.slice(0, 2000) };
            }
            if (!r.ok) {
              return { ok: false, status: r.status, error: (data && data.error) || ("HTTP " + r.status), retryAfter: retry, data: data };
            }
            return { ok: true, status: r.status, data: data };
          });
      })
      .catch(function (e) {
        t.cancel();
        var msg = e && e.name === "AbortError" ? "Request timed out." : String((e && e.message) || e);
        return { ok: false, status: 0, error: msg };
      });
  }
  window.VCWParity = window.VCWParity || {};
  window.VCWParity.api = { apiFetch: apiFetch, apiBase: base };
})();
