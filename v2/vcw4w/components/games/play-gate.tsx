"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";
import { AdSlot } from "@/components/ads/AdSlot";
import type { HouseAd } from "@/lib/ads";
import {
  GAME_CACHE_FREE_BYTES,
  GAME_HEARTBEAT_SECONDS,
  GUEST_AD_INTERVAL_MS,
} from "@/lib/game-rent";

type Gate =
  | { kind: "checking" }
  | { kind: "metering"; signedIn: true }
  | {
      kind: "playing";
      signedIn: boolean;
      sessionId: string | null;
      loadFee: number;
      freeLoad: boolean;
      coinsPerHour: number;
    }
  | { kind: "guest-ad"; ad: HouseAd; loadsUsed: number; loadsFree: number }
  | { kind: "denied"; message: string }
  | { kind: "topup"; message: string };

const METER_TIMEOUT_MS = 8000;
/** Assume a full load when the runtime never reports bytes (safe direction). */
const UNMEASURED_BYTES = 2 * GAME_CACHE_FREE_BYTES;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(String((data as { error?: unknown }).error ?? `Request failed (${response.status})`));
    (err as { status?: number }).status = response.status;
    throw err;
  }
  return data as T;
}

/**
 * PlayGate — the play shell's front door.
 *
 * Signed-in players: the game loads immediately (play is never blocked on
 * metering); when the runtime bridge reports fresh network bytes
 * (`fourweird-metering`), a coin session starts (load fee incl. first hour),
 * then a 5-minute visible-tab heartbeat bills extra hours. Cached loads
 * (< 1 MiB new data) are free. Out of coins → banner, beats stop.
 *
 * Guests: IP-quota-checked via /api/games/guest-pass. Inside the free quota
 * they play right away; beyond it each load needs one instantly-skippable
 * house ad, plus a dismissible ad banner every 30 min. No saves (the frame
 * already degrades to local progress), no multiplayer, no AI/Buddy.
 */
