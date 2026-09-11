"use client";

import { useState } from "react";

/**
 * KidLoginForm; child sign-in with `username#1234` + password. No email, no
 * Supabase account: the server sets an httpOnly session cookie on success.
 */
export function KidLoginForm({ next = "/games" }: { next?: string }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("Logging in…");
    try {
      const res = await fetch("/api/family/kid-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(body.error ?? "Login failed."));
      setPassword("");
      window.location.assign(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={login} className="space-y-4 rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">🎮 Kid &amp; Teen login</h2>
      <p className="text-sm text-slate-300">
        Log in with the handle your parent made for you; it looks like <b>name#1234</b>; plus your password.
      </p>
      <div>
        <label className="text-sm text-slate-300" htmlFor="kid-login-handle">Handle (name#1234)</label>
        <input
          id="kid-login-handle"
          name="handle"
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          value={handle}
          maxLength={30}
          required
          onChange={(e) => setHandle(e.target.value)}
          placeholder="sparky#1234"
        />
      </div>
      <div>
        <label className="text-sm text-slate-300" htmlFor="kid-login-password">Password</label>
        <input
          id="kid-login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          value={password}
          maxLength={128}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button disabled={busy} className="w-full rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
        {busy ? "Logging in…" : "Log in and play"}
      </button>
      <p role="status" className="text-sm text-slate-400">{message}</p>
      <p className="text-xs text-slate-500">
        Parents: manage handles, budgets, time limits, and allowed hours in Account → Family.
      </p>
    </form>
  );
}
