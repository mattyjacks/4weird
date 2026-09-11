"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";
import {
  RUNTIME_LABELS,
  RUNTIME_DESCRIPTIONS,
  centsToUsdPerHour,
  perSecondUsd,
  type Runtime,
} from "@/lib/agent-market";

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

type ProvisionState = { ok: true; endpointUrl: string; gpuId?: string; hourlyUsd?: number; podId?: string } | { ok: false; code?: string; message?: string };

function runtimeLabel(runtime: string): string {
  return (RUNTIME_LABELS as Record<string, string>)[runtime] ?? runtime;
}

function grossFor(pricePerHour: number, hours: number) {
  const gross = pricePerHour * hours;
  const cut = Math.round((gross * SERVICE_CUT_PCT) / 100);
  return { gross, cut, provider: gross - cut };
}

const RUNTIME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  ...(Object.keys(RUNTIME_LABELS) as Runtime[]).map((r) => ({ value: r, label: RUNTIME_LABELS[r] })),
];

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [runtime, setRuntime] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoursById, setHoursById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [connectionById, setConnectionById] = useState<Record<string, ProvisionState>>({});
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
      setNoteById((m) => ({ ...m, [listing.id]: "Hours must be 1..720 (your max rental length — billed per second up to that cap)." }));
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
      const body = (await res.json()) as {
        success: boolean;
        error?: string;
        connection?: { endpointUrl?: string; gpu?: string; hourlyUsd?: number; podId?: string };
        provision?: { ok?: boolean; code?: string; message?: string; endpointUrl?: string; gpuId?: string; hourlyUsd?: number; podId?: string };
        note?: string;
      };
      if (!body.success) {
        setNoteById((m) => ({ ...m, [listing.id]: body.error ?? "Booking failed." }));
        return;
      }
      const conn = body.connection ?? body.provision;
      if (conn && "endpointUrl" in (conn as object) && (conn as { endpointUrl?: string }).endpointUrl) {
        const c = conn as { endpointUrl: string; gpu?: string; gpuId?: string; hourlyUsd?: number; podId?: string };
        setConnectionById((m) => ({
          ...m,
          [listing.id]: { ok: true, endpointUrl: c.endpointUrl, gpuId: c.gpu ?? c.gpuId, hourlyUsd: c.hourlyUsd, podId: c.podId },
        }));
        setNoteById((m) => ({
          ...m,
          [listing.id]: `Rented! Server live at the RunPod default endpoint below (billed per second up to ${hours}h escrow).`,
        }));
      } else if (body.provision && body.provision.ok === false) {
        setConnectionById((m) => ({ ...m, [listing.id]: { ok: false, code: body.provision?.code, message: body.provision?.message } }));
        setNoteById((m) => ({
          ...m,
          [listing.id]: `Booked ${hours}h (escrow locked). Server not live yet: ${body.provision?.message ?? "provisioning deferred."}`,
        }));
      } else {
        setNoteById((m) => ({
          ...m,
          [listing.id]: `Booked ${hours}h. Escrow locked from your coin balance — billed per second.`,
        }));
      }
    } catch {
      setNoteById((m) => ({ ...m, [listing.id]: "Booking failed." }));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-black">Rent an agent</h2>
      <p className="mt-2 text-sm text-slate-400">
        Quotes are USD/hour maximums (gross, 25% cut included) — you pay per
        second of actual use, never more than the quote.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Runtime
          <select
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          >
            {RUNTIME_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
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
          const usdHr = centsToUsdPerHour(l.price_cents_per_hour);
          const perSec = perSecondUsd(l.price_cents_per_hour);
          const desc = (RUNTIME_DESCRIPTIONS as Record<string, string>)[l.runtime];
          const conn = connectionById[l.id];
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
                {runtimeLabel(l.runtime)} · {l.provider_code}
              </p>
              {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
              <p className="mt-3 text-xl font-black text-cyan-300">
                up to {formatUsd(l.price_cents_per_hour)}
                <span className="text-sm font-normal text-slate-400"> /hour max, gross</span>
              </p>
              <p className="text-xs text-slate-500">
                ≈ ${perSec.toFixed(4)}/sec · ${usdHr.toFixed(2)}/hr cap — includes {SERVICE_CUT_PCT}% platform cut. Billed per second.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <label className="text-sm text-slate-300">
                  Max hours
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
                  {busyId === l.id ? "Renting…" : "Rent this agent"}
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Up to {formatUsd(math.gross)} for {hours || 0}h — billed per
                second ({formatUsd(math.cut)} platform /{" "}
                {formatUsd(math.provider)} compute at full use).
              </p>
              {l.provider_code === "runpod" && (
                <p className="mt-1 text-xs text-slate-500">
                  RunPod default endpoint — no URL needed. Booking rents the
                  cheapest live GPU at or under this max.
                </p>
              )}
              {conn && conn.ok && (
                <p className="mt-2 rounded-md border border-emerald-800 bg-emerald-950 p-2 text-xs break-all text-emerald-200">
                  Live: {conn.endpointUrl}
                  {conn.gpuId ? ` · ${conn.gpuId}` : ""}
                  {typeof conn.hourlyUsd === "number" ? ` · $${conn.hourlyUsd.toFixed(2)}/hr` : ""}
                </p>
              )}
              {conn && !conn.ok && (
                <p className="mt-2 rounded-md border border-amber-800 bg-amber-950 p-2 text-xs text-amber-200">
                  {conn.message ?? "Server pending."}
                </p>
              )}
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