export function PlayGate({ slug, title, src, version }: { slug: string; title: string; src: string; version?: string }) {
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [broke, setBroke] = useState("");
  const [showGuestAd, setShowGuestAd] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const beatsRef = useRef(0);

  const startSession = useCallback(
    async (newBytes: number) => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const body = await postJson<{
          session: {
            session_id: string;
            load_fee: number;
            free_load: boolean;
            coins_per_load: number;
            coins_per_hour: number;
          };
        }>("/api/games/session", {
          action: "start",
          game_slug: slug,
          new_bytes: newBytes,
          bundle_version: version ?? "1",
        });
        sessionRef.current = body.session.session_id;
        setGate({
          kind: "playing",
          signedIn: true,
          sessionId: body.session.session_id,
          loadFee: body.session.load_fee,
          freeLoad: body.session.free_load,
          coinsPerHour: body.session.coins_per_hour,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start play session.";
        if (/insufficient balance/i.test(message)) {
          setGate({ kind: "topup", message });
        } else {
          // Metering failed but the static game is already served: play on
          // unmetered rather than bricking the game; the next load retries.
          setGate({ kind: "playing", signedIn: true, sessionId: null, loadFee: 0, freeLoad: false, coinsPerHour: 1 });
          setBroke(`Play metering is down (${message}) — playing unmetered this load.`);
        }
      }
    },
    [slug, version],
  );

  // Boot: signed in, guest, or metering-unavailable (local dev).
  useEffect(() => {
    let live = true;
    (async () => {
      let sessionRes: Response | null = null;
      try {
        sessionRes = await fetch("/api/auth/session", { credentials: "include" });
      } catch {
        sessionRes = null;
      }
      if (!live) return;
      if (sessionRes && sessionRes.ok) {
        setGate({ kind: "metering", signedIn: true });
        return;
      }
      if (sessionRes && sessionRes.status === 503) {
        // No Supabase on this deploy: free local play, no metering.
        setGate({ kind: "playing", signedIn: false, sessionId: null, loadFee: 0, freeLoad: true, coinsPerHour: 0 });
        return;
      }
      // Guest path: quota + ads.
      try {
        const pass = await postJson<{
          allowed: boolean;
          loads_used: number;
          loads_free: number;
          ad_required: boolean;
          ad: HouseAd | null;
        }>("/api/games/guest-pass", { game_slug: slug });
        if (!live) return;
        try {
          const key = `4weird-guest-loads:${new Date().toISOString().slice(0, 10)}`;
          window.localStorage.setItem(key, String(pass.loads_used));
        } catch {
          /* private mode; server quota still enforced */
        }
        if (pass.ad_required && pass.ad) {
          setGate({ kind: "guest-ad", ad: pass.ad, loadsUsed: pass.loads_used, loadsFree: pass.loads_free });
        } else {
          setGate({ kind: "playing", signedIn: false, sessionId: null, loadFee: 0, freeLoad: true, coinsPerHour: 0 });
        }
      } catch (error) {
        if (!live) return;
        setGate({ kind: "denied", message: error instanceof Error ? error.message : "Guest play unavailable." });
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  // Signed-in metering: wait for the bridge's byte report, else bill the load.
  useEffect(() => {
    if (gate.kind !== "metering") return;
    const onMetering = (event: Event) => {
      const detail = (event as CustomEvent<{ bytes?: number; slug?: string }>).detail;
      if (detail?.slug && detail.slug !== slug) return;
      void startSession(Math.max(0, Math.floor(Number(detail?.bytes ?? UNMEASURED_BYTES))));
    };
    const timer = setTimeout(() => void startSession(UNMEASURED_BYTES), METER_TIMEOUT_MS);
    window.addEventListener("fourweird-metering", onMetering);
    return () => {
      window.removeEventListener("fourweird-metering", onMetering);
      clearTimeout(timer);
    };
  }, [gate.kind, slug, startSession]);

  // Hourly heartbeat: visible tab only, 5-minute beats.
  useEffect(() => {
    if (gate.kind !== "playing" || !gate.signedIn || !gate.sessionId) return;
    const sid = gate.sessionId;
    const beat = async () => {
      if (document.hidden) return;
      try {
        await postJson("/api/games/session", { action: "heartbeat", session_id: sid, active_seconds: GAME_HEARTBEAT_SECONDS });
        beatsRef.current += 1;
      } catch (error) {
        if (/insufficient balance/i.test(error instanceof Error ? error.message : "")) {
          setBroke("Out of coins — hourly metering paused. Top up to keep your play counted (the game keeps running).");
        }
      }
    };
    const timer = setInterval(() => void beat(), GAME_HEARTBEAT_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [gate]);

  // End the coin session on unmount.
  useEffect(() => {
    return () => {
      const sid = sessionRef.current;
      sessionRef.current = null;
      if (sid) {
        try {
          void fetch("/api/games/session", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "end", session_id: sid }),
            keepalive: true,
          });
        } catch {
          /* unload race; the session stays open and harmless */
        }
      }
    };
  }, []);

  // Guest mid-play banner every 30 min.
  useEffect(() => {
    if (gate.kind !== "playing" || gate.signedIn) return;
    const timer = setInterval(() => setShowGuestAd(true), GUEST_AD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [gate]);

  if (gate.kind === "checking" || gate.kind === "metering") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
        <div className="grid h-[70vh] min-h-[420px] place-items-center p-8 text-center sm:h-[75vh]">
          <div>
            <p className="text-lg font-bold text-white">Loading {title}…</p>
            <p className="mt-2 text-sm text-white/60">
              {gate.kind === "metering" ? "Measuring fresh download (cached loads play free)…" : "Checking your pass…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gate.kind === "guest-ad") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
        <p className="text-lg font-black text-white">🎟️ Free guest loads used ({gate.loadsUsed - 1} of {gate.loadsFree} today)</p>
        <p className="mt-2 text-sm text-slate-300">
          Guests keep playing by watching a quick ad — or sign in and play on coins (daily bonuses alone cover 5+
          hours a day, no ads, plus cloud saves and multiplayer).
        </p>
        <div className="mt-4">
          <AdSlot
            slot={`play-${slug}`}
            forceAd={gate.ad}
            onSkipped={() => setGate({ kind: "playing", signedIn: false, sessionId: null, loadFee: 0, freeLoad: true, coinsPerHour: 0 })}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Sign up — get 100 free coins
          </Link>
          <Link href="/auth/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (gate.kind === "denied") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
        <p className="text-lg font-black text-white">🚦 Guest limit reached</p>
        <p className="mt-2 text-sm text-slate-300">{gate.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Sign up free — 100 coins
          </Link>
          <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Browse games
          </Link>
        </div>
      </div>
    );
  }

  if (gate.kind === "topup") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
        <p className="text-lg font-black text-white">🪙 Out of coins</p>
        <p className="mt-2 text-sm text-slate-300">{gate.message} Claim your daily bonus, grab a pack, or invite a friend (25/25).</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/pricing" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Get coins — 100 = $1.00
          </Link>
          <Link href="/account" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Claim daily bonus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {gate.signedIn && (
        <p role="status" className="mb-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs text-slate-300">
          {gate.sessionId ? (
            <>
              Metering play: this load <b className="text-white">{gate.freeLoad ? "free (cached)" : `${gate.loadFee} coin${gate.loadFee === 1 ? "" : "s"} (first hour included)`}</b>
              {" "}· +{gate.coinsPerHour} coin/hr after · <Link href="/my/usage/" className="text-cyan-300 hover:underline">usage</Link>
            </>
          ) : (
            <>Playing unmetered this load (session unavailable).</>
          )}
          {broke && <> · <span className="text-amber-200">{broke}</span></>}
        </p>
      )}
      {!gate.signedIn && (
        <p className="mb-2 rounded-xl border border-amber-300/30 bg-amber-300/[.06] px-4 py-2 text-xs text-slate-300">
          Playing as a guest — free with ads, no cloud saves or multiplayer.{" "}
          <Link href="/auth/sign-up" className="font-bold text-cyan-300 hover:underline">
            Sign up free
          </Link>{" "}
          for 100 coins, daily bonuses, and no ads.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
        <div className="h-[70vh] min-h-[420px] sm:h-[75vh]">
          <GameRuntimeFrame slug={slug} title={title} src={src} />
        </div>
      </div>
      {showGuestAd && (
        <div className="mt-2">
          <AdSlot slot={`midplay-${slug}`} onSkipped={() => setShowGuestAd(false)} compact />
        </div>
      )}
    </div>
  );
}
