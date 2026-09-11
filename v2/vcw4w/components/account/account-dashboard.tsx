"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = { display_name?: string | null; family_role?: string | null; age_band?: string | null };
type LedgerRow = { delta?: number; reason?: string; created_at?: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? `Request failed (${response.status})`));
  return body as T;
}

export function AccountDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [centicentcoins, setCenticentcoins] = useState<number | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [name, setName] = useState("");
  const [band, setBand] = useState("unknown");
  const [familyRole, setFamilyRole] = useState("solo");
  const [message, setMessage] = useState("Loading account…");
  const [busy, setBusy] = useState(false);

  const loadAccount = useCallback(() => { void Promise.all([request<{ profile: Profile }>("/api/me/profile"), request<{ balance: number; centicentcoins?: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=10")]).then(([p, b, h]) => { setProfile(p.profile); setName(p.profile?.display_name ?? ""); setBand(p.profile?.age_band ?? "unknown"); setFamilyRole(p.profile?.family_role ?? "solo"); setBalance(b.balance); setCenticentcoins(typeof b.centicentcoins === "number" ? b.centicentcoins : Math.round((Number(b.balance) || 0) * 100)); setHistory(h.rows ?? []); setMessage(""); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load account.")); }, []);
  useEffect(() => { loadAccount(); window.addEventListener("vibe-coins-changed", loadAccount); return () => window.removeEventListener("vibe-coins-changed", loadAccount); }, [loadAccount]);

  async function saveName() { if (busy) return; setBusy(true); setMessage("Saving…"); try { await request("/api/me/profile", { method: "PATCH", body: JSON.stringify({ display_name: name, age_band: band, family_role: familyRole }) }); setProfile({ display_name: name, age_band: band, family_role: familyRole }); setMessage("Profile saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save profile."); } finally { setBusy(false); } }
  async function claim() { if (busy) return; setBusy(true); setMessage("Checking for purchases…"); try { const result = await request<{ claimed: number }>("/api/coins/claim", { method: "POST", body: "{}" }); const [nextBalance, nextHistory] = await Promise.all([request<{ balance: number; centicentcoins?: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=10")]); setBalance(nextBalance.balance); setCenticentcoins(typeof nextBalance.centicentcoins === "number" ? nextBalance.centicentcoins : Math.round((Number(nextBalance.balance) || 0) * 100)); setHistory(nextHistory.rows ?? []); setMessage(result.claimed ? `Claimed ${result.claimed} coin grant(s).` : "No unclaimed purchases found."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to claim coins."); } finally { setBusy(false); } }

  return <div className="space-y-8"><p role="status" className="text-sm text-slate-400">{message}</p><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Profile</h2><label className="mt-4 block text-sm text-slate-400" htmlFor="display-name">Display name</label><div className="mt-2 flex gap-3"><input id="display-name" name="displayName" autoComplete="nickname" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /><button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={saveName}>Save</button></div><p className="mt-2 text-xs text-slate-500">Current: {profile?.display_name || "Not set"}</p></section><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Family &amp; age band</h2><p className="mt-2 text-sm text-slate-400">Full accounts are 13+ only: Teen (13-17) or Adult (18+). Under 13 plays on a parent-created Child account (Account → Family tab). Teen bands block Adults (18+) games like Kids Mode; no birth date is ever collected.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-400" htmlFor="age-band">My age band<select id="age-band" name="ageBand" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" value={band} onChange={(event) => setBand(event.target.value)}><option value="unknown">Prefer not to say (legacy — treated as Teen)</option><option value="teen">Teen (13-17)</option><option value="adult">Adult (18+)</option></select></label><label className="text-sm text-slate-400" htmlFor="family-role">Account type<select id="family-role" name="familyRole" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" value={familyRole} onChange={(event) => setFamilyRole(event.target.value)}><option value="solo">Solo</option><option value="parent">Parent (manage children)</option></select></label></div><p className="mt-2 text-xs text-slate-500">Save in the Profile section above to apply.</p></section><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Vibe Coins</h2><p className="mt-2 text-3xl font-black text-cyan-300">{balance ?? "-"}</p><p className="mt-1 text-sm text-slate-400">{centicentcoins ?? "-"} centicentcoins <span className="text-slate-500">(100 per coin · billed per second, quoted per hour)</span></p></div><button className="rounded-lg border border-white/20 px-4 py-2" onClick={claim}>Claim purchases</button></div><ul className="mt-6 space-y-2 text-sm text-slate-400">{history.map((row, index) => <li key={`${row.created_at ?? "row"}-${index}`} className="flex justify-between border-t border-white/10 pt-2"><span>{row.reason ?? "Coin activity"}</span><span>{row.delta ?? 0}</span></li>)}</ul></section></div>;
}
