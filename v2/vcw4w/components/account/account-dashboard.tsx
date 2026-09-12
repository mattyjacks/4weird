"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Profile = { display_name?: string | null; family_role?: string | null; age_band?: string | null };
type LedgerRow = { delta?: number; reason?: string; created_at?: string };

type AgeBandChoice = "" | "teen" | "adult";

const UNDER13_HELP =
  "Under 13 needs a parent-created Child account in Account → Family (have a parent sign up as Adult 18+ first).";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? `Request failed (${response.status})`));
  return body as T;
}

function toBandChoice(value: unknown): AgeBandChoice {
  return value === "teen" || value === "adult" ? value : "";
}

export function AccountDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [centicentcoins, setCenticentcoins] = useState<number | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [name, setName] = useState("");
  const [band, setBand] = useState<AgeBandChoice>("");
  const [familyRole, setFamilyRole] = useState("solo");
  const [message, setMessage] = useState("Loading account…");
  const [busy, setBusy] = useState(false);

  const loadAccount = useCallback(() => { void Promise.all([request<{ profile: Profile | null }>("/api/me/profile"), request<{ balance: number; centicentcoins?: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=25")]).then(([p, b, h]) => { setProfile(p.profile ?? null); setName(p.profile?.display_name ?? ""); setBand(toBandChoice(p.profile?.age_band)); setFamilyRole(p.profile?.family_role ?? "solo"); setBalance(b.balance); setCenticentcoins(typeof b.centicentcoins === "number" ? b.centicentcoins : Math.round((Number(b.balance) || 0) * 100)); setHistory(h.rows ?? []); setLoaded(true); setMessage(""); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load account.")); }, []);
  useEffect(() => { loadAccount(); window.addEventListener("vibe-coins-changed", loadAccount); return () => window.removeEventListener("vibe-coins-changed", loadAccount); }, [loadAccount]);

  // Legacy rows (null/unknown/kid) can never satisfy the play gate: the API
  // rejects unknown/kid writes, so the UI never sends them - it prompts for
  // a teen/adult choice instead.
  const needsBand = loaded && profile?.age_band !== "teen" && profile?.age_band !== "adult";

  async function saveName() { if (busy) return; setBusy(true); setMessage("Saving…"); try { await request("/api/me/profile", { method: "PATCH", body: JSON.stringify({ display_name: name }) }); setProfile((prev) => ({ ...(prev ?? {}), display_name: name })); setMessage("Profile saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save profile."); } finally { setBusy(false); } }

  async function saveBand() {
    if (busy) return;
    if (band !== "teen" && band !== "adult") {
      setMessage(`Choose your age band: Teen (13-17) or Adult (18+). ${UNDER13_HELP}`);
      return;
    }
    setBusy(true); setMessage("Saving…");
    try { await request("/api/me/profile", { method: "PATCH", body: JSON.stringify({ age_band: band }) }); setProfile((prev) => ({ ...(prev ?? {}), age_band: band })); setMessage("Age band saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save age band."); } finally { setBusy(false); }
  }

  async function saveFamilyRole() { if (busy) return; setBusy(true); setMessage("Saving…"); try { await request("/api/me/profile", { method: "PATCH", body: JSON.stringify({ family_role: familyRole }) }); setProfile((prev) => ({ ...(prev ?? {}), family_role: familyRole })); setMessage("Profile saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save profile."); } finally { setBusy(false); } }

  async function claim() { if (busy) return; setBusy(true); setMessage("Checking for purchases…"); try { const result = await request<{ claimed: number }>("/api/coins/claim", { method: "POST", body: "{}" }); const [nextBalance, nextHistory] = await Promise.all([request<{ balance: number; centicentcoins?: number }>("/api/coins/balance"), request<{ rows: LedgerRow[] }>("/api/coins/history?limit=25")]); setBalance(nextBalance.balance); setCenticentcoins(typeof nextBalance.centicentcoins === "number" ? nextBalance.centicentcoins : Math.round((Number(nextBalance.balance) || 0) * 100)); setHistory(nextHistory.rows ?? []); setMessage(result.claimed ? `Claimed ${result.claimed} coin grant(s).` : "No unclaimed purchases found."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to claim coins."); } finally { setBusy(false); } }

  return (
    <div className="space-y-8">
      <p role="status" className="text-sm text-slate-400">{message}</p>
      {needsBand && (
        <div role="alert" id="age-band" className="scroll-mt-24 rounded-2xl border border-amber-300/50 bg-amber-300/[.08] p-6">
          <h2 className="text-xl font-bold text-amber-200">Choose Teen/Adult to play rated games</h2>
          <p className="mt-2 text-sm text-slate-300">
            Your account has no age band yet, so rated games stay restricted. Pick Teen (13-17) or Adult (18+) below
            and save — no birth date is ever collected. {UNDER13_HELP}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300" htmlFor="age-band-prompt">
              Age band
              <select id="age-band-prompt" name="ageBandPrompt" className="ml-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" value={band} onChange={(event) => setBand(toBandChoice(event.target.value))}>
                <option value="">Select…</option>
                <option value="teen">Teen (13-17)</option>
                <option value="adult">Adult (18+)</option>
              </select>
            </label>
            <button type="button" className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={saveBand}>Save age band</button>
            <Link className="text-sm font-semibold text-cyan-300 hover:underline" href="/account?tab=family">Go to Family</Link>
          </div>
        </div>
      )}
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Profile</h2>
        <label className="mt-4 block text-sm text-slate-400" htmlFor="display-name">Display name</label>
        <div className="mt-2 flex gap-3">
          <input id="display-name" name="displayName" autoComplete="nickname" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
          <button type="button" className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={saveName}>Save</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Current: {profile?.display_name || "Not set"}</p>
      </section>
      <section id="age-band" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Family &amp; age band</h2>
        <p className="mt-2 text-sm text-slate-400">Full accounts are 13+ only: Teen (13-17) or Adult (18+). Under 13 plays on a parent-created Child account (<Link className="text-cyan-300 hover:underline" href="/account?tab=family">Account → Family tab</Link>). Teen bands block Adults (18+) games like Kids Mode; no birth date is ever collected.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-slate-400" htmlFor="age-band">My age band</label>
            <select id="age-band" name="ageBand" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" value={band} onChange={(event) => setBand(toBandChoice(event.target.value))}>
              <option value="">Select…</option>
              <option value="teen">Teen (13-17)</option>
              <option value="adult">Adult (18+)</option>
            </select>
            <button type="button" className="mt-2 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={saveBand}>Save age band</button>
          </div>
          <div>
            <label className="text-sm text-slate-400" htmlFor="family-role">Account type</label>
            <select id="family-role" name="familyRole" className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" value={familyRole} onChange={(event) => setFamilyRole(event.target.value)}>
              <option value="solo">Solo</option>
              <option value="parent">Parent (manage children)</option>
            </select>
            <button type="button" className="mt-2 rounded-lg border border-white/20 px-4 py-2" onClick={saveFamilyRole}>Save account type</button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Current band: {profile?.age_band === "teen" || profile?.age_band === "adult" ? profile.age_band : "not set — choose Teen/Adult to play rated games"}</p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Vibe Coins</h2>
            <p className="mt-2 text-3xl font-black text-cyan-300">{balance ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-400">{centicentcoins ?? "-"} centicentcoins <span className="text-slate-500">(100 per coin — billed per second, quoted per hour)</span></p>
          </div>
          <button type="button" className="rounded-lg border border-white/20 px-4 py-2" onClick={claim}>Claim purchases</button>
        </div>
        <ul className="mt-6 space-y-2 text-sm text-slate-400">{history.map((row, index) => <li key={`${row.created_at ?? "row"}-${index}`} className="flex justify-between border-t border-white/10 pt-2"><span>{row.reason ?? "Coin activity"}</span><span>{row.delta ?? 0}</span></li>)}</ul>
        <p className="mt-4 text-sm"><a className="font-semibold text-cyan-300 hover:underline" href="/my/usage/">Full usage: hours played, loads, builds &amp; spend →</a></p>
      </section>
    </div>
  );
}
