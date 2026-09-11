"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";
import {
  RUNTIME_LABELS,
  RUNTIME_DESCRIPTIONS,
  PRICE_USD_MAX,
  PRICE_USD_MIN,
  displayEndpoint,
  perSecondUsd,
  type Runtime,
} from "@/lib/agent-market";

type ProviderInfo = { code: string; name: string; configured: boolean };

type Booking = {
  id: string;
  listing_id: string;
  status: string;
  escrow_coins: number;
  started_at: string;
  ended_at: string | null;
  pod_id?: string | null;
  endpoint_url?: string | null;
  gpu_type?: string | null;
  agent_listings: {
    id: string;
    name: string;
    runtime: string;
    provider_code: string;
    endpoint_url?: string;
    price_cents_per_hour: number;
    status: string;
  } | null;
};

type MineResponse = {
  rentals: Booking[];
  ownerBookings: Booking[];
  usage: {
    booking_id: string;
    seconds: number;
    gross_cents: number;
    cut_cents: number;
    provider_cents: number;
  }[];
  totals: { seconds: number; gross_cents: number; cut_cents: number; provider_cents: number };
};

const RUNTIME_VALUES = Object.keys(RUNTIME_LABELS) as Runtime[];

function connectionFor(b: Booking): string {
  if (b.endpoint_url) return b.endpoint_url;
  if (b.agent_listings?.endpoint_url) return displayEndpoint(b.agent_listings.endpoint_url);
  return "";
}

