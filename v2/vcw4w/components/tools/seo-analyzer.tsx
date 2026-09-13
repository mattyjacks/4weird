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

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Your page</h2>
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Title tag
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Meta description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={320}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                URL slug
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                maxLength={100}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Primary keyword
              </span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={80}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Google SERP preview</h2>
        <div className="mt-4 rounded-2xl bg-white p-5 text-left">
          <p className="text-xs text-slate-700">{displayUrl}</p>
          <p className="mt-1 text-xl text-blue-800 hover:underline">{displayTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{displayDescription}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              handleCopy(
                `<title>${title.trim()}</title>\n<meta name="description" content="${description.trim()}" />`,
                "Meta tags",
              )
            }
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Copy meta tags
          </button>
        </div>
        {copied ? <p className="mt-3 text-sm text-cyan-300">{copied}</p> : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Social card preview (OpenGraph)</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-cyan-500/40 via-slate-900 to-violet-500/40">
            <span className="px-6 text-center text-lg font-black text-white">
              {displayTitle}
            </span>
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">4weird.com</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">{displayDescription}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">
          Score: {passed}/{checks.length}
        </h2>
        <ul className="mt-4 space-y-3">
          {checks.map((check) => (
            <li key={check.label} className="flex gap-3 text-sm">
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
    </div>
  );
}
