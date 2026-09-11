'use strict';
/* Cloud Run BYOK page. Key lives in sessionStorage only, never in URL or logs.
   A loopback-only local control plane calls Runpod, avoiding browser CORS. */
(function () {
  var LOCAL_API = 'http://127.0.0.1:42069/api/cloud';
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

  async function cloudRequest(path, options) {
    var key = getKey();
    var opts = options || {};
    var headers = Object.assign({ 'X-Runpod-Key': key }, opts.headers || {});
    var res;
    try {
      res = await fetch(LOCAL_API + path, Object.assign({}, opts, { headers: headers }));
    } catch (e) {
      throw new Error('Local VCW control plane is unavailable. Start the desktop app or run npm run start:cloud.');
    }
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.success === false) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  async function refreshCheapest() {
    var key = getKey();
    if (!key) { log('Paste your Runpod key first.'); return; }
    saveKey(key);
    log('Checking live GPU stock...');
    try {
      var data = await cloudRequest('/catalog', { method: 'GET' });
      var gpus = data.gpus || [];
      var ok = gpus.filter(function (g) {
        return g.secure === true && String(g.availability) !== 'NONE' && Number(g.memory) >= 16 && g.price && Number(g.price.secure) > 0;
      }).map(function (g) {
        return { id: g.id, memory: Number(g.memory), price: Number(g.price.secure) };
      }).sort(function (a, b) { return b.memory - a.memory || a.price - b.price; });
      if (ok.length) {
        fillGpus(ok.slice(0, 8));
        log('Best available: ' + ok[0].id + ' (' + ok[0].memory + 'GB) $' + ok[0].price + '/hr.');
      } else {
        fillGpus(FALLBACK_GPUS);
        log('No live stock matched, kept fallback order.');
      }
    } catch (e) {
      fillGpus(FALLBACK_GPUS);
      var msg = String((e && e.message) || e);
      log('Catalog check failed (' + msg.slice(0, 160) + '), kept fallback order.');
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
    var game = $('run-game').value || 'snake-canvas';
    var inputMode = $('run-input-mode').value || 'desktop';
    var videoLayout = $('run-video-layout').value || 'both';
    var controlToken = ($('run-control-token').value || '').trim();
    if (controlToken && !/^[A-Za-z0-9._~-]{24,256}$/.test(controlToken)) {
      log('Phone control token must be 24-256 URL-safe characters. Nothing launched.');
      return;
    }
    log('Launching ' + game + ' on ' + gpuId + ' with ' + MODEL_FOR(mem) + '...');
    try {
      var data = await cloudRequest('/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ('vibe-cloud-' + Date.now().toString(36)).slice(0, 48), gpuId: gpuId,
          gpuMemoryGB: mem, autoSelectGpu: true, gameId: game, openSourceGameId: game, inputMode: inputMode, videoLayout: videoLayout,
          controlToken: controlToken || undefined
        })
      });
      state.podId = data.podId;
      if (!state.podId) throw new Error('Runpod did not return a pod id');
      state.startedAt = Date.now();
      // Security: desktop URLs come back from the API (via Runpod). Only
      // https: targets may become iframe sources; anything else (including
      // javascript:/data:) falls back to the known-good proxy pattern, and
      // only for sane pod ids.
      var podOk = /^[A-Za-z0-9-]{1,64}$/.test(String(state.podId));
      var httpsUrl = function (u, fallback) {
        try {
          var parsed = new URL(String(u));
          if (parsed.protocol === 'https:') return parsed.href;
        } catch (e) {}
        return podOk ? fallback : 'about:blank';
      };
      $('run-game-view').src = httpsUrl(data.desktops && data.desktops.game, 'https://' + state.podId + '-6901.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale');
      $('run-agent-view').src = httpsUrl(data.desktops && data.desktops.agent, 'https://' + state.podId + '-6902.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale');
      if (data.gpu) { state.hourly = Number(opt.dataset.price) || state.hourly; log('Pod ' + state.podId + ' created on ' + data.gpu.id + ' (' + data.gpu.memoryGB + 'GB). Model: ' + ((data.model && data.model.tag) || MODEL_FOR(data.gpu.memoryGB)) + '.'); }
      else log('Pod ' + state.podId + ' created. Max cost $' + ((state.hourly / 3600) * MAX_SECONDS).toFixed(4) + '.');
      clearInterval(state.timer);
      state.timer = setInterval(setCost, 1000);
      setCost();
      if (data.phone && data.phone.endpoint) {
        log('Phone endpoint ready after pod boot: ' + data.phone.endpoint + '; open the phone controller and enter this endpoint plus the token you chose.');
      }
      // Hard client side auto stop at 55 minutes.
      setTimeout(function () {
        if (state.podId) stopRun('55 minute cap reached, auto stopped');
      }, MAX_SECONDS * 1000);
    } catch (e) {
      var m = String((e && e.message) || e);
      log('Launch failed (' + m.slice(0, 160) + '). Check the local control plane, key, and stock, then retry.');
    }
  }

  async function stopRun(reason) {
    var key = getKey();
    if (!state.podId) { setStatus('Idle.'); return; }
    try {
      if (key) {
        await cloudRequest('/stop', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ podId: state.podId })
        });
      }
    } catch (e) {}
    clearInterval(state.timer);
    log('Stopped pod ' + state.podId + '. ' + (reason || 'Billing ended.'));
    state.podId = null;
    state.startedAt = 0;
    $('run-game-view').src = 'about:blank';
    $('run-agent-view').src = 'about:blank';
    setCost();
    setStatus('Idle. Max 55:00. Per second billing.');
  }

  $('run-refresh').addEventListener('click', refreshCheapest);
  $('run-launch').addEventListener('click', launchRun);
  $('run-stop').addEventListener('click', function () { stopRun('Stopped by user.'); });
  $('run-forget').addEventListener('click', forgetKey);

  /* Cheap CPU-only Ubuntu desktop (remote desktop + bidirectional clipboard).
     Key stays in sessionStorage, sent only to the loopback VCW control plane. */
  var cpuState = { podId: null, hourly: 0.06, startedAt: 0 };
  var CPU_PRICES = { cpu3c: 0.06, cpu3g: 0.08, cpu5c: 0.07 };
  function cpuCost() {
    if (!cpuState.startedAt) return 'Cost: $0.0000';
    var secs = Math.min(Math.floor((Date.now() - cpuState.startedAt) / 1000), MAX_SECONDS);
    return 'Cost: $' + ((cpuState.hourly / 3600) * secs).toFixed(4) + ' (' + secs + 's, per second)';
  }
  async function launchCpuDesktop() {
    var key = getKey();
    if (!key) { log('Paste your Runpod key first.'); return; }
    saveKey(key);
    var cpuId = ($('run-cpu') && $('run-cpu').value) || 'cpu3c';
    var dc = ($('run-datacenter') && $('run-datacenter').value) || 'EU-RO-1';
    cpuState.hourly = CPU_PRICES[cpuId] || 0.06;
    log('Launching cheap CPU Ubuntu desktop on ' + cpuId + ' 2 vCPU ($' + cpuState.hourly.toFixed(2) + '/hr) in ' + dc + '...');
    try {
      var data = await cloudRequest('/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ computeType: 'CPU', cpuId: cpuId, vcpuCount: 2, dataCenterId: dc, name: ('vcw-cpu-' + Date.now().toString(36)).slice(0, 48) })
      });
      cpuState.podId = data.podId;
      if (!cpuState.podId) throw new Error('Runpod did not return a pod id');
      cpuState.startedAt = Date.now();
      var podOk = /^[A-Za-z0-9-]{1,64}$/.test(String(cpuState.podId));
      var url = (data.desktop && /^https:/.test(data.desktop)) ? data.desktop : 'https://' + cpuState.podId + '-6901.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale';
      if (!podOk) url = 'about:blank';
      $('run-cpu-view').src = url;
      $('run-cpu-status').textContent = 'CPU pod ' + cpuState.podId + ' (' + cpuId + ' 2 vCPU $' + cpuState.hourly.toFixed(2) + '/hr). ' + cpuCost() + '. Clipboard both ways via noVNC sidebar Clipboard. Max cost $' + ((cpuState.hourly / 3600) * MAX_SECONDS).toFixed(4) + '.';
      log('CPU pod ' + cpuState.podId + ' created. Desktop: ' + url);
      log('Clipboard: copy locally -> noVNC sidebar Clipboard -> Ctrl+V in pod; reverse for pod -> desktop.');
      refreshPods();
      setTimeout(function () {
        if (cpuState.podId) { log('55 minute cap reached, stop the CPU pod to end billing.'); }
      }, MAX_SECONDS * 1000);
    } catch (e) {
      log('CPU launch failed (' + String((e && e.message) || e).slice(0, 160) + '). Check the local control plane, key, and CPU stock, then retry.');
    }
  }
  async function refreshPods() {
    var key = getKey();
    if (!key) { $('run-pods').textContent = 'Paste your Runpod key first.'; return; }
    try {
      var data = await cloudRequest('/list', { method: 'GET' });
      var pods = data.pods || [];
      if (!pods.length) { $('run-pods').textContent = 'No pods running on this key. ' + cpuCost() + '.'; return; }
      $('run-pods').textContent = pods.map(function (p) { return p.id + ' [' + p.status + '] ' + (p.name || ''); }).join('\n');
    } catch (e) {
      $('run-pods').textContent = 'Pod list failed (' + String((e && e.message) || e).slice(0, 120) + ').';
    }
  }
  if ($('run-launch-cpu')) $('run-launch-cpu').addEventListener('click', launchCpuDesktop);
  if ($('run-list')) $('run-list').addEventListener('click', refreshPods);
})();
