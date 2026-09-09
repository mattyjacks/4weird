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
    '<a class="vcw-brand" href="/vcw/">4WEIRD <b>/ VIBECODEWORKER</b></a>' +
    '<div class="vcw-links">' +
    link('/vcw/', 'Overview', 'overview') +
    link('/vcw/web/run/', 'Cloud Run', 'run') +
    link('/vcw/web/full/', 'Full Web', 'full') +
    link('/vcw/web/hub/', 'Workspace', 'hub') +
    link('/vcw/desktop/', 'Desktop', 'desktop') +
    link('/vcw/agent/', 'Agent API', 'agent') +
    link('https://github.com/mattyjacks/4weird', 'GitHub', '', true) +
    '</div>' +
    '<div class="vcw-mode">' +
    mode('/vcw/web/run/', 'Run', 'run') +
    mode('/vcw/web/full/', 'Full', 'full') +
    '</div>';
  document.body.insertBefore(bar, document.body.firstChild);
  var rule = document.createElement('hr');
  rule.className = 'vcw-rule';
  bar.after(rule);
})();
