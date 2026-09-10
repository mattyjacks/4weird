"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";

type ProviderInfo = { code: string; name: string; configured: boolean };

type Booking = {
  id: string;
  listing_id: string;
  status: string;
  escrow_coins: number;
  started_at: string;
  ended_at: string | null;
  agent_listings: {
    id: string;
    name: string;
    runtime: string;
    provider_code: string;
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

export function MyCompute() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [form, setForm] = useState({
    name: "",
    runtime: "openclaw",
    provider_code: "runpod",
    endpoint_url: "",
    price: "100",
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
          endpoint_url: form.endpoint_url.trim(),
          price_cents_per_hour: Number(form.price),
        }),
      });
      const body = (await res.json()) as { success: boolean; error?: string };
      if (!body.success) throw new Error(body.error || "Create failed.");
      setFormMsg("Listing published.");
      setForm({ name: "", runtime: "openclaw", provider_code: "runpod", endpoint_url: "", price: "100" });
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
          ? `Metered: ${formatUsd(body.usage.gross_cents)} gross (includes ${SERVICE_CUT_PCT}% platform cut).`
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
        [bookingId]: body.success ? "Booking ended." : (body.error ?? "End failed."),
      }));
      if (body.success) void loadMine();
    } catch {
      setActionMsg((m) => ({ ...m, [bookingId]: "End failed." }));
    } finally {
      setBusyId("");
    }
  }

  function bookingCard(b: Booking) {
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
                ? `${formatUsd(b.agent_listings.price_cents_per_hour)}/hour gross — includes ${SERVICE_CUT_PCT}% platform cut.`
                : ""}
            </p>
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
        <h2 className="text-2xl font-black">Rent out your agent</h2>
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
            Name (1–80 chars)
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
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
              <option value="openclaw">openclaw</option>
              <option value="nanoclaw">nanoclaw</option>
              <option value="custom">custom</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Provider
            <select
              value={form.provider_code}
              onChange={(e) => set("provider_code", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            >
              <option value="runpod">RunPod</option>
              <option value="digitalocean">DigitalOcean</option>
              <option value="custom">Custom endpoint</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Price (cents/hour, gross)
            <input
              type="number"
              min={1}
              max={100000}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Endpoint URL (https only)
            <input
              value={form.endpoint_url}
              onChange={(e) => set("endpoint_url", e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {formatUsd(Number(form.price) || 0)}/hour gross — includes {SERVICE_CUT_PCT}%
          platform cut.
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
        <h2 className="text-2xl font-black">My rentals</h2>
        {mineError && <p className="mt-2 text-sm text-slate-400">{mineError} (login to see bookings)</p>}
        {mine && mine.rentals.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">No rentals yet.</p>
        )}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {(mine?.rentals ?? []).map(bookingCard)}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black">Bookings on my listings</h2>
        {mine && (
          <p className="mt-2 text-sm text-slate-300">
            Metered {mine.totals.seconds}s · {formatUsd(mine.totals.gross_cents)} gross
            (includes {SERVICE_CUT_PCT}% platform cut: {formatUsd(mine.totals.cut_cents)}{" "}
            platform / {formatUsd(mine.totals.provider_cents)} compute).
          </p>
        )}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {(mine?.ownerBookings ?? []).map(bookingCard)}
        </ul>
      </section>
    </div>
  );
}
