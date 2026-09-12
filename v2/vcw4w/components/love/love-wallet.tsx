"use client";

import { useCallback, useEffect, useState } from "react";
import { LOVE_AWARD_TIERS, type LoveAwardTier, type LoveWallet } from "@/lib/love-letters";
import { InfoTip } from "@/components/ui/info-tip";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

// Own 💌 wallet: spendable balance + public counters + shy hide toggle.
export function LoveWalletPanel() {
  const [wallet, setWallet] = useState<LoveWallet | null>(null);
  const [message, setMessage] = useState("Loading 💌…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await request<LoveWallet>("/api/love/me");
      setWallet(r);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load 💌.");
    }
  }, []);

  useEffect(() => {
    void load();
    const reload = () => void load();
    window.addEventListener("love-letters-changed", reload);
    return () => window.removeEventListener("love-letters-changed", reload);
  }, [load]);

  async function toggleVisibility(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      // display_name is required by the profile PATCH validator: echo it back.
      const p = await request<{ profile: { display_name?: string | null } }>("/api/me/profile");
      await request("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ display_name: p.profile?.display_name || "player", is_profile_public: next }),
      });
      setWallet((w) => (w ? { ...w, is_public: next } : w));
      setMessage(next ? "Profile is public - 💌 stats visible." : "Profile hidden - 💌 stats private (shy mode).");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update visibility.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-pink-400/20 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">💌 Love Letters <InfoTip text="Love Letters 💌 are thanks, not coins. Gifts cost 1, awards cost 2, 5, or 10. Never converts to coins, never cashes out." label="Love Letters: gifts, awards, never money" /></h2>
      <p className="mt-2 text-sm text-slate-400">
        Clan-native appreciation; not coins, never converts, never cashes out. Start with 💌x3, earn +1 per daily
        claim + clan quests + loved posts. Spend on gifts (1) and awards (2/5/10) for posts you love.
      </p>
      {wallet ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-black/40 px-3 py-2 text-white">Balance: <b>💌x{wallet.balance}</b> <InfoTip text="Letters you can spend now on gifts and awards." label="Spendable Love Letter balance" /></span>
          <span className="rounded-lg bg-black/40 px-3 py-2 text-slate-300" title="Minted from daily bonuses + clan quests">Earned: <b>💌x{wallet.earned}</b> <InfoTip text="All letters you ever earned from claims and quests." label="Earned Love Letters: claims and quests" /></span>
          <span className="rounded-lg bg-black/40 px-3 py-2 text-slate-300" title="Received from humans who loved your posts">Received: <b>💌x{wallet.received}</b> <InfoTip text="Letters others sent you for posts they loved." label="Received Love Letters: loved posts" /></span>
          <span className="rounded-lg bg-black/40 px-3 py-2 text-slate-300" title="Given to posts you loved">Given: <b>💌x{wallet.given}</b> <InfoTip text="Letters you sent to posts you loved." label="Given Love Letters: posts you loved" /></span>
        </div>
      ) : (
        <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
      )}
      {message && wallet && <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>}
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-300" htmlFor="love-public-toggle">
        <input
          id="love-public-toggle"
          name="lovePublic"
          type="checkbox"
          disabled={busy || !wallet}
          checked={wallet?.is_public ?? true}
          onChange={(e) => void toggleVisibility(e.target.checked)}
        />
        Public profile (show my 💌 Earned / Received / Given). Untick for shy mode.
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Awards: {Object.entries(LOVE_AWARD_TIERS).map(([k, v]) => `${k} 💌x${(v as { cost: number }).cost}`).join(" · ")}.
      </p>
    </section>
  );
}

// Public 💌 stats for any handle (respects the shy hide flag).
export function LoveProfileStats({ handle }: { handle: string }) {
  const [stats, setStats] = useState<{ earned: number; received: number; given: number; is_public: boolean } | null>(null);
  useEffect(() => {
    if (!handle) return;
    fetch(`/api/love/profile?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((b) => {
        if (b.success) setStats(b.profile);
        else setStats(null);
      })
      .catch(() => setStats(null));
  }, [handle]);
  if (!stats) return null;
  if (!stats.is_public) return <span className="text-xs text-slate-500">💌 private (shy mode)</span>;
  return (
    <span className="text-xs text-slate-300">
      💌 Earned {stats.earned} · Received {stats.received} · Given {stats.given}
    </span>
  );
}

export type { LoveAwardTier };
