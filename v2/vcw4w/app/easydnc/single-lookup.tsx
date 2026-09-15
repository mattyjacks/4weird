"use client";

import { useState, type FormEvent } from "react";

type LookupResult = { number: string; dnc: boolean; status: string };

export function SingleLookup() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");

  async function lookup(e: FormEvent) {
    e.preventDefault();
    const value = phone.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/easydnc/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: [value], is_byok: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Lookup failed.");
      const first = Array.isArray(data.results) ? data.results[0] : null;
      setResult({
        number: first?.number ?? value,
        dnc: first?.dnc ?? false,
        status: first?.status ?? "Clean",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
        Single-phone lookup
      </h2>
      <form onSubmit={lookup} className="mt-2 flex gap-1.5">
        <label htmlFor="easydnc-single" className="sr-only">
          Phone number to scrub
        </label>
        <input
          id="easydnc-single"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 010 2030"
          inputMode="tel"
          autoComplete="tel"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!phone.trim() || busy}
          className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "…" : "Scrub"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          ⚠️ {error}
        </p>
      ) : null}
      {result ? (
        <dl className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
          <div className="rounded-lg bg-slate-900 px-1 py-1.5">
            <dt className="text-[9px] uppercase tracking-wide text-slate-500">Phone</dt>
            <dd className="truncate font-mono text-slate-200">{result.number}</dd>
          </div>
          <div
            className={`rounded-lg px-1 py-1.5 ${result.dnc ? "bg-red-950/60 text-red-300" : "bg-emerald-950/60 text-emerald-300"}`}
          >
            <dt className="text-[9px] uppercase tracking-wide opacity-70">DNC</dt>
            <dd className="font-bold">{result.dnc ? "Blacklisted" : "Clean"}</dd>
          </div>
          <div className="rounded-lg bg-slate-900 px-1 py-1.5">
            <dt className="text-[9px] uppercase tracking-wide text-slate-500">Registry</dt>
            <dd className="truncate text-slate-200">{result.status}</dd>
          </div>
          <div
            className={`rounded-lg px-1 py-1.5 ${result.dnc ? "bg-amber-950/60 text-amber-300" : "bg-slate-900 text-slate-400"}`}
          >
            <dt className="text-[9px] uppercase tracking-wide opacity-70">Litigator</dt>
            <dd className="font-bold">{result.dnc ? "⚠ Flag" : "—"}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
