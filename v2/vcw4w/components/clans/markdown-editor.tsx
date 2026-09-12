"use client";

import { useId, useState } from "react";
import { MARKDOWN_HELP } from "@/lib/markdown";
import { MarkdownView } from "@/components/clans/markdown-view";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

/** Markdown-first composer: Write tab (textarea + toolbar) + Preview tab. */
export function MarkdownEditor({ value, onChange, placeholder, maxLength = 8000, rows = 4 }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const inputId = useId();

  function wrap(before: string, after = "") {
    const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    onChange(next.slice(0, maxLength));
  }

  const btn =
    "rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-xs font-bold text-slate-300 hover:text-cyan-300";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab("write")} className={`${btn} ${tab === "write" ? "text-cyan-300" : ""}`}>
            Write
          </button>
          <button type="button" onClick={() => setTab("preview")} className={`${btn} ${tab === "preview" ? "text-cyan-300" : ""}`}>
            Preview
          </button>
        </div>
        {tab === "write" && (
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} onClick={() => wrap("**", "**")} title="Bold">B</button>
            <button type="button" className={btn} onClick={() => wrap("*", "*")} title="Italic">I</button>
            <button type="button" className={btn} onClick={() => wrap("`", "`")} title="Code">{"<>"}</button>
            <button type="button" className={btn} onClick={() => wrap("[", "](https://)")} title="Link">🔗</button>
            <button type="button" className={btn} onClick={() => wrap("\n> ", "")} title="Quote">❝</button>
            <button type="button" className={btn} onClick={() => wrap("\n- ", "")} title="List">•≡</button>
            <button type="button" className={btn} onClick={() => wrap("\n```\n", "\n```")} title="Code block">▦</button>
          </div>
        )}
      </div>
      {tab === "write" ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          required
          rows={rows}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500"
        />
      ) : (
        <div className="mt-2 min-h-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
          {value.trim() ? (
            <MarkdownView text={value} />
          ) : (
            <p className="text-sm text-slate-500">Nothing to preview yet.</p>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">{MARKDOWN_HELP}</p>
    </div>
  );
}
