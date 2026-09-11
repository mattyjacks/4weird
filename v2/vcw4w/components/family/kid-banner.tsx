"use client";

import { useCallback, useEffect, useState } from "react";

type KidMe = {
  handle: string;
  age_band: string;
  balance: number;
  seconds_today: number;
  daily_minutes: number | null;
  allowed_start: string | null;
  allowed_end: string | null;
  in_window: boolean;
};

/**
 * KidBanner; shown whenever a child session is live on this device: who is
 * playing, wallet balance, time used/left, and a switch-back (logout) button.
 * Mount it on play + catalog surfaces; it renders nothing otherwise.
 */
export function KidBanner() {
  const [kid, setKid] = useState<KidMe | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/family/kid-login", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      setKid((body as { kid?: KidMe }).kid ?? null);
    } catch {
      setKid(null);
    }
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener("kid-session-changed", load);
    return () => window.removeEventListener("kid-session-changed", load);
  }, [load]);

  if (!kid) return null;
  const limitSeconds = kid.daily_minutes === null ? null : kid.daily_minutes * 60;
  const left = limitSeconds === null ? null : Math.max(0, limitSeconds - kid.seconds_today);
  const usedMin = Math.floor(kid.seconds_today / 60);

  async function logout() {
    await fetch("/api/family/kid-logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    window.dispatchEvent(new Event("kid-session-changed"));
    window.location.assign("/games");
  }

  return (
    <div role="status" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] px-4 py-2 text-xs text-slate-200">
      <span>
        🎮 Playing as <b className="text-white">{kid.handle}</b> ({kid.age_band})
      </span>
      <span>💰 {kid.balance} coins</span>
      <span>
        ⏱️ {usedMin} min today
        {left !== null && <> · {Math.floor(left / 60)} min left</>}
      </span>
      {kid.allowed_start && kid.allowed_end && <span>🕒 {kid.allowed_start}-{kid.allowed_end}</span>}
      {!kid.in_window && <b className="text-amber-200">Outside play hours; play is paused until the window opens.</b>}
      {left !== null && left <= 0 && <b className="text-amber-200">Daily time is up; see you tomorrow!</b>}
      <button type="button" onClick={logout} className="ml-auto rounded-full border border-white/20 px-3 py-1 font-semibold hover:bg-white/10">
        Switch player
      </button>
    </div>
  );
}