export function MyCompute() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [form, setForm] = useState({
    name: "",
    runtime: "openclaw",
    provider_code: "runpod",
    endpoint_url: "",
    priceUsd: "1.00",
  });
  const [formMsg, setFormMsg] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [mine, setMine] = useState<MineResponse | null>(null);
  const [mineError, setMineError] = useState("");
  const [secondsById, setSecondsById] = useState<Record<string, string>>({});
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    void fetch("/api/agents/providers")
      .then((r) => r.json())
      .then((b: { providers?: ProviderInfo[] }) => setProviders(b.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  const loadMine = useCallback(async () => {
    setMineError("");
    try {
      const res = await fetch("/api/agents/bookings/mine");
      const body = (await res.json()) as MineResponse & { success: boolean; error?: string };
      if (!body.success) throw new Error(body.error || "Login required.");
      setMine(body);
    } catch (e) {
      setMineError(e instanceof Error ? e.message : "Failed to load.");
    }
  }, []);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const needsEndpoint = form.provider_code === "custom";
  const priceCents = Math.round(Number(form.priceUsd) * 100);
  async function createListing() {
    setFormBusy(true);
    setFormMsg("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          runtime: form.runtime,
          provider_code: form.provider_code,
          endpoint_url: needsEndpoint ? form.endpoint_url.trim() : "",
          price_usd_per_hour: Number(form.priceUsd),
        }),
      });
      const body = (await res.json()) as { success: boolean; error?: string; note?: string };
      if (!body.success) throw new Error(body.error || "Create failed.");
      setFormMsg(body.note ?? "Listing published. Renters are billed per second up to your max.");
      setForm({ name: "", runtime: "openclaw", provider_code: "runpod", endpoint_url: "", priceUsd: "1.00" });
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setFormBusy(false);
    }
  }

  async function heartbeat(bookingId: string) {
    const seconds = Number(secondsById[bookingId] || "60");
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400) {
      setActionMsg((m) => ({ ...m, [bookingId]: "Seconds must be 1..86400." }));
      return;
    }
    setBusyId(bookingId);
    try {
      const res = await fetch(`/api/agents/bookings/${bookingId}/heartbeat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      const body = (await res.json()) as {
        success: boolean;
        error?: string;
        usage?: { gross_cents: number; cut_cents: number; provider_cents: number };
      };
      setActionMsg((m) => ({
        ...m,
        [bookingId]: body.success && body.usage
          ? `Metered ${seconds}s: ${formatUsd(body.usage.gross_cents)} gross (includes ${SERVICE_CUT_PCT}% platform cut).`
          : (body.error ?? "Heartbeat failed."),
      }));
      if (body.success) void loadMine();
    } catch {
      setActionMsg((m) => ({ ...m, [bookingId]: "Heartbeat failed." }));
    } finally {
      setBusyId("");
    }
  }

  async function endBooking(bookingId: string) {
    setBusyId(bookingId);
    try {
      const res = await fetch(`/api/agents/bookings/${bookingId}/end`, { method: "POST" });
      const body = (await res.json()) as { success: boolean; error?: string };
      setActionMsg((m) => ({
        ...m,
        [bookingId]: body.success ? "Booking ended. Billing stops here." : (body.error ?? "End failed."),
      }));
      if (body.success) void loadMine();
    } catch {
      setActionMsg((m) => ({ ...m, [bookingId]: "End failed." }));
    } finally {
      setBusyId("");
    }
  }

  function bookingCard(b: Booking) {
    const conn = connectionFor(b);
    return (
      <li key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">{b.agent_listings?.name ?? "Unknown agent"}</p>
            <p className="text-xs text-slate-400">
              {b.status} · escrow {b.escrow_coins} coins · since{" "}
              {new Date(b.started_at).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">
              {b.agent_listings
                ? `Up to ${formatUsd(b.agent_listings.price_cents_per_hour)}/hour max, gross; includes ${SERVICE_CUT_PCT}% platform cut, billed per second.`
                : ""}
            </p>
            {b.gpu_type ? <p className="text-xs text-slate-500">GPU: {b.gpu_type}</p> : null}
            {conn ? (
              <p className="mt-1 text-xs">
                <ProxyLink href={conn} label="Open server" />
              </p>
            ) : null}
          </div>
          {b.status === "active" && (
            <button
              type="button"
              disabled={busyId === b.id}
              onClick={() => void endBooking(b.id)}
              className="shrink-0 rounded-md border border-red-500 px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-950 disabled:opacity-50"
            >
              End
            </button>
          )}
        </div>
        {b.status === "active" && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-slate-300">
              Seconds
              <input
                type="number"
                min={1}
                max={86400}
                value={secondsById[b.id] ?? "60"}
                onChange={(e) => setSecondsById((m) => ({ ...m, [b.id]: e.target.value }))}
                className="ml-2 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white"
              />
            </label>
            <button
              type="button"
              disabled={busyId === b.id}
              onClick={() => void heartbeat(b.id)}
              className="rounded-md bg-slate-700 px-2 py-1 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Report usage
            </button>
          </div>
        )}
        {actionMsg[b.id] && <p className="mt-1 text-xs text-amber-300">{actionMsg[b.id]}</p>}
      </li>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-black">List your compute for rent</h2>
        <p className="mt-2 text-sm text-slate-400">
          You are the <strong>host</strong> here: publish a server others can
          rent and earn coins per second of use. To <strong>rent</strong> one
          yourself, use “Rent an agent” above.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {providers.map((p) => (
            <span
              key={p.code}
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                p.configured ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"
              }`}
            >
              {p.name}: {p.configured ? "configured" : "unconfigured"}
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Name (1-80 chars)
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              placeholder="e.g. Budget Xonotic server"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Runtime
            <select
              value={form.runtime}
              onChange={(e) => set("runtime", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            >
              {RUNTIME_VALUES.map((r) => (
                <option key={r} value={r}>{RUNTIME_LABELS[r]}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {(RUNTIME_DESCRIPTIONS as Record<string, string>)[form.runtime] ?? ""}
            </span>
          </label>
          <label className="text-sm text-slate-300">
            Provider
            <select
              value={form.provider_code}
              onChange={(e) => set("provider_code", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            >
              <option value="runpod">RunPod (auto endpoint)</option>
              <option value="digitalocean">DigitalOcean</option>
              <option value="custom">Custom endpoint</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Max price (USD/hour, gross)
            <input
              type="number"
              min={PRICE_USD_MIN}
              max={PRICE_USD_MAX}
              step="0.01"
              value={form.priceUsd}
              onChange={(e) => set("priceUsd", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            />
          </label>
          {needsEndpoint ? (
            <label className="text-sm text-slate-300 md:col-span-2">
              Endpoint URL (https only)
              <input
                value={form.endpoint_url}
                onChange={(e) => set("endpoint_url", e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
              />
            </label>
          ) : (
            <p className="text-sm text-slate-400 md:col-span-2">
              RunPod default endpoint: no URL needed. Renting auto-provisions
              the cheapest live GPU at or under your max and hands the renter
              its proxy URL.
              {form.runtime === "xonotic-vcw" || form.runtime === "xonotic-self" ? (
                <> Xonotic serves on port 26000 (game) + 8888 (status).</>
              ) : null}
            </p>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Up to ${Number(form.priceUsd || 0).toFixed(2)}/hour max, gross; includes {SERVICE_CUT_PCT}%
          platform cut. Billed per second (≈ ${Number.isFinite(priceCents) ? perSecondUsd(priceCents).toFixed(4) : "0.0000"}/sec), never more than the hourly cap.
        </p>
        <button
          type="button"
          disabled={formBusy}
          onClick={() => void createListing()}
          className="mt-3 rounded-md bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {formBusy ? "Publishing…" : "Publish listing"}
        </button>
        {formMsg && <p className="mt-2 text-sm text-amber-300">{formMsg}</p>}
      </section>

      <section>
        <h2 className="text-2xl font-black">My rentals (I&apos;m renting)</h2>
        <p className="mt-1 text-sm text-slate-400">
          <Link href="/runpods" className="font-semibold text-cyan-300 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-200">
            Open My RunPods ↗
          </Link>{" "}
          for clickable links plus Stop / Start / Restart / Terminate / Delete on every pod you created.
        </p>
        {mineError && <p className="mt-2 text-sm text-slate-400">{mineError} (login to see bookings)</p>}
        {mine && mine.rentals.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">No rentals yet; pick a listing under “Rent an agent”.</p>
        )}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {(mine?.rentals ?? []).map(bookingCard)}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">Bookings on my listings (I&apos;m hosting)</h2>
        {mine && (
          <p className="mt-2 text-sm text-slate-300">
            Metered {mine.totals.seconds}s · {formatUsd(mine.totals.gross_cents)} gross
            (includes {SERVICE_CUT_PCT}% platform cut: {formatUsd(mine.totals.cut_cents)}{" "}
            platform / {formatUsd(mine.totals.provider_cents)} compute). Quotes are
            ${" "}per-hour maximums; every row above billed per second.
          </p>
        )}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {(mine?.ownerBookings ?? []).map(bookingCard)}
        </ul>
      </section>
    </div>
  );
}
