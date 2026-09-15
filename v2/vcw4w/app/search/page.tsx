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
// Pills filter client-side by result kind (?f=games|docs|clans|servers);
// "All" shows everything. Shareable: ?q= + &f= round-trip the same view.
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
  "        pills[p].className = 'rounded-full border px-2.5 py-1 text-xs font-bold ' + (on",
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
  "    if (!q) {",
  "      box.innerHTML = '<p class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">Type above and press Search — results appear here and the URL stays shareable.</p>';",
  "      return;",
  "    }",
  "    box.innerHTML = '<p role=\"status\" class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">Searching for &ldquo;' + esc(q) + '&rdquo;&hellip;</p>';",
  "    fetch('/api/search?q=' + encodeURIComponent(q), { headers: { accept: 'application/json' } })",
  "      .then(function (res) {",
  "        if (!res.ok) throw new Error('search unavailable');",
  "        return res.json();",
  "      })",
  "      .then(function (data) {",
  "        var items = data && Array.isArray(data.results) ? data.results : [];",
  "        items = items.filter(function (it) { return matchKind(kindOf(it || {})); });",
  "        if (items.length === 0) {",
  "          box.innerHTML = '<p role=\"status\" class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">No results for &ldquo;' + esc(q) + '&rdquo; yet — try another spelling.</p>';",
  "          return;",
  "        }",
  "        var html = '<ul class=\"grid gap-2\">';",
  "        for (var i = 0; i < items.length; i++) {",
  "          var item = items[i] || {};",
  "          var title = esc(item.title || item.name || 'Untitled');",
  "          var href = esc(item.href || item.url || ('/search?q=' + encodeURIComponent(q)));",
  "          var kind = esc(item.kind || 'result');",
  "          var snippet = item.snippet || item.description ? '<p class=\"mt-1 text-sm text-slate-400\">' + esc(item.snippet || item.description) + '</p>' : '';",
  "          html += '<li class=\"rounded-xl border border-white/10 bg-white/[.03] p-3\"><a class=\"text-cyan-300 underline\" href=\"' + href + '\">' + title + '</a><p class=\"mt-1 text-xs uppercase tracking-widest text-slate-500\">' + kind + '</p>' + snippet + '</li>';",
  "        }",
  "        html += '</ul>';",
  "        box.innerHTML = html;",
  "      })",
  "      .catch(function () {",
  "        box.innerHTML = '<p role=\"status\" class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">Search is unavailable right now — the hint above still applies, try again shortly.</p>';",
  "      });",
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">
            Search <span className="text-cyan-300">⌘K</span>
          </h1>
          <div role="group" aria-label="Result filters" className="flex flex-wrap items-center gap-1.5">
            {(Array.isArray(FILTERS) ? FILTERS : []).map((k, index) => (
              <button
                key={String(k ?? index)}
                type="button"
                data-search-filter={k}
                aria-pressed={k === active}
                className={
                  "rounded-full border px-2.5 py-1 text-xs font-bold " +
                  (k === active
                    ? "border-cyan-300 bg-cyan-400 text-slate-950"
                    : "border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/50")
                }
              >
                {k === "all" ? "All" : String(k ?? "").charAt(0).toUpperCase() + String(k ?? "").slice(1)}
              </button>
            ))}
          </div>
        </div>
        <form
          method="get"
          action="/search"
          role="search"
          className="mt-2 flex shrink-0 flex-col gap-2 sm:flex-row"
        >
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
            placeholder="Try “neon racing”, “dsp theory”, “chill synth”…  (⌘K)"
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2 text-base text-white placeholder:text-slate-500"
          />
          <input type="hidden" name="f" value={active} />
          <button
            type="submit"
            className="rounded-xl bg-cyan-400 px-6 py-2 text-base font-bold text-slate-950"
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
            <div id="search-results" role="status">
              <p className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Type above and press Search — results load here without losing
                the shareable URL.
              </p>
            </div>
          </Suspense>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SEARCH_SCRIPT }} />
      </section>
    </div>
  );
}
