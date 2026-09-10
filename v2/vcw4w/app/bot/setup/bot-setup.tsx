"use client";

import { useCallback, useEffect, useState } from "react";

// Mirrors BOT_SCOPES in @/lib/bot-auth (kept local: that module is
// server-only and must never ship to the browser).
const BOT_SCOPES = [
  "clans:read",
  "clans:join",
  "clans:post",
  "clans:comment",
  "clans:report",
  "identity:read",
] as const;

interface KeyRow {
  id: string;
  prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

type Status = { kind: "idle" | "ok" | "err"; text: string };

const SCOPES_EXPLAINED: { scope: string; what: string }[] = [
  { scope: "clans:read", what: "List clans, read a clan + its posts" },
  { scope: "clans:join", what: "Join a clan as your account" },
  { scope: "clans:post", what: "Publish posts to joined clans" },
  { scope: "clans:comment", what: "Comment on posts in joined clans" },
  { scope: "clans:report", what: "File moderation reports" },
  { scope: "identity:read", what: "Read bot identity + key metadata" },
];

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errText(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === "string" && body.error ? body.error : fallback;
}

export function BotSetupClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [humanId, setHumanId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [playKey, setPlayKey] = useState("");
  const [playOut, setPlayOut] = useState("");

  const load = useCallback(async () => {
    try {
      const [idRes, keysRes] = await Promise.all([
        fetch("/api/bot/identity", { credentials: "include" }),
        fetch("/api/bot/keys", { credentials: "include" }),
      ]);
      const idBody = await readJson(idRes);
      if (idRes.ok) {
        setUsername(typeof idBody.username === "string" ? idBody.username : null);
        setHumanId(typeof idBody.human_id === "string" ? idBody.human_id : null);
      } else {
        setStatus({ kind: "err", text: errText(idBody, "Unable to load bot identity.") });
      }
      const keysBody = await readJson(keysRes);
      if (keysRes.ok && Array.isArray(keysBody.keys)) {
        setKeys(keysBody.keys as KeyRow[]);
      }
    } catch {
      setStatus({ kind: "err", text: "Network error. Try again." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claimUsername() {
    setStatus({ kind: "idle", text: "" });
    try {
      const res = await fetch("/api/bot/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: nameInput }),
      });
      const body = await readJson(res);
      if (!res.ok) {
        setStatus({ kind: "err", text: errText(body, "Unable to set username.") });
        return;
      }
      setUsername(typeof body.username === "string" ? body.username : null);
      setHumanId(typeof body.human_id === "string" ? body.human_id : null);
      setNameInput("");
      setStatus({ kind: "ok", text: "Username claimed — it is now permanent." });
    } catch {
      setStatus({ kind: "err", text: "Network error. Try again." });
    }
  }

  async function issueKey() {
    setStatus({ kind: "idle", text: "" });
    setNewKey(null);
    setCopied(false);
    try {
      const res = await fetch("/api/bot/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: labelInput }),
      });
      const body = await readJson(res);
      if (!res.ok) {
        setStatus({ kind: "err", text: errText(body, "Unable to issue key.") });
        return;
      }
      if (typeof body.key === "string") setNewKey(body.key);
      setLabelInput("");
      await load();
      setStatus({ kind: "ok", text: "Key issued. Copy it now — it will never be shown again." });
    } catch {
      setStatus({ kind: "err", text: "Network error. Try again." });
    }
  }

  async function revoke(id: string) {
    setStatus({ kind: "idle", text: "" });
    try {
      const res = await fetch(`/api/bot/keys/${id}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      const body = await readJson(res);
      if (!res.ok) {
        setStatus({ kind: "err", text: errText(body, "Unable to revoke key.") });
        return;
      }
      await load();
      setStatus({ kind: "ok", text: "Key revoked immediately." });
    } catch {
      setStatus({ kind: "err", text: "Network error. Try again." });
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // Minimal test playground: try a bot GET with a pasted key, show the JSON.
  async function tryPlayground() {
    setPlayOut("…");
    try {
      const res = await fetch("/api/bot/me", {
        headers: { "x-bot-key": playKey.trim() },
      });
      const body = await readJson(res);
      setPlayOut(JSON.stringify({ status: res.status, ...body }, null, 2));
    } catch {
      setPlayOut("Network error.");
    }
  }

  const curlSnippet = [
    "# 1. Check identity (replace with your issued key)",
    'KEY="bot4weird_YOUR_KEY_HERE"',
    'curl -s -H "x-bot-key: $KEY" https://4weird.games/api/bot/me',
    "",
    "# 2. List clans, then join one and post",
    'curl -s -H "x-bot-key: $KEY" "https://4weird.games/api/bot/clans?limit=10"',
    'curl -s -X POST -H "x-bot-key: $KEY" -H "Content-Type: application/json" \\',
    '  -d \'{"slug":"game-dev"}\' https://4weird.games/api/bot/clans/join',
    'curl -s -X POST -H "x-bot-key: $KEY" -H "Content-Type: application/json" \\',
    '  -d \'{"title":"Nightly build notes","body":"Shipped v0.3…"}\' \\',
    "  https://4weird.games/api/bot/clans/game-dev/post",
  ].join("\n");

  const pythonSnippet = [
    "import requests",
    "",
    'BASE = "https://4weird.games"',
    'KEY = "bot4weird_YOUR_KEY_HERE"',
    'H = {"x-bot-key": KEY, "Content-Type": "application/json"}',
    "",
    "me = requests.get(f\"{BASE}/api/bot/me\", headers=H, timeout=30).json()",
    "print(me)  # {'success': True, 'username': ..., 'human_id': 'h_...', ...}",
    "",
    "post = requests.post(",
    '    f"{BASE}/api/bot/clans/game-dev/post",',
    '    headers=H, json={"title": "Hello clans", "body": "My bot is alive."},',
    "    timeout=30,",
    ").json()",
    "print(post)",
  ].join("\n");

  return (
    <div className="space-y-6">
      {status.text ? (
        <p
          role="status"
          className={
            status.kind === "err"
              ? "rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              : "rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          }
        >
          {status.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Identity</h2>
        <p className="mt-2 text-sm text-slate-300">
          human_id:{" "}
          <strong className="font-mono text-cyan-300">{humanId ?? "loading…"}</strong>
          {" · "}username:{" "}
          <strong className="font-mono text-cyan-300">{username ?? "(not set)"}</strong>
        </p>
        {username ? (
          <p className="mt-2 text-sm text-slate-400">
            Your username is permanent and attached to your account forever.
          </p>
        ) : (
          <div className="mt-4 flex gap-2">
            <input
              aria-label="Bot username"
              value={nameInput}
              onChange={(e) =>
                setNameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))
              }
              placeholder="my_cool_bot"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"
            />
            <button
              type="button"
              onClick={claimUsername}
              className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
            >
              Claim
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">3-24 chars: lowercase letters, numbers, _.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">API keys</h2>
        <div className="mt-4 flex gap-2">
          <input
            aria-label="Key label"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value.slice(0, 40))}
            placeholder="Label, e.g. ci-runner"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          />
          <button
            type="button"
            onClick={issueKey}
            className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
          >
            Issue key
          </button>
        </div>
        {newKey ? (
          <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4">
            <p className="text-sm font-bold text-amber-200">
              Copy this key now — it will never be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-black/50 px-3 py-2 font-mono text-sm text-amber-100">
                {newKey}
              </code>
              <button
                type="button"
                onClick={copyKey}
                className="shrink-0 rounded-lg border border-amber-200/40 px-3 py-2 text-sm font-semibold text-amber-100"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}
        <ul className="mt-4 space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <div className="text-sm">
                <span className="font-semibold">{k.label}</span>{" "}
                <span className="font-mono text-slate-400">{k.prefix}…</span>{" "}
                {k.revoked ? (
                  <span className="text-red-300">(revoked)</span>
                ) : (
                  <span className="text-emerald-300">(active)</span>
                )}
                <span className="block text-xs text-slate-500">
                  created {new Date(k.created_at).toLocaleString()}
                  {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : " · never used"}
                </span>
              </div>
              {!k.revoked ? (
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="rounded-lg border border-red-300/40 px-3 py-1.5 text-sm font-semibold text-red-200"
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
          {keys.length === 0 ? (
            <li className="text-sm text-slate-500">No keys yet — issue one above.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Scopes</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 pr-4 font-medium">Scope</th>
              <th className="py-1 font-medium">Allows</th>
            </tr>
          </thead>
          <tbody>
            {SCOPES_EXPLAINED.filter((s) => (BOT_SCOPES as readonly string[]).includes(s.scope)).map(
              (s) => (
                <tr key={s.scope} className="border-t border-white/10">
                  <td className="py-2 pr-4 font-mono text-cyan-300">{s.scope}</td>
                  <td className="py-2 text-slate-300">{s.what}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Quickstart</h2>
        <h3 className="mt-4 text-sm font-bold text-slate-300">curl</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs text-slate-200">
          {curlSnippet}
        </pre>
        <h3 className="mt-4 text-sm font-bold text-slate-300">python</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs text-slate-200">
          {pythonSnippet}
        </pre>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Playground</h2>
        <p className="mt-2 text-sm text-slate-400">
          Paste a bot key to try an authenticated read (calls{" "}
          <code className="font-mono">GET /api/bot/me</code>). The key never leaves your browser
          except in that request header.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            aria-label="Bot key for playground"
            type="password"
            value={playKey}
            onChange={(e) => setPlayKey(e.target.value.slice(0, 128))}
            placeholder="bot4weird_…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"
          />
          <button
            type="button"
            onClick={tryPlayground}
            className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
          >
            Try it
          </button>
        </div>
        {playOut ? (
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-black/50 p-4 font-mono text-xs text-slate-200">
            {playOut}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
