"use client";

import { useCallback, useEffect, useState } from "react";

type Kid = {
  id: string;
  username: string;
  discriminator: string;
  handle: string;
  age_band: "kid" | "teen" | "adult";
  status: "active" | "suspended";
  created_at: string;
  last_login_at: string | null;
  balance: number;
  seconds_today: number;
  controls: {
    daily_minutes: number | null;
    allowed_start: string;
    allowed_end: string;
    timezone: string;
    monthly_cap_coins: number;
    hard_stop: boolean;
  } | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * ParentDashboard — Parent accounts manage Child sub-accounts here: create
 * `username#1234` logins, set budgets / daily minutes / allowed hours,
 * fund wallets from the parent's own coins, reset passwords, suspend, and
 * close (refunds the wallet). Children never touch checkout or Supabase auth.
 */
export function ParentDashboard() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [message, setMessage] = useState("Loading child accounts…");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newBand, setNewBand] = useState("kid");
  const [freshHandle, setFreshHandle] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await request<{ kids: Kid[] }>("/api/family/kids");
      setKids(r.kids ?? []);
      setMessage((r.kids ?? []).length ? "" : "No child accounts yet — create the first one below. You become a Parent account automatically.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load child accounts.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFreshHandle("");
    try {
      const r = await request<{ handle: string }>("/api/family/kids", {
        method: "POST",
        body: JSON.stringify({ username: newName, password: newPass, age_band: newBand }),
      });
      setFreshHandle(r.handle);
      setNewName("");
      setNewPass("");
      setMessage(`Created ${r.handle}.`);
      void load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create child account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">👨‍👩‍👧 Parent Mode — child accounts</h2>
        <p className="mt-2 text-sm text-slate-300">
          Children log in with a <b>username#1234 + password</b> — no email, no Supabase account. You attest their age
          band (kid 0–12, teen 13–17, adult 18+); the band gates ratings with zero date-of-birth collection. Wallets
          hold only coins you grant from your own balance — children can spend them on play, never check out, tip, or
          subscribe. At most 10 children per parent.
        </p>
        <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
        {freshHandle && (
          <p role="alert" className="mt-2 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-200">
            ✅ Created <b>{freshHandle}</b> — write down this handle and the password you chose. The handle is the login.
          </p>
        )}
        <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm" htmlFor="kid-username">
            Username
            <input id="kid-username" name="kidUsername" autoComplete="off" className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={newName} maxLength={24} required onChange={(e) => setNewName(e.target.value)} placeholder="sparky" />
          </label>
          <label className="text-sm" htmlFor="kid-password">
            Password
            <input id="kid-password" name="kidPassword" type="password" autoComplete="new-password" className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={newPass} maxLength={128} required onChange={(e) => setNewPass(e.target.value)} placeholder="8+ chars, 3 of 4 classes" />
          </label>
          <label className="text-sm" htmlFor="kid-band">
            Age band
            <select id="kid-band" name="kidBand" className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={newBand} onChange={(e) => setNewBand(e.target.value)}>
              <option value="kid">Kid (0–12)</option>
              <option value="teen">Teen (13–17)</option>
              <option value="adult">Adult (18+)</option>
            </select>
          </label>
          <button disabled={creating} className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
            {creating ? "Creating…" : "Create child"}
          </button>
        </form>
      </section>
      {kids.map((kid) => (
        <KidCard key={kid.id} kid={kid} refresh={load} />
      ))}
    </div>
  );
}

