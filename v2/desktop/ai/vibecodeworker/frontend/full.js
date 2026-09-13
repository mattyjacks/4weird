/* Full web version: downloads the whole /ai source fresh on every load,
   then browses it locally in the browser. Same-origin first (the /ai folder
   ships with this site), GitHub raw as fallback. */
(function () {
  'use strict';
  var MANIFEST_URL = '/ai/manifest.json';
  var LOCAL_BASE = '/ai/';
  var GH_BASE = 'https://raw.githubusercontent.com/mattyjacks/4weird/main/website/v1/ai/';
  var texts = {};
  var current = '';

  function $(id) { return document.getElementById(id); }
  function log(msg) {
    var el = $('full-log');
    el.textContent += msg + '\n';
  }
  function setStatus(msg) { $('full-status').textContent = msg; }
  function setBar(done, total) {
    document.querySelector('#full-bar i').style.width = total ? (Math.round(done / total * 100) + '%') : '0';
  }
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function fetchText(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }

  async function loadAll() {
    texts = {};
    current = '';
    $('full-tree').innerHTML = '';
    $('full-view').textContent = 'Loading...';
    $('full-hits').innerHTML = '';
    setBar(0, 1);
    var bust = '?t=' + Date.now();
    var manifest;
    try {
      manifest = JSON.parse(await fetchText(MANIFEST_URL + bust));
    } catch (e) {
      setStatus('Could not load the file manifest: ' + e.message);
      return;
    }
    var files = manifest.files || [];
    var fromGithub = 0;
    setStatus('Downloading ' + files.length + ' files...');
    var done = 0;
    // Small batches so progress paints and slow files do not block the rest.
    var BATCH = 8;
    for (var i = 0; i < files.length; i += BATCH) {
      var batch = files.slice(i, i + BATCH);
      await Promise.all(batch.map(async function (f) {
        try {
          texts[f.path] = await fetchText(LOCAL_BASE + f.path + bust);
        } catch (e1) {
          try {
            texts[f.path] = await fetchText(GH_BASE + f.path);
            fromGithub++;
          } catch (e2) {
            texts[f.path] = null;
            log('Missed ' + f.path + ' (' + e2.message + ')');
          }
        }
        done++;
        setBar(done, files.length);
      }));
      setStatus('Downloading ' + done + ' / ' + files.length + ' files...');
    }
    var got = Object.keys(texts).filter(function (k) { return texts[k] !== null; }).length;
    var kb = Math.round((manifest.bytes || 0) / 1024);
    $('full-meta').textContent = got + ' / ' + files.length + ' files live (' + kb + 'KB manifest size)' +
      (fromGithub ? ', ' + fromGithub + ' via GitHub fallback' : ', all from this site');
    setStatus(got === files.length ? 'All files loaded fresh. Pick one on the left.' : 'Loaded with ' + (files.length - got) + ' misses (see log).');
    log('Loaded ' + got + '/' + files.length + ' files at ' + new Date().toISOString());
    renderTree('');
    var first = files.length ? files[0].path : '';
    if (first && texts[first] !== null) showFile(first);
  }

  function renderTree(filter) {
    var tree = $('full-tree');
    tree.innerHTML = '';
    var q = (filter || '').toLowerCase();
    var groups = {};
    Object.keys(texts).forEach(function (p) {
      if (texts[p] === null) return;
      if (q && p.toLowerCase().indexOf(q) === -1) return;
      var parts = p.split('/');
      var dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
      (groups[dir] = groups[dir] || []).push(p);
    });
    var dirs = Object.keys(groups).sort();
    if (!dirs.length) {
      tree.textContent = 'No files match.';
      return;
    }
    dirs.forEach(function (d) {
      var h = document.createElement('div');
      h.className = 'dir';
      h.textContent = d + ' (' + groups[d].length + ')';
      tree.appendChild(h);
      groups[d].sort().forEach(function (p) {
        var b = document.createElement('button');
        b.textContent = p.split('/').pop();
        b.title = p;
        if (p === current) b.className = 'active';
        b.addEventListener('click', function () { showFile(p); });
        tree.appendChild(b);
      });
    });
  }

  function showFile(p) {
    current = p;
    var src = texts[p];
    $('full-title').textContent = p;
    if (src === null || src === undefined) {
      $('full-view').textContent = 'File did not download. See log.';
      return;
    }
    var lines = src.split('\n');
    var numbered = lines.map(function (ln, i) {
      return String(i + 1).padStart(5, ' ') + '  ' + ln;
    }).join('\n');
    $('full-view').innerHTML = esc(numbered);
    $('full-raw').href = LOCAL_BASE + p;
    var act = document.querySelectorAll('#full-tree button.active');
    for (var i = 0; i < act.length; i++) act[i].className = '';
    var btns = document.querySelectorAll('#full-tree button');
    for (var j = 0; j < btns.length; j++) {
      if (btns[j].title === p) { btns[j].className = 'active'; break; }
    }
  }

  function searchContents() {
    var q = ($('full-q').value || '').trim().toLowerCase();
    var box = $('full-hits');
    box.innerHTML = '';
    if (q.length < 3) {
      box.textContent = 'Type at least 3 characters to search contents (shorter text filters file names live).';
      return;
    }
    var hits = [];
    Object.keys(texts).forEach(function (p) {
      var src = texts[p];
      if (!src) return;
      var idx = src.toLowerCase().indexOf(q);
      if (idx !== -1) {
        var lineNo = src.slice(0, idx).split('\n').length;
        hits.push({ path: p, line: lineNo });
      }
    });
    if (!hits.length) {
      box.textContent = 'No content matches for "' + q + '".';
      return;
    }
    box.textContent = hits.length + ' file(s) contain "' + q + '":';
    hits.slice(0, 50).forEach(function (h) {
      var b = document.createElement('button');
      b.textContent = h.path + ' (line ' + h.line + ')';
      b.addEventListener('click', function () { showFile(h.path); });
      box.appendChild(b);
    });
    if (hits.length > 50) {
      var more = document.createElement('div');
      more.textContent = '...and ' + (hits.length - 50) + ' more. Refine the query.';
      box.appendChild(more);
    }
  }

  $('full-reload').addEventListener('click', loadAll);
  $('full-q').addEventListener('input', function () { renderTree($('full-q').value); });
  $('full-search').addEventListener('click', searchContents);
  $('full-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') searchContents(); });
  $('full-copy').addEventListener('click', function () {
    if (!current || texts[current] == null) return;
    navigator.clipboard.writeText(texts[current]).then(function () {
      setStatus('Copied ' + current + ' (' + texts[current].length + ' chars).');
    });
  });

  loadAll();
})();
