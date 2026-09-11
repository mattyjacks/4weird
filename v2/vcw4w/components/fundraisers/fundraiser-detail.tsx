"use client";

import { useCallback, useEffect, useState } from "react";
import { LAUNCH_DISCLAIMER_SHORT } from "@/lib/support";

type Campaign = {
  id: string;
  creator_id: string;
  clan_id: string | null;
  title: string;
  story: string;
  use_of_funds: string;
  category: string;
  goal_coins: number;
  status: string;
  ends_at: string | null;
  created_at: string;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  return (await res.json()) as { success?: boolean; error?: string } & Record<string, unknown>;
}

export function FundraiserDetail({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [raised, setRaised] = useState(0);
  const [backers, setBackers] = useState(0);
  const [coins, setCoins] = useState("500");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api(`/api/fundraisers/${id}`);
      if (!data.success) {
        setMissing(true);
        setError(data.error ?? "Campaign not found.");
        return;
      }
      setCampaign(data.campaign as Campaign);
      const p = data.progress as { raised_gross?: number; backers?: number };
      setRaised(Number(p?.raised_gross ?? 0));
      setBackers(Number(p?.backers ?? 0));
    } catch {
      setError("Could not load this campaign. Try again shortly.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function contribute() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await api(`/api/fundraisers/${id}/contribute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coins: Number(coins) }),
      });
      if (!data.success) setError(data.error ?? "Backing failed.");
      else {
        const b = data.backed as { gross_coins?: number; net_coins?: number };
        setNotice(
          `Backed with ${b.gross_coins} coins (${b.net_coins} reach the project after the 25% cut). Gifts are final — thank you.`,
        );
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function close(status: "closed" | "cancelled") {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await api(`/api/fundraisers/${id}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!data.success) setError(data.error ?? "Close failed.");
      else {
        setNotice(status === "closed" ? "Campaign closed to new backing." : "Campaign cancelled. Raised coins stay credited.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500";
  const btn =
    "rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50";
  const btnGhost =
    "rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50";

  if (missing || (!campaign && error)) {
    return <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error || "Campaign not found."}</p>;
  }
  if (!campaign) return <p className="text-sm text-slate-400">Loading campaign…</p>;

  const pct = Math.min(100, Math.round((raised / Math.max(1, Number(campaign.goal_coins))) * 100));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
        {LAUNCH_DISCLAIMER_SHORT}
      </div>
      {notice && <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</p>}
      {error && <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}

      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          {campaign.category} · {campaign.status}
        </p>
        <h2 className="text-3xl font-black">{campaign.title}</h2>
        {campaign.ends_at && (
          <p className="text-sm text-slate-400">Ends {new Date(campaign.ends_at).toLocaleDateString()}</p>
        )}
      </header>

      <div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-cyan-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-cyan-200">
          {raised.toLocaleString()} / {Number(campaign.goal_coins).toLocaleString()} coins ({pct}%) · {backers} backers
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-bold">The project</h3>
        <p className="whitespace-pre-wrap text-sm text-slate-200">{campaign.story}</p>
      </section>

      {campaign.use_of_funds && (
        <section className="space-y-2">
          <h3 className="text-lg font-bold">Use of funds</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-200">{campaign.use_of_funds}</p>
        </section>
      )}

      {campaign.status === "open" ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-lg font-bold">Back this project</h3>
          <p className="text-sm text-slate-400">
            A voluntary gift in coins — final once sent, no ownership or returns. 25% platform cut included.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={input + " sm:max-w-48"} value={coins} onChange={(e) => setCoins(e.target.value)} inputMode="decimal" placeholder="Coins (1–100000)" />
            <button className={btn} disabled={busy} onClick={() => void contribute()}>
              Back with coins
            </button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-400">This campaign is {campaign.status} and no longer accepts backing.</p>
      )}

      <section className="space-y-2">
        <h3 className="text-lg font-bold">Creator controls</h3>
        <div className="flex gap-2">
          <button className={btnGhost} disabled={busy} onClick={() => void close("closed")}>
            Close campaign
          </button>
          <button className={btnGhost} disabled={busy} onClick={() => void close("cancelled")}>
            Cancel campaign
          </button>
        </div>
      </section>
    </div>
  );
}