function KidCard({ kid, refresh }: { kid: Kid; refresh: () => void }) {
  const c = kid.controls;
  const [minutes, setMinutes] = useState(c?.daily_minutes === null || c?.daily_minutes === undefined ? "-1" : String(c.daily_minutes));
  const [start, setStart] = useState((c?.allowed_start ?? "06:00:00").slice(0, 5));
  const [end, setEnd] = useState((c?.allowed_end ?? "22:00:00").slice(0, 5));
  const [tz, setTz] = useState(c?.timezone ?? "UTC");
  const [cap, setCap] = useState(String(c?.monthly_cap_coins ?? 0));
  const [hardStop, setHardStop] = useState(Boolean(c?.hard_stop));
  const [band, setBand] = useState(kid.age_band);
  const [fund, setFund] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await request(`/api/family/kids/${kid.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          daily_minutes: Number(minutes),
          allowed_start: start,
          allowed_end: end,
          timezone: tz || "UTC",
          monthly_cap_coins: Number(cap),
          hard_stop: hardStop,
          age_band: band,
          status: kid.status,
        }),
      });
      setMessage("Controls saved.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend() {
    setBusy(true);
    try {
      await request(`/api/family/kids/${kid.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: kid.status === "active" ? "suspended" : "active" }),
      });
      setMessage(kid.status === "active" ? "Suspended — live sessions stop working." : "Reactivated.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update.");
    } finally {
      setBusy(false);
    }
  }

  async function fundWallet(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await request<{ balance: number }>("/api/family/fund", {
        method: "POST",
        body: JSON.stringify({ kid_id: kid.id, coins: Number(fund) }),
      });
      setFund("");
      setMessage(`Funded. New wallet balance: ${r.balance} coins.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to fund.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(`/api/family/kids/${kid.id}`, { method: "PATCH", body: JSON.stringify({ password: newPass }) });
      setNewPass("");
      setMessage("Password reset — all live sessions for this child were logged out.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reset.");
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!window.confirm(`Close ${kid.handle}? The remaining ${kid.balance} coins refund to you.`)) return;
    setBusy(true);
    try {
      const r = await request<{ refunded_coins: number }>(`/api/family/kids/${kid.id}`, { method: "DELETE" });
      setMessage(`Closed. Refunded ${r.refunded_coins} coins.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to close.");
    } finally {
      setBusy(false);
    }
  }

  const limit = c?.daily_minutes;
  const remaining = limit === null || limit === undefined ? null : Math.max(0, limit * 60 - kid.seconds_today);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">
          🎮 {kid.handle}{" "}
          <span className="text-sm font-semibold text-slate-400">
            ({kid.age_band} · {kid.status})
          </span>
        </h3>
        <span className="text-sm text-slate-300">
          💰 {kid.balance} coins · ⏱️ {fmtTime(kid.seconds_today)} today
          {remaining !== null && <> · {fmtTime(remaining)} left</>}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm" htmlFor={`minutes-${kid.id}`}>
          Time limit per day (minutes, -1 = unlimited)
          <input id={`minutes-${kid.id}`} name="dailyMinutes" type="number" min={-1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
        </label>
        <label className="text-sm" htmlFor={`start-${kid.id}`}>
          Allowed from (HH:MM)
          <input id={`start-${kid.id}`} name="allowedStart" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
        </label>
        <label className="text-sm" htmlFor={`end-${kid.id}`}>
          Allowed until (HH:MM)
          <input id={`end-${kid.id}`} name="allowedEnd" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
        </label>
        <label className="text-sm" htmlFor={`tz-${kid.id}`}>
          Timezone
          <input id={`tz-${kid.id}`} name="timezone" value={tz} maxLength={64} onChange={(e) => setTz(e.target.value)} placeholder="UTC" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
        </label>
        <label className="text-sm" htmlFor={`cap-${kid.id}`}>
          Monthly budget (coins, 0 = no cap)
          <input id={`cap-${kid.id}`} name="monthlyCap" type="number" min={0} max={100000000} step="0.01" value={cap} onChange={(e) => setCap(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm" htmlFor={`hard-${kid.id}`}>
          <input id={`hard-${kid.id}`} name="hardStop" type="checkbox" checked={hardStop} onChange={(e) => setHardStop(e.target.checked)} /> Stop spend at cap
        </label>
        <label className="text-sm" htmlFor={`band-${kid.id}`}>
          Age band (you attest this)
          <select id={`band-${kid.id}`} name="ageBand" value={band} onChange={(e) => setBand(e.target.value as Kid["age_band"])} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2">
            <option value="kid">Kid (0–12)</option>
            <option value="teen">Teen (13–17)</option>
            <option value="adult">Adult (18+)</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={save} className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Save controls</button>
        <button disabled={busy} onClick={toggleSuspend} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">
          {kid.status === "active" ? "Suspend" : "Reactivate"}
        </button>
        <button disabled={busy} onClick={close} className="rounded-lg border border-red-400/40 px-4 py-2 text-red-200 disabled:opacity-50">Close + refund</button>
      </div>
      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
        <form onSubmit={fundWallet} className="flex items-end gap-2">
          <label className="text-sm" htmlFor={`fund-${kid.id}`}>
            Fund from my coins
            <input id={`fund-${kid.id}`} name="fund" type="number" min={0.01} max={100000} step="0.01" value={fund} required onChange={(e) => setFund(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" placeholder="25" />
          </label>
          <button disabled={busy} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">Send</button>
        </form>
        <form onSubmit={resetPassword} className="flex items-end gap-2">
          <label className="text-sm" htmlFor={`pass-${kid.id}`}>
            New password (logs them out everywhere)
            <input id={`pass-${kid.id}`} name="newPassword" type="password" autoComplete="new-password" value={newPass} required minLength={8} maxLength={128} onChange={(e) => setNewPass(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
          </label>
          <button disabled={busy} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">Reset</button>
        </form>
      </div>
      <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
    </section>
  );
}
