"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ManifestFile = { path: string };

/**
 * Native source browser (replaces the framed full.html).
 * Same behavior, rewritten as React: loads /ai/manifest.json fresh on
 * every load from this same origin, browses the tree, searches contents,
 * and views files. No iframe.
 */
export function VcwFull() {
  const [files, setFiles] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string | null>>({});
  const [current, setCurrent] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("Starting…");
  const [meta, setMeta] = useState("");
  const [log, setLog] = useState("");
  const [hits, setHits] = useState<{ path: string; line: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFiles([]);
    setTexts({});
    setCurrent("");
    setHits(null);
    setProgress(0);
    try {
      const bust = `?t=${Date.now()}`;
      const manifestRes = await fetch(`/ai/manifest.json${bust}`, { cache: "no-store" });
      if (!manifestRes.ok) throw new Error(`HTTP ${manifestRes.status}`);
      const manifest = (await manifestRes.json()) as { files?: ManifestFile[]; bytes?: number };
      const list = Array.isArray(manifest.files) ? manifest.files.map((f) => f.path).filter(Boolean) : [];
      if (!list.length) throw new Error("empty manifest");
      setStatus(`Downloading ${list.length} files…`);
      const got: Record<string, string | null> = {};
      const missed: string[] = [];
      const BATCH = 8;
      let done = 0;
      for (let i = 0; i < list.length; i += BATCH) {
        await Promise.all(
          list.slice(i, i + BATCH).map(async (p) => {
            try {
              const res = await fetch(`/ai/${p}${bust}`, { cache: "no-store" });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              got[p] = await res.text();
            } catch {
              got[p] = null;
              missed.push(p);
            }
            done += 1;
            setProgress(Math.round((done / list.length) * 100));
          }),
        );
        setStatus(`Downloading ${done} / ${list.length} files…`);
      }
      const okCount = list.filter((p) => got[p] !== null).length;
      const kb = Math.round(((manifest.bytes as number) || 0) / 1024);
      setFiles(list);
      setTexts(got);
      setMeta(`${okCount} / ${list.length} files live (${kb}KB manifest size), all from this site`);
      setStatus(okCount === list.length ? "All files loaded fresh. Pick one on the left." : `Loaded with ${list.length - okCount} misses (see log).`);
      setLog((prev) => `${prev}Loaded ${okCount}/${list.length} files at ${new Date().toISOString()}\n`);
      if (missed.length) setLog((prev) => `${prev}${missed.slice(0, 20).map((p) => `Missed ${p}`).join("\n")}\n`);
      if (list[0] && got[list[0]] !== null) setCurrent(list[0]);
    } catch (error) {
      setStatus(`Could not load the file manifest: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const groups = useMemo(() => {
    const q = filter.toLowerCase();
    const map = new Map<string, string[]>();
    for (const p of files) {
      if (texts[p] === null) continue;
      if (q && !p.toLowerCase().includes(q)) continue;
      const parts = p.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
      const arr = map.get(dir) ?? [];
      arr.push(p);
      map.set(dir, arr);
    }
    return [...map.entries()].map(([dir, paths]) => [dir, paths.sort()] as const).sort((a, b) => a[0].localeCompare(b[0]));
  }, [files, texts, filter]);

  const searchContents = useCallback(() => {
    const q = filter.trim().toLowerCase();
    if (q.length < 3) {
      setHits(null);
      return;
    }
    const found: { path: string; line: number }[] = [];
    for (const p of files) {
      const src = texts[p];
      if (!src) continue;
      const idx = src.toLowerCase().indexOf(q);
      if (idx !== -1) found.push({ path: p, line: src.slice(0, idx).split("\n").length });
      if (found.length >= 50) break;
    }
    setHits(found);
  }, [filter, files, texts]);

  const currentText = current ? texts[current] : undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        The entire VibeCodeWorker <code>/ai</code> source, downloaded fresh on every load — straight from this
        site. Browse it, search it, open the workspace. No install, any computer.
      </p>
      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-300/20 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Reload all files"}
          </button>
          <Link href="/vibecodeworker/hub" className="rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-300/20">
            Launch workspace
          </Link>
          <Link href="/vibecodeworker/run" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10">
            Switch to Run mode
          </Link>
        </div>
        <p role="status" className="mt-3 font-mono text-xs text-slate-300">{status}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#1a2230]" aria-hidden="true">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
        {meta && <p className="mt-2 font-mono text-xs text-slate-500">{meta}</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <h2 className="font-bold text-white">Search</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="search"
            autoComplete="off"
            placeholder="Filter by file name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchContents();
            }}
            aria-label="Filter files"
            className="min-w-56 flex-1 rounded-lg border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={searchContents}
            className="rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-300/20"
          >
            Search file contents
          </button>
        </div>
        <div className="mt-2 font-mono text-xs text-slate-400">
          {hits === null ? (
            <p>Type at least 3 characters and press Search to scan contents (shorter text filters file names live).</p>
          ) : hits.length === 0 ? (
            <p>No content matches.</p>
          ) : (
            <>
              <p>{hits.length} file(s) contain the query:</p>
              {hits.map((h) => (
                <button key={h.path} type="button" onClick={() => setCurrent(h.path)} className="block py-0.5 text-left text-cyan-300 hover:underline">
                  {h.path} (line {h.line})
                </button>
              ))}
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
          <h2 className="font-bold text-white">Files</h2>
          <div className="mt-2 max-h-[560px] overflow-y-auto font-mono text-xs">
            {groups.length === 0 && <p className="text-slate-500">No files match.</p>}
            {groups.map(([dir, paths]) => (
              <div key={dir}>
                <p className="mb-0.5 mt-2 text-cyan-300">{dir} ({paths.length})</p>
                {paths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    title={p}
                    onClick={() => setCurrent(p)}
                    className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 py-0.5 text-left hover:bg-cyan-300/10 hover:text-white ${p === current ? "bg-cyan-300/10 text-white" : "text-slate-300"}`}
                  >
                    {p.split("/").pop()}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
          <h2 className="truncate font-bold text-white">{current || "Viewer"}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!current || currentText == null}
              onClick={() => {
                if (current && currentText) void navigator.clipboard.writeText(currentText).then(() => setStatus(`Copied ${current} (${currentText.length} chars).`));
              }}
              className="rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-300/20 disabled:opacity-50"
            >
              Copy
            </button>
            {current && (
              <a href={`/ai/${current}`} target="_blank" rel="noopener" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                Open raw
              </a>
            )}
          </div>
          <pre className="mt-3 max-h-[560px] overflow-auto rounded-lg border border-white/10 bg-[#05080e] p-3 font-mono text-xs text-slate-200">
            {current
              ? currentText === null
                ? "File did not download. See log."
                : currentText === undefined
                  ? "Loading…"
                  : currentText.split("\n").map((ln, i) => `${String(i + 1).padStart(5, " ")}  ${ln}`).join("\n") || "(empty file)"
              : "Pick a file on the left."}
          </pre>
        </section>
      </div>

      {log && (
        <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
          <h2 className="font-bold text-white">Log</h2>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-400">{log}</pre>
        </section>
      )}
    </div>
  );
}
