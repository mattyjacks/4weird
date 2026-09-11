"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtGhost, fmtGhostTime } from "@/lib/ghost";

type Member = { id: string; display_name: string; roles: string[] };
type Contract = { id: string; title: string; worker_id: string; payer_id: string; rate_ghost: number; status: string };
type Timer = { id: string; contract_id: string; worker_id: string; clock_in: string; clock_out: string | null; active_seconds: number; beats: number; total_beats: number; note: string };
type Debt = { id: string; debtor_id: string; creditor_id: string; amount_ghost: number; reason: string; status: string; timer_id: string | null; created_at: string };
type Balance = { user_id: string; owed_to_me: number; i_owe: number };
type Summary = { members: Member[]; contracts: Contract[]; open_timers: Timer[]; debts: Debt[]; balances: Balance[] };
type Org = { id: string; name: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

const BEAT_SECONDS = 60;

function nameOf(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.display_name ?? `${id.slice(0, 8)}…`;
}

/**
 * GhostTimer; the /timer/ work clock for orgs. Clock in on a contract, beat
 * every 60s with visible-tab seconds (activity % = active beats / total),
 * clock out, invoice tracked seconds into Ghost Cash debts. Debts are
 * hypothetical IOUs (👻 has no value); mark/settle/void from the book.
 * Screen proof is worker-attached (manual screenshot upload), never captured.
 */
export function GhostTimer() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [me, setMe] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("Pick an org to open its Ghost books.");
  const [myTimer, setMyTimer] = useState<Timer | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [contractId, setContractId] = useState("");
  const beatAccum = useRef(0);
  const lastTick = useRef(0);

  const load = useCallback(async (org: string) => {
    if (!org) return;
    try {
      const [s, session] = await Promise.all([
        request<{ summary: Summary }>(`/api/ghost/summary?org=${org}`),
        request<{ user?: { id?: string } }>("/api/auth/session").catch(() => null),
      ]);
      setSummary(s.summary);
      const myId = String(session?.user?.id ?? "");
      setMe(myId);
      const mine = (s.summary.open_timers ?? []).find((t) => t.worker_id === myId) ?? null;
      setMyTimer(mine);
      setLiveSeconds(mine ? mine.active_seconds : 0);
      beatAccum.current = 0;
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Ghost books.");
    }
  }, []);

  useEffect(() => {
    request<{ orgs: Org[] }>("/api/orgs").then((r) => {
      setOrgs(r.orgs ?? []);
      if (r.orgs?.length === 1) setOrgId(r.orgs[0].id);
    }).catch(() => setMessage("Unable to load orgs."));
  }, []);
  useEffect(() => { void load(orgId); }, [orgId, load]);

  // External dual-timer companion mode
  const [upworkSync, setUpworkSync] = useState(false);
  const [upworkJob, setUpworkJob] = useState("");

  // Stopwatch: accumulate real seconds. In external dual-timer mode, track background seconds as well.
  useEffect(() => {
    if (!myTimer) return;
    lastTick.current = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      const dt = Math.floor((now - lastTick.current) / 1000);
      lastTick.current = now;
      // If external dual-timer mode is ON, the user is working in an external tracker app and other windows,
      // so accumulate active seconds even when this browser tab is backgrounded!
      if (document.hidden && !upworkSync) return;
      beatAccum.current += dt;
      setLiveSeconds((s) => s + dt);
      if (beatAccum.current >= BEAT_SECONDS) {
        const chunk = Math.min(300, beatAccum.current);
        beatAccum.current = 0;
        request("/api/ghost/timer", { method: "POST", body: JSON.stringify({ action: "beat", timer_id: myTimer.id, active_seconds: chunk }) })
          .then(() => undefined)
          .catch(() => { beatAccum.current += chunk; });
      }
    }, 5000);
    return () => clearInterval(tick);
  }, [myTimer, upworkSync]);

  async function clockIn() {
    if (!contractId) { setMessage("Pick a contract first."); return; }
    try {
      const fullNote = upworkSync && upworkJob ? `${note ? note + " " : ""}[External: ${upworkJob}]` : note;
      const r = await request<{ timer: Timer }>("/api/ghost/timer", { method: "POST", body: JSON.stringify({ action: "in", contract_id: contractId, note: fullNote }) });
      setMyTimer(r.timer);
      setLiveSeconds(0);
      beatAccum.current = 0;
      setMessage(upworkSync
        ? `Clocked in with external dual-timer mode enabled! Running alongside your external tracker.`
        : `Clocked in; tracking to the second. Beats flush every 60s while this tab is visible.`);
      void load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to clock in.");
    }
  }

  async function clockOut() {
    if (!myTimer) return;
    // Flush the tail before closing so no tracked second is lost.
    if (beatAccum.current > 0) {
      try {
        await request("/api/ghost/timer", { method: "POST", body: JSON.stringify({ action: "beat", timer_id: myTimer.id, active_seconds: Math.min(300, beatAccum.current) }) });
      } catch { /* closing still proceeds */ }
      beatAccum.current = 0;
    }
    try {
      const r = await request<{ summary: { earned_ghost: number; active_seconds: number } }>("/api/ghost/timer", { method: "POST", body: JSON.stringify({ action: "out", timer_id: myTimer.id }) });
      setMessage(`Clocked out: ${fmtGhostTime(r.summary.active_seconds)} tracked → ${fmtGhost(Number(r.summary.earned_ghost))} hypothetical. Invoice it from the timers list.`);
      setMyTimer(null);
      void load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to clock out.");
    }
  }

  async function invoice(timerId: string) {
    try {
      const r = await request<{ debt: Debt }>("/api/ghost/timer", { method: "POST", body: JSON.stringify({ action: "invoice", timer_id: timerId }) });
      setMessage(`Invoiced ${fmtGhost(r.debt.amount_ghost)}; payer owes worker (hypothetically, always).`);
      void load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to invoice.");
    }
  }

  async function settle(debtId: string, status: string) {
    try {
      await request("/api/ghost/debts", { method: "POST", body: JSON.stringify({ action: "settle", debt_id: debtId, status }) });
      setMessage(status === "settled" ? "Debt settled (in Ghost; no money moved, ever)." : "Debt voided.");
      void load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update debt.");
    }
  }

  const members = summary?.members ?? [];
  const myContracts = (summary?.contracts ?? []).filter((c) => c.status === "open" && c.worker_id === me);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">👻 Ghost Cash timer</h2>
        <p className="mt-2 text-sm text-slate-300">
          Hypothetical IOUs for org work - <b>not money, no value, no cash-out</b>, just a ruler for who owes whom.
          Clock in, work with this tab visible (activity % proves presence), clock out, invoice tracked seconds.
          Proof screenshots are attached by the worker, never captured.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm" htmlFor="ghost-org">
            Org
            <select id="ghost-org" name="org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2">
              <option value="">Pick an org…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          {myTimer ? (
            <div className="flex items-end gap-2">
              <p className="text-sm">⏱️ <b>{fmtGhostTime(liveSeconds)}</b> this session</p>
              <button onClick={clockOut} className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950">Clock out</button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <label className="text-sm" htmlFor="ghost-contract">
                Contract
                <select id="ghost-contract" name="contract" value={contractId} onChange={(e) => setContractId(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                  <option value="">Pick a contract…</option>
                  {myContracts.map((c) => <option key={c.id} value={c.id}>{c.title} @ {fmtGhost(c.rate_ghost)}/h</option>)}
                </select>
              </label>
              <input aria-label="Shift note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="What are you working on?" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
              <button onClick={clockIn} className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Clock in</button>
            </div>
          )}
        </div>

        {/* External dual-timer companion mode banner */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-400">
            <input
              type="checkbox"
              checked={upworkSync}
              onChange={(e) => setUpworkSync(e.target.checked)}
              className="rounded border-white/20 bg-black/30 text-emerald-400 focus:ring-0"
            />
            <span>⏱️ External Dual-Timer Companion Mode</span>
          </label>
          {upworkSync && (
            <input
              value={upworkJob}
              onChange={(e) => setUpworkJob(e.target.value)}
              placeholder="External Contract ID / Job (e.g. ~01abc123)"
              className="rounded border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1 text-xs text-white placeholder:text-zinc-500 font-mono"
            />
          )}
          <span className="text-zinc-400">
            {upworkSync
              ? "Active: Tracks background seconds while you work in an external tracker app."
              : "Enable to track 4weird Ghost debts simultaneously alongside an external timer."}
          </span>
        </div>

        <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
      </section>

      {summary && (
        <>
          <GhostContracts orgId={orgId} members={members} contracts={summary.contracts} refresh={() => load(orgId)} me={me} />
          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
            <h3 className="text-lg font-bold">Open timers</h3>
            {(summary.open_timers ?? []).length ? summary.open_timers.map((t) => (
              <div key={t.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm">
                <span>{nameOf(members, t.worker_id)} · {fmtGhostTime(t.id === myTimer?.id ? liveSeconds : t.active_seconds)} · activity {t.total_beats ? Math.round((t.beats / t.total_beats) * 100) : 0}%{t.note ? ` · “${t.note}”` : ""}</span>
                <span className="flex gap-2">
                  <ProofUpload timerId={t.id} mine={t.worker_id === me} />
                  {(t.worker_id === me || summary.contracts.find((c) => c.id === t.contract_id)) && (
                    <button onClick={() => invoice(t.id)} className="rounded-lg border border-white/20 px-3 py-1">Invoice 👻</button>
                  )}
                </span>
              </div>
            )) : <p className="mt-2 text-sm text-slate-400">Nobody clocked in.</p>}
          </section>
          <GhostDebts members={members} debts={summary.debts} balances={summary.balances} orgId={orgId} refresh={() => load(orgId)} onSettle={settle} />
        </>
      )}
    </div>
  );
}

function GhostContracts({ orgId, members, contracts, refresh, me }: { orgId: string; members: Member[]; contracts: Contract[]; refresh: () => void; me: string }) {
  const [title, setTitle] = useState("");
  const [worker, setWorker] = useState("");
  const [payer, setPayer] = useState("");
  const [rate, setRate] = useState("100");
  const [message, setMessage] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await request("/api/ghost/contracts", { method: "POST", body: JSON.stringify({ org_id: orgId, title, worker_id: worker, payer_id: payer, rate_ghost: Number(rate) }) });
      setTitle("");
      setMessage("Contract opened.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create contract.");
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h3 className="text-lg font-bold">Contracts (rate in 👻/hour; hypothetical)</h3>
      {(contracts ?? []).map((c) => (
        <div key={c.id} className="mt-2 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-2 text-sm">
          <span><b>{c.title}</b> · {nameOf(members, c.worker_id)} works · {nameOf(members, c.payer_id)} owes · {fmtGhost(c.rate_ghost)}/h · {c.status}</span>
        </div>
      ))}
      {!contracts?.length && <p className="mt-2 text-sm text-slate-400">No contracts yet.</p>}
      <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-2">
        <input aria-label="Contract title" value={title} required minLength={2} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Landing page copy" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
        <label className="text-sm">Worker
          <select value={worker} required onChange={(e) => setWorker(e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm">
            <option value="">…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
        <label className="text-sm">Pays
          <select value={payer || me} required onChange={(e) => setPayer(e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm">
            <option value="">…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
        <label className="text-sm">👻/h
          <input type="number" value={rate} required min={0} max={100000000} step="0.01" onChange={(e) => setRate(e.target.value)} className="ml-1 w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm" />
        </label>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Open contract</button>
      </form>
      <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
    </section>
  );
}

function ProofUpload({ timerId, mine }: { timerId: string; mine: boolean }) {
  const [message, setMessage] = useState("");
  if (!mine) return null;
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("timer_id", timerId);
    try {
      const res = await fetch("/api/ghost/proofs", { method: "POST", credentials: "include", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(body.error ?? "Upload failed."));
      setMessage("Proof attached.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }
  return (
    <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-1 text-xs" title="Attach a screenshot you took (≤1 MB)">
      📎 Proof
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      {message && <span className="ml-1 text-slate-400">{message}</span>}
    </label>
  );
}

function GhostDebts({ members, debts, balances, orgId, refresh, onSettle }: { members: Member[]; debts: Debt[]; balances: Balance[]; orgId: string; refresh: () => void; onSettle: (id: string, status: string) => void }) {
  const [debtor, setDebtor] = useState("");
  const [creditor, setCreditor] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  async function mark(e: React.FormEvent) {
    e.preventDefault();
    try {
      await request("/api/ghost/debts", { method: "POST", body: JSON.stringify({ action: "mark", org_id: orgId, debtor_id: debtor, creditor_id: creditor, amount_ghost: Number(amount), reason }) });
      setAmount("");
      setReason("");
      setMessage("Debt recorded (hypothetically).");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record debt.");
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h3 className="text-lg font-bold">Who owes whom (👻; not money)</h3>
      {(balances ?? []).map((b) => (
        <div key={b.user_id} className="mt-2 flex justify-between gap-2 border-t border-white/10 pt-2 text-sm">
          <span>{nameOf(members, b.user_id)}</span>
          <span className="text-slate-300">owed {fmtGhost(Number(b.owed_to_me))} · owes {fmtGhost(Number(b.i_owe))}</span>
        </div>
      ))}
      <div className="mt-4 space-y-2">
        {(debts ?? []).map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
            <span>{nameOf(members, d.debtor_id)} owes {nameOf(members, d.creditor_id)} <b>{fmtGhost(Number(d.amount_ghost))}</b> · {d.reason} · <i className="text-slate-400">{d.status}</i></span>
            {d.status === "owed" && (
              <span className="flex gap-2">
                <button onClick={() => onSettle(d.id, "settled")} className="rounded-lg border border-white/20 px-3 py-1 text-xs">Settle</button>
                <button onClick={() => onSettle(d.id, "void")} className="rounded-lg border border-white/20 px-3 py-1 text-xs">Void</button>
              </span>
            )}
          </div>
        ))}
        {!debts?.length && <p className="text-sm text-slate-400">No debts on the books. Suspiciously harmonious.</p>}
      </div>
      <form onSubmit={mark} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">Owes
          <select value={debtor} required onChange={(e) => setDebtor(e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm">
            <option value="">…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
        <label className="text-sm">Owed to
          <select value={creditor} required onChange={(e) => setCreditor(e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm">
            <option value="">…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
        <input aria-label="Ghost amount" type="number" value={amount} required min={0.01} max={100000000} step="0.01" onChange={(e) => setAmount(e.target.value)} placeholder="50" className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm" />
        <input aria-label="Reason" value={reason} required minLength={2} maxLength={240} onChange={(e) => setReason(e.target.value)} placeholder="3h design work" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Mark owed</button>
      </form>
      <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
    </section>
  );
}
