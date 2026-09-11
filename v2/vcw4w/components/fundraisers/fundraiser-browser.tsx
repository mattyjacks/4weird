"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LAUNCH_CATEGORIES, LAUNCH_DISCLAIMER_SHORT, FUNDRAISERS_ENABLED, FUNDRAISERS_DISABLED_NOTICE, type LaunchCategory } from "@/lib/support";

type Campaign = {
  id: string;
  creator_id: string;
  clan_id: string | null;
  title: string;
  category: string;
  goal_coins: number;
  status: string;
  ends_at: string | null;
  created_at: string;
  progress?: { raised_gross: number; backers: number };
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  return (await res.json()) as { success?: boolean; error?: string } & Record<string, unknown>;
}

export function FundraiserBrowser() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [category, setCategory] = useState<"" | LaunchCategory>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [funds, setFunds] = useState("");
  const [goal, setGoal] = useState("5000");
  const [cat, setCat] = useState<LaunchCategory>("game-launch");
  const [clanSlug, setClanSlug] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api(`/api/fundraisers${category ? `?category=${category}` : ""}`);
      if (!data.success) setError(data.error ?? "Could not load campaigns.");
      else setCampaigns(((data.campaigns as Campaign[]) ?? []).filter((c) => c.status === "open"));
    } catch {
      setError("Could not load campaigns. Try again shortly.");
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    // Disabled in the UI while compliance is worked out; the API + RPCs
    // underneath are intentionally left working so this flips back on.
    if (!FUNDRAISERS_ENABLED) {
      setError("Fundraisers are disabled while we work out the legal and compliance side.");
      return;
    }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      let clanId: string | null = null;
      const slug = clanSlug.trim().toLowerCase();
      if (slug) {
        if (!/^[a-z0-9-]{1,40}$/.test(slug)) {
          setError("Clan slug looks invalid.");
          setBusy(false);
          return;
        }
        const clan = await api(`/api/clans/${slug}`);
        clanId = (clan.clan as { id?: string } | undefined)?.id ?? null;
        if (!clan.success || !clanId) {
          setError("Clan not found, or you are not a moderator of it.");
          setBusy(false);
          return;
        }
      }
      const data = await api("/api/fundraisers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          story,
          use_of_funds: funds,
          goal_coins: Number(goal),
          category: cat,
          clan_id: clanId,
          ends_at: endsAt || undefined,
        }),
      });
      if (!data.success) setError(data.error ?? "Campaign creation failed.");
      else {
        const c = data.campaign as { id?: string };
        setNotice("Campaign launched. Tell the story honestly; backers fund dreams, not guarantees.");
        setTitle("");
        setStory("");
        setFunds("");
        await load();
        if (c?.id) window.location.href = `/fundraisers/${c.id}`;
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
    "rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="space-y-10">
      {!FUNDRAISERS_ENABLED && (
        <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
          <p className="font-bold">🚧 Launching and backing are disabled for now.</p>
          <p className="mt-1">{FUNDRAISERS_DISABLED_NOTICE}</p>
        </div>
      )}
      <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
        {LAUNCH_DISCLAIMER_SHORT} Full rules: <a className="underline" href="/terms">Terms of Use §8A</a>.
      </div>

      {notice && <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</p>}
      {error && <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button className={category === "" ? btn : btnGhost} onClick={() => setCategory("")}>
          All projects
        </button>
        {LAUNCH_CATEGORIES.map((c) => (
          <button key={c} className={category === c ? btn : btnGhost} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Open campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-400">No open campaigns in this view; launch the first one below.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {campaigns.map((c) => {
              const raised = Number(c.progress?.raised_gross ?? 0);
              const pct = Math.min(100, Math.round((raised / Math.max(1, Number(c.goal_coins))) * 100));
              return (
                <li key={c.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <Link className="font-bold hover:underline" href={`/fundraisers/${c.id}`}>
                    {c.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.category} · {c.progress?.backers ?? 0} backers
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-cyan-300" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-sm text-cyan-200">
                    {raised.toLocaleString()} / {Number(c.goal_coins).toLocaleString()} coins ({pct}%)
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Launch your game or startup</h2>
        <p className="text-sm text-slate-400">
          Gift-based backing for creative projects only; games, tech startups, creative tech. No charity, medical,
          emergency, political, or investment language is accepted (it is rejected automatically). You must describe
          what the coins will fund, and every reward you mention is a goal, not a guarantee. Login required.
          {!FUNDRAISERS_ENABLED && " Launching is disabled for now while we work out regulations and compliance."}
        </p>
        <div className="grid gap-3" aria-disabled={!FUNDRAISERS_ENABLED}>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title (4-120 chars)" disabled={!FUNDRAISERS_ENABLED} />
          <textarea className={input + " min-h-28"} value={story} onChange={(e) => setStory(e.target.value)} placeholder="Story (20-5000 chars): what are you building, why, and what happens if you hit the goal?" disabled={!FUNDRAISERS_ENABLED} />
          <input className={input} value={funds} onChange={(e) => setFunds(e.target.value)} placeholder="Use of funds; e.g. art, servers, SDK licenses (recommended)" disabled={!FUNDRAISERS_ENABLED} />
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block text-sm">
              Goal (50-1M coins)
              <input className={input + " mt-1"} value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" disabled={!FUNDRAISERS_ENABLED} />
            </label>
            <label className="block text-sm">
              Category
              <select className={input + " mt-1"} value={cat} onChange={(e) => setCat(e.target.value as LaunchCategory)} disabled={!FUNDRAISERS_ENABLED}>
                {LAUNCH_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Clan slug (optional)
              <input className={input + " mt-1"} value={clanSlug} onChange={(e) => setClanSlug(e.target.value)} placeholder="my-clan" disabled={!FUNDRAISERS_ENABLED} />
            </label>
            <label className="block text-sm">
              Ends (optional)
              <input className={input + " mt-1"} type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={!FUNDRAISERS_ENABLED} />
            </label>
          </div>
        </div>
        <button className={btn} disabled={busy || !FUNDRAISERS_ENABLED} onClick={() => void create()}>
          {FUNDRAISERS_ENABLED ? "Launch campaign" : "Launching disabled; back soon"}
        </button>
      </section>
    </div>
  );
}
