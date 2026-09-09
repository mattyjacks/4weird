/* Shared VibeCodeWorker header for every /vcw page.
   Usage: <body data-vcw="run"> (or overview, full) + <script src="vcw-nav.js"></script>
   Highlights the active page and gives a one-click Run/Full mode switch. */
(function () {
  'use strict';
  var active = (document.body && document.body.dataset.vcw) || '';
  var link = function (href, label, key, ext) {
    var cls = key === active ? ' class="active"' : '';
    var target = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    var extCls = ext ? ' ext' : '';
    if (cls) cls = ' class="active' + extCls + '"';
    else if (ext) cls = ' class="ext"';
    return '<a href="' + href + '"' + cls + target + '>' + label + '</a>';
  };
  var mode = function (href, label, key) {
    return '<a href="' + href + '"' + (key === active ? ' class="active"' : '') + '>' + label + '</a>';
  };
  var bar = document.createElement('div');
  bar.className = 'vcw-nav';
  bar.innerHTML =
    '<a class="vcw-brand" href="overview.html">4WEIRD <b>/ VIBECODEWORKER</b></a>' +
    '<div class="vcw-links">' +
    link('overview.html', 'Overview', 'overview') +
    link('run.html', 'Cloud Run', 'run') +
    link('full.html', 'Full Web', 'full') +
    link('hub.html', 'Workspace', 'hub') +
    link('docs/index.html', 'Docs', 'docs') +
    link('https://github.com/mattyjacks/4weird', 'GitHub', '', true) +
    '</div>' +
    '<div class="vcw-mode">' +
    mode('run.html', 'Run', 'run') +
    mode('full.html', 'Full', 'full') +
    '</div>';
  document.body.insertBefore(bar, document.body.firstChild);
  var rule = document.createElement('hr');
  rule.className = 'vcw-rule';
  bar.after(rule);
})();
