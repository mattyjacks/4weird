"use client";

import { useMemo, useState } from "react";
import { copyText, emitToolEvent } from "@/components/tools/interop";

interface Check {
  label: string;
  pass: boolean;
  hint: string;
}

function buildChecks(
  title: string,
  description: string,
  slug: string,
  keyword: string,
): Check[] {
  const t = title.trim();
  const d = description.trim();
  const k = keyword.trim().toLowerCase();
  return [
    {
      label: "Title length 30–60 characters",
      pass: t.length >= 30 && t.length <= 60,
      hint: `${t.length} chars — aim for 50–60 so Google rarely truncates it.`,
    },
    {
      label: "Meta description length 120–160 characters",
      pass: d.length >= 120 && d.length <= 160,
      hint: `${d.length} chars — 150–160 earns the full two-line snippet.`,
    },
    {
      label: "Primary keyword in the title",
      pass: k.length > 0 && t.toLowerCase().includes(k),
      hint:
        k.length === 0
          ? "Type a primary keyword to check placement."
          : `“${keyword.trim()}” ${t.toLowerCase().includes(k) ? "found" : "missing"} in title.`,
    },
    {
      label: "Primary keyword in the description",
      pass: k.length > 0 && d.toLowerCase().includes(k),
      hint:
        k.length === 0
          ? "Type a primary keyword to check placement."
          : `“${keyword.trim()}” ${d.toLowerCase().includes(k) ? "found" : "missing"} in description.`,
    },
    {
      label: "Clean URL slug",
      pass: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim()),
      hint: "Lowercase letters, numbers, and hyphens only — no spaces or underscores.",
    },
  ];
}

// SEO analyzer: SERP simulator + social card previewer + heuristic checklist.
// Hydration-safe: initial state is static; scoring is a pure useMemo;
// browser APIs (clipboard, bus) fire only inside event handlers.
// LAYOUT (UXPASS p56): 2-col 45/55 (compact form + gauges | live SERP/social
// + sticky Copy/Export). No logic renames.
export function SeoAnalyzer() {
  const [title, setTitle] = useState("GraveGain 3D — free browser arena shooter | 4weird");
  const [description, setDescription] = useState(
    "Play GraveGain 3D free in your browser: fast arena shooter, clans, and leaderboards on 4weird. No download needed.",
  );
  const [slug, setSlug] = useState("gravegain-3d-free-browser-shooter");
  const [keyword, setKeyword] = useState("browser shooter");
  const [copied, setCopied] = useState<string | null>(null);

  const checks = useMemo(
    () => buildChecks(title, description, slug, keyword),
    [title, description, slug, keyword],
  );
  const passed = checks.filter((c) => c.pass).length;

  const handleCopy = (text: string, label: string) => {
    void copyText(text, label).then((ok) => {
      setCopied(ok ? `${label} copied.` : "Copy unavailable — select the text manually.");
      window.setTimeout(() => setCopied(null), 2500);
    });
    emitToolEvent({ tool: "seo", action: "copy", detail: label });
  };

  const displayTitle = title.trim() || "Untitled page";
  const displayDescription =
    description.trim() || "Add a meta description to preview the snippet.";
  const displayUrl = `4weird.com › games › ${slug.trim() || "…"}`;

  const titleLen = title.trim().length;
  const descLen = description.trim().length;
  const metaTags = `<title>${title.trim()}</title>\n<meta name="description" content="${description.trim()}" />`;
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title.trim(),
      description: description.trim(),
      url: `https://4weird.com/games/${slug.trim()}`,
      keywords: keyword.trim(),
    },
    null,
    2,
  );

  const gauge = (len: number, max: number) => Math.min(100, Math.round((len / max) * 100));

  return (
    <div className="grid gap-3 lg:grid-cols-[45%_55%] lg:items-start">
      {/* Left 45%: compact form + char gauges + score. */}
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black">Your page</h2>
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            Score {passed}/{checks.length}
          </span>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Title tag</span>
              <span className={titleLen > 60 ? "text-amber-300" : "text-slate-500"}>
                {titleLen}/60
              </span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={`block h-full rounded-full ${titleLen >= 30 && titleLen <= 60 ? "bg-emerald-300" : "bg-amber-300"}`}
                style={{ width: `${gauge(titleLen, 60)}%` }}
              />
            </span>
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Meta description</span>
              <span className={descLen > 160 ? "text-amber-300" : "text-slate-500"}>
                {descLen}/160
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={320}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={`block h-full rounded-full ${descLen >= 120 && descLen <= 160 ? "bg-emerald-300" : "bg-amber-300"}`}
                style={{ width: `${gauge(descLen, 160)}%` }}
              />
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                URL slug
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                maxLength={100}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Primary keyword
              </span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={80}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            </label>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="flex gap-2 text-xs">
              <span
                aria-hidden="true"
                className={`font-black ${check.pass ? "text-emerald-300" : "text-amber-300"}`}
              >
                {check.pass ? "✓" : "!"}
              </span>
              <span>
                <span className="font-bold text-white">{check.label}</span>
                <span className="block text-slate-400">{check.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right 55%: live previews + sticky Copy/Export. */}
      <div className="lg:sticky lg:top-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-black">Live previews</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopy(metaTags, "Meta tags")}
                className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Copy HTML meta tags
              </button>
              <button
                type="button"
                onClick={() => handleCopy(jsonLd, "JSON-LD")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/10"
              >
                Export JSON-LD
              </button>
            </div>
          </div>
          {copied ? <p className="mt-2 text-xs text-cyan-300">{copied}</p> : null}
          <h3 className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Google SERP preview
          </h3>
          <div className="mt-1.5 rounded-xl bg-white p-4 text-left">
            <p className="text-[11px] text-slate-700">{displayUrl}</p>
            <p className="mt-0.5 text-lg text-blue-800 hover:underline">{displayTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {displayDescription}
            </p>
          </div>
          <h3 className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Social card preview (OpenGraph)
          </h3>
          <div className="mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
            <div className="flex h-24 items-center justify-center bg-gradient-to-br from-cyan-500/40 via-slate-900 to-violet-500/40">
              <span className="line-clamp-2 px-4 text-center text-sm font-black text-white">
                {displayTitle}
              </span>
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">4weird.com</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{displayDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
