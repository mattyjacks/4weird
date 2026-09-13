"use client";

import { useMemo, useState } from "react";

export type CodeFile = { name: string; text: string };

function detectLang(name: string): string {
  if (/\.html?$/i.test(name)) return "html";
  if (/\.(ts|tsx)$/i.test(name)) return "ts";
  if (/\.(js|mjs|cjs|jsx)$/i.test(name)) return "js";
  if (/\.json$/i.test(name)) return "json";
  if (/\.css$/i.test(name)) return "css";
  if (/\.md$/i.test(name)) return "md";
  return "text";
}

// Tiny dependency-free tinting: comments, strings, keywords, numbers, tags.
function tint(line: string, lang: string): { text: string; cls: string }[] {
  const out: { text: string; cls: string }[] = [];
  const push = (text: string, cls: string) => {
    if (text) out.push({ text, cls });
  };
  let rest = line;
  const strRe =
    lang === "html"
      ? /^(.*?)((?:&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[a-zA-Z][^&]*?&gt;)|("[^"]*"|'[^']*'))/
      : /^(.*?)((?:\/\/.*$)|(?:\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*'|`[^`]*`)|\b\d+(?:\.\d+)?\b|\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|new|await|async|true|false|null)\b)/;
  let guard = 0;
  while (rest && guard++ < 40) {
    const m = strRe.exec(rest);
    if (!m) {
      push(rest, "text-slate-200");
      break;
    }
    push(m[1], "text-slate-200");
    const tok = m[2];
    const cls = /^(\/\/|\/\*|&lt;!--)/.test(tok)
      ? "italic text-slate-500"
      : /^["'`]/.test(tok)
        ? "text-amber-200"
        : /^\d/.test(tok)
          ? "text-cyan-300"
          : /^&lt;/.test(tok)
            ? "text-fuchsia-300"
            : "text-emerald-300";
    push(tok, cls);
    rest = rest.slice(m[1].length + tok.length);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Beautiful code view: file tree + tabbed viewer, line numbers, tinted
 * tokens, sticky header with language + size. Quarantined packages render
 * the verdict banner only; never file contents.
 */
export function CodeViewer({
  files,
  verdict,
  quarantined,
  title,
}: {
  files: CodeFile[];
  verdict: string;
  quarantined: boolean;
  title: string;
}) {
  const [active, setActive] = useState(0);
  const file = files[Math.min(active, Math.max(0, files.length - 1))];
  const lines = useMemo(() => (file ? file.text.split("\n").slice(0, 2000) : []), [file]);
  const lang = file ? detectLang(file.name) : "text";

  if (quarantined) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-sm text-red-200">
        <p className="font-black">🛡️ Held for human review ({verdict}).</p>
        <p className="mt-2">
          This package tripped a safety signal, so its files are never displayed. A human
          moderator reviews every held package; authority referrals happen only through
          proper human channels.
        </p>
      </div>
    );
  }
  if (!file) {
    return (
      <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        No previewable text files in this package yet; the .zip itself is stored safely.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-slate-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[.03] px-4 py-2 text-xs text-slate-400">
        <span className="font-black text-white">📄 {title}</span>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300">
          {verdict}
        </span>
        <span className="ml-auto font-mono">
          {file.name} · {lang} · {lines.length} lines
        </span>
      </div>
      <div className="flex">
        <ul className="hidden max-h-[560px] w-52 shrink-0 overflow-auto border-r border-white/10 p-2 text-xs sm:block">
          {files.slice(0, 100).map((f, i) => (
            <li key={f.name}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`block w-full truncate rounded px-2 py-1 text-left font-mono transition ${
                  i === active ? "bg-cyan-500/20 font-bold text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="min-w-0 flex-1 overflow-auto">
          <pre className="max-h-[560px] p-4 font-mono text-[12.5px] leading-5">
            {lines.map((ln, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-10 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
                <code className="whitespace-pre-wrap break-all">
                  {tint(escapeHtml(ln) || " ", lang).map((t, k) => (
                    <span key={k} className={t.cls} dangerouslySetInnerHTML={{ __html: t.text || " " }} />
                  ))}
                </code>
              </div>
            ))}
          </pre>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-2 sm:hidden">
        {files.slice(0, 30).map((f, i) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs ${i === active ? "bg-cyan-500/25 text-cyan-200" : "bg-white/5 text-slate-400"}`}
          >
            {f.name.split("/").pop()}
          </button>
        ))}
      </div>
    </div>
  );
}
