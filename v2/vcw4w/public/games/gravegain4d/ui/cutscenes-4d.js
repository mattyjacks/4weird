/* GraveGain4D — pre-hole cutscene title cards (DS-G4D-06, lane games).
 * Additive to window.GraveGain4DUI (created by hud-4d.js; boots it if absent).
 * No game.css edits: all styling is inline + own g4d- element ids.
 * Autosave: calls window.__fourweirdRequestSave('cutscene-end') fail-open after each card.
 */
(function () {
  'use strict';

  var NS = (window.GraveGain4DUI = window.GraveGain4DUI || {});
  if (NS.__cutscenesLoaded) return;
  NS.__cutscenesLoaded = true;

  var CARD_MS = 2500;
  var active = []; // { overlay, timer }

  function requestSaveFailOpen() {
    try {
      var fn = window.__fourweirdRequestSave;
      if (typeof fn === 'function') fn('cutscene-end');
    } catch (err) {
      // fail-open: a save hook must never break the cutscene flow.
    }
  }

  function pick(v, fallback) {
    return v == null || v === '' ? fallback : v;
  }

  function buildCard(holeData) {
    holeData = holeData || {};
    var overlay = document.createElement('div');
    overlay.id = 'g4d-cutscene';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Hole title card');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '60';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(6,2,16,.88)';
    overlay.style.cursor = 'pointer';

    var card = document.createElement('div');
    card.id = 'g4d-cutscene-card';
    card.style.maxWidth = '520px';
    card.style.width = 'calc(100vw - 48px)';
    card.style.padding = '28px 30px';
    card.style.textAlign = 'center';
    card.style.color = '#efe6ff';
    card.style.fontFamily = "'Trebuchet MS',Verdana,sans-serif";
    card.style.background = 'linear-gradient(135deg,rgba(40,10,80,.95),rgba(10,30,50,.95))';
    card.style.border = '2px solid #b26bff';
    card.style.borderRadius = '14px';
    card.style.boxShadow = '0 0 32px #7b2ff7,0 0 8px #00e5ff';
    card.style.pointerEvents = 'none'; // clicks land on overlay (dismiss)

    var kicker = document.createElement('div');
    kicker.id = 'g4d-cutscene-hole';
    kicker.textContent = 'HOLE ' + pick(holeData.hole, '—');
    kicker.style.fontSize = '13px';
    kicker.style.letterSpacing = '4px';
    kicker.style.color = '#00e5ff';
    card.appendChild(kicker);

    var title = document.createElement('div');
    title.id = 'g4d-cutscene-title';
    title.textContent = pick(holeData.title, 'The Wound Opens');
    title.style.fontSize = '30px';
    title.style.fontWeight = 'bold';
    title.style.margin = '10px 0 4px';
    title.style.textShadow = '0 0 14px #b26bff';
    card.appendChild(title);

    var speaker = document.createElement('div');
    speaker.id = 'g4d-cutscene-speaker';
    speaker.textContent = '❝ ' + pick(holeData.speaker, 'Elder Mirathiel') + ' ❞';
    speaker.style.fontSize = '15px';
    speaker.style.fontStyle = 'italic';
    speaker.style.color = '#ffd97b';
    speaker.style.margin = '6px 0 12px';
    card.appendChild(speaker);

    var obj = document.createElement('div');
    obj.id = 'g4d-cutscene-objective';
    obj.textContent = 'OBJECTIVE: ' + pick(holeData.objective, 'Sink the star-ball. Mind the fold.');
    obj.style.fontSize = '15px';
    obj.style.margin = '0 0 10px';
    card.appendChild(obj);

    var flavor = document.createElement('div');
    flavor.id = 'g4d-cutscene-flavor';
    flavor.textContent = pick(
      holeData.flavor != null ? holeData.flavor : holeData.wound,
      'The Hades Array tore a W-axis wound here — the fairway folds where it should lie flat.'
    );
    flavor.style.fontSize = '13px';
    flavor.style.opacity = '0.85';
    flavor.style.lineHeight = '1.5';
    card.appendChild(flavor);

    var tap = document.createElement('div');
    tap.id = 'g4d-cutscene-tap';
    tap.textContent = '(tap to tee off)';
    tap.style.fontSize = '12px';
    tap.style.opacity = '0.6';
    tap.style.marginTop = '14px';
    card.appendChild(tap);

    overlay.appendChild(card);
    return overlay;
  }

  function dismiss(entry, reason) {
    if (!entry || entry.done) return;
    entry.done = true;
    if (entry.timer) {
      window.clearTimeout(entry.timer);
      entry.timer = 0;
    }
    if (entry.overlay && entry.overlay.parentNode) {
      entry.overlay.parentNode.removeChild(entry.overlay);
    }
    var ix = active.indexOf(entry);
    if (ix >= 0) active.splice(ix, 1);
    requestSaveFailOpen(); // autosave request after each card, fail-open
    var cb = entry.cb;
    entry.cb = null;
    if (typeof cb === 'function') {
      try {
        cb(reason || 'dismissed');
      } catch (err) {
        // fail-open: card consumer errors must not break the game.
      }
    }
  }

  // showHoleCard(holeData, cb): title-card overlay; auto-dismiss 2.5s or click.
  // holeData: { hole, title, speaker, objective, flavor|wound }
  NS.showHoleCard = function showHoleCard(holeData, cb) {
    if (typeof holeData === 'function' && cb == null) {
      cb = holeData;
      holeData = {};
    }
    var overlay = buildCard(holeData || {});
    var entry = { overlay: overlay, timer: 0, cb: typeof cb === 'function' ? cb : null, done: false };
    overlay.addEventListener('click', function () {
      dismiss(entry, 'tap');
    });
    document.body.appendChild(overlay);
    active.push(entry);
    entry.timer = window.setTimeout(function () {
      dismiss(entry, 'timeout');
    }, CARD_MS);
    return NS;
  };

  // Dismiss every open card now (each still fires its save hook + callback).
  NS.dismissAll = function dismissAll() {
    active.slice().forEach(function (entry) {
      dismiss(entry, 'dismissAll');
    });
    return NS;
  };
})();
