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
 * Weird Vault browser — the Drive/GitHub rival. Strictly separated scopes
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

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const q = new URLSearchParams({ scope, ...(scopeId ? { scope_id: scopeId } : {}) });
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
  }, [scope, scopeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload() {
    setMsg("");
    if (!pick) {
      setMsg("Pick a file first.");
      return;
    }
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
          path: pick.name,
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
        {files.map((f) => (
          <li key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="truncate font-mono font-bold">{f.path}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f.kind} · {(f.bytes / 1024).toFixed(1)} KB · {new Date(f.updated_at).toLocaleString()}
              {f.quarantined ? " · 🛡️ quarantined (hidden)" : ""}
            </p>
            {!f.quarantined && (
              <a className="mt-1 inline-block text-xs font-bold text-cyan-600 underline dark:text-cyan-300" href={`/api/vault/blobs/${f.id}`}>
                Open →
              </a>
            )}
          </li>
        ))}
      </ul>
      {files.length === 0 && !busy && (
        <p className="text-sm text-muted-foreground">Nothing here yet — store your first file above.</p>
      )}
    </div>
  );
}
