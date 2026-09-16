import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  alternates: { canonical: "/search" },
  title: "Search | 4weird",
  description:
    "Search 4weird games, docs, music, servers and clans. Results pages are shareable — copy the URL with ?q= to send anyone the same search.",
};

// Client island as an inline progressive-enhancement script: this envelope
// owns ONLY app/search/page.tsx (no sibling *-client.tsx), so the
// client-side fetch to GET /api/search lives here instead of in a separate
// client component. Fail-open: any error leaves the server-rendered hint
// state in place. No imports from sibling builders.
//
// Spotlight bar (48px): filter pills ride as leading chips inside the same
// 1-row bar as the input + submit. Typing debounces ~150ms into a live
// fetch with history.replaceState (no reload); Enter / Search submits the
// GET form so ?q= + &f= round-trip the same shareable view. Results render
// as compact 40px keyboard-navigable rows (ArrowUp/Down + Enter).
const SEARCH_SCRIPT = [
  "(function () {",
  "  try {",
  "    var params = new URLSearchParams(window.location.search);",
  "    var q = (params.get('q') || '').trim();",
  "    var f = (params.get('f') || 'all').toLowerCase();",
  "    var box = document.getElementById('search-results');",
  "    var input = document.getElementById('search-q');",
  "    var pills = document.querySelectorAll('[data-search-filter]');",
  "    if (!box) return;",
  "    if (input && q) input.value = q;",
  "    var activeIdx = -1;",
  "    var rows = [];",
  "    function kindOf(item) {",
  "      return String(item.kind || item.type || 'result').toLowerCase();",
  "    }",
  "    function matchKind(kind) {",
  "      if (f === 'all') return true;",
  "      if (f === 'docs') return kind.indexOf('doc') !== -1 || kind.indexOf('music') !== -1;",
  "      return kind.indexOf(f.slice(0, 4)) !== -1;",
  "    }",
  "    function paintPills() {",
  "      for (var p = 0; p < pills.length; p++) {",
  "        var on = String(pills[p].getAttribute('data-search-filter') || '').toLowerCase() === f;",
  "        pills[p].setAttribute('aria-pressed', on ? 'true' : 'false');",
  "        pills[p].className = 'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ' + (on",
  "          ? 'border-cyan-300 bg-cyan-400 text-slate-950'",
  "          : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/50');",
  "      }",
  "    }",
  "    paintPills();",
  "    for (var p = 0; p < pills.length; p++) {",
  "      (function (el) {",
  "        el.addEventListener('click', function () {",
  "          var nf = String(el.getAttribute('data-search-filter') || 'all').toLowerCase();",
  "          var nq = (document.getElementById('search-q') || {}).value || q || '';",
  "          var url = '/search?q=' + encodeURIComponent(nq.trim()) + (nf !== 'all' ? '&f=' + encodeURIComponent(nf) : '');",
  "          window.location.href = url;",
  "        });",
  "      })(pills[p]);",
  "    }",
  "    function esc(s) {",
  "      return String(s).replace(/[&<>\"']/g, function (c) {",
  "        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c];",
  "      });",
  "    }",
  "    function hintHtml(msg) {",
  "      return '<p role=\"status\" class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">' + msg + '</p>';",
  "    }",
  "    function setActive(i) {",
  "      activeIdx = i;",
  "      for (var r = 0; r < rows.length; r++) {",
  "        var on = r === i;",
  "        rows[r].setAttribute('aria-selected', on ? 'true' : 'false');",
  "        var cls = rows[r].className.replace('border-cyan-300 bg-cyan-400/10', 'border-white/10').replace('  ', ' ');",
  "        rows[r].className = on ? cls.replace('border-white/10', 'border-cyan-300 bg-cyan-400/10') : cls;",
  "      }",
  "      if (input) {",
  "        if (i >= 0 && rows[i]) input.setAttribute('aria-activedescendant', rows[i].id);",
  "        else input.removeAttribute('aria-activedescendant');",
  "      }",
  "    }",
  "    function render(items, query) {",
  "      if (items.length === 0) {",
  "        rows = [];",
  "        box.innerHTML = hintHtml('No results for &ldquo;' + esc(query) + '&rdquo; yet &mdash; try another spelling.');",
  "        return;",
  "      }",
  "      var html = '<ul class=\"grid gap-1\">';",
  "      for (var i = 0; i < items.length; i++) {",
  "        var item = items[i] || {};",
  "        var title = esc(item.title || item.name || 'Untitled');",
  "        var href = esc(item.href || item.url || ('/search?q=' + encodeURIComponent(query)));",
  "        var kind = esc(item.kind || 'result');",
  "        html += '<li role=\"option\" aria-selected=\"false\" id=\"search-row-' + i + '\" data-search-row=\"' + i + '\" class=\"flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-2.5 text-sm hover:border-cyan-300/50\">' + '<span class=\"shrink-0 rounded-full border border-cyan-300/40 px-1.5 py-px text-[10px] font-bold uppercase tracking-widest text-cyan-300\">' + kind + '</span>' + '<a class=\"min-w-0 flex-1 truncate text-slate-100 hover:text-cyan-300\" href=\"' + href + '\" tabindex=\"-1\">' + title + '</a>' + '<span aria-hidden=\"true\" class=\"shrink-0 text-slate-500\">&rsaquo;</span></li>';",
  "      }",
  "      html += '</ul>';",
  "      box.innerHTML = html;",
  "      var found = box.querySelectorAll('[data-search-row]');",
  "      rows = [];",
  "      for (var j = 0; j < found.length; j++) {",
  "        (function (el, idx) {",
  "          rows.push(el);",
  "          el.addEventListener('mouseenter', function () { setActive(idx); });",
  "          el.addEventListener('click', function (ev) {",
  "            var a = el.querySelector('a');",
  "            if (a && ev.target !== a) window.location.href = a.getAttribute('href');",
  "          });",
  "        })(found[j], j);",
  "      }",
  "      setActive(-1);",
  "    }",
  "    function fetchLive(query) {",
  "      rows = [];",
  "      setActive(-1);",
  "      if (!query) {",
  "        box.innerHTML = hintHtml('Type above &mdash; results filter live here and the URL stays shareable.');",
  "        return;",
  "      }",
  "      box.innerHTML = hintHtml('Searching for &ldquo;' + esc(query) + '&rdquo;&hellip;');",
  "      fetch('/api/search?q=' + encodeURIComponent(query), { headers: { accept: 'application/json' } })",
  "        .then(function (res) {",
  "          if (!res.ok) throw new Error('search unavailable');",
  "          return res.json();",
  "        })",
  "        .then(function (data) {",
  "          var items = data && Array.isArray(data.results) ? data.results : [];",
  "          items = items.filter(function (it) { return matchKind(kindOf(it || {})); });",
  "          render(items, query);",
  "        })",
  "        .catch(function () {",
  "          rows = [];",
  "          box.innerHTML = hintHtml('Search is unavailable right now &mdash; press Search to retry with a shareable URL.');",
  "        });",
  "    }",
  "    var deb = null;",
  "    if (input) {",
  "      input.setAttribute('role', 'combobox');",
  "      input.setAttribute('aria-controls', 'search-results');",
  "      input.setAttribute('aria-autocomplete', 'list');",
  "      input.setAttribute('aria-expanded', 'true');",
  "      input.addEventListener('input', function () {",
  "        if (deb) clearTimeout(deb);",
  "        deb = setTimeout(function () {",
  "          var nq = input.value.trim();",
  "          try {",
  "            var u = '/search?q=' + encodeURIComponent(nq) + (f !== 'all' ? '&f=' + encodeURIComponent(f) : '');",
  "            window.history.replaceState(null, '', nq ? u : '/search');",
  "          } catch (e) {}",
  "          fetchLive(nq);",
  "        }, 150);",
  "      });",
  "      input.addEventListener('keydown', function (ev) {",
  "        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {",
  "          if (!rows.length) return;",
  "          ev.preventDefault();",
  "          var next = ev.key === 'ArrowDown' ? activeIdx + 1 : activeIdx - 1;",
  "          if (next >= rows.length) next = 0;",
  "          if (next < 0) next = rows.length - 1;",
  "          setActive(next);",
  "        } else if (ev.key === 'Enter' && activeIdx >= 0 && rows[activeIdx]) {",
  "          var a = rows[activeIdx].querySelector('a');",
  "          if (a) { ev.preventDefault(); window.location.href = a.getAttribute('href'); }",
  "        } else if (ev.key === 'Escape') {",
  "          setActive(-1);",
  "        }",
  "      });",
  "    }",
  "    document.addEventListener('keydown', function (ev) {",
  "      var mod = ev.metaKey || ev.ctrlKey;",
  "      if (mod && String(ev.key || '').toLowerCase() === 'k') { ev.preventDefault(); if (input) input.focus(); }",
  "      else if (ev.key === '/' && document.activeElement !== input) { ev.preventDefault(); if (input) input.focus(); }",
  "    });",
  "    if (!q) {",
  "      box.innerHTML = hintHtml('Type above &mdash; results filter live here and the URL stays shareable.');",
  "      return;",
  "    }",
  "    fetchLive(q);",
  "  } catch (e) {",
  "    /* fail-open: server-rendered hint state stays visible */",
  "  }",
  "})();",
].join("\n");

