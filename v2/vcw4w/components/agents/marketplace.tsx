"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";

type Listing = {
  id: string;
  owner_id: string;
  name: string;
  runtime: string;
  provider_code: string;
  price_cents_per_hour: number;
  status: string;
  created_at: string;
};

function grossFor(pricePerHour: number, hours: number) {
  const gross = pricePerHour * hours;
  const cut = Math.round((gross * SERVICE_CUT_PCT) / 100);
  return { gross, cut, provider: gross - cut };
}

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [runtime, setRuntime] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoursById, setHoursById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (runtime) q.set("runtime", runtime);
      if (provider) q.set("provider", provider);
      const res = await fetch(`/api/agents?${q.toString()}`);
      const body = (await res.json()) as {
        success: boolean;
        listings?: Listing[];
        error?: string;
      };
      if (!body.success) throw new Error(body.error || "Failed to load.");
      setListings(body.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [runtime, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  async function book(listing: Listing) {
    const hours = Number(hoursById[listing.id] || "1");
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
      setNoteById((m) => ({ ...m, [listing.id]: "Hours must be 1..720." }));
      return;
    }
    setBusyId(listing.id);
    setNoteById((m) => ({ ...m, [listing.id]: "" }));
    try {
      const res = await fetch(`/api/agents/${listing.id}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      const body = (await res.json()) as { success: boolean; error?: string };
      setNoteById((m) => ({
        ...m,
        [listing.id]: body.success
          ? `Booked ${hours}h. Escrow locked from your coin balance.`
          : (body.error ?? "Booking failed."),
      }));
    } catch {
      setNoteById((m) => ({ ...m, [listing.id]: "Booking failed." }));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Runtime
          <select
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="">All</option>
            <option value="openclaw">openclaw</option>
            <option value="nanoclaw">nanoclaw</option>
            <option value="custom">custom</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="">All</option>
            <option value="runpod">RunPod</option>
            <option value="digitalocean">DigitalOcean</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      {loading && <p className="mt-6 text-slate-400">Loading agents…</p>}
      {error && <p className="mt-6 text-red-400">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="mt-6 text-slate-400">No available agents right now.</p>
      )}

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {listings.map((l) => {
          const hours = Number(hoursById[l.id] || "1") || 0;
          const math = grossFor(l.price_cents_per_hour, hours);
          return (
            <li
              key={l.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{l.name}</h3>
                <span className="shrink-0 rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">
                  {l.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {l.runtime} · {l.provider_code}
              </p>
              <p className="mt-3 text-xl font-black text-cyan-300">
                {formatUsd(l.price_cents_per_hour)}
                <span className="text-sm font-normal text-slate-400"> /hour gross</span>
              </p>
              <p className="text-xs text-slate-500">
                Gross price — includes {SERVICE_CUT_PCT}% platform cut.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <label className="text-sm text-slate-300">
                  Hours
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={hoursById[l.id] ?? "1"}
                    onChange={(e) =>
                      setHoursById((m) => ({ ...m, [l.id]: e.target.value }))
                    }
                    className="ml-2 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={busyId === l.id}
                  onClick={() => void book(l)}
                  className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {busyId === l.id ? "Booking…" : "Rent"}
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Total {formatUsd(math.gross)} gross for {hours || 0}h — includes{" "}
                {SERVICE_CUT_PCT}% platform cut ({formatUsd(math.cut)} platform /{" "}
                {formatUsd(math.provider)} compute).
              </p>
              {noteById[l.id] && (
                <p className="mt-1 text-sm text-amber-300">{noteById[l.id]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
