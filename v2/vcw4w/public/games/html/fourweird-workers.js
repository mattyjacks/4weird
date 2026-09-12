/* 4weird shared worker pool (v2-native, every game).
 *
 * Served at /games/html/fourweird-workers.js and injected into EVERY
 * canonical bundle by scripts/sync-game-bundles.mjs (alongside
 * runtime-bridge.js). Parity sources untouched.
 *
 * What it does: tiny FIFO pool (<=2 workers) over an inline Blob worker
 * that runs PURE-MATH tasks off the main thread: seeded RNG streams,
 * steering batches, particle integration, timing aggregation. Same
 * run(task, payload) -> Promise API with a synchronous fallback registry,
 * so callers never branch: workers accelerate when available, the game
 * stays correct when they are not (file://, CSP worker-src, no Worker).
 *
 * Never throws; no DOM/canvas/audio inside the worker; transferables only
 * as an optimization (structured clone otherwise); per-task timeout with
 * fallback. Exposes window.FourWeirdWorkers = { supported(), run(),
 * probe(), version }.
 */
(function () {
    'use strict';
    if (window.FourWeirdWorkers) return;

    var VERSION = '1.0.0';
    var MAX_WORKERS = 2;
    var DEFAULT_TIMEOUT_MS = 1500;

    // Inline worker source: pure math only. No Math.random (seeded
    // mulberry32), no DOM, no importScripts, no eval.
    var WORKER_SRC = [
        "'use strict';",
        'function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}',
        'function rngStream(seed,n){var r=mulberry32(seed>>>0);var o=new Array(n);for(var i=0;i<n;i++)o[i]=r();return o;}',
        'function steerBatch(p){var out=[];try{var es=p.enemies||[];var px=+p.px||0,py=+p.py||0;for(var i=0;i<es.length;i++){var e=es[i];var dx=px-(+e.x||0),dy=py-(+e.y||0);var d=Math.sqrt(dx*dx+dy*dy)||1;out.push({i:i,nx:dx/d,ny:dy/d,d:d});}}catch(e){}return out;}',
        'function integrate(p){var out=[];try{var ps=p.parts||[];var dt=Math.min(Math.max(+p.dt||0.016,0),0.05);for(var i=0;i<ps.length;i++){var q=ps[i];var x=(+q.x||0)+(+q.vx||0)*dt;var y=(+q.y||0)+(+q.vy||0)*dt;var vx=(+q.vx||0)*0.94,vy=(+q.vy||0)*0.94;var life=(+q.life||0)-dt;out.push({x:x,y:y,vx:vx,vy:vy,life:life});}}catch(e){}return out;}',
        'function aggregate(p){try{var s=p.samples||[];if(!s.length)return{avg:-1,n:0};var a=0;for(var i=0;i<s.length;i++)a+=+s[i]||0;a/=s.length;var pr=a>28?"potato":a>20?"balanced":a>13?"high":"ultra";return{avg:a,n:s.length,preset:pr};}catch(e){return{avg:-1,n:0};}}',
        'self.onmessage=function(ev){var m=ev.data||{};var id=m.id;var task=String(m.task||"");var payload=m.payload||{};var result=null;try{if(task==="rng-stream"){result=rngStream(payload.seed|0,Math.min(Math.max(payload.n|0,0),100000));}else if(task==="ai-steer"){result=steerBatch(payload);}else if(task==="particle-integrate"){result=integrate(payload);}else if(task==="timing-aggregate"){result=aggregate(payload);}else{result={error:"unknown-task:"+task};}self.postMessage({id:id,ok:true,result:result});}catch(err){try{self.postMessage({id:id,ok:false,error:String((err&&err.message)||err)});}catch(e){}}};'
    ].join('\n');

    // Synchronous fallback registry: identical semantics, main thread.
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var FALLBACK = {
        'rng-stream': function (p) {
            var r = mulberry32((p.seed | 0) >>> 0);
            var n = Math.min(Math.max(p.n | 0, 0), 100000);
            var o = new Array(n);
            for (var i = 0; i < n; i++) o[i] = r();
            return o;
        },
        'ai-steer': function (p) {
            var out = [];
            var es = p.enemies || [];
            var px = +p.px || 0, py = +p.py || 0;
            for (var i = 0; i < es.length; i++) {
                var dx = px - (+es[i].x || 0), dy = py - (+es[i].y || 0);
                var d = Math.sqrt(dx * dx + dy * dy) || 1;
                out.push({ i: i, nx: dx / d, ny: dy / d, d: d });
            }
            return out;
        },
        'particle-integrate': function (p) {
            var out = [];
            var ps = p.parts || [];
            var dt = Math.min(Math.max(+p.dt || 0.016, 0), 0.05);
            for (var i = 0; i < ps.length; i++) {
                var q = ps[i];
                out.push({
                    x: (+q.x || 0) + (+q.vx || 0) * dt,
                    y: (+q.y || 0) + (+q.vy || 0) * dt,
                    vx: (+q.vx || 0) * 0.94,
                    vy: (+q.vy || 0) * 0.94,
                    life: (+q.life || 0) - dt
                });
            }
            return out;
        },
        'timing-aggregate': function (p) {
            var s = p.samples || [];
            if (!s.length) return { avg: -1, n: 0 };
            var a = 0;
            for (var i = 0; i < s.length; i++) a += +s[i] || 0;
            a /= s.length;
            return { avg: a, n: s.length, preset: a > 28 ? 'potato' : a > 20 ? 'balanced' : a > 13 ? 'high' : 'ultra' };
        }
    };

    var pool = [];
    var seq = 0;
    var pending = {};
    var workerOK = null;

    function detectSupport() {
        if (workerOK !== null) return workerOK;
        try {
            if (typeof Worker === 'undefined') { workerOK = false; return false; }
            if (typeof Blob === 'undefined' || !URL || typeof URL.createObjectURL !== 'function') {
                workerOK = false; return false;
            }
            // ?workers=0 kill-switch for debugging / restrictive embeds.
            try {
                if (new URLSearchParams(window.location.search).get('workers') === '0') {
                    workerOK = false; return false;
                }
            } catch (e) { /* ignore */ }
            workerOK = true;
            return true;
        } catch (e) { workerOK = false; return false; }
    }

    function makeWorker() {
        var blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var w = new Worker(url);
        w.onmessage = function (ev) {
            try {
                var m = ev.data || {};
                var slot = pending[m.id];
                if (!slot) return;
                delete pending[m.id];
                try { clearTimeout(slot.timer); } catch (e) { /* ignore */ }
                // Return worker to the idle pool.
                try { pool.push(slot.worker); } catch (e) { /* ignore */ }
                pump();
                if (m.ok) slot.resolve(m.result);
                else slot.reject(new Error(String(m.error || 'worker-error')));
            } catch (e) { /* ignore */ }
        };
        w.onerror = function () {
            try {
                // Fail open: flush this worker's in-flight task to fallback.
                for (var id in pending) {
                    if (pending[id] && pending[id].worker === w) {
                        (function (slotId) {
                            var slot = pending[slotId];
                            delete pending[slotId];
                            try { clearTimeout(slot.timer); } catch (e) { /* ignore */ }
                            fallbackRun(slot.task, slot.payload).then(slot.resolve, slot.reject);
                        })(id);
                        break;
                    }
                }
            } catch (e) { /* ignore */ }
            try { w.terminate(); } catch (e) { /* ignore */ }
            workerOK = false;
        };
        return w;
    }

    var queue = [];

    function pump() {
        try {
            while (queue.length && pool.length) {
                var job = queue.shift();
                var w = pool.pop();
                job(w);
            }
        } catch (e) { /* ignore */ }
    }

    function fallbackRun(task, payload) {
        return new Promise(function (resolve, reject) {
            try {
                var fn = FALLBACK[task];
                if (!fn) { reject(new Error('unknown-task:' + task)); return; }
                resolve(fn(payload || {}));
            } catch (e) { reject(e); }
        });
    }

    function run(task, payload, opts) {
        var timeout = DEFAULT_TIMEOUT_MS;
        try {
            if (opts && typeof opts.timeout === 'number') {
                timeout = Math.min(Math.max(opts.timeout, 100), 10000);
            }
        } catch (e) { /* ignore */ }
        task = String(task || '');
        payload = payload || {};
        if (!detectSupport()) return fallbackRun(task, payload);
        return new Promise(function (resolve, reject) {
            var id = 'fw' + (++seq) + '_' + Date.now();
            var settled = false;
            function done(fn, v) {
                if (settled) return;
                settled = true;
                try { fn(v); } catch (e) { /* ignore */ }
            }
            var timer = setTimeout(function () {
                try { delete pending[id]; } catch (e) { /* ignore */ }
                // Timeout: answer from the main-thread fallback, keep going.
                fallbackRun(task, payload).then(
                    function (v) { done(resolve, v); },
                    function (e) { done(reject, e); }
                );
            }, timeout);
            pending[id] = { resolve: function (v) { done(resolve, v); }, reject: function (e) { done(reject, e); }, timer: timer, task: task, payload: payload, worker: null };
            queue.push(function (w) {
                try {
                    pending[id].worker = w;
                    w.postMessage({ id: id, task: task, payload: payload });
                } catch (e) {
                    try { delete pending[id]; } catch (ignored) { /* ignore */ }
                    try { clearTimeout(timer); } catch (ignored2) { /* ignore */ }
                    try { pool.push(w); } catch (ignored3) { /* ignore */ }
                    fallbackRun(task, payload).then(
                        function (v) { done(resolve, v); },
                        function (err) { done(reject, err); }
                    );
                }
            });
            // Grow the pool lazily (<=MAX_WORKERS), degrade to fallback on error.
            try {
                var want = 1;
                try {
                    var cores = window.navigator && window.navigator.hardwareConcurrency;
                    if (typeof cores === 'number' && cores >= 4) want = Math.min(MAX_WORKERS, 2);
                } catch (e) { /* ignore */ }
                var live = pool.length + Object.keys(pending).length;
                if (live < want) pool.push(makeWorker());
            } catch (e) {
                // Construction failed (CSP/file://): answer via fallback.
                queue.pop();
                try { delete pending[id]; } catch (ignored) { /* ignore */ }
                try { clearTimeout(timer); } catch (ignored2) { /* ignore */ }
                workerOK = false;
                fallbackRun(task, payload).then(
                    function (v) { done(resolve, v); },
                    function (err) { done(reject, err); }
                );
                return;
            }
            pump();
        });
    }

    // probe(): one rAF frame-time sample aggregated off-thread when
    // possible; used by the play shell / perf manager to compare worker vs
    // sync paths. Never throws, always resolves.
    function probe() {
        return new Promise(function (resolve) {
            try {
                var samples = [];
                var frames = 0;
                var first = -1, last = -1;
                var now = (typeof performance !== 'undefined' && performance.now)
                    ? function () { return performance.now(); } : function () { return Date.now(); };
                var raf = (typeof window.requestAnimationFrame === 'function')
                    ? function (fn) { window.requestAnimationFrame(fn); }
                    : function (fn) { setTimeout(fn, 16); };
                (function tick() {
                    try {
                        var t = now();
                        if (first < 0) first = t;
                        if (last >= 0) samples.push(Math.min(Math.max(t - last, 0), 100));
                        last = t;
                        frames += 1;
                        if (frames >= 12) {
                            run('timing-aggregate', { samples: samples }, { timeout: 800 }).then(
                                function (r) { resolve({ supported: detectSupport(), frames: frames, agg: r }); },
                                function () { resolve({ supported: false, frames: frames, agg: { avg: -1, n: samples.length } }); }
                            );
                            return;
                        }
                        raf(tick);
                    } catch (e) { resolve({ supported: false, frames: frames, agg: { avg: -1, n: samples.length } }); }
                })();
            } catch (e) { resolve({ supported: false, frames: 0, agg: { avg: -1, n: 0 } }); }
        });
    }

    try {
        window.FourWeirdWorkers = {
            version: VERSION,
            supported: detectSupport,
            run: run,
            probe: probe
        };
    } catch (e) { /* window unwritable */ }
})();
