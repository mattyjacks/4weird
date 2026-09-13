"use client";

import { useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  return (await res.json()) as { success?: boolean; error?: string } & Record<string, unknown>;
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const btnCls =
  "rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50";
const btnGhostCls =
  "rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50";

/**
 * TipForm; the one-time tip box from /support, reusable anywhere.
 * Pass initialRecipientUserId + lockRecipient to prefill the creator (game
 * pages) so the tipper never has to paste a user ID by hand. Unlocked mode
 * keeps the manual ID field + clan toggle, exactly like /support.
 */
export function TipForm({
  initialRecipientUserId = "",
  lockRecipient = false,
}: {
  initialRecipientUserId?: string;
  lockRecipient?: boolean;
}) {
  const [tipTo, setTipTo] = useState(initialRecipientUserId);
  const [tipClan, setTipClan] = useState(false);
  const [tipCoins, setTipCoins] = useState("100");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep the locked recipient in sync once the game page resolves it.
  const lockedId = lockRecipient ? initialRecipientUserId : "";
  const shownTo = lockRecipient ? lockedId : tipTo;
  const setShownTo = lockRecipient ? undefined : setTipTo;

  async function tip() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const coins = Number(tipCoins);
      if (!Number.isFinite(coins) || coins < 1 || coins > 100000) {
        setError("Amount must be 1..100000 coins.");
        setBusy(false);
        return;
      }
      let payload: Record<string, unknown> = { coins };
      if (!lockRecipient && tipClan) {
        const slug = shownTo.trim().toLowerCase();
        if (!/^[a-z0-9-]{1,40}$/.test(slug)) {
          setError("Enter the clan slug (e.g. my-clan).");
          setBusy(false);
          return;
        }
        const clan = await api(`/api/clans/${slug}`);
        const clanId = (clan.clan as { id?: string } | undefined)?.id;
        if (!clan.success || !clanId) {
          setError("Clan not found.");
          setBusy(false);
          return;
        }
        payload = { ...payload, clan_id: clanId };
      } else {
        const id = shownTo.trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          setError(
            lockRecipient
              ? "Creator ID not resolved yet; try again in a moment."
              : "Enter a valid creator user ID.",
          );
          setBusy(false);
          return;
        }
        payload = { ...payload, recipient_user_id: id };
      }
      const data = await api("/api/support/tip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!data.success) setError(data.error ?? "Tip failed.");
      else {
        const t = data.tipped as { gross_coins?: number; net_coins?: number };
        setNotice(
          !lockRecipient && tipClan
            ? `Sent ${t.gross_coins} coins (${t.net_coins} reach the clan wallet after the 25% cut). Voluntary and final.`
            : `Sent ${t.gross_coins} coins (${t.net_coins} reach the creator as time-locked Crowns - 30-day unlock, 1-year expiry - after the 25% cut). Voluntary and final.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</p>
      )}
      {error && (
        <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        {lockRecipient ? (
          <p className="text-sm text-slate-400">
            Creator <span className="font-mono text-xs text-slate-300">{lockedId ? `${lockedId.slice(0, 8)}…` : "resolving…"}</span>
            <InfoTip
              text="This tip goes straight to this game's mapped creator. They must be verified to receive it."
              label="Tip recipient: this game's creator"
            />
          </p>
        ) : (
          <label className="block text-sm">
            {tipClan ? "Clan slug" : "Creator user ID"}{" "}
            <InfoTip
              text={
                tipClan
                  ? "Anyone logged in can tip a clan. The short name, e.g. my-clan; goes to the clan wallet."
                  : "Anyone logged in can tip a creator. Paste their user ID; they must be verified to receive it."
              }
              label="Tip recipient: clan slug or creator ID"
            />
            <input
              className={inputCls + " mt-1"}
              value={shownTo}
              onChange={(e) => setShownTo?.(e.target.value)}
              placeholder={tipClan ? "my-clan" : "paste their user ID"}
            />
          </label>
        )}
        <label className="block text-sm">
          Coins (1-100k){" "}
          <InfoTip
            text="Anyone logged in can send 1 to 100,000 coins. One-time gift, voluntary, no refund."
            label="Tip amount: 1 to 100,000 coins"
          />
          <input className={inputCls + " mt-1"} value={tipCoins} onChange={(e) => setTipCoins(e.target.value)} inputMode="decimal" />
        </label>
        <div className="flex gap-2">
          {!lockRecipient && (
            <button className={btnGhostCls} disabled={busy} onClick={() => setTipClan((v) => !v)}>
              {tipClan ? "Tip a clan" : "Tip a creator"}
            </button>
          )}
          <button className={btnCls} disabled={busy || (lockRecipient && !lockedId)} onClick={() => void tip()}>
            Send tip
          </button>
        </div>
      </div>
    </div>
  );
}
