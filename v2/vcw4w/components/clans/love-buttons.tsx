"use client";

import { useEffect, useState } from "react";
import { LOVE_AWARD_TIERS, type LoveAwardTier } from "@/lib/love-letters";
import { InfoTip } from "@/components/ui/info-tip";

// Give 1 💌 + tiered awards on a clan post. Receiver = post author (a user),
// so awards for posts ARE awards for users. Fires love-letters-changed on success.
export function LoveButtons({ postId }: { postId: string }) {
  const [totals, setTotals] = useState<{ gifts: number; awards: number; letters: number } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<LoveAwardTier>("spotlight");

  async function refresh() {
    try {
      const res = await fetch(`/api/love/post/${postId}`);
      const data = await res.json().catch(() => ({}));
      if (data.success) setTotals({ gifts: data.gifts, awards: data.awards, letters: data.letters });
    } catch {
      // Totals are garnish; buttons still work.
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function act(path: string, payload: Record<string, unknown>, okMsg: string) {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setNote(okMsg);
      window.dispatchEvent(new Event("love-letters-changed"));
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1">
        <InfoTip text="Give sends 1 love letter to the author. Awards cost 2, 5, or 10. Never coins, never cash." label="About giving love" />
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void act("/api/love/give", { post_id: postId }, "💌 sent!")}
        className="rounded-full border border-pink-400/40 bg-pink-400/10 px-3 py-1 text-xs font-bold text-pink-200 disabled:opacity-50"
        title="Give 1 love letter to the author"
      >
        💌 Give (1)
      </button>
      <select
        aria-label="Award tier"
        value={tier}
        onChange={(e) => setTier(e.target.value as LoveAwardTier)}
        className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white"
      >
        {(Object.keys(LOVE_AWARD_TIERS) as LoveAwardTier[]).map((t) => (
          <option key={t} value={t}>
            {t} (💌x{LOVE_AWARD_TIERS[t].cost})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => void act("/api/love/award", { post_id: postId, tier }, `🏆 ${tier} awarded!`)}
        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200 disabled:opacity-50"
        title="Spend 💌 on an advanced award for this post + its author"
      >
        🏆 Award
      </button>
      {totals && (totals.letters > 0) && (
        <span className="text-xs text-pink-200/80" title={`${totals.gifts} gifts + ${totals.awards} awards`}>
          💌x{totals.letters}
        </span>
      )}
      {note && <span role="status" className="text-xs text-slate-400">{note}</span>}
    </div>
  );
}
