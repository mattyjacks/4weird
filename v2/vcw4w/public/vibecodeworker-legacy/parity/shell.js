/* VCW desktop parity — shell router: native-first + webview fallback (plain script). */
(function () {
  "use strict";
  // Mirror of web SITE_NAV_GROUPS (subset). Full map lives in docs/PARITY.md.
  var ROUTES = [
    { hash: "#/games", web: "/games", label: "Play games" },
    { hash: "#/leaderboards", web: "/leaderboards", label: "Leaderboards" },
    { hash: "#/lobbies", web: "/lobbies", label: "Lobbies" },
    { hash: "#/clans", web: "/clans", label: "Clans" },
    { hash: "#/submit", web: "/submit", label: "Submit game" },
    { hash: "#/vibecodeworker", web: "/vibecodeworker/hub", label: "VCW hub" },
    { hash: "#/run", web: "/vibecodeworker/run", label: "VCW cloud run" },
    { hash: "#/desktop", web: "/desktop", label: "RunPod control pane" },
    { hash: "#/agents", web: "/agents", label: "Agents" },
    { hash: "#/runpods", web: "/runpods", label: "My RunPods" },
    { hash: "#/vault", web: "/vault", label: "Vault" },
    { hash: "#/pricing", web: "/pricing", label: "Pricing" },
    { hash: "#/account", web: "/account", label: "Account" },
    { hash: "#/usage", web: "/my/usage", label: "Usage receipts" },
    { hash: "#/docs", web: "/docs", label: "Docs" },
    { hash: "#/support", web: "/support", label: "Support" },
  ];
  function siteUrl() {
    try {
      if (window.VCWParity && window.VCWParity.config) {
        return window.VCWParity.config.getConfig().siteUrl;
      }
    } catch (e) {}
    return "https://4weird.com";
  }
  function routeFor(hash) {
    var h = String(hash || "").split("?")[0];
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].hash === h) return ROUTES[i];
    }
    return null;
  }
  // Webview fallback: render an authenticated-optional iframe to prod web.
  // Native views (games browser, QA workspace) take precedence; this is the
  // escape hatch that guarantees "desktop can do anything web can" on day one.
  function openWebFallback(webPath, outletId) {
    var outlet = outletId ? document.getElementById(outletId) : null;
    var url = siteUrl() + webPath;
    if (!outlet) {
      window.open(url, "_blank", "noopener");
      return { mode: "external", url: url };
    }
    outlet.innerHTML = "";
    var bar = document.createElement("div");
    bar.className = "parity-fallback-bar";
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open in browser: " + webPath;
    bar.appendChild(link);
    var frame = document.createElement("iframe");
    frame.src = url;
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    frame.style.width = "100%";
    frame.style.minHeight = "70vh";
    frame.style.border = "1px solid var(--border, #233)";
    outlet.appendChild(bar);
    outlet.appendChild(frame);
    return { mode: "iframe", url: url };
  }
  function renderNav(mountId) {
    var mount = mountId ? document.getElementById(mountId) : null;
    if (!mount) return { ok: false, error: "No nav mount." };
    mount.innerHTML = "";
    ROUTES.forEach(function (r) {
      var a = document.createElement("a");
      a.href = r.hash;
      a.textContent = r.label;
      a.setAttribute("data-web", r.web);
      mount.appendChild(a);
    });
    return { ok: true, count: ROUTES.length };
  }
  window.VCWParity = window.VCWParity || {};
  window.VCWParity.shell = { routes: ROUTES, routeFor: routeFor, openWebFallback: openWebFallback, renderNav: renderNav };
})();
