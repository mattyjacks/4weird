"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VAULT_FREE_BYTES_PERSONAL, quoteVaultStorageSplit } from "@/lib/blob-vault";
import { renderMarkdownSafe } from "@/lib/markdown";

type VaultFile = {
  id: string;
  scope: string;
  path: string;
  bytes: number;
  kind: string;
  quarantined: boolean;
  updated_at: string;
};

type ScopeOpt = { id: string; slug?: string; name?: string; org_id?: string };

type UploadItem = {
  key: string;
  file: File;
  safePath: string;
  status: "queued" | "hashing" | "registering" | "uploading" | "confirming" | "done" | "error";
  progress: number;
  error?: string;
  fileId?: string;
  quoteGross?: number;
};

type ShareLink = { id: string; token: string; expires_at: string | null; created_at: string };

const BLOCKED_EXT = /\.(html?|xhtml|svg|svgz|shtml|hta|swf|xap|xht|xml|js|mjs|cjs|xhtm|dhtml|jse|vbs|vbe|mhtml|mht)$/i;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file, mirrors VAULT_MAX_BLOB_BYTES

const KIND_OPTIONS = [
  "model-3d",
  "image",
  "animation",
  "code",
  "audio",
  "video",
  "text",
  "chat",
  "log",
  "asset",
];

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function sanitizeName(raw: string): string {
  const base = (raw.split(/[\\/]/).pop() ?? "file").trim() || "file";
  return (
    base
      .replace(/[^A-Za-z0-9._/@:+() \-]/g, "_")
      .replace(/\.\.+/g, "_")
      .replace(/^\/+|\/+$/g, "")
      .slice(0, 128) || "file"
  );
}

type PreviewKind = "text" | "markdown" | "image" | "audio" | "video" | "pdf" | "html" | "none";

/**
 * Weird Vault browser; private file storage with strictly separated scopes
 * (personal / team / org), content-addressed dedup, signed-URL uploads
 * (browser PUTs direct to storage), share links, trash, quarantine hiding.
 *
 * Limits: 50 MB per file; personal scope includes 500 MB free, overage is
 * ~3 coins/GB-month with the 25% platform cut included, never on top.
 */