const FILTERS = ["all", "games", "docs", "clans", "servers"] as const;

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; f?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = String(sp.q ?? "");
  const f = String(sp.f ?? "all").toLowerCase();
  const active = (FILTERS as readonly string[]).includes(f) ? f : "all";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-3 py-2 sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <h1 className="text-base font-black">Search</h1>
          <kbd className="rounded-md border border-white/10 bg-white/[.03] px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            ⌘K
          </kbd>
          <p className="truncate text-xs text-slate-500">
            Live spotlight — results filter as you type, URL stays shareable.
          </p>
        </div>
        <form
          id="search-form"
          method="get"
          action="/search"
          role="search"
          aria-label="Site search"
          className="mt-2 flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[.03] px-2 focus-within:border-cyan-300/60"
        >
          <span aria-hidden="true" className="shrink-0 pl-1 text-slate-500">
            ⌕
          </span>
          <div
            role="group"
            aria-label="Result filters"
            className="flex max-w-[46%] flex-none items-center gap-1 overflow-x-auto"
          >
            {(Array.isArray(FILTERS) ? FILTERS : []).map((k, index) => (
              <button
                key={String(k ?? index)}
                type="button"
                data-search-filter={k}
                aria-pressed={k === active}
                className={
                  "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold " +
                  (k === active
                    ? "border-cyan-300 bg-cyan-400 text-slate-950"
                    : "border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/50")
                }
              >
                {k === "all" ? "All" : String(k ?? "").charAt(0).toUpperCase() + String(k ?? "").slice(1)}
              </button>
            ))}
          </div>
          <label htmlFor="search-q" className="sr-only">
            Search 4weird
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            autoComplete="off"
            autoFocus
            defaultValue={q}
            placeholder="Try “neon racing”, “dsp theory”, “chill synth”…  (⌘K or /)"
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <input type="hidden" name="f" value={active} />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950"
          >
            Search
          </button>
        </form>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Preparing search…
              </p>
            }
          >
            <div id="search-results" role="listbox" aria-label="Search results">
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Type above — results filter live here without losing the
                shareable URL.
              </p>
            </div>
          </Suspense>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SEARCH_SCRIPT }} />
      </section>
    </div>
  );
}
