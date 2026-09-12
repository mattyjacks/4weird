"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { InfoTip } from "@/components/ui/info-tip";
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
  owner_id?: string;
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

function coinsFor(cents: number): number {
  return Math.round(cents);
}

const RUNTIME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  ...(Object.keys(RUNTIME_LABELS) as Runtime[]).map((r) => ({ value: r, label: RUNTIME_LABELS[r] })),
];

type SortKey = "recommended" | "cheapest" | "newest";

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [runtime, setRuntime] = useState("");
  const [provider, setProvider] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recommended");
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listings.filter((l) =>
      q ? `${l.name} ${l.runtime} ${l.provider_code}`.toLowerCase().includes(q) : true,
    );
    const rank = (l: Listing) => (l.runtime === "nanoclaw" ? 0 : l.runtime === "openclaw" ? 1 : 2);
    return [...filtered].sort((a, b) => {
      if (sort === "cheapest") return a.price_cents_per_hour - b.price_cents_per_hour;
      if (sort === "newest") return Date.parse(b.created_at || "") - Date.parse(a.created_at || "");
      return rank(a) - rank(b) || a.price_cents_per_hour - b.price_cents_per_hour;
    });
  }, [listings, query, sort]);

  const cheapest = useMemo(
    () => (listings.length ? Math.min(...listings.map((l) => l.price_cents_per_hour)) : null),
    [listings],
  );

  async function book(listing: Listing) {
    const hours = Number(hoursById[listing.id] || "1");
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
      setNoteById((m) => ({ ...m, [listing.id]: "Hours must be 1..720 (your max rental length; billed per second up to that cap)." }));
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
          [listing.id]: `Rented! Server live at the RunPod default endpoint below (billed per second up to ${hours}h escrow). Manage it on /runpods; spend shows on /my/usage. Next: SSH in and run the NanoClaw pod bootstrap from the panel above.`,
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
          [listing.id]: `Booked ${hours}h. Escrow locked from your coin balance; billed per second.`,
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
        Quotes are USD/hour maximums (gross, 25% cut included); you pay per
        second of actual use, never more than the quote. NanoClaw is recommended -
        one bot key from <Link href="/bot/setup" className="text-cyan-300 hover:underline">/bot/setup</Link> drives
        website chat + Telegram on any listing below.
      </p>
      {cheapest !== null && (
        <p className="mt-2 inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
          {visible.length} live · from {formatUsd(cheapest)}/hr max · billed per second
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
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
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="recommended">Recommended first</option>
            <option value="cheapest">Cheapest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <label className="flex min-w-48 flex-1 items-center gap-2 text-sm text-slate-300">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="name, runtime, provider…"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => { setRuntime(""); setProvider(""); setQuery(""); setSort("recommended"); }}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300 hover:text-white"
        >
          Reset
        </button>
      </div>

      {loading && <p className="mt-6 text-slate-400">Loading agents…</p>}
      {error && <p className="mt-6 text-red-400">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
          <p className="font-bold">No available agents match right now.</p>
          <p className="mt-1 text-slate-400">
            Try clearing search/filters - or be the supply: publish a NanoClaw listing below (RunPod needs no URL),
            get a key at <Link href="/bot/setup" className="text-cyan-300 hover:underline">/bot/setup</Link>, and read{" "}
            <Link href="/docs/agents-compute" className="text-cyan-300 hover:underline">/docs/agents-compute</Link>.
          </p>
        </div>
      )}

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((l) => {
          const hours = Number(hoursById[l.id] || "1") || 0;
          const math = grossFor(l.price_cents_per_hour, hours);
          const usdHr = centsToUsdPerHour(l.price_cents_per_hour);
          const perSec = perSecondUsd(l.price_cents_per_hour);
          const desc = (RUNTIME_DESCRIPTIONS as Record<string, string>)[l.runtime];
          const conn = connectionById[l.id];
          const recommended = l.runtime === "nanoclaw";
          const day = grossFor(l.price_cents_per_hour, 24);
          return (
            <li
              key={l.id}
              className={`rounded-xl border p-5 ${recommended ? "border-cyan-300/40 bg-gradient-to-b from-cyan-300/[.07] to-slate-900" : "border-slate-800 bg-slate-900"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{l.name}</h3>
                <span className="flex shrink-0 items-center gap-1">
                  {recommended && (
                    <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[11px] font-black text-slate-950">
                      RECOMMENDED
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">
                    {l.status}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {runtimeLabel(l.runtime)} · {l.provider_code}
              </p>
              {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
              <p className="mt-3 text-xl font-black text-cyan-300">
                up to {formatUsd(l.price_cents_per_hour)}
                <span className="text-sm font-normal text-slate-400"> /hour max, gross</span>{" "}
                <InfoTip side="bottom" text="Gross price — 25% platform cut included, never added on top. Billed per second, never more than the quote." label="About agent price" />
              </p>
              <p className="text-xs text-slate-500">
                ≈ ${perSec.toFixed(4)}/sec · ${usdHr.toFixed(2)}/hr cap; includes {SERVICE_CUT_PCT}% platform cut. Billed per second.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                1h ≈ {formatUsd(l.price_cents_per_hour)} ({coinsFor(l.price_cents_per_hour)} coins) · 24h ≈ {formatUsd(day.gross)} max · partial hours pro-rate per second.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <label className="text-sm text-slate-300">
                  Max hours{" "}
                  <InfoTip side="bottom" text="Escrow locks the max upfront; per-second use releases the rest. Hours must be 1..720." label="About max rental hours" />
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
                Up to {formatUsd(math.gross)} for {hours || 0}h; billed per
                second ({formatUsd(math.cut)} platform /{" "}
                {formatUsd(math.provider)} compute at full use).
              </p>
              {l.provider_code === "runpod" && (
                <p className="mt-1 text-xs text-slate-500">
                  RunPod default endpoint; no URL needed. Booking rents the
                  cheapest live GPU at or under this max.{" "}
                  <InfoTip side="bottom" text="RunPod mirror: cheapest live GPU at or under your max, handed back as a proxy URL." label="About RunPod mirror" />
                </p>
              )}
              {l.provider_code === "custom" && (
                <p className="mt-1 text-xs text-slate-500">
                  Custom endpoint: your serverless URL wakes per job - ideal NanoClaw serverless target.
                </p>
              )}
              {conn && conn.ok && (
                <div className="mt-2 rounded-md border border-emerald-800 bg-emerald-950 p-2 text-xs break-all text-emerald-200">
                  <ProxyLink href={conn.endpointUrl} label="Open server" />
                  {conn.gpuId ? <span>{` · ${conn.gpuId}`}</span> : ""}
                  {typeof conn.hourlyUsd === "number" ? <span>{` · $${conn.hourlyUsd.toFixed(2)}/hr`}</span> : ""}
                </div>
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
