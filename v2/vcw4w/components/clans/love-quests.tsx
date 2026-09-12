"use client";

import { useCallback, useEffect, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";

type Quest = { id: string; title: string; reward_ll: number; active: boolean };
type Completion = { quest_id: string; user_id: string };

// Clan quests: the second 💌 mint source (after daily bonuses).
// Owners/mods create quests and mark members complete; completion mints reward.
export function LoveQuests({ clanId, clanSlug }: { clanId?: string; clanSlug: string }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("2");
  const [completeUser, setCompleteUser] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!clanId) return;
    try {
      const res = await fetch(`/api/love/quests?clan_id=${encodeURIComponent(clanId)}`);
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setQuests(data.quests ?? []);
        setCompletions(data.completions ?? []);
      }
    } catch {
      // Quests are garnish; the forum still renders.
    }
  }, [clanId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(payload: Record<string, unknown>, okMsg: string) {
    setNote("");
    try {
      const res = await fetch("/api/love/quests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setNote(okMsg);
      window.dispatchEvent(new Event("love-letters-changed"));
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed.");
    }
  }

  return (
    <section className="rounded-xl border border-pink-400/20 bg-slate-900 p-5">
      <h2 className="font-bold text-pink-200">💌 Clan quests (earn love letters) <InfoTip text="Only owners/mods can post quests and mark members complete. Rewards are 1–10 Love Letters 💌, minted to the member. Never coins." label="Clan quests: who mints Love Letters" /></h2>
      <p className="mt-1 text-xs text-slate-400">
        Owners/mods post quests (reward 1..10 💌); marking a member complete mints it to their 💌 Earned. Daily
        bonuses are the other mint. Clan: {clanSlug}.
      </p>
      {quests.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {quests.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-1">
              <span>{q.title} <small className="text-pink-200">💌x{q.reward_ll}</small></span>
              <span className="text-xs text-slate-500">
                {completions.filter((c) => c.quest_id === q.id).length} completed{q.active ? "" : " · closed"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No quests yet; owners/mods can post the first.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label="Quest title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quest title (3..120)"
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          aria-label="Quest reward"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={String(n)}>💌x{n}</option>
          ))}
        </select>
        <button
          onClick={() => void post({ action: "create", clan_id: clanId, title, reward: Number(reward) }, "Quest posted.")}
          className="rounded-lg bg-pink-400 px-3 py-2 text-sm font-bold text-slate-950"
        >
          Post quest
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          aria-label="Member user id to complete"
          value={completeUser}
          onChange={(e) => setCompleteUser(e.target.value)}
          placeholder="member user_id"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          aria-label="Quest to complete"
          id="love-quest-pick"
          name="questPick"
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {quests.filter((q) => q.active).map((q) => (
            <option key={q.id} value={q.id}>{q.title} (💌x{q.reward_ll})</option>
          ))}
        </select>
        <button
          onClick={() => {
            const el = document.getElementById("love-quest-pick") as HTMLSelectElement | null;
            if (!el?.value) {
              setNote("Pick a quest first.");
              return;
            }
            void post({ action: "complete", quest_id: el.value, user_id: completeUser }, "Quest completed - 💌 minted.");
          }}
          className="rounded-lg border border-pink-400/40 px-3 py-2 text-sm font-bold text-pink-200"
        >
          Mark complete
        </button>
      </div>
      {note && <p role="status" className="mt-2 text-sm text-slate-300">{note}</p>}
    </section>
  );
}
