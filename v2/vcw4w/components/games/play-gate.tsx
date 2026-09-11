"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";
import { AdSlot } from "@/components/ads/AdSlot";
import { AgeGate } from "@/components/games/age-gate";
import { RatingBadge } from "@/components/games/rating-badge";
import { KidBanner } from "@/components/family/kid-banner";
import { requiredAgeFor, getGameRating, isKidsMode } from "@/lib/age-gate";
import { bandMinAge } from "@/lib/family";
import type { HouseAd } from "@/lib/ads";
import {
  GAME_CACHE_FREE_BYTES,
  GAME_HEARTBEAT_SECONDS,
  GAME_STILL_PLAYING_SECONDS,
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

const METER_TIMEOUT_MS = 20000;
/** Assume a full load when the runtime never reports bytes (safe direction). */
// Note: the timeout only delays *billing*, never play — the frame mounts
// immediately in "metering", so slow game loads still report real bytes.
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
 * Age ratings first: Adults (18+) games always show a date-of-birth gate
 * (checked on-device, never stored); Kids Mode accounts can never see or
 * play Adults games (hard block, no bypass), while Teens (13–17) games ask
 * Kids Mode players for a 13+ date-of-birth check.
 *
 * Signed-in players: the game loads immediately (play is never blocked on
 * metering); when the runtime bridge reports fresh network bytes
 * (`fourweird-metering`), a coin session starts (proportional load fee:
 * the load rate for 1 MiB, exact to the centicentcoin even under 1 MB),
 * then a 1-minute visible-tab heartbeat bills running play per second
 * (hourly rate spread over 3600 s, from the first second). Every 5 hours
 * of active play a "still playing?" check asks for confirmation — the game
 * keeps running either way; it only confirms metering continues. Out of
 * coins → banner, beats stop.
 *
 * Guests: IP-quota-checked via /api/games/guest-pass. Inside the free quota
 * they play right away; beyond it each load needs one instantly-skippable
 * house ad, plus a dismissible ad banner every 30 min. No saves (the frame
 * already degrades to local progress), no multiplayer, no AI/Buddy.
 */
export function PlayGate({ slug, title, src, version }: { slug: string; title: string; src: string; version?: string }) {
  return (
    <Suspense>
      <PlayGateInner slug={slug} title={title} src={src} version={version} />
    </Suspense>
  );
}

// Lobby joins land here as ?match=<uuid>. The match id is forwarded into the
// runtime iframe's query string (same-origin) where the game's own
// matchmaking code reads it. Client-side on purpose: the play page stays
// static so unknown slugs 404 with a real 404 status, and useSearchParams
// needs the Suspense boundary above during prerender.
function PlayGateInner({ slug, title, src, version }: { slug: string; title: string; src: string; version?: string }) {
  const match = useSearchParams().get("match");
  const frameSrc = /^[0-9a-f-]{36}$/i.test(String(match ?? "")) ? `${src}?match=${encodeURIComponent(String(match))}` : src;
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [broke, setBroke] = useState("");
  const [showGuestAd, setShowGuestAd] = useState(false);
  // Age gate: resolved on mount from the catalog rating + Kids Mode, or from
  // a live child session (parent-attested band + hours + daily minutes — no
  // DOB is ever asked of children). "passed" means play may proceed; anything
  // else renders instead of the metering boot below. An entered DOB never
  // leaves the AgeGate component.
  const [age, setAge] = useState<
    "unknown" | "blocked" | "gate-teens" | "gate-adults" | "kid-rating" | "kid-hours" | "kid-timeup" | "passed"
  >("unknown");
  const [kidHandle, setKidHandle] = useState<string | null>(null);
  const rating = getGameRating(slug);
  // Per-second metering state: cumulative active seconds (from heartbeat
  // receipts) + how many 5-hour still-playing checks were acknowledged.
  const [activeSecs, setActiveSecs] = useState(0);
  const [stillAcks, setStillAcks] = useState(0);
  const sessionRef = useRef<string | null>(null);
  const startedRef = useRef(false);

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
        setActiveSecs(0);
        setStillAcks(0);
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
        } else if (kidHandle && /daily time limit|allowed play hours|monthly budget|suspended|session expired|rating blocked/i.test(message)) {
          // Child sessions fail CLOSED on parental limits: no unmetered play.
          setGate({ kind: "denied", message });
        } else {
          // Metering failed but the static game is already served: play on
          // unmetered rather than bricking the game; the next load retries.
          setGate({ kind: "playing", signedIn: true, sessionId: null, loadFee: 0, freeLoad: false, coinsPerHour: 1 });
          setBroke(`Play metering is down (${message}) — playing unmetered this load.`);
        }
      }
    },
    [slug, version, kidHandle],
  );

  // Age gate first: a live child session decides by parent-attested band +
  // hours + daily minutes; otherwise rating + Kids Mode decide (DOB gates).
  useEffect(() => {
    let live = true;
    const resolve = async () => {
      try {
        const res = await fetch("/api/family/kid-login", { credentials: "include" });
        const body = await res.json().catch(() => ({}));
        const kid = (body as { kid?: {
          handle: string; age_band: string; seconds_today: number;
          daily_minutes: number | null; in_window: boolean;
        } }).kid ?? null;
        if (!live) return;
        if (kid) {
          setKidHandle(kid.handle);
          if (bandMinAge(kid.age_band) < requiredAgeFor(rating)) {
            setAge("kid-rating");
            return;
          }
          if (!kid.in_window) {
            setAge("kid-hours");
            return;
          }
          if (kid.daily_minutes !== null && kid.seconds_today >= kid.daily_minutes * 60) {
            setAge("kid-timeup");
            return;
          }
          setAge("passed");
          return;
        }
      } catch {
        /* kid lookup failed — fall through to the standard gates */
      }
      if (!live) return;
      setKidHandle(null);
      const kids = isKidsMode();
      if (rating === "adults") setAge(kids ? "blocked" : "gate-adults");
      else if (rating === "teens") setAge(kids ? "gate-teens" : "passed");
      else setAge("passed");
    };
    void resolve();
    const refresh = () => void resolve();
    window.addEventListener("kids-mode-changed", refresh);
    window.addEventListener("kid-session-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      live = false;
      window.removeEventListener("kids-mode-changed", refresh);
      window.removeEventListener("kid-session-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [rating, slug]);

  // Boot: signed in, guest, or metering-unavailable (local dev).
  // A live child session skips straight to metering — /api/games/session
  // routes the kid_session cookie to the child wallet RPCs server-side.
  useEffect(() => {
    if (age !== "passed") return;
    let live = true;
    (async () => {
      if (kidHandle) {
        if (live) setGate({ kind: "metering", signedIn: true });
        return;
      }
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
  }, [slug, age, kidHandle]);

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

  // Per-second heartbeat: visible tab only, 1-minute beats that bill only
  // the delta since the last beat. Receipts update the active-seconds
  // counter driving the 5-hour still-playing check.
  useEffect(() => {
    if (gate.kind !== "playing" || !gate.signedIn || !gate.sessionId) return;
    const sid = gate.sessionId;
    const beat = async () => {
      if (document.hidden) return;
      try {
        const body = await postJson<{ beat: { active_seconds: number } }>("/api/games/session", { action: "heartbeat", session_id: sid, active_seconds: GAME_HEARTBEAT_SECONDS });
        const secs = Math.max(0, Math.floor(Number(body?.beat?.active_seconds ?? 0)));
        if (secs > 0) setActiveSecs(secs);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/insufficient balance/i.test(message)) {
          setBroke("Out of coins — metering paused. Top up to keep your play counted (the game keeps running).");
        } else if (/daily time limit|allowed play hours|monthly budget|suspended|session expired/i.test(message)) {
          // Parental limits hit mid-play: the game keeps running, but the
          // child sees why metering stopped (server stays authoritative).
          setBroke(`⏸️ ${message} — the game keeps running, but play time is paused.`);
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

  if (age === "blocked") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" role="alert">
        <p className="text-lg font-black text-white">🔒 Kids Mode is on</p>
        <p className="mt-2 text-sm text-slate-300">
          {title} is rated <RatingBadge rating={rating} /> and can&apos;t be played while Kids Mode is on.
          Turn Kids Mode off in <Link href="/account?tab=settings" className="font-bold text-cyan-300 hover:underline">account settings</Link> (or
          the games catalog) to play it — Adults games still ask for an 18+ age check every time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Browse kid-friendly games
          </Link>
        </div>
      </div>
    );
  }

  if (age === "kid-rating" || age === "kid-hours" || age === "kid-timeup") {
    const copy =
      age === "kid-rating"
        ? { head: "🔒 Not for your age band yet", body: `${title} is rated ${rating === "adults" ? "Adults (18+)" : "Teens (13–17)"}, and your parent set your account to a younger band. Ask them to change it in Account → Family if that’s wrong.` }
        : age === "kid-hours"
          ? { head: "🕒 Outside your play hours", body: "Your parent set hours when you can play. Come back when the window opens — your games and coins will be right here." }
          : { head: "⏰ Daily time is up!", body: "You’ve used today’s play minutes. Great session — see you tomorrow!" };
    return (
      <div>
        <KidBanner />
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" role="alert">
          <p className="text-lg font-black text-white">{copy.head}</p>
          <p className="mt-2 text-sm text-slate-300">{copy.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Browse your games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (age === "gate-adults" || age === "gate-teens") {
    return (
      <div>
        <div className="mb-2">
          <RatingBadge rating={rating} />
        </div>
        <AgeGate rating={age === "gate-adults" ? "adults" : "teens"} title={title} onPass={() => setAge("passed")} />
      </div>
    );
  }

  if (gate.kind === "checking") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
        <div className="play-frame-height grid min-h-[420px] place-items-center p-8 text-center">
          <div>
            <p className="text-lg font-bold text-white">Loading {title}…</p>
            <p className="mt-2 text-sm text-white/60">Checking your pass…</p>
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
    const kidBlock = kidHandle !== null;
    return (
      <div>
        {kidHandle && <KidBanner />}
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
          <p className="text-lg font-black text-white">{kidBlock ? "⏸️ Paused by parental controls" : "🚦 Guest limit reached"}</p>
          <p className="mt-2 text-sm text-slate-300">{gate.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {kidBlock ? (
              <Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Browse your games
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                  Sign up free — 100 coins
                </Link>
                <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                  Browse games
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gate.kind === "topup") {
    return (
      <div>
        {kidHandle && <KidBanner />}
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
          <p className="text-lg font-black text-white">🪙 Out of coins</p>
          <p className="mt-2 text-sm text-slate-300">
            {kidHandle
              ? `${gate.message} Ask your parent to add coins to your wallet in Account → Family.`
              : `${gate.message} Claim your daily bonus, grab a pack, or invite a friend (25/25).`}
          </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/pricing" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Get coins — 100 = $1.00
          </Link>
          <Link href="/account" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Claim daily bonus
          </Link>
        </div>
        </div>
      </div>
    );
  }

  // "metering" and "playing" share one mounted frame below so the game never
  // reboots when the coin session starts. This is load-bearing: the byte
  // report that starts the session comes from the runtime bridge INSIDE the
  // frame, so the frame must mount before metering can complete — blocking
  // it forced every load down the unmeasured-fallback path (full fee even
  // for cached loads).
  const metering = gate.kind === "metering";
  const playing = gate.kind === "playing" ? gate : null;
  // Still-playing check: every 5 hours of active play, ask for confirmation.
  // The game keeps running either way — this only confirms metering.
  const hoursPlayed = playing?.signedIn && playing.sessionId ? activeSecs / 3600 : 0;
  const needStillCheck =
    playing?.signedIn && playing.sessionId ? activeSecs >= (stillAcks + 1) * GAME_STILL_PLAYING_SECONDS : false;

  return (
    <div>
      {kidHandle && <KidBanner />}
      {metering && (
        <p role="status" className="mb-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs text-slate-300">
          Measuring fresh download (first loads bill exact bytes)…
        </p>
      )}
      {playing?.signedIn && (
        <p role="status" className="mb-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs text-slate-300">
          {playing.sessionId ? (
            <>
              Metering play: this load <b className="text-white">{playing.freeLoad ? "free (cached)" : `${playing.loadFee} coin${playing.loadFee === 1 ? "" : "s"} (exact bytes)`}</b>
              {" "}· +{playing.coinsPerHour} coin/hr, billed per second from the first second · <Link href="/my/usage/" className="text-cyan-300 hover:underline">usage</Link>
              {hoursPlayed > 0 && <> · {hoursPlayed.toFixed(1)}h played</>}
            </>
          ) : (
            <>Playing unmetered this load (session unavailable).</>
          )}
          {broke && <> · <span className="text-amber-200">{broke}</span></>}
        </p>
      )}
      {needStillCheck && (
        <div role="alert" className="mb-2 rounded-xl border border-amber-300/40 bg-amber-300/[.08] px-4 py-3 text-xs text-slate-200">
          <p className="font-bold text-amber-200">
            ⏰ Still playing? You&apos;ve been running for {(activeSecs / 3600).toFixed(1)} hours (billed per second at {playing && "coinsPerHour" in playing ? playing.coinsPerHour : 1} coin/hr).
          </p>
          <p className="mt-1 text-slate-300">
            The game keeps running either way — confirm metering should continue, or just close the tab.
          </p>
          <button
            className="mt-2 rounded-full bg-amber-300 px-4 py-1.5 font-bold text-slate-950 hover:bg-amber-200"
            onClick={() => setStillAcks((n) => n + 1)}
          >
            Yes, still playing — keep metering
          </button>
        </div>
      )}
      {playing && !playing.signedIn && (
        <p className="mb-2 rounded-xl border border-amber-300/30 bg-amber-300/[.06] px-4 py-2 text-xs text-slate-300">
          Playing as a guest — free with ads, no cloud saves or multiplayer.{" "}
          <Link href="/auth/sign-up" className="font-bold text-cyan-300 hover:underline">
            Sign up free
          </Link>{" "}
          for 100 coins, daily bonuses, and no ads.
        </p>
      )}
      <div className="perf-frame overflow-hidden overscroll-contain rounded-2xl border border-white/15 bg-black">
        <div className="play-frame-height min-h-[420px]">
          <GameRuntimeFrame slug={slug} title={title} src={frameSrc} />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Click the game once to focus keyboard controls · Fullscreen or Pop out for the full game window · Progress
        saves to slot 1 when you&apos;re signed in.
      </p>
      {showGuestAd && (
        <div className="mt-2">
          <AdSlot slot={`midplay-${slug}`} onSkipped={() => setShowGuestAd(false)} compact />
        </div>
      )}
    </div>
  );
}
