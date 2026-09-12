/* Battlesharks 2 codex overlay (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundle: public/games/html/battlesharks2-lore.js,
 * injected into the GENERATED runtime copy only by scripts/sync-game-bundles.mjs.
 * NEVER edit public/games/html/battlesharks2/** (game.js, game.css, index.html,
 * game.json — see scripts/verify-game-bundles.mjs). NEVER touch old-v1/.
 *
 * Contract:
 *   - Data: window.BS2_LORE when the host provides it ({ facility, logs,
 *     zones, bestiary, timeline }); otherwise a built-in fallback copy with
 *     matching ids, kept in sync with content/battlesharks2-lore.ts.
 *   - UI: fixed corner button "📖 CODEX" toggles a dialog with three tabs:
 *     Logs / Bestiary / Zones. Scientist logs tab also carries the complex
 *     timeline below the log list.
 *   - Input safety: the overlay root is pointer-events:none; ONLY the button
 *     and the open panel are pointer-events:auto. No keyboard listeners, no
 *     pointer lock, no canvas listeners — game input is never intercepted.
 *   - Exposes window.BS2Codex { open, close, toggle } (idempotent).
 */
(function () {
  "use strict";
  try {
    if (window.BS2Codex) return; // idempotent under double-injection

    /* ---------- data (host-provided window.BS2_LORE wins; fallback matches
       content/battlesharks2-lore.ts ids/names) ---------- */
    function hostLore() {
      try {
        var g = window.BS2_LORE;
        if (g && g.logs && g.zones && g.bestiary) return g;
      } catch (e) { /* ignore */ }
      return null;
    }

    var FALLBACK = {
      slug: "battlesharks2",
      facility: {
        name: "BS-07 Aquarium Complex",
        operator: "BS-07 R&D Command",
        foundedBy: "Dr. Amara Osei for the Meridian Marine Institute",
        history: "A decommissioned military testing tank turned into an ark: cloned reef sharks, raised from Pups and grafted with surplus cybernetics, eat clownfish to heal and grow, harvest cyber-debris and mutagens, and spend both in the R&D Lab Hub — until mutagen runoff corrupted the security core and the Robo-Kraken declared every shark an intruder."
      },
      logs: [
        { id: "osei-why-we-built-the-tanks", author: "Dr. Amara Osei", role: "Founder, Lead Geneticist", title: "Why we built the tanks", date: "BS-07 Day 001", text: "They call this place an aquarium. It is not. It is an ark. When the poacher subs and the minefields finished the outer reef, the Meridian Marine Institute gave me one decommissioned testing complex, a freezer of reef-shark embryos, and a warehouse of military-surplus cybernetics nobody else wanted. So we grew guardians: cloned reef sharks, Pup-small at first, grafted with hardware so they could survive water that kills everything else. Eat. Grow. Clean the reef. That was the deal." },
        { id: "vega-laser-rig", author: 'Tomas "Rusty" Vega', role: "Chief Engineer, Cybernetics Wing", title: "About the laser rig (read before you fire it)", date: "BS-07 Day 214", text: "The laser was a mining cutter before it was a shark fin. Damn thing runs hot, drinks cyber-debris like water, and kicks like a mule — which is exactly why we bolted it to the fastest animal in the complex. The jet thruster is not a toy either. It is an escape hatch with flames. Point it AWAY from the problem, count to one, and be somewhere else." },
        { id: "park-coral-and-clownfish", author: "Junie Park", role: "Intern, Reef Restoration", title: "The coral + clownfish trick", date: "BS-07 Day 309", text: "Hi! I am the intern, I feed everybody! Deploy bioluminescent coral and it spawns edible clownfish — eating them heals you AND gives biomass for growing bigger. Hydrothermal vents are the same idea for grown-up stuff: park one, wait, and it burps up mutagen canisters. The mines do not heal you. The mines are not snacks. I learned that the loud way so you do not have to." },
        { id: "harlow-kraken-warning", author: "D. Harlow", role: "Security Chief", title: "KRAKEN CONTAINMENT WARNING", date: "BS-07 Day 402", text: "The Robo-Kraken was our security system. Past tense. Mutagen runoff got into its command core, and now BS-BOSS treats every shark as an intruder. It hits like hell when it connects. You do NOT fight it small. Eat, upgrade, come back a Hunter with missiles and a full shield, and never stop moving. Clear the Kraken, clear the aquarium." }
      ],
      zones: [
        { id: "launch-bay", name: "Launch Bay", icon: "🚀", description: "Where every run begins: the clone creche. Your shark launches as a LVL 1 Pup — small, quick, unarmed, hungry. The bay water is safe; it is the last safe water you will see for a while.", tip: "Eat the nearest small fish first — early meals heal you and bank the first biomass toward Hunter size." },
        { id: "testing-bay", name: "Testing Bay", icon: "🧪", description: "The main proving tank: open water laced with naval mines, hunter subs, depth charges, and security grids. Coral glows where interns seeded it; vents puff mutagen in the deep corners.", tip: "Circle the edges: sweep coral for clownfish, grab debris between patrols, open the Lab Hub (E) between fights — never mid-swarm." },
        { id: "kraken-arena", name: "Robo-Kraken Arena", icon: "🐙", description: "The flooded security core. When the warning flashes, the ROBO-KRAKEN BS-BOSS rises here with its own health bar. Destroying it clears the complex and pays a mutagen bounty.", tip: "Come back a Hunter with missiles and shielding, keep moving, and dash OUT of trouble, never through it." }
      ],
      bestiary: [
        { id: "clownfish-fry", name: "Clownfish Fry", icon: "🐠", kind: "prey", behavior: "Small, bright, harmless. Schools drift near bioluminescent coral and never fight back.", counter: "Eat them. Every fry heals you and drops biomass — a full belly is your first upgrade." },
        { id: "hunter-sub", name: "Military Hunter Sub", icon: "🚤", kind: "hunter", behavior: "Crewed patrol subs that chase, shoot, and herd you toward mines. Faster than a Pup, slower than a jet dash.", counter: "Never fight them small or head-on. Outgrow them on clownfish, then engage — or dash past." },
        { id: "naval-mine", name: "Naval Mine", icon: "💣", kind: "hazard", behavior: "Anchored ordnance: perfectly still, 35 damage on touch. Clusters guard debris fields because the complex knows you get greedy.", counter: "Eat AROUND mines, never through them. Lure chasers in and let greed punish them instead." },
        { id: "depth-charge", name: "Depth Charge", icon: "🧨", kind: "hazard", behavior: "Dropped from above, sinking and detonating in your neighborhood. The danger zone moves.", counter: "Keep lateral speed up. A drifting shark is a target; a strafing shark is a rumor." },
        { id: "security-grid", name: "Security Grid", icon: "⚡", kind: "hazard", behavior: "Electrified barriers that sit exactly where the shortest path goes.", counter: "Take the long way shielded, or dash the gap in one commit. Half-measures get zapped." },
        { id: "mutagen-vent", name: "Hydrothermal Vent", icon: "🌋", kind: "fixture", behavior: "Volcanic fissures that puff out raw mutagen canisters on a slow timer — the rarest currency in BS-07.", counter: "Deploy a vent early and defend its corner: every canister is a future laser, shield, or thruster." },
        { id: "robo-kraken", name: "Robo-Kraken BS-BOSS", icon: "🐙", kind: "boss", behavior: "Rogue security core: armored, tentacled, convinced every shark is an intruder. Ends runs that arrive undergrown or standing still.", counter: "Arrive a Hunter with missiles and full shield. Circle-strafe, fire on the move, dash away from grabs." }
      ],
      timeline: [
        { era: "Year 0 — The Dead Reef", text: "Poacher subs and minefields finish the outer reef. The Institute inherits the BS-07 tanks." },
        { era: "Day 001 — The Ark Opens", text: "Dr. Osei thaws the first embryos: eat, grow, clean the reef." },
        { era: "Day 214 — The Rig Works", text: "The first laser graft holds; the thruster stops exploding sharks." },
        { era: "Day 309 — Snack Science", text: "Seeded coral + clownfish triples Pup survival." },
        { era: "Day 402 — The Breach", text: "Runoff corrupts the security core. The Kraken turns." },
        { era: "Today — Your Run", text: "You launch as the latest clone. Clear the Kraken, clear the aquarium." }
      ]
    };

    function lore() {
      try { return hostLore() || FALLBACK; } catch (e) { return FALLBACK; }
    }

    function esc(s) {
      try {
        return String(s == null ? "" : s)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;")
          .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      } catch (e) { return ""; }
    }

    /* ---------- styles (scoped, panel-only interactivity) ---------- */
    function injectCss() {
      try {
        if (document.getElementById("bs2-codex-css")) return;
        var css = [
          "#bs2-codex-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:inherit}",
          "#bs2-codex-btn{position:absolute;right:12px;bottom:12px;pointer-events:auto;cursor:pointer;",
          " background:rgba(2,20,35,.92);color:#7df9ff;border:1px solid rgba(125,249,255,.55);border-radius:10px;",
          " padding:9px 13px;font-size:14px;font-weight:700;letter-spacing:.04em;box-shadow:0 0 14px rgba(0,229,255,.35)}",
          "#bs2-codex-btn:hover{background:rgba(4,40,70,.95)}",
          "#bs2-codex-panel{position:absolute;right:12px;bottom:56px;width:min(430px,calc(100vw - 24px));",
          "body.bs2-touch #bs2-codex-btn{bottom:170px}",
          "body.bs2-touch #bs2-codex-panel{bottom:214px}",
          " max-height:min(70vh,560px);display:none;flex-direction:column;pointer-events:auto;",
          " background:rgba(2,18,32,.97);color:#d7f6ff;border:1px solid rgba(125,249,255,.5);border-radius:12px;",
          " box-shadow:0 8px 40px rgba(0,0,0,.6);overflow:hidden}",
          "#bs2-codex-panel.open{display:flex}",
          "#bs2-codex-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(125,249,255,.25)}",
          "#bs2-codex-head b{font-size:14px;letter-spacing:.05em}",
          "#bs2-codex-head span{font-size:11px;opacity:.7}",
          "#bs2-codex-x{margin-left:auto;pointer-events:auto;cursor:pointer;background:transparent;color:#d7f6ff;",
          " border:1px solid rgba(215,246,255,.35);border-radius:8px;padding:2px 9px;font-size:14px}",
          "#bs2-codex-tabs{display:flex;gap:6px;padding:8px 12px 0}",
          "#bs2-codex-tabs button{pointer-events:auto;cursor:pointer;flex:1;background:transparent;color:#9be9ff;",
          " border:1px solid rgba(125,249,255,.3);border-bottom:none;border-radius:8px 8px 0 0;padding:7px 4px;font-size:13px;font-weight:700}",
          "#bs2-codex-tabs button.active{background:rgba(0,229,255,.14);color:#fff}",
          "#bs2-codex-body{overflow-y:auto;padding:10px 12px 14px;pointer-events:auto}",
          "#bs2-codex-body h4{margin:10px 0 4px;font-size:13px;color:#7df9ff}",
          "#bs2-codex-body p{margin:4px 0 8px;font-size:12.5px;line-height:1.5}",
          "#bs2-codex-body .bs2-card{border:1px solid rgba(125,249,255,.22);border-radius:9px;padding:8px 10px;margin:0 0 8px;background:rgba(0,60,90,.25)}",
          "#bs2-codex-body .bs2-meta{font-size:11px;opacity:.75;margin-bottom:4px}",
          "#bs2-codex-body .bs2-tip{font-size:12px;color:#ffe58a}",
          "#bs2-codex-body .bs2-kind{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.05em;",
          " border:1px solid rgba(255,229,138,.5);border-radius:20px;padding:1px 8px;margin-left:6px;color:#ffe58a}"
        ].join("\n");
        var st = document.createElement("style");
        st.id = "bs2-codex-css";
        st.textContent = css;
        document.head.appendChild(st);
      } catch (e) { /* ignore */ }
    }

    /* ---------- render ---------- */
    var root = null, panel = null, body = null, tabBtns = [];
    var activeTab = "logs";

    function card(html) {
      try { return '<div class="bs2-card">' + html + "</div>"; } catch (e) { return ""; }
    }

    function renderLogs(d) {
      try {
        var h = "";
        try {
          var f = d.facility || {};
          h += card("<h4>" + esc(f.name || "BS-07 Aquarium Complex") + "</h4><p>" + esc(f.history || "") + "</p>");
        } catch (e) { /* ignore */ }
        try {
          (d.logs || []).forEach(function (l) {
            h += card("<h4>" + esc(l.title || l.id) + "</h4>" +
              '<div class="bs2-meta">' + esc(l.author || "") + " — " + esc(l.role || "") + " · " + esc(l.date || "") + "</div>" +
              "<p>" + esc(l.text || "") + "</p>");
          });
        } catch (e) { /* ignore */ }
        try {
          h += "<h4>COMPLEX TIMELINE</h4>";
          (d.timeline || []).forEach(function (t) {
            h += card("<h4>" + esc(t.era || "") + "</h4><p>" + esc(t.text || "") + "</p>");
          });
        } catch (e) { /* ignore */ }
        return h || "<p>No logs aboard.</p>";
      } catch (e) { return "<p>Codex unavailable.</p>"; }
    }

    function renderBestiary(d) {
      try {
        var h = "";
        (d.bestiary || []).forEach(function (b) {
          try {
            h += card("<h4>" + esc(b.icon || "") + " " + esc(b.name || b.id) +
              '<span class="bs2-kind">' + esc((b.kind || "").toUpperCase()) + "</span></h4>" +
              "<p><b>Behavior:</b> " + esc(b.behavior || "") + "</p>" +
              '<p class="bs2-tip"><b>Counter:</b> ' + esc(b.counter || "") + "</p>");
          } catch (e) { /* ignore one bad entry */ }
        });
        return h || "<p>No specimens catalogued.</p>";
      } catch (e) { return "<p>Codex unavailable.</p>"; }
    }

    function renderZones(d) {
      try {
        var h = "";
        (d.zones || []).forEach(function (z) {
          try {
            h += card("<h4>" + esc(z.icon || "") + " " + esc(z.name || z.id) + "</h4>" +
              "<p>" + esc(z.description || "") + "</p>" +
              '<p class="bs2-tip"><b>Tip:</b> ' + esc(z.tip || "") + "</p>");
          } catch (e) { /* ignore one bad entry */ }
        });
        return h || "<p>No zones charted.</p>";
      } catch (e) { return "<p>Codex unavailable.</p>"; }
    }

    function render() {
      try {
        if (!body) return;
        var d = lore();
        var h = "";
        try {
          if (activeTab === "logs") h = renderLogs(d);
          else if (activeTab === "bestiary") h = renderBestiary(d);
          else h = renderZones(d);
        } catch (e) { h = "<p>Codex unavailable.</p>"; }
        body.innerHTML = h;
        try {
          tabBtns.forEach(function (b) {
            try { b.classList.toggle("active", b.getAttribute("data-tab") === activeTab); } catch (e) { /* ignore */ }
          });
        } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }

    function setTab(name) {
      try {
        if (name === "logs" || name === "bestiary" || name === "zones") activeTab = name;
        render();
      } catch (e) { /* ignore */ }
    }

    function open() { try { if (panel) { render(); panel.classList.add("open"); } } catch (e) { /* ignore */ } }
    function close() { try { if (panel) panel.classList.remove("open"); } catch (e) { /* ignore */ } }
    function toggle() {
      try { if (panel) { panel.classList.contains("open") ? close() : open(); } } catch (e) { /* ignore */ }
    }

    function build() {
      try {
        injectCss();
        root = document.createElement("div");
        root.id = "bs2-codex-root";
        // Root stays pointer-events:none (CSS); children opt in individually.

        var btn = document.createElement("button");
        btn.id = "bs2-codex-btn";
        btn.type = "button";
        btn.textContent = "📖 CODEX";
        btn.title = "BS-07 Codex: logs, bestiary, zones";
        try {
          btn.addEventListener("click", function (ev) {
            try { ev.stopPropagation(); toggle(); } catch (e) { /* ignore */ }
          });
        } catch (e) { /* ignore */ }

        panel = document.createElement("div");
        panel.id = "bs2-codex-panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "BS-07 Codex");

        var head = document.createElement("div");
        head.id = "bs2-codex-head";
        try { head.innerHTML = "<b>📖 BS-07 CODEX</b><span>LORE · WORLD · FIELD GUIDE</span>"; } catch (e) { /* ignore */ }
        var x = document.createElement("button");
        x.id = "bs2-codex-x";
        x.type = "button";
        x.textContent = "✕";
        x.title = "Close codex";
        try {
          x.addEventListener("click", function (ev) {
            try { ev.stopPropagation(); close(); } catch (e) { /* ignore */ }
          });
        } catch (e) { /* ignore */ }
        try { head.appendChild(x); } catch (e) { /* ignore */ }

        var tabs = document.createElement("div");
        tabs.id = "bs2-codex-tabs";
        tabBtns = [];
        ["logs", "bestiary", "zones"].forEach(function (name) {
          try {
            var b = document.createElement("button");
            b.type = "button";
            b.setAttribute("data-tab", name);
            b.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            (function (n) {
              try {
                b.addEventListener("click", function (ev) {
                  try { ev.stopPropagation(); setTab(n); } catch (e) { /* ignore */ }
                });
              } catch (e) { /* ignore */ }
            })(name);
            tabBtns.push(b);
            try { tabs.appendChild(b); } catch (e) { /* ignore */ }
          } catch (e) { /* ignore */ }
        });

        body = document.createElement("div");
        body.id = "bs2-codex-body";

        try {
          panel.appendChild(head);
          panel.appendChild(tabs);
          panel.appendChild(body);
          root.appendChild(btn);
          root.appendChild(panel);
          (document.body || document.documentElement).appendChild(root);
        } catch (e) { /* ignore */ }
        render();
      } catch (e) { /* never break the game */ }
    }

    function ready(fn) {
      try {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function h() {
            try { document.removeEventListener("DOMContentLoaded", h); fn(); } catch (e) { /* ignore */ }
          });
        } else fn();
      } catch (e) { try { fn(); } catch (e2) { /* ignore */ } }
    }

    window.BS2Codex = { open: open, close: close, toggle: toggle };
    ready(build);
  } catch (e) { /* never break the game */ }
})();
