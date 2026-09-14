import { cacheLife, cacheTag } from "next/cache";
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
const SEARCH_SCRIPT = [
  "(function () {",
  "  try {",
  "    var params = new URLSearchParams(window.location.search);",
  "    var q = (params.get('q') || '').trim();",
  "    var box = document.getElementById('search-results');",
  "    var input = document.getElementById('search-q');",
  "    if (!box) return;",
  "    if (input && q) input.value = q;",
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
  "        if (items.length === 0) {",
  "          box.innerHTML = '<p role=\"status\" class=\"rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400\">No results for &ldquo;' + esc(q) + '&rdquo; yet — try another spelling.</p>';",
  "          return;",
  "        }",
  "        var html = '<ul class=\"grid gap-3\">';",
  "        for (var i = 0; i < items.length; i++) {",
  "          var item = items[i] || {};",
  "          var title = esc(item.title || item.name || 'Untitled');",
  "          var href = esc(item.href || item.url || ('/search?q=' + encodeURIComponent(q)));",
  "          var kind = esc(item.kind || 'result');",
  "          var snippet = item.snippet || item.description ? '<p class=\"mt-1 text-sm text-slate-400\">' + esc(item.snippet || item.description) + '</p>' : '';",
  "          html += '<li class=\"rounded-xl border border-white/10 bg-white/[.03] p-4\"><a class=\"text-cyan-300 underline\" href=\"' + href + '\">' + title + '</a><p class=\"mt-1 text-xs uppercase tracking-widest text-slate-500\">' + kind + '</p>' + snippet + '</li>';",
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

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("search");

  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Search · 4weird
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Find your <span className="text-cyan-300">weird.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          One box across games, docs, music, servers and clans. Every search
          is shareable — send anyone the URL with{" "}
          <code className="rounded bg-white/10 px-1">?q=</code> and they see
          the same results.
        </p>
        <form
          method="get"
          action="/search"
          role="search"
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="search-q" className="sr-only">
            Search 4weird
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Try “neon racing”, “dsp theory”, “chill synth”…"
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-base text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-cyan-400 px-6 py-3 text-base font-bold text-slate-950"
          >
            Search
          </button>
        </form>
        <div className="mt-8">
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
