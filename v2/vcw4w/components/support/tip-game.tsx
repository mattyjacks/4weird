"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TipForm } from "@/components/support/tip-form";
import { SUPPORT_DISCLAIMER_SHORT } from "@/lib/support";

type Tier = {
  id: string;
  owner_user_id: string | null;
  clan_id: string | null;
  title: string;
  blurb: string;
  coins_monthly: number;
};

type CreatorInfo = {
  dev_user_id: string | null;
  verified: boolean | null;
  tiers: Tier[];
  source: "mapped" | "house" | null;
};

/**
 * TipGame; the /support one-time tip box, working from a game page.
 * Resolves the game's mapped creator via /api/games/creator and locks the
 * tip recipient to them. Falls back to the manual ID field when no creator
 * is mapped yet, so tipping always works without leaving the page.
 */
export function TipGame({ slug, title }: { slug: string; title: string }) {
  const [info, setInfo] = useState<CreatorInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/games/creator?game_slug=${encodeURIComponent(slug)}`, { credentials: "include" })
      .then((r) => r.json().catch(() => null))
      .then((body) => {
        if (!live) return;
        if (body?.success) {
          setInfo({
            dev_user_id: body.dev_user_id ?? null,
            verified: typeof body.verified === "boolean" ? body.verified : null,
            tiers: Array.isArray(body.tiers) ? body.tiers : [],
            source: body.source === "mapped" || body.source === "house" ? body.source : null,
          });
        } else {
          setInfo({ dev_user_id: null, verified: null, tiers: [], source: null });
        }
      })
      .catch(() => {
        if (live) setInfo({ dev_user_id: null, verified: null, tiers: [], source: null });
      });
    return () => {
      live = false;
    };
  }, [slug]);

  async function subscribe(tierId: string) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/support/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "subscribe", tier_id: tierId }),
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      setMsg(data?.success ? "Subscribed; first month charged now. Cancel anytime; no proration." : (data?.error ?? "Subscribe failed."));
    } finally {
      setBusy(false);
    }
  }

  const devId = info?.dev_user_id ?? null;

  return (
    <section aria-label={`Support ${title}`} className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:mt-10 sm:p-6">
      <h2 className="text-lg font-bold sm:text-xl">Support this game</h2>
      <p className="mt-2 text-sm text-slate-400">
        Send a one-time tip in coins to{" "}
        {info?.source === "house"
          ? "4weird's house creator"
          : devId
            ? "the creator mapped to this game"
            : "this game's creator"}{" "}
        — coffee money, not a contract. {SUPPORT_DISCLAIMER_SHORT}{" "}
        <Link href="/support" className="text-cyan-300 hover:underline">
          More on /support
        </Link>
        .
      </p>
      {info && devId && info.verified === false && (
        <p className="mt-2 text-sm text-amber-200">
          This creator is not verified yet, so personal tips cannot land until they are verified. You can still
          subscribe below once tiers go live, or tip via /support.
        </p>
      )}
      <div className="mt-4">
        {info === null ? (
          <p className="text-sm text-slate-500">Resolving the creator…</p>
        ) : devId ? (
          <TipForm key={devId} initialRecipientUserId={devId} lockRecipient />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              No verified creator is mapped to this game yet — paste their user ID to tip them directly.
            </p>
            <TipForm />
          </>
        )}
      </div>
      {info && info.tiers.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-sm font-bold text-slate-200">Monthly tiers from this creator</h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {info.tiers.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <p className="text-sm font-bold">{t.title}</p>
                <p className="mt-1 text-xs text-slate-400">{t.blurb || "Monthly support."}</p>
                <p className="mt-1 text-xs text-cyan-200">
                  {t.coins_monthly} coins/mo (${(Number(t.coins_monthly) / 100).toFixed(2)}) · 25% cut included
                </p>
                <button
                  className="mt-2 rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void subscribe(t.id)}
                >
                  Subscribe
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-slate-300">{msg}</p>}
    </section>
  );
}
