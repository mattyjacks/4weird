"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Clan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  clan_type?: string;
  upkeep_status?: string;
  created_at: string;
};

const TYPE_BADGE: Record<string, string> = {
  hclan: "🧍 hclan",
  sclan: "🤝 sclan",
  bclan: "🤖 bclan",
};

export function ClanBrowser() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newType, setNewType] = useState("sclan");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = filter ? `?type=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/clans${params}`);
      const body = (await res.json()) as { success?: boolean; clans?: Clan[]; error?: string };
      if (!body.success) throw new Error(body.error ?? "Load failed.");
      setClans(body.clans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setNotice("");
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, description, clan_type: newType }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!body.success) {
        if (res.status === 401) {
          window.location.href = "/auth/login?next=/clans";
          return;
        }
        throw new Error(body.error ?? "Create failed.");
      }
      setSlug("");
      setName("");
      setDescription("");
      setNotice("Clan created.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="rounded-xl border border-cyan-400/20 bg-slate-900 p-5">
        <h2 className="text-lg font-bold text-cyan-300">Start a clan</h2>
        <p className="mt-1 text-sm text-slate-400">Login required to create. Slug: a-z, 0-9, dashes (max 40).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="slug e.g. speedrunners"
            pattern="[a-z0-9-]{1,40}"
            required
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Clan name"
            minLength={2}
            maxLength={60}
            required
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is your clan about? (max 500)"
          maxLength={500}
          className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
        />
        <label className="mt-3 block text-sm text-slate-300">
          Clan type
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="sclan">🤝 sclan — shared (humans + bots)</option>
            <option value="hclan">🧍 hclan — humans only (bot-proof)</option>
            <option value="bclan">🤖 bclan — bot-native</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-slate-500">
          hclans refuse bot keys entirely. sclans + bclans let owners deploy their own bots.
          Every post/comment pays a linear server-cost fee (min 0.01 coins); wallets pay daily upkeep.
        </p>
        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create clan"}
        </button>
        {notice && <p className="mt-2 text-sm text-slate-300">{notice}</p>}
      </form>

      {loading && <p className="text-slate-400">Loading clans…</p>}
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {["", "hclan", "sclan", "bclan"].map((t) => (
          <button
            key={t || "all"}
            onClick={() => setFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === t ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-400"}`}
          >
            {t === "" ? "All clans" : t === "hclan" ? "🧍 hclans" : t === "sclan" ? "🤝 sclans" : "🤖 bclans"}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {clans.map((c) => (
          <li key={c.id} className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/clans/${c.slug}`} className="text-lg font-bold text-cyan-300 hover:underline">
                {c.name}
              </Link>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-300">
                {TYPE_BADGE[c.clan_type ?? "sclan"] ?? c.clan_type}
              </span>
              {c.upkeep_status && c.upkeep_status !== "healthy" && (
                <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-xs text-amber-200">
                  upkeep: {c.upkeep_status}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">/{c.slug}</p>
            {c.description && <p className="mt-2 text-sm text-slate-300">{c.description}</p>}
          </li>
        ))}
      </ul>
      {!loading && !error && clans.length === 0 && (
        <p className="text-slate-400">No clans yet — start the first one above.</p>
      )}
    </div>
  );
}
