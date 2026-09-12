"use client";

import { useCallback, useEffect, useState } from "react";
import { SUPPORT_DISCLAIMER_SHORT } from "@/lib/support";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

type Tier = {
  id: string;
  owner_user_id: string | null;
  clan_id: string | null;
  title: string;
  blurb: string;
  coins_monthly: number;
};

type Sub = {
  id: string;
  tier_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  return (await res.json()) as { success?: boolean; error?: string } & Record<string, unknown>;
}

export function SupportClient() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [reqStatus, setReqStatus] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Forms
  const [tipTo, setTipTo] = useState("");
  const [tipClan, setTipClan] = useState(false);
  const [tipCoins, setTipCoins] = useState("100");
  const [tierTitle, setTierTitle] = useState("");
  const [tierCoins, setTierCoins] = useState("200");
  const [tierBlurb, setTierBlurb] = useState("");
  const [tierClanSlug, setTierClanSlug] = useState("");
  const [verifyNote, setVerifyNote] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [t, s, v] = await Promise.all([
        api("/api/support/tiers"),
        api("/api/support/subscribe"),
        api("/api/verification"),
      ]);
      if (t.success) setTiers((t.tiers as Tier[]) ?? []);
      if (s.success) setSubs((s.subscriptions as Sub[]) ?? []);
      else setSubs([]);
      if (v.success) {
        setVerified(Boolean(v.verified));
        const r = v.request as { status?: string } | null;
        setReqStatus(r?.status ?? "");
      } else setVerified(null);
    } catch {
      setError("Could not load support data. Try again shortly.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function subscribe(tierId: string) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await api("/api/support/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "subscribe", tier_id: tierId }),
      });
      if (!data.success) setError(data.error ?? "Subscribe failed.");
      else {
        setNotice("Subscribed; first month charged now. Cancel anytime; no proration.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancel(subId: string) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await api("/api/support/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", subscription_id: subId }),
      });
      if (!data.success) setError(data.error ?? "Cancel failed.");
      else {
        setNotice("Subscription cancelled. Current period stays active until it ends.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function tip() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      let payload: Record<string, unknown> = { coins: Number(tipCoins) };
      if (tipClan) {
        const slug = tipTo.trim().toLowerCase();
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
        payload = { ...payload, recipient_user_id: tipTo.trim() };
      }
      const data = await api("/api/support/tip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!data.success) setError(data.error ?? "Tip failed.");
      else {
        const t = data.tipped as { gross_coins?: number; net_coins?: number };
        setNotice(tipClan
          ? `Sent ${t.gross_coins} coins (${t.net_coins} reach the clan wallet after the 25% cut). Voluntary and final.`
          : `Sent ${t.gross_coins} coins (${t.net_coins} reach the creator as time-locked Crowns - 30-day unlock, 1-year expiry - after the 25% cut). Voluntary and final.`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createTier() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      let clanId: string | null = null;
      const slug = tierClanSlug.trim().toLowerCase();
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
      const data = await api("/api/support/tiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clan_id: clanId,
          title: tierTitle,
          coins_monthly: Number(tierCoins),
          blurb: tierBlurb,
        }),
      });
      if (!data.success) setError(data.error ?? "Tier creation failed.");
      else {
        setNotice("Tier published. Supporters can subscribe now.");
        setTierTitle("");
        setTierBlurb("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestVerification() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await api("/api/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: verifyNote }),
      });
      if (!data.success) setError(data.error ?? "Request failed.");
      else {
        setNotice("Verification requested. We review every application by hand.");
        setReqStatus("pending");
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

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
        {SUPPORT_DISCLAIMER_SHORT} Full terms: <a className="underline" href="/terms">Terms of Use §8A</a>.
      </div>

      {notice && <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</p>}
      {error && <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Support tiers</h2>
        <CompactDetails summary="Should I subscribe or just tip?">
          <p className="text-sm text-slate-400">
            Only verified creators can offer personal tiers, only clan mods can offer clan tiers, and anyone logged in
            can send tips or subscribe. Tiers bill monthly; tips are one-time. Both are voluntary and final. Creators
            earn time-locked Crowns (30-day unlock, 1-year expiry); clans get wallet coins for upkeep.
          </p>
        </CompactDetails>
        {tiers.length === 0 ? (
          <p className="text-sm text-slate-400">No tiers yet; verified creators and clans can publish the first one below.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {tiers.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="font-bold">{t.title}</p>
                <p className="mt-1 text-sm text-slate-300">{t.blurb || "Monthly support."}</p>
                <p className="mt-2 text-sm text-cyan-200">
                  {t.coins_monthly} coins/mo (${(Number(t.coins_monthly) / 100).toFixed(2)}) · 25% cut included
                </p>
                <p className="mt-1 text-xs text-slate-500">{t.clan_id ? "Clan tier" : "Creator tier"}</p>
                <button className={btn + " mt-3"} disabled={busy} onClick={() => void subscribe(t.id)}>
                  Subscribe
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Send a one-time tip</h2>
        <p className="text-sm text-slate-400">
          A “coffee money” gift in coins; voluntary, non-refundable, and never a purchase. Creators must be verified;
          anyone can tip a clan (owners fund their own clan via the wallet instead).
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <label className="block text-sm">
            {tipClan ? "Clan slug" : "Creator user ID"} <InfoTip text={tipClan ? "Anyone logged in can tip a clan. The short name, e.g. my-clan; goes to the clan wallet." : "Anyone logged in can tip a creator. Paste their user ID; they must be verified to receive it."} label="Tip recipient: clan slug or creator ID" />
            <input className={input + " mt-1"} value={tipTo} onChange={(e) => setTipTo(e.target.value)} placeholder={tipClan ? "my-clan" : "paste their user ID"} />
          </label>
          <label className="block text-sm">
            Coins (1-100k) <InfoTip text="Anyone logged in can send 1 to 100,000 coins. One-time gift, voluntary, no refund." label="Tip amount: 1 to 100,000 coins" />
            <input className={input + " mt-1"} value={tipCoins} onChange={(e) => setTipCoins(e.target.value)} inputMode="decimal" />
          </label>
          <div className="flex gap-2">
            <button className={btnGhost} disabled={busy} onClick={() => setTipClan((v) => !v)}>
              {tipClan ? "Tip a clan" : "Tip a creator"}
            </button>
            <button className={btn} disabled={busy} onClick={() => void tip()}>
              Send tip
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">My subscriptions <InfoTip text="Only you can cancel your own subscription, anytime. The current month stays active until it ends; no partial refund." label="Cancel subscription: anytime, no proration" /></h2>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-400">No subscriptions. Subscribing charges the first month immediately.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm">
                <span>
                  <span className="font-mono text-xs text-slate-400">{s.tier_id.slice(0, 8)}…</span> · {s.status} · renews{" "}
                  {new Date(s.current_period_end).toLocaleDateString()}
                </span>
                {(s.status === "active" || s.status === "past_due") && (
                  <button className={btnGhost} disabled={busy} onClick={() => void cancel(s.id)}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Offer a tier <InfoTip text="Only verified creators can offer a personal tier; only clan mods can offer a clan tier. Leave the clan field empty for a personal tier." label="Offer tier: who can publish" /></h2>
        <p className="text-sm text-slate-400">
          Only verified creators can offer personal tiers; only clan moderators can offer clan tiers (leave the clan
          field empty for a personal tier). Tier perks are goals you hope to deliver; never contractual promises.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} value={tierTitle} onChange={(e) => setTierTitle(e.target.value)} placeholder="Tier title (2-80 chars)" />
          <input className={input} value={tierCoins} onChange={(e) => setTierCoins(e.target.value)} inputMode="decimal" placeholder="Coins per month (1-100000)" />
          <input className={input} value={tierBlurb} onChange={(e) => setTierBlurb(e.target.value)} placeholder="Blurb; what will support go toward? (optional)" />
          <input className={input} value={tierClanSlug} onChange={(e) => setTierClanSlug(e.target.value)} placeholder="Clan slug for a clan tier (optional)" />
        </div>
        <button className={btn} disabled={busy} onClick={() => void createTier()}>
          Publish tier
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Creator verification <InfoTip text="Only verified creators can receive personal tips and offer personal tiers. Clan tiers use their mods instead. We review every application by hand." label="Verification: who reviews" /></h2>
        {verified ? (
          <p className="text-sm text-emerald-200">✓ You are verified; you can receive tips and offer personal tiers.</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              Only verified creators can receive personal support (clans are covered by their moderators instead). Tell
              us who you are and what you make; we review every application by hand.
              {reqStatus === "pending" && <span className="text-amber-200"> Your request is pending review.</span>}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className={input} value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="What do you create? (max 500 chars)" />
              <button className={btn} disabled={busy} onClick={() => void requestVerification()}>
                Request verification
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
