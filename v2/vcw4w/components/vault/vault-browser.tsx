"use client";

import { useCallback, useEffect, useState } from "react";

type VaultFile = {
  id: string;
  scope: string;
  path: string;
  bytes: number;
  kind: string;
  quarantined: boolean;
  updated_at: string;
};

/**
 * Weird Vault browser; private file storage with strictly separated scopes
 * (personal / team / org), content-addressed dedup, signed-URL uploads
 * (browser PUTs direct to storage), share links, quarantine hiding.
 */
export function VaultBrowser() {
  const [scope, setScope] = useState<"personal" | "team" | "org">("personal");
  const [scopeId, setScopeId] = useState("");
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<File | null>(null);
  // Drive-like folder state: cwd is a path prefix ("" = root). Deep-linkable
  // via ?folder= so the NewGamePlus builder can open its bundle folder.
  const [cwd, setCwd] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const q = new URLSearchParams({
        scope,
        ...(scopeId ? { scope_id: scopeId } : {}),
        ...(cwd ? { prefix: cwd.endsWith("/") ? cwd : `${cwd}/`, limit: "100" } : {}),
      });
      const res = await fetch(`/api/vault/blobs?${q}`, { credentials: "include" });
      const body = (await res.json()) as { success: boolean; files?: VaultFile[]; error?: string };
      if (!body.success) {
        setMsg(body.error ?? "Load failed.");
        setFiles([]);
      } else {
        setFiles(body.files ?? []);
      }
    } catch {
      setMsg("Load failed.");
    } finally {
      setBusy(false);
    }
  }, [scope, scopeId, cwd]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick up ?folder= deep links (e.g. from a NewGamePlus bundle panel).
  useEffect(() => {
    try {
      const folder = new URL(window.location.href).searchParams.get("folder") ?? "";
      if (folder) setCwd(folder.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+|\/+$/g, ""));
    } catch {
      /* deep link is best-effort */
    }
  }, []);

  // Drive grouping, derived from flat paths — zero API change.
  const cwdPrefix = cwd ? `${cwd}/` : "";
  const folders = [...new Set(
    files
      .filter((f) => f.path.startsWith(cwdPrefix))
      .map((f) => f.path.slice(cwdPrefix.length).split("/")[0])
      .filter((seg) => seg && files.some((g) => g.path === `${cwdPrefix}${seg}/` || g.path.startsWith(`${cwdPrefix}${seg}/`))),
  )].sort();
  const filesHere = files
    .filter((f) => f.path.startsWith(cwdPrefix) && !f.path.slice(cwdPrefix.length).includes("/"))
    .sort((a, b) => a.path.localeCompare(b.path));
  const crumbs = cwd ? cwd.split("/") : [];

  function openPreview(f: VaultFile) {
    setPreviewId(f.id);
    setPreviewText(null);
    const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
    if (["css", "js", "md", "json", "txt", "html"].includes(ext) && f.bytes < 200_000) {
      void fetch(`/api/vault/blobs/${f.id}`, { credentials: "include" })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Preview failed (${r.status})`))))
        .then((t) => setPreviewText(t.slice(0, 50_000)))
        .catch(() => setPreviewText(null));
    }
  }

  async function upload() {
    setMsg("");
    if (!pick) {
      setMsg("Pick a file first.");
      return;
    }
    // Sanitize to the server's cleanVaultPath set (spaces/parens OK) and
    // store inside the open folder, so uploads land where you're looking.
    const base = (pick.name.split(/[\\/]/).pop() ?? "file").trim() || "file";
    const safe = base
      .replace(/[^A-Za-z0-9._/@:+() \-]/g, "_")
      .replace(/\.\.+/g, "_")
      .replace(/^\/+|\/+$/g, "")
      .slice(0, 128) || "file";
    const dest = cwd ? `${cwd}/${safe}`.slice(0, 512) : safe;
    setBusy(true);
    try {
      const digest = await crypto.subtle.digest("SHA-256", await pick.arrayBuffer());
      const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const reg = await fetch("/api/vault/blobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          scope_id: scopeId || undefined,
          path: dest,
          bytes: pick.size,
          sha256,
          kind: "asset",
          mime: pick.type || "application/octet-stream",
        }),
      });
      const regBody = (await reg.json()) as {
        success: boolean;
        file?: { id: string };
        uploadUrl?: string;
        error?: string;
      };
      if (!regBody.success || !regBody.uploadUrl || !regBody.file) {
        setMsg(regBody.error ?? "Register failed.");
        return;
      }
      const put = await fetch(regBody.uploadUrl, { method: "PUT", body: pick });
      if (!put.ok) {
        setMsg("Byte upload failed.");
        return;
      }
      const ready = await fetch(`/api/vault/blobs/${regBody.file.id}`, {
        method: "POST",
        credentials: "include",
      });
      const readyBody = (await ready.json()) as { success: boolean; error?: string };
      setMsg(readyBody.success ? "Stored + metered (25% cut included)." : (readyBody.error ?? "Confirm failed."));
      setPick(null);
      await load();
    } catch {
      setMsg("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["personal", "team", "org"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-full px-4 py-1.5 font-bold capitalize ${scope === s ? "bg-cyan-600 text-white" : "border border-border"}`}
          >
            {s}
          </button>
        ))}
        {scope !== "personal" && (
          <input
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            placeholder="team / org id (uuid)"
            className="w-64 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs"
          />
        )}
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="rounded-full border border-border px-4 py-1.5 font-bold disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <input type="file" onChange={(e) => setPick(e.target.files?.[0] ?? null)} className="text-xs" />
        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="rounded-full bg-cyan-600 px-5 py-1.5 font-black text-white disabled:opacity-50"
        >
          Store in Vault
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(cwd || folders.length > 0) && (
          <li className="rounded-xl border border-dashed border-border bg-card p-3 text-sm">
            <nav aria-label="Vault folders" className="flex flex-wrap items-center gap-1 text-xs">
              <button type="button" onClick={() => setCwd("")} className={`font-mono font-bold underline ${!cwd ? "text-foreground" : "text-cyan-600 dark:text-cyan-300"}`}>
                Vault
              </button>
              {crumbs.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    onClick={() => setCwd(crumbs.slice(0, i + 1).join("/"))}
                    className={`font-mono font-bold underline ${i === crumbs.length - 1 ? "text-foreground" : "text-cyan-600 dark:text-cyan-300"}`}
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </nav>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCwd("newgameplus")}
                title="Games built by NewGamePlus"
                className="rounded-full border border-fuchsia-400/40 px-3 py-1 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-300"
              >
                🎮 newgameplus
              </button>
              {folders.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCwd(cwd ? `${cwd}/${name}` : name)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-bold"
                >
                  📁 {name}
                </button>
              ))}
            </div>
          </li>
        )}
        {filesHere.map((f) => (
          <li key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="truncate font-mono font-bold" title={f.path}>{f.path.split("/").pop()}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{f.path}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f.kind} · {(f.bytes / 1024).toFixed(1)} KB · {new Date(f.updated_at).toLocaleString()}
              {f.quarantined ? " · 🛡️ quarantined (hidden)" : ""}
            </p>
            {!f.quarantined && (
              <span className="mt-1 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => openPreview(f)} className="text-xs font-bold text-cyan-600 underline dark:text-cyan-300">
                  Preview
                </button>
                <a className="text-xs font-bold text-cyan-600 underline dark:text-cyan-300" href={`/api/vault/blobs/${f.id}`}>
                  Open →
                </a>
                <a className="text-xs font-bold text-cyan-600 underline dark:text-cyan-300" href={`/api/vault/blobs/${f.id}`} download={f.path.split("/").pop()}>
                  Download
                </a>
              </span>
            )}
          </li>
        ))}
      </ul>
      {previewId && (
        <div className="rounded-2xl border border-border bg-card p-3" role="dialog" aria-label="File preview">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-bold">{files.find((f) => f.id === previewId)?.path ?? "preview"}</p>
            <button type="button" onClick={() => { setPreviewId(null); setPreviewText(null); }} className="rounded-full border border-border px-3 py-1 text-xs font-bold">
              Close
            </button>
          </div>
          {/\.html?$/i.test(files.find((f) => f.id === previewId)?.path ?? "") ? (
            <iframe title="Vault HTML preview" src={`/api/vault/blobs/${previewId}`} sandbox="allow-scripts" className="mt-2 h-[420px] w-full rounded-xl bg-black" />
          ) : previewText !== null ? (
            <pre className="mt-2 max-h-[420px] overflow-auto rounded-xl bg-black/80 p-3 font-mono text-[11px] text-slate-200">{previewText}</pre>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Loading preview…</p>
          )}
        </div>
      )}
      {filesHere.length === 0 && folders.length === 0 && !busy && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet; store your first file above.
          {cwd === "newgameplus" && (
            <> No bundles yet — <a className="font-bold text-cyan-600 underline dark:text-cyan-300" href="/newgameplus">build one →</a></>
          )}
        </p>
      )}
    </div>
  );
}
