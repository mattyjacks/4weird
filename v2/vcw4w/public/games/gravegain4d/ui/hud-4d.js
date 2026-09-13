/* GraveGain4D — trippy 4D HUD overlay (DS-G4D-06, lane games).
 * Exposes window.GraveGain4DUI (created here, extended additively by cutscenes-4d.js).
 * No game.css edits: all styling is inline + own g4d- element ids.
 * The overlay NEVER blocks gameplay: root + backdrop are pointer-events:none,
 * only the W-slice slider and buttons re-enable pointer events.
 */
(function () {
  'use strict';

  var NS = (window.GraveGain4DUI = window.GraveGain4DUI || {});
  if (NS.__hudLoaded) return;
  NS.__hudLoaded = true;

  var state = {
    mounted: false,
    root: null,
    canvas: null,
    ctx: null,
    raf: 0,
    t: 0,
    reducedMotion: false,
    slice: 50,
    hole: 1,
    par: 3,
    strokes: 0,
    depth: 0,
    depthMax: 100,
    power: 0,
    rewindHint: '',
    sliceCb: null,
    els: {}
  };

  function el(tag, id, text) {
    var n = document.createElement(tag);
    if (id) n.id = id;
    if (text != null) n.textContent = text;
    return n;
  }

  function px44(n) {
    // Touch-friendly 44px target per DS-G4D-06.
    n.style.minHeight = '44px';
    n.style.minWidth = '44px';
    return n;
  }

  function buildBackdrop() {
    var c = el('canvas', 'g4d-hud-bg');
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.pointerEvents = 'none';
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  // Trippy folding-vector animated backdrop: layered sin-field polylines.
  // GPU-cheap by design: ~5 strokes, no shadowBlur, no gradients per frame,
  // devicePixelRatio capped at 1.5, half-rate stepping on small screens.
  function drawFrame() {
    var ctx = state.ctx;
    var c = state.canvas;
    if (!ctx || !c) return;
    var w = c.width;
    var h = c.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    var t = state.t;
    var lines = 5;
    var i, x, y;
    for (i = 0; i < lines; i += 1) {
      (function (li) {
        var hue = (265 + li * 24 + t * 18) % 360;
        ctx.beginPath();
        var step = Math.max(8, Math.floor(w / 90));
        for (x = 0; x <= w; x += step) {
          var f1 = Math.sin(x * 0.018 + t * (1.1 + li * 0.23) + li * 1.7);
          var f2 = Math.sin(x * 0.043 - t * 0.7 + li * 0.9);
          y = h * (0.5 + 0.09 * li * (li % 2 === 0 ? 1 : -1) / 2) +
            f1 * h * 0.10 + f2 * h * 0.045;
          // "Folding" crease: damp + mirror the field past a drifting vertical fold.
          var fold = w * (0.5 + 0.28 * Math.sin(t * 0.4 + li));
          if (x > fold) y = h * 0.5 - (y - h * 0.5) * 0.6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'hsla(' + hue + ',85%,62%,0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      })(i);
    }
    // W-slice marker: vertical tick showing current slice position.
    var sx = (state.slice / 100) * w;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.strokeStyle = 'hsla(180,90%,60%,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function resize() {
    var c = state.canvas;
    if (!c || !state.root) return;
    var r = state.root.getBoundingClientRect();
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.floor(r.width * dpr));
    c.height = Math.max(1, Math.floor(r.height * dpr));
    if (state.reducedMotion) drawFrame(); // single static frame
  }

  function loop() {
    if (state.reducedMotion) return;
    state.t += 0.016;
    drawFrame();
    state.raf = window.requestAnimationFrame(loop);
  }

  function fmtScore() {
    return 'HOLE ' + state.hole + '  ·  PAR ' + state.par + '  ·  STROKES ' + state.strokes;
  }

  function refresh() {
    var e = state.els;
    if (e.score) e.score.textContent = fmtScore();
    if (e.sliceVal) e.sliceVal.textContent = 'W ' + Math.round(state.slice);
    if (e.depth) e.depth.textContent = 'TIMELINE ' + Math.round(state.depth) + '/' + Math.round(state.depthMax);
    if (e.power) {
      var p = Math.max(0, Math.min(100, state.power));
      e.powerFill.style.width = p + '%';
      e.power.setAttribute('aria-valuenow', String(Math.round(p)));
    }
    if (e.rewind) e.rewind.textContent = state.rewindHint || 'REWIND: hold R / ⏪ button to fold back along W';
    if (e.slider && Number(e.slider.value) !== Math.round(state.slice)) {
      e.slider.value = String(Math.round(state.slice));
    }
    drawFrame();
  }

  NS.init = function init(opts) {
    opts = opts || {};
    if (state.mounted) {
      if (typeof opts.onSlice === 'function') state.sliceCb = opts.onSlice;
      return NS;
    }
    var root = el('div', 'g4d-hud');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '30';
    root.style.pointerEvents = 'none'; // never blocks gameplay
    root.style.fontFamily = "'Trebuchet MS',Verdana,sans-serif";
    root.style.color = '#e8dcff';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-label', 'GraveGain4D 4D HUD overlay');

    state.canvas = buildBackdrop();
    root.appendChild(state.canvas);

    // Top-left: hole/par/strokes readout.
    var score = el('div', 'g4d-score', fmtScore());
    score.style.position = 'absolute';
    score.style.top = '10px';
    score.style.left = '12px';
    score.style.fontSize = '15px';
    score.style.letterSpacing = '1px';
    score.style.textShadow = '0 0 8px #7b2ff7,0 0 2px #000';
    score.style.pointerEvents = 'none';
    root.appendChild(score);

    // Top-right: timeline depth + ghost legend.
    var tl = el('div', 'g4d-timeline');
    tl.style.position = 'absolute';
    tl.style.top = '10px';
    tl.style.right = '12px';
    tl.style.textAlign = 'right';
    tl.style.fontSize = '13px';
    tl.style.pointerEvents = 'none';
    var depth = el('div', 'g4d-depth', 'TIMELINE 0/100');
    depth.style.textShadow = '0 0 8px #00e5ff,0 0 2px #000';
    var legend = el('div', 'g4d-ghost-legend', '◌ GHOST = past-W echo   ● YOU = now-W');
    legend.style.opacity = '0.85';
    legend.style.fontSize = '12px';
    tl.appendChild(depth);
    tl.appendChild(legend);
    root.appendChild(tl);

    // Bottom bar: W-slice slider + slice value + rewind button.
    var bar = el('div', 'g4d-slicebar');
    bar.style.position = 'absolute';
    bar.style.left = '12px';
    bar.style.right = '12px';
    bar.style.bottom = '12px';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.gap = '10px';
    bar.style.pointerEvents = 'none';
    root.appendChild(bar);

    var slider = document.createElement('input');
    slider.id = 'g4d-wslice';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(state.slice);
    slider.setAttribute('aria-label', 'W slice — fold position along the fourth dimension');
    slider.style.flex = '1';
    slider.style.pointerEvents = 'auto'; // interactive exception
    slider.style.height = '44px'; // 44px touch target
    slider.style.accentColor = '#b26bff';
    slider.style.cursor = 'pointer';
    slider.addEventListener('input', function () {
      state.slice = Number(slider.value);
      refresh();
      if (state.sliceCb) state.sliceCb(state.slice);
    });
    bar.appendChild(slider);

    var sliceVal = el('div', 'g4d-sliceval', 'W 50');
    sliceVal.style.minWidth = '52px';
    sliceVal.style.textAlign = 'center';
    sliceVal.style.fontSize = '14px';
    sliceVal.style.pointerEvents = 'none';
    bar.appendChild(sliceVal);

    var rewindBtn = px44(el('button', 'g4d-rewind-btn', '⏪'));
    rewindBtn.type = 'button';
    rewindBtn.setAttribute('aria-label', 'Rewind along W timeline');
    rewindBtn.style.pointerEvents = 'auto'; // interactive exception
    rewindBtn.style.background = 'rgba(20,8,40,.75)';
    rewindBtn.style.color = '#e8dcff';
    rewindBtn.style.border = '1px solid #b26bff';
    rewindBtn.style.borderRadius = '10px';
    rewindBtn.style.fontSize = '20px';
    rewindBtn.style.cursor = 'pointer';
    rewindBtn.addEventListener('click', function () {
      if (typeof NS.onRewindRequest === 'function') NS.onRewindRequest();
      else NS.setRewindHint('REWIND folding… (hook: GraveGain4DUI.onRewindRequest)');
    });
    bar.appendChild(rewindBtn);

    // Power meter (hook: engine pushes 0..100 via setPower).
    var power = el('div', 'g4d-power');
    power.setAttribute('role', 'progressbar');
    power.setAttribute('aria-label', 'Shot power meter');
    power.setAttribute('aria-valuemin', '0');
    power.setAttribute('aria-valuemax', '100');
    power.setAttribute('aria-valuenow', '0');
    power.style.position = 'absolute';
    power.style.left = '12px';
    power.style.bottom = '68px';
    power.style.width = '180px';
    power.style.maxWidth = '40vw';
    power.style.height = '12px';
    power.style.border = '1px solid #00e5ff';
    power.style.borderRadius = '6px';
    power.style.background = 'rgba(0,20,30,.6)';
    power.style.pointerEvents = 'none';
    var fill = el('div', 'g4d-power-fill');
    fill.style.height = '100%';
    fill.style.width = '0%';
    fill.style.borderRadius = '6px';
    fill.style.background = 'linear-gradient(90deg,#00e5ff,#7b2ff7,#ff4fd8)';
    power.appendChild(fill);
    root.appendChild(power);

    // Rewind hint line.
    var rewind = el('div', 'g4d-rewind-hint', 'REWIND: hold R / ⏪ button to fold back along W');
    rewind.style.position = 'absolute';
    rewind.style.left = '12px';
    rewind.style.bottom = '88px';
    rewind.style.fontSize = '12px';
    rewind.style.opacity = '0.8';
    rewind.style.pointerEvents = 'none';
    root.appendChild(rewind);

    state.els = { score: score, depth: depth, slider: slider, sliceVal: sliceVal, power: power, powerFill: fill, rewind: rewind };
    state.root = root;
    state.ctx = state.canvas.getContext('2d');
    if (typeof opts.onSlice === 'function') state.sliceCb = opts.onSlice;

    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    state.reducedMotion = !!(mq && mq.matches);
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', function (ev) {
        state.reducedMotion = !!ev.matches;
        if (state.reducedMotion) {
          if (state.raf) window.cancelAnimationFrame(state.raf);
          state.raf = 0;
          drawFrame();
        } else if (!state.raf) {
          state.raf = window.requestAnimationFrame(loop);
        }
      });
    }

    document.body.appendChild(root);
    state.mounted = true;
    window.addEventListener('resize', resize);
    resize();
    refresh();
    if (!state.reducedMotion) state.raf = window.requestAnimationFrame(loop);
    return NS;
  };

  // ---- live-update hooks (engine calls these; all fail-open pre-mount) ----
  NS.setHole = function (hole, par) {
    if (hole != null) state.hole = Number(hole) || 1;
    if (par != null) state.par = Number(par) || 3;
    if (state.mounted) refresh();
    return NS;
  };
  NS.setStrokes = function (n) {
    state.strokes = Number(n) || 0;
    if (state.mounted) refresh();
    return NS;
  };
  NS.setSlice = function (w) {
    state.slice = Math.max(0, Math.min(100, Number(w) || 0));
    if (state.mounted) refresh();
    return NS;
  };
  NS.onSlice = function (cb) {
    state.sliceCb = typeof cb === 'function' ? cb : null;
    return NS;
  };
  NS.setTimeline = function (depth, max) {
    if (depth != null) state.depth = Number(depth) || 0;
    if (max != null) state.depthMax = Number(max) || 100;
    if (state.mounted) refresh();
    return NS;
  };
  NS.setPower = function (p) {
    state.power = Math.max(0, Math.min(100, Number(p) || 0));
    if (state.mounted) refresh();
    return NS;
  };
  NS.setRewindHint = function (text) {
    state.rewindHint = String(text == null ? '' : text);
    if (state.mounted) refresh();
    return NS;
  };
  // Optional engine hook: NS.onRewindRequest = function () {...}
  NS.onRewindRequest = null;

  NS.destroy = function () {
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
    window.removeEventListener('resize', resize);
    if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
    state.mounted = false;
    state.root = state.canvas = state.ctx = null;
    state.els = {};
    return NS;
  };
})();
