"use client";

import { useEffect, useState } from "react";

type Profile = { display_name?: string | null };
type LedgerRow = { amount?: number; reason?: string; created_at?: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? `Request failed (${response.status})`));
  return body as T;
}

export function AccountDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Loading account…");

  useEffect(() => { void Promise.all([request<{ profile: Profile }>("/api/me/profile"), request<{ balance: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=10")]).then(([p, b, h]) => { setProfile(p.profile); setName(p.profile?.display_name ?? ""); setBalance(b.balance); setHistory(h.rows ?? []); setMessage(""); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load account.")); }, []);

  async function saveName() { setMessage("Saving…"); try { await request("/api/me/profile", { method: "PATCH", body: JSON.stringify({ display_name: name }) }); setProfile({ display_name: name }); setMessage("Profile saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save profile."); } }
  async function claim() { setMessage("Checking for purchases…"); try { const result = await request<{ claimed: number }>("/api/coins/claim", { method: "POST", body: "{}" }); const [nextBalance, nextHistory] = await Promise.all([request<{ balance: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=10")]); setBalance(nextBalance.balance); setHistory(nextHistory.rows ?? []); setMessage(result.claimed ? `Claimed ${result.claimed} coin grant(s).` : "No unclaimed purchases found."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to claim coins."); } }

  return <div className="space-y-8"><p role="status" className="text-sm text-slate-400">{message}</p><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Profile</h2><label className="mt-4 block text-sm text-slate-400" htmlFor="display-name">Display name</label><div className="mt-2 flex gap-3"><input id="display-name" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /><button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={saveName}>Save</button></div><p className="mt-2 text-xs text-slate-500">Current: {profile?.display_name || "Not set"}</p></section><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Vibe Coins</h2><p className="mt-2 text-3xl font-black text-cyan-300">{balance ?? "—"}</p></div><button className="rounded-lg border border-white/20 px-4 py-2" onClick={claim}>Claim purchases</button></div><ul className="mt-6 space-y-2 text-sm text-slate-400">{history.map((row, index) => <li key={`${row.created_at ?? "row"}-${index}`} className="flex justify-between border-t border-white/10 pt-2"><span>{row.reason ?? "Coin activity"}</span><span>{row.amount ?? 0}</span></li>)}</ul></section></div>;
}
