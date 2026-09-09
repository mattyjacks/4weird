'use strict';
/* Cloud Run BYOK page. Key lives in sessionStorage only, never in URL or logs.
   Browser calls api.runpod.io directly so the key never touches 4weird servers. */
(function () {
  var BASE = 'https://api.runpod.io/v2';
  var MAX_SECONDS = 55 * 60;
  var state = { podId: null, hourly: 0, startedAt: 0, timer: null, key: null };

  var $ = function (id) { return document.getElementById(id); };
  function log(msg) {
    var el = $('run-log');
    el.textContent += '[' + new Date().toISOString().slice(11, 19) + '] ' + msg + '\n';
    el.scrollTop = el.scrollHeight;
  }
  function setStatus(msg) { $('run-status').textContent = msg; }
  function setCost() {
    if (!state.startedAt) { $('run-cost').textContent = 'Cost: $0.0000'; return; }
    var secs = Math.min(Math.floor((Date.now() - state.startedAt) / 1000), MAX_SECONDS);
    var cost = (state.hourly / 3600) * secs;
    var left = MAX_SECONDS - secs;
    var mm = String(Math.floor(left / 60)).padStart(2, '0');
    var ss = String(left % 60).padStart(2, '0');
    $('run-cost').textContent = 'Cost: $' + cost.toFixed(4) + ' (' + secs + 's, per second)';
    setStatus('Running pod ' + state.podId + '. Auto stop in ' + mm + ':' + ss + '.');
    if (left <= 0) stopRun('55 minute cap reached, auto stopped');
  }

  function getKey() {
    var v = ($('run-key').value || '').trim();
    if (v) return v;
    return state.key || sessionStorage.getItem('vibe_runpod_key') || '';
  }
  function saveKey(k) {
    state.key = k;
    try { sessionStorage.setItem('vibe_runpod_key', k); } catch (e) {}
  }
  function forgetKey() {
    state.key = null;
    $('run-key').value = '';
    try { sessionStorage.removeItem('vibe_runpod_key'); } catch (e) {}
    log('Key forgotten for this tab.');
  }

  var FALLBACK_GPUS = [
    { id: 'NVIDIA RTX 2000 Ada Generation', memory: 16, price: 0.24 },
    { id: 'NVIDIA RTX A4000', memory: 16, price: 0.25 },
    { id: 'NVIDIA GeForce RTX 4090', memory: 24, price: 0.74 },
    { id: 'NVIDIA A40', memory: 48, price: 0.49 }
  ];
  var MODEL_FOR = function (mem) {
    if (mem >= 80) return 'qwen2.5vl:72b';
    if (mem >= 40) return 'qwen2.5vl:32b';
    if (mem >= 24) return 'qwen2.5vl:14b';
    if (mem >= 16) return 'qwen2.5vl:7b';
    return 'qwen2.5vl:3b';
  };

  function fillGpus(list) {
    var sel = $('run-gpu');
    sel.innerHTML = '';
    list.forEach(function (g) {
      var o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.id + ' ' + g.memory + 'GB $' + g.price + '/hr';
      o.dataset.memory = g.memory;
      o.dataset.price = g.price;
      sel.appendChild(o);
    });
  }
  fillGpus(FALLBACK_GPUS);

  async function refreshCheapest() {
    var key = getKey();
    if (!key) { log('Paste your Runpod key first.'); return; }
    saveKey(key);
    log('Checking live GPU stock...');
    try {
      var res = await fetch(BASE + '/catalog/gpus?include=AVAILABILITY&product=POD', {
        headers: { Authorization: 'Bearer ' + key }
      });
      if (!res.ok) {
        var t = '';
        try { t = (await res.text()).slice(0, 160); } catch (e) {}
        throw new Error('HTTP ' + res.status + (t ? ' ' + t : ''));
      }
      var data = await res.json();
      var gpus = data.gpus || data || [];
      var ok = gpus.filter(function (g) {
        return g.secure === true && String(g.availability) !== 'NONE' && Number(g.memory) >= 16 && g.price && Number(g.price.secure) > 0;
      }).map(function (g) {
        return { id: g.id, memory: Number(g.memory), price: Number(g.price.secure) };
      }).sort(function (a, b) { return a.price - b.price; });
      if (ok.length) {
        fillGpus(ok.slice(0, 8));
        log('Cheapest available: ' + ok[0].id + ' $' + ok[0].price + '/hr.');
      } else {
        fillGpus(FALLBACK_GPUS);
        log('No live stock matched, kept fallback order.');
      }
    } catch (e) {
      fillGpus(FALLBACK_GPUS);
      var msg = String((e && e.message) || e);
      if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('TypeError') !== -1) {
        log('Catalog blocked by browser CORS. Use the desktop app proxy (npm run start:cloud) or try again.');
      } else {
        log('Catalog check failed (' + msg.slice(0, 120) + '), kept fallback order.');
      }
    }
  }

  async function launchRun() {
    var key = getKey();
    if (!key) { log('Paste your Runpod key first.'); return; }
    saveKey(key);
    var sel = $('run-gpu');
    var opt = sel.options[sel.selectedIndex];
    var gpuId = sel.value;
    var mem = Number(opt.dataset.memory) || 16;
    state.hourly = Number(opt.dataset.price) || 0;
    var game = $('run-game').value || 'gravegain3d';
    log('Launching ' + game + ' on ' + gpuId + ' with ' + MODEL_FOR(mem) + '...');
    try {
      var res = await fetch(BASE + '/pods', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ('vibe-cloud-' + Date.now().toString(36)).slice(0, 48),
          image: 'runpod/pytorch:2.4.0-py11-cuda12.4.1-devel-ubuntu22.04',
          gpu: { id: gpuId, count: 1 },
          ports: ['8888/http', '42069/http'],
          disk: 40,
          env: { VIBE_GAME: game, VIBE_MODEL: MODEL_FOR(mem), VIBE_MAX_MINUTES: '55', VIBE_MODE: 'cloud-game-plus-model' }
        })
      });
      if (!res.ok) {
        var err = '';
        try { err = (await res.text()).slice(0, 200); } catch (e2) {}
        throw new Error('HTTP ' + res.status + (err ? ' ' + err : ''));
      }
      var data = await res.json();
      var pod = data.pod || data;
      state.podId = pod.id || pod.podId;
      state.startedAt = Date.now();
      $('run-view').src = 'https://' + state.podId + '-8888.proxy.runpod.net';
      log('Pod ' + state.podId + ' created. Max cost $' + ((state.hourly / 3600) * MAX_SECONDS).toFixed(4) + '.');
      clearInterval(state.timer);
      state.timer = setInterval(setCost, 1000);
      setCost();
      // Hard client side auto stop at 55 minutes.
      setTimeout(function () {
        if (state.podId) stopRun('55 minute cap reached, auto stopped');
      }, MAX_SECONDS * 1000);
    } catch (e) {
      var m = String((e && e.message) || e);
      if (m.indexOf('Failed to fetch') !== -1) {
        log('Launch blocked by browser CORS. Run the desktop app proxy: npm run start:cloud, then use the desktop Cloud panel.');
      } else {
        log('Launch failed (' + m.slice(0, 160) + '). Check key and stock, then retry.');
      }
    }
  }

  async function stopRun(reason) {
    var key = getKey();
    if (!state.podId) { setStatus('Idle.'); return; }
    try {
      if (key) {
        await fetch(BASE + '/pods/' + encodeURIComponent(state.podId), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + key }
        });
      }
    } catch (e) {}
    clearInterval(state.timer);
    log('Stopped pod ' + state.podId + '. ' + (reason || 'Billing ended.'));
    state.podId = null;
    state.startedAt = 0;
    $('run-view').src = 'about:blank';
    setCost();
    setStatus('Idle. Max 55:00. Per second billing.');
  }

  $('run-refresh').addEventListener('click', refreshCheapest);
  $('run-launch').addEventListener('click', launchRun);
  $('run-stop').addEventListener('click', function () { stopRun('Stopped by user.'); });
  $('run-forget').addEventListener('click', forgetKey);
  window.addEventListener('beforeunload', function () {
    if (state.podId && state.key) {
      try {
        navigator.sendBeacon(BASE + '/pods/' + encodeURIComponent(state.podId) + '?_method=DELETE', '');
      } catch (e) {}
    }
  });
})();