export function VaultBrowser() {
  const [scope, setScope] = useState<"personal" | "team" | "org">("personal");
  const [scopeId, setScopeId] = useState("");
  const [orgs, setOrgs] = useState<ScopeOpt[]>([]);
  const [teams, setTeams] = useState<ScopeOpt[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgAlert, setMsgAlert] = useState(false);
  // Drive-like folder state: cwd is a path prefix ("" = root). Deep-linkable
  // via ?folder= so the NewGamePlus builder can open its bundle folder.
  const [cwd, setCwd] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("updated");
  const [dirAsc, setDirAsc] = useState(false);
  const [kindFilter, setKindFilter] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("none");
  const [previewName, setPreviewName] = useState("");
  const [shareFile, setShareFile] = useState<VaultFile | null>(null);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [expiryHrs, setExpiryHrs] = useState("24");
  const [usage, setUsage] = useState<{
    personal: { bytes: number; files: number };
    teams: { id: string; bytes: number; files: number }[];
    orgs: { id: string; bytes: number; files: number }[];
  } | null>(null);
  const activeXhrs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const previewOpener = useRef<HTMLButtonElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  function say(text: string, alert = false) {
    setMsg(text);
    setMsgAlert(alert);
  }

  const load = useCallback(async () => {
    // Team/org scopes are meaningless without a picked squad/org: never fire
    // a request the API must refuse with 400. Show a picker hint instead.
    if ((scope === "team" || scope === "org") && !scopeId) {
      setFiles([]);
      setBusy(false);
      say(scope === "team" ? "Pick a squad above to list its files." : "Pick an org above to list its files.");
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({
        scope,
        ...(scopeId ? { scope_id: scopeId } : {}),
        ...(cwd ? { prefix: `${cwd}/` } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
        sort,
        dir: dirAsc ? "asc" : "desc",
        ...(kindFilter ? { kind: kindFilter } : {}),
        ...(showTrash ? { trashed: "1" } : {}),
        limit: "100",
      });
      const res = await fetch(`/api/vault/blobs?${params}`, { credentials: "include" });
      const body = (await res.json()) as { success: boolean; files?: VaultFile[]; error?: string };
      if (!body.success) {
        say(body.error ?? "Couldn't load Vault. Check connection and retry.", true);
        setFiles([]);
      } else {
        if (msgAlert) say("");
        setFiles(body.files ?? []);
      }
    } catch {
      say("Couldn't load Vault. Check connection and retry.", true);
    } finally {
      setBusy(false);
    }
  }, [scope, scopeId, cwd, q, sort, dirAsc, kindFilter, showTrash, msgAlert]);

  // Debounce search typing into load().
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Pick up ?folder= deep links (e.g. from a NewGamePlus bundle panel).
  useEffect(() => {
    try {
      const folder = new URL(window.location.href).searchParams.get("folder") ?? "";
      if (folder) setCwd(folder.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+|\/+$/g, ""));
    } catch {
      /* deep link is best-effort */
    }
  }, []);

  // Scope pickers: orgs + squads (teams) the caller belongs to.
  useEffect(() => {
    if (scope === "personal") return;
    let live = true;
    (async () => {
      try {
        if (scope === "org") {
          const r = await fetch("/api/orgs", { credentials: "include" });
          const b = (await r.json()) as { success: boolean; orgs?: ScopeOpt[] };
          if (live && b.success) {
            setOrgs(b.orgs ?? []);
            setScopeId((cur) => cur || b.orgs?.[0]?.id || "");
          }
        } else {
          const r = await fetch("/api/squads", { credentials: "include" });
          const b = (await r.json()) as { success: boolean; teams?: ScopeOpt[] };
          if (live && b.success) {
            setTeams(b.teams ?? []);
            setScopeId((cur) => cur || b.teams?.[0]?.id || "");
          }
        }
      } catch {
        /* picker is best-effort; the raw API error still guides */
      }
    })();
    return () => {
      live = false;
    };
  }, [scope]);

  // Storage usage (personal free quota + per-scope bytes).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/vault/usage", { credentials: "include" });
        const b = (await r.json()) as {
          success: boolean;
          usage?: { personal: { bytes: number; files: number }; teams: { id: string; bytes: number; files: number }[]; orgs: { id: string; bytes: number; files: number }[] };
        };
        if (live && b.success && b.usage) setUsage(b.usage);
      } catch {
        /* quota bar hides when unavailable */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Drive grouping, derived from flat paths — zero API change.
  const cwdPrefix = cwd ? `${cwd}/` : "";
  const folders = useMemo(
    () =>
      [...new Set(
        files
          .filter((f) => f.path.startsWith(cwdPrefix))
          .map((f) => f.path.slice(cwdPrefix.length).split("/")[0])
          .filter((seg) => seg && files.some((g) => g.path === `${cwdPrefix}${seg}/` || g.path.startsWith(`${cwdPrefix}${seg}/`))),
      )].sort(),
    [files, cwdPrefix],
  );
  const filesHere = useMemo(
    () =>
      files
        .filter((f) => f.path.startsWith(cwdPrefix) && !f.path.slice(cwdPrefix.length).includes("/"))
        .sort((a, b) => a.path.localeCompare(b.path)),
    [files, cwdPrefix],
  );
  const crumbs = cwd ? cwd.split("/") : [];

  // ---- upload queue (register -> PUT -> ready, max 3 concurrent) ----
  const patchItem = useCallback((key: string, patch: Partial<UploadItem>) => {
    setQueue((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }, []);

  const runItem = useCallback(
    async (item: UploadItem) => {
      patchItem(item.key, { status: "hashing", progress: 0, error: undefined });
      try {
        if (item.file.size < 1 || item.file.size > MAX_BYTES) {
          patchItem(item.key, { status: "error", error: "Rejected before upload: files must be 1 byte to 50 MB." });
          return;
        }
        if (BLOCKED_EXT.test(item.safePath)) {
          patchItem(item.key, { status: "error", error: "That file extension cannot be stored inline. Re-save as .txt/.bin." });
          return;
        }
        const digest = await crypto.subtle.digest("SHA-256", await item.file.arrayBuffer());
        const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
        patchItem(item.key, { status: "registering", progress: 0.05 });
        const reg = await fetch("/api/vault/blobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            scope_id: scopeId || undefined,
            path: item.safePath,
            bytes: item.file.size,
            sha256,
            kind: item.file.type.startsWith("image/") ? "image" : item.file.type.startsWith("audio/") ? "audio" : item.file.type.startsWith("video/") ? "video" : item.file.type.startsWith("text/") ? "text" : "asset",
            mime: item.file.type || "application/octet-stream",
          }),
        });
        const regBody = (await reg.json()) as {
          success: boolean;
          file?: { id: string };
          uploadUrl?: string;
          quote?: { gross: number };
          error?: string;
        };
        if (!regBody.success || !regBody.uploadUrl || !regBody.file) {
          patchItem(item.key, { status: "error", error: regBody.error ?? "Register failed." });
          return;
        }
        patchItem(item.key, { fileId: regBody.file.id, quoteGross: regBody.quote?.gross, status: "uploading", progress: 0.1 });
        // XHR for the byte PUT: fetch has no upload-progress events.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrs.current.set(item.key, xhr);
          xhr.open("PUT", regBody.uploadUrl!);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patchItem(item.key, { progress: 0.1 + 0.8 * (e.loaded / e.total) });
          };
          xhr.onload = () => {
            activeXhrs.current.delete(item.key);
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Byte upload failed."));
          };
          xhr.onerror = () => {
            activeXhrs.current.delete(item.key);
            reject(new Error("Byte upload failed."));
          };
          xhr.onabort = () => {
            activeXhrs.current.delete(item.key);
            reject(new Error("Upload cancelled."));
          };
          xhr.send(item.file);
        });
        patchItem(item.key, { status: "confirming", progress: 0.95 });
        const ready = await fetch(`/api/vault/blobs/${regBody.file.id}`, { method: "POST", credentials: "include" });
        const readyBody = (await ready.json()) as { success: boolean; error?: string };
        if (!readyBody.success) {
          patchItem(item.key, { status: "error", error: readyBody.error ?? "Confirm failed." });
          return;
        }
        patchItem(item.key, { status: "done", progress: 1 });
      } catch (e) {
        patchItem(item.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed." });
      }
    },
    [patchItem, scope, scopeId],
  );

  const pumpQueue = useCallback(() => {
    setQueue((prev) => {
      const active = prev.filter((i) => ["hashing", "registering", "uploading", "confirming"].includes(i.status)).length;
      const slots = Math.max(0, 3 - active);
      if (slots === 0) return prev;
      const next = prev.filter((i) => i.status === "queued").slice(0, slots);
      for (const item of next) void runItem(item);
      return prev;
    });
  }, [runItem]);

  useEffect(() => {
    pumpQueue();
    const pending = queue.some((i) => ["queued", "hashing", "registering", "uploading", "confirming"].includes(i.status));
    if (!pending && queue.some((i) => i.status === "done" || i.status === "error")) {
      const done = queue.filter((i) => i.status === "done").length;
      const failed = queue.filter((i) => i.status === "error").length;
      if (done > 0) {
        say(`Stored ${done} file${done === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""} (25% cut included).`);
        void load();
      } else if (failed > 0) {
        say(`${failed} upload${failed === 1 ? "" : "s"} failed. Retry below.`, true);
      }
    }
    // load()/pumpQueue intentionally excluded: re-running on their identity
    // change would re-fire uploads and list loads in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function enqueue(list: FileList | File[]) {
    const arr = [...list];
    if (arr.length === 0) return;
    const items: UploadItem[] = arr.map((file, i) => {
      const safe = sanitizeName(file.name);
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        safePath: cwd ? `${cwd}/${safe}`.slice(0, 512) : safe,
        status: "queued" as const,
        progress: 0,
      };
    });
    setQueue((prev) => [...prev, ...items]);
    say(`Queued ${items.length} file${items.length === 1 ? "" : "s"} in ${cwd || "Vault"}.`);
  }

  function retryItem(key: string) {
    setQueue((prev) => prev.map((it) => (it.key === key ? { ...it, status: "queued" as const, progress: 0, error: undefined } : it)));
  }

  function cancelItem(key: string) {
    activeXhrs.current.get(key)?.abort();
    setQueue((prev) => prev.filter((it) => it.key !== key));
  }

  const queueActive = queue.some((i) => ["queued", "hashing", "registering", "uploading", "confirming"].includes(i.status));
  const overall = queue.length
    ? queue.reduce((n, i) => n + i.progress, 0) / queue.length
    : 0;

  // ---- previews (via short-lived signed download URL, never the JSON route) ----
  async function openPreview(f: VaultFile, opener?: HTMLButtonElement | null) {
    if (opener) previewOpener.current = opener;
    setPreviewId(f.id);
    setPreviewName(f.path);
    setPreviewText(null);
    setPreviewUrl(null);
    setPreviewKind("none");
    try {
      const r = await fetch(`/api/vault/blobs/${f.id}`, { credentials: "include" });
      const b = (await r.json()) as {
        success: boolean;
        file?: { download?: string | null; provenance?: { mime?: string } };
      };
      const url = b.success ? (b.file?.download ?? null) : null;
      if (!url) {
        setPreviewText(null);
        return;
      }
      const mime = (b.file?.provenance?.mime ?? "").toLowerCase();
      const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
      const asText = mime.startsWith("text/") || mime === "application/json" || ["txt", "md", "json", "css", "csv", "log", "js"].includes(ext);
      if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(ext)) {
        if (f.bytes > 10 * 1024 * 1024) return;
        setPreviewUrl(url);
        setPreviewKind("image");
      } else if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext)) {
        if (f.bytes > 20 * 1024 * 1024) return;
        setPreviewUrl(url);
        setPreviewKind("audio");
      } else if (mime.startsWith("video/") || ["mp4", "webm"].includes(ext)) {
        setPreviewUrl(url);
        setPreviewKind("video");
      } else if (mime === "application/pdf" || ext === "pdf") {
        if (f.bytes > 15 * 1024 * 1024) return;
        setPreviewUrl(url);
        setPreviewKind("pdf");
      } else if (/\.html?$/i.test(f.path)) {
        // Legacy rows only (new HTML uploads are rejected server-side).
        // Bare sandbox: no scripts, ever.
        if (f.bytes > 2 * 1024 * 1024) return;
        setPreviewUrl(url);
        setPreviewKind("html");
      } else if (asText && f.bytes < 200_000) {
        const t = await (await fetch(url)).text();
        const slice = t.slice(0, 50_000);
        if (ext === "md" || mime === "text/markdown") {
          setPreviewText(renderMarkdownSafe(slice.slice(0, 8000)));
          setPreviewKind("markdown");
        } else {
          setPreviewText(slice);
          setPreviewKind("text");
        }
      }
    } catch {
      setPreviewText(null);
    }
  }

  function closePreview() {
    setPreviewId(null);
    setPreviewText(null);
    setPreviewUrl(null);
    setPreviewKind("none");
    previewOpener.current?.focus?.();
  }

  useEffect(() => {
    if (!previewId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    closeBtn.current?.focus?.();
    return () => window.removeEventListener("keydown", onKey);
  }, [previewId]);

  // ---- file mutations ----
  async function renameFile(f: VaultFile) {
    const next = window.prompt("New file name:", basename(f.path));
    if (!next) return;
    const dir = dirname(f.path);
    const dest = dir ? `${dir}/${sanitizeName(next)}` : sanitizeName(next);
    const r = await fetch(`/api/vault/blobs/${f.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: dest }),
    });
    const b = (await r.json()) as { success: boolean; error?: string };
    say(b.success ? `Renamed to ${dest}.` : (b.error ?? "Rename failed."), !b.success);
    if (b.success) void load();
  }

  async function moveFile(f: VaultFile) {
    const folder = window.prompt("Move to folder (blank = Vault root):", dirname(f.path));
    if (folder === null) return;
    const clean = folder.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");
    const dest = clean ? `${clean}/${basename(f.path)}` : basename(f.path);
    const r = await fetch(`/api/vault/blobs/${f.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: dest }),
    });
    const b = (await r.json()) as { success: boolean; error?: string };
    say(b.success ? `Moved to ${dest}.` : (b.error ?? "Move failed."), !b.success);
    if (b.success) void load();
  }

  async function deleteFile(f: VaultFile) {
    if (!window.confirm(`Move ${basename(f.path)} (${formatBytes(f.bytes)}) to trash? Share links break now; bytes free up on purge.`)) return;
    const r = await fetch(`/api/vault/blobs/${f.id}`, { method: "DELETE", credentials: "include" });
    const b = (await r.json()) as { success: boolean; error?: string };
    say(b.success ? "Moved to trash." : (b.error ?? "Delete failed."), !b.success);
    if (b.success) {
      setSelected((prev) => prev.filter((id) => id !== f.id));
      void load();
    }
  }

  async function restoreFile(id: string) {
    const r = await fetch(`/api/vault/blobs/${id}/restore`, { method: "POST", credentials: "include" });
    const b = (await r.json()) as { success: boolean; error?: string };
    say(b.success ? "Restored from trash." : (b.error ?? "Restore failed."), !b.success);
    if (b.success) void load();
  }

  async function purgeFile(id: string) {
    if (!window.confirm("Delete forever? Bytes free up only when no other file holds them.")) return;
    const r = await fetch(`/api/vault/blobs/${id}/purge`, { method: "POST", credentials: "include" });
    const b = (await r.json()) as { success: boolean; error?: string; freedBytes?: number };
    say(b.success ? `Deleted forever (${formatBytes(b.freedBytes ?? 0)}).` : (b.error ?? "Purge failed."), !b.success);
    if (b.success) {
      setSelected((prev) => prev.filter((x) => x !== id));
      void load();
    }
  }

  // ---- batch selection ----
  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function batchDelete() {
    if (selected.length === 0) return;
    const verb = showTrash ? "purge forever" : "move to trash";
    if (!window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${selected.length} file${selected.length === 1 ? "" : "s"}?`)) return;
    setBatchBusy(true);
    let okCount = 0;
    let failCount = 0;
    for (const id of selected) {
      try {
        const url = showTrash ? `/api/vault/blobs/${id}/purge` : `/api/vault/blobs/${id}`;
        const r = await fetch(url, { method: showTrash ? "POST" : "DELETE", credentials: "include" });
        const b = (await r.json()) as { success: boolean };
        if (b.success) okCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    setBatchBusy(false);
    setSelected([]);
    say(failCount ? `Done: ${okCount} ok, ${failCount} failed.` : showTrash ? `Purged ${okCount} files.` : `Moved ${okCount} files to trash.`, failCount > 0);
    void load();
  }

  async function batchDownload() {
    if (selected.length === 0) return;
    if (selected.length > 20) say("Large batch: downloading first 20.", true);
    setBatchBusy(true);
    for (const id of selected.slice(0, 20)) {
      try {
        const r = await fetch(`/api/vault/blobs/${id}`, { credentials: "include" });
        const b = (await r.json()) as { success: boolean; file?: { download?: string | null; path?: string } };
        const url = b.success ? b.file?.download : null;
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = basename(b.file?.path ?? "download");
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch {
        /* per-file best effort */
      }
    }
    setBatchBusy(false);
  }

  // ---- shares ----
  async function openShares(f: VaultFile) {
    setShareFile(f);
    setShares([]);
    setShareBusy(true);
    try {
      const r = await fetch(`/api/vault/shares?file_id=${f.id}`, { credentials: "include" });
      const b = (await r.json()) as { success: boolean; shares?: ShareLink[] };
      if (b.success) setShares(b.shares ?? []);
    } catch {
      /* list is best-effort */
    } finally {
      setShareBusy(false);
    }
  }

  async function createShare() {
    if (!shareFile) return;
    setShareBusy(true);
    try {
      const r = await fetch("/api/vault/shares", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: shareFile.id, expires_hours: Number(expiryHrs) || 24 }),
      });
      const b = (await r.json()) as { success: boolean; share?: ShareLink; error?: string };
      if (b.success && b.share) {
        setShares((prev) => [b.share!, ...prev]);
        say("Share link created. Copy it below.");
      } else {
        say(b.error ?? "Share failed.", true);
      }
    } catch {
      say("Share failed.", true);
    } finally {
      setShareBusy(false);
    }
  }

  async function revokeShare(id: string) {
    const r = await fetch(`/api/vault/shares/${id}`, { method: "DELETE", credentials: "include" });
    const b = (await r.json()) as { success: boolean; error?: string };
    if (b.success) {
      setShares((prev) => prev.filter((s) => s.id !== id));
      say("Link revoked.");
    } else {
      say(b.error ?? "Revoke failed.", true);
    }
  }

  async function copyText(text: string, note: string) {
    try {
      await navigator.clipboard.writeText(text);
      say(note);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        say(note);
      } catch {
        say("Copy failed. Select the text manually.", true);
      }
    }
  }

  // ---- folders ----
  function newFolder() {
    const name = window.prompt("New folder name:");
    if (!name) return;
    const clean = name.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");
    if (!clean) {
      say("Invalid folder name.", true);
      return;
    }
    setCwd(cwd ? `${cwd}/${clean}` : clean);
    say(`Opened ${clean}. Uploads now land here; the folder persists with its first file.`);
  }

  async function renameFolder(name: string) {
    const next = window.prompt("Rename folder:", name);
    if (!next) return;
    const clean = next.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");
    if (!clean || clean.includes("/")) {
      say("Invalid folder name (single segment).", true);
      return;
    }
    const from = cwd ? `${cwd}/${name}` : name;
    const to = cwd ? `${cwd}/${clean}` : clean;
    const r = await fetch("/api/vault/folders", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, scope_id: scopeId || undefined, from, to }),
    });
    const b = (await r.json()) as { success: boolean; renamed?: number; error?: string };
    say(b.success ? `Renamed folder (${b.renamed} files).` : (b.error ?? "Rename failed."), !b.success);
    if (b.success) void load();
  }

  async function deleteFolder(name: string) {
    const folder = cwd ? `${cwd}/${name}` : name;
    if (!window.confirm(`Move everything under ${folder} to trash?`)) return;
    const p = new URLSearchParams({ scope, ...(scopeId ? { scope_id: scopeId } : {}), path: folder });
    const r = await fetch(`/api/vault/folders?${p}`, { method: "DELETE", credentials: "include" });
    const b = (await r.json()) as { success: boolean; deleted?: number; error?: string };
    say(b.success ? `Trashed ${b.deleted} files.` : (b.error ?? "Delete failed."), !b.success);
    if (b.success) void load();
  }

  // ---- quota ----
  const quotaView = useMemo(() => {
    if (!usage) return null;
    if (scope === "personal") {
      const bytes = usage.personal.bytes;
      const over = Math.max(0, bytes - VAULT_FREE_BYTES_PERSONAL);
      const quote = over > 0 ? quoteVaultStorageSplit(bytes) : null;
      return `${formatBytes(bytes)} / ${formatBytes(VAULT_FREE_BYTES_PERSONAL)} free${quote ? ` · ~${quote.gross} coins/mo overage` : ""}`;
    }
    const list = scope === "team" ? usage.teams : usage.orgs;
    const row = list.find((x) => x.id === scopeId);
    const bytes = row?.bytes ?? 0;
    const quote = quoteVaultStorageSplit(bytes);
    return `${formatBytes(bytes)} · ~${quote.gross} coins/mo`;
  }, [usage, scope, scopeId]);

  const scopeLabel = scope === "personal" ? "Personal" : scope === "team" ? "Team" : "Org";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="Vault scope">
        {(["personal", "team", "org"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={scope === s}
            onClick={() => {
              setScope(s);
              setScopeId("");
              setSelected([]);
            }}
            className={`min-h-[44px] rounded-full px-4 py-1.5 font-bold capitalize ${scope === s ? "bg-cyan-600 text-white" : "border border-border"}`}
          >
            {s}
          </button>
        ))}
        {scope === "org" && (
          <label className="flex min-h-[44px] items-center gap-2 text-xs">
            <span className="font-bold">Org</span>
            <select
              aria-label="Organization"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="min-h-[44px] max-w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">Pick an org…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.slug || o.id}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope === "team" && (
          <label className="flex min-h-[44px] items-center gap-2 text-xs">
            <span className="font-bold">Squad</span>
            <select
              aria-label="Squad"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="min-h-[44px] max-w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">Pick a squad…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.slug || t.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="text-xs text-muted-foreground" title="Includes 25% platform cut; never added on top.">
          <span aria-hidden="true">📊 </span>{quotaView ?? `${scopeLabel} scope`}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          aria-label="Refresh file list"
          className="min-h-[44px] rounded-full border border-border px-4 py-1.5 font-bold disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          aria-pressed={showTrash}
          className={`min-h-[44px] rounded-full border border-border px-4 py-1.5 font-bold ${showTrash ? "bg-amber-600 text-white" : ""}`}
        >
          <span aria-hidden="true">🗑️ </span>Trash
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex min-h-[44px] items-center gap-2">
          <span className="sr-only">Search files</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${cwd || "Vault"}…`}
            aria-label="Search files"
            className="min-h-[44px] w-52 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
          />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-xs">
          <span className="font-bold">Sort</span>
          <select
            aria-label="Sort files"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-[44px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="updated">Updated</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="kind">Kind</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setDirAsc((v) => !v)}
          aria-label={dirAsc ? "Sort descending" : "Sort ascending"}
          className="min-h-[44px] rounded-full border border-border px-3 py-1.5 font-bold"
        >
          {dirAsc ? "▲" : "▼"}
        </button>
        <label className="flex min-h-[44px] items-center gap-2 text-xs">
          <span className="font-bold">Kind</span>
          <select
            aria-label="Filter by kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="">All</option>
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={newFolder}
          className="min-h-[44px] rounded-full border border-border px-4 py-1.5 font-bold"
        >
          <span aria-hidden="true">＋ </span>New folder
        </button>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files);
        }}
      >
        <label htmlFor="vault-file" className="min-h-[44px] cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-bold">
          Choose files
        </label>
        <input
          id="vault-file"
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) enqueue(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
        <span className="text-xs text-muted-foreground">Drag &amp; drop here, or choose. 50 MB per file. Lands in {cwd || "Vault"}. {formatBytes(VAULT_FREE_BYTES_PERSONAL)} free on Personal.</span>
        {msg && (
          <span role={msgAlert ? "alert" : "status"} aria-live="polite" className="w-full text-xs text-muted-foreground">
            {msg}
          </span>
        )}
      </div>

      {queue.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm" aria-label="Upload queue">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">
              Uploads {queueActive ? `· ${Math.round(overall * 100)}%` : "· done"}
              {queue.some((i) => i.quoteGross !== undefined) &&
                ` · ~${queue.reduce((n, i) => n + (i.quoteGross ?? 0), 0).toFixed(2)} coins (25% cut included)`}
            </p>
            <button
              type="button"
              onClick={() => setQueue((prev) => prev.filter((i) => ["hashing", "registering", "uploading", "confirming", "queued"].includes(i.status)))}
              className="min-h-[44px] rounded-full border border-border px-3 py-1 text-xs font-bold"
            >
              Clear finished
            </button>
          </div>
          <progress value={overall} max={1} aria-label="Overall upload progress" className="h-2 w-full" />
          <ul className="space-y-2">
            {queue.map((it) => (
              <li key={it.key} className="rounded-xl border border-border p-2 text-xs" role="status" aria-label={`${basename(it.safePath)}: ${it.status}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate font-mono font-bold" title={it.safePath}>
                    {basename(it.safePath)}
                  </span>
                  <span className="text-muted-foreground">
                    {it.status === "done" ? "Stored" : it.status === "error" ? (it.error ?? "Failed") : `${it.status} · ${Math.round(it.progress * 100)}%`}
                  </span>
                </div>
                <progress value={it.progress} max={1} aria-label={`Progress for ${basename(it.safePath)}`} className="h-1.5 w-full" />
                <div className="mt-1 flex gap-2">
                  {it.status === "error" && (
                    <button type="button" onClick={() => retryItem(it.key)} className="min-h-[44px] rounded-full border border-border px-3 py-1 font-bold">
                      Retry
                    </button>
                  )}
                  {it.status !== "done" && (
                    <button type="button" onClick={() => cancelItem(it.key)} className="min-h-[44px] rounded-full border border-border px-3 py-1 font-bold">
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2" aria-busy={busy}>
        {(cwd || folders.length > 0) && (
          <li className="rounded-xl border border-dashed border-border bg-card p-3 text-sm">
            <nav aria-label="Vault folders" className="flex flex-wrap items-center gap-1 text-xs">
              <button type="button" onClick={() => setCwd("")} className={`min-h-[44px] font-mono font-bold underline ${!cwd ? "text-foreground" : "text-cyan-600 dark:text-cyan-300"}`}>
                Vault
              </button>
              {crumbs.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    onClick={() => setCwd(crumbs.slice(0, i + 1).join("/"))}
                    className={`min-h-[44px] font-mono font-bold underline ${i === crumbs.length - 1 ? "text-foreground" : "text-cyan-600 dark:text-cyan-300"}`}
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
                className="min-h-[44px] rounded-full border border-fuchsia-400/40 px-3 py-1 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-300"
              >
                <span aria-hidden="true">🎮 </span>newgameplus
              </button>
              {folders.map((name) => (
                <span key={name} className="flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1 text-xs font-bold">
                  <button type="button" onClick={() => setCwd(cwd ? `${cwd}/${name}` : name)} className="min-h-[36px]" aria-label={`Open folder ${name}`}>
                    <span aria-hidden="true">📁 </span>{name}
                  </button>
                  <button type="button" onClick={() => void renameFolder(name)} className="min-h-[36px] px-1 text-muted-foreground" aria-label={`Rename folder ${name}`}>
                    ✎
                  </button>
                  <button type="button" onClick={() => void deleteFolder(name)} className="min-h-[36px] px-1 text-muted-foreground" aria-label={`Delete folder ${name}`}>
                    🗑
                  </button>
                </span>
              ))}
            </div>
          </li>
        )}
        {selected.length > 0 && (
          <li className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-cyan-600 bg-card p-3 text-sm sm:col-span-2">
            <span className="font-bold">{selected.length} selected</span>
            <button type="button" onClick={() => setSelected([])} className="min-h-[44px] rounded-full border border-border px-3 py-1 text-xs font-bold">
              Clear
            </button>
            <button type="button" onClick={() => void batchDownload()} disabled={batchBusy || showTrash} className="min-h-[44px] rounded-full border border-border px-3 py-1 text-xs font-bold disabled:opacity-50">
              Download
            </button>
            <button type="button" onClick={() => void batchDelete()} disabled={batchBusy} className="min-h-[44px] rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
              {showTrash ? "Purge forever" : "Trash"}
            </button>
          </li>
        )}
        {filesHere.map((f) => (
          <li key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="flex items-center gap-2">
              {!f.quarantined && (
                <input
                  type="checkbox"
                  checked={selected.includes(f.id)}
                  onChange={() => toggleSelect(f.id)}
                  aria-label={`Select ${basename(f.path)}`}
                  className="h-5 w-5"
                />
              )}
              <span className="truncate font-mono font-bold" title={f.path}>{basename(f.path)}</span>
            </p>
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{f.path}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {f.kind} · {formatBytes(f.bytes)} · {new Date(f.updated_at).toLocaleString()}
              {f.quarantined ? " · 🛡️ quarantined (hidden)" : ""}
            </p>
            {showTrash ? (
              <span className="mt-1 flex min-h-[44px] flex-wrap items-center gap-3">
                <button type="button" onClick={() => void restoreFile(f.id)} className="min-h-[44px] text-xs font-bold text-cyan-600 underline dark:text-cyan-300">
                  Restore
                </button>
                <button type="button" onClick={() => void purgeFile(f.id)} className="min-h-[44px] text-xs font-bold text-red-500 underline">
                  Delete forever
                </button>
              </span>
            ) : !f.quarantined ? (
              <span className="mt-1 flex min-h-[44px] flex-wrap items-center gap-3">
                <button type="button" onClick={(e) => void openPreview(f, e.currentTarget)} className="min-h-[44px] text-xs font-bold text-cyan-600 underline dark:text-cyan-300">
                  Preview
                </button>
                <a className="flex min-h-[44px] items-center text-xs font-bold text-cyan-600 underline dark:text-cyan-300" href={`/api/vault/blobs/${f.id}`}>
                  Open →
                </a>
                <a className="flex min-h-[44px] items-center text-xs font-bold text-cyan-600 underline dark:text-cyan-300" href={`/api/vault/blobs/${f.id}`} download={basename(f.path)}>
                  Download
                </a>
                <button type="button" onClick={() => void openShares(f)} className="min-h-[44px] text-xs font-bold text-cyan-600 underline dark:text-cyan-300">
                  Share
                </button>
                <button type="button" onClick={() => void renameFile(f)} className="min-h-[44px] text-xs font-bold text-muted-foreground underline">
                  Rename
                </button>
                <button type="button" onClick={() => void moveFile(f)} className="min-h-[44px] text-xs font-bold text-muted-foreground underline">
                  Move
                </button>
                <button type="button" onClick={() => void deleteFile(f)} className="min-h-[44px] text-xs font-bold text-red-500 underline">
                  Trash
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {previewId && (
        <div className="rounded-2xl border border-border bg-card p-3" role="dialog" aria-modal="true" aria-label="File preview">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-bold">{previewName}</p>
            <button ref={closeBtn} type="button" onClick={closePreview} className="min-h-[44px] rounded-full border border-border px-3 py-1 text-xs font-bold">
              Close
            </button>
          </div>
          {previewKind === "image" && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={previewName} className="mt-2 max-h-[420px] w-full rounded-xl object-contain bg-black" />
          ) : previewKind === "audio" && previewUrl ? (
            <audio controls preload="metadata" src={previewUrl} className="mt-2 w-full" />
          ) : previewKind === "video" && previewUrl ? (
            <video controls preload="metadata" src={previewUrl} className="mt-2 max-h-[420px] w-full rounded-xl bg-black" />
          ) : previewKind === "pdf" && previewUrl ? (
            <iframe title={`PDF preview of ${previewName}`} src={previewUrl} sandbox="" className="mt-2 h-[420px] w-full rounded-xl bg-white" />
          ) : previewKind === "html" && previewUrl ? (
            <iframe title={`HTML preview of ${previewName}`} src={previewUrl} sandbox="" className="mt-2 h-[420px] w-full rounded-xl bg-white" />
          ) : previewKind === "markdown" && previewText !== null ? (
            <div className="mt-2 max-h-[420px] overflow-auto rounded-xl bg-black/80 p-3 text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: previewText }} />
          ) : previewKind === "text" && previewText !== null ? (
            <pre className="mt-2 max-h-[420px] overflow-auto rounded-xl bg-black/80 p-3 font-mono text-[11px] text-slate-200">{previewText}</pre>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {previewUrl || previewText ? "Loading preview…" : "No preview for this file (too large, quarantined, or unsupported). Use Open or Download."}
            </p>
          )}
        </div>
      )}

      {shareFile && (
        <div className="rounded-2xl border border-border bg-card p-3" role="dialog" aria-modal="true" aria-label="Share links">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-bold">Share {basename(shareFile.path)}</p>
            <button type="button" onClick={() => setShareFile(null)} className="min-h-[44px] rounded-full border border-border px-3 py-1 text-xs font-bold">
              Close
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex min-h-[44px] items-center gap-2">
              <span className="font-bold">Expires</span>
              <select aria-label="Link expiry" value={expiryHrs} onChange={(e) => setExpiryHrs(e.target.value)} className="min-h-[44px] rounded-lg border border-border bg-background px-2 py-1.5">
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </label>
            <button type="button" onClick={() => void createShare()} disabled={shareBusy} className="min-h-[44px] rounded-full bg-cyan-600 px-4 py-1.5 font-bold text-white disabled:opacity-50">
              Create link
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {shares.map((s) => {
              const url = `${window.location.origin}/api/vault/s/${s.token}`;
              return (
                <li key={s.id} className="rounded-xl border border-border p-2 text-xs">
                  <p className="truncate font-mono" title={url}>{url}</p>
                  <p className="mt-1 text-muted-foreground">
                    Expires {s.expires_at ? new Date(s.expires_at).toLocaleString() : "never"}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => void copyText(url, "Link copied.")} className="min-h-[44px] rounded-full border border-border px-3 py-1 font-bold">
                      Copy
                    </button>
                    <button type="button" onClick={() => void revokeShare(s.id)} className="min-h-[44px] rounded-full border border-border px-3 py-1 font-bold text-red-500">
                      Revoke
                    </button>
                  </div>
                </li>
              );
            })}
            {shares.length === 0 && !shareBusy && <li className="text-xs text-muted-foreground">No active links.</li>}
          </ul>
        </div>
      )}

      <details className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <summary className="min-h-[44px] cursor-pointer font-bold">Vault limits &amp; rules</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>50 MB per file — every game loads fast. Larger files are rejected before upload.</li>
          <li>Personal scope: {formatBytes(VAULT_FREE_BYTES_PERSONAL)} free. Teams/orgs start at 0 — fund up. Overage ~3 coins/GB-month, 25% cut included, never on top.</li>
          <li>Blocked inline-active types: HTML/SVG/XML/JS MIME + .html/.svg/.js/.swf/.hta/.xml extensions rejected — re-save as .txt/.bin.</li>
          <li>One scope per file (personal/team/org), enforced in DB. Team/org needs membership; personal stays private.</li>
          <li>Trash counts toward quota until purge. Share links die with the file.</li>
          <li>Quarantined files are hidden: no preview, download, or share — queued for human review.</li>
        </ul>
      </details>

      {filesHere.length === 0 && folders.length === 0 && !busy && (
        <p className="text-sm text-muted-foreground">
          {showTrash ? "Trash is empty." : "Nothing here yet; store your first file above."}
          {cwd === "newgameplus" && !showTrash && (
            <> No bundles yet — <a className="font-bold text-cyan-600 underline dark:text-cyan-300" href="/newgameplus">build one →</a></>
          )}
        </p>
      )}
    </div>
  );
}
