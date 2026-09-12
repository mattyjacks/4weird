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
import {
  CONTENT_MODE_LABELS,
  canUseContentMode,
  contentModeSummary,
  defaultContentMode,
  effectiveMinAge,
  hasContentModes,
  listContentModesForViewer,
  readStoredContentMode,
  withContentModeParam,
  writeStoredContentMode,
} from "@/lib/content-modes";
import type { ContentMode } from "@/lib/content-modes";
import type { HouseAd } from "@/lib/ads";
import {
  GAME_HEARTBEAT_SECONDS,
  GAME_LOAD_REFERENCE_BYTES,
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
// Note: the timeout only delays *billing*, never play; the frame mounts
// immediately in "metering", so slow game loads still report real bytes.
const UNMEASURED_BYTES = 2 * GAME_LOAD_REFERENCE_BYTES;

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
 * PlayGate; the play shell's front door.
 *
 * Age ratings first: the server (/api/games/session) requires
 * profiles.age_band='adult' for Adults (18+) and 'teen'/'adult' for Teens
 * (13+), so the date-of-birth gate (checked on-device, never stored) is
 * shown ONLY when it can succeed server-side — adults with an adult band,
 * teens with a teen/adult band or the Kids-Mode-device guest case. Anything
 * else is a hard band-fix block (no DOB bypass): Adults titles explain the
 * Account-settings Adult-band fix, Teens titles prompt for Teen/Adult band,
 * and guests get a sign-in prompt — never a DOB gate that passes then 403s.
 *
 * Signed-in players: the game loads immediately (play is never blocked on
 * metering); when the runtime bridge reports fresh network bytes
 * (`fourweird-metering`), a coin session starts (proportional load fee:
 * the load rate for 1 MiB, exact to the centicentcoin even under 1 MB),
 * then a 1-minute visible-tab heartbeat bills running play per second
 * (hourly rate spread over 3600 s, from the first second). Every 5 hours
 * of active play a "still playing?" check asks for confirmation; the game
 * keeps running either way; it only confirms metering continues. Out of
 * coins → banner, beats stop.
 *
 * Guests: IP-quota-checked via /api/games/guest-pass. Inside the free quota
 * they play right away; beyond it each load needs one instantly-skippable
 * house ad, plus a dismissible ad banner every 30 min. No saves (the frame
 * already degrades to local progress), no multiplayer, no AI/Buddy.
 */
export function PlayGate({ slug, title, src, version, emoji }: { slug: string; title: string; src: string; version?: string; emoji?: string }) {
  return (
    <Suspense>
      <PlayGateInner slug={slug} title={title} src={src} version={version} emoji={emoji} />
    </Suspense>
  );
}

// Lobby joins land here as ?match=<uuid>. The match id is forwarded into the
// runtime iframe's query string (same-origin) where the game's own
// matchmaking code reads it. Client-side on purpose: the play page stays
// static so unknown slugs 404 with a real 404 status, and useSearchParams
// needs the Suspense boundary above during prerender.
/**
 * ContentMode picker: ALWAYS renders all three modes (kid/teen/all) via
 * listContentModesForViewer — the list is never filtered. Modes the viewer
 * cannot use render disabled with a 🔒 lockReason (canUseContentMode).
 */
function ContentModePicker({
  slug,
  band,
  kidBand,
  mode,
  onSelect,
}: {
  slug: string;
  band: "unknown" | "kid" | "teen" | "adult";
  kidBand: string | null;
  mode: ContentMode;
  onSelect: (next: ContentMode) => void;
}) {
  if (!hasContentModes(slug)) return null;
  const options = listContentModesForViewer(band, kidBand);
  return (
    <fieldset className="mb-3 rounded-2xl border border-white/15 bg-black p-4 sm:p-5">
      <legend className="px-2 text-sm font-black text-white">Content mode</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const summary = contentModeSummary(option.mode);
          const selected = mode === option.mode;
          return (
            <label
              key={option.mode}
              className={`block cursor-pointer rounded-xl border px-3 py-2.5 text-left text-xs ${
                selected ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-white/[.03]"
              } ${option.locked ? "cursor-not-allowed opacity-70" : "hover:bg-white/[.06]"}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`content-mode-${slug}`}
                  checked={selected}
                  disabled={option.locked}
                  onChange={() => onSelect(option.mode)}
                  className="accent-cyan-300"
                />
                <span className="text-sm font-black text-white">
                  {option.locked ? "🔒 " : ""}
                  {option.label}
                </span>
              </span>
              <span className="mt-1 block text-slate-300">{option.description}</span>
              <span className="mt-1 block text-slate-400">
                Gore: {summary.gore} · Drugs: {summary.drugs} · Language: {summary.language}
              </span>
              {option.locked && option.lockReason && (
                <span className="mt-1 block font-semibold text-amber-200">{option.lockReason}</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Kid: no blood/gore, child-friendly words · Teen ({CONTENT_MODE_LABELS.teen}): gore on, mild swears only ·{" "}
        {CONTENT_MODE_LABELS.all}: everything, 18+ only.
      </p>
    </fieldset>
  );
}

function PlayGateInner({ slug, title, src, version, emoji }: { slug: string; title: string; src: string; version?: string; emoji?: string }) {
  const match = useSearchParams().get("match");
  const matchSrc = /^[0-9a-f-]{36}$/i.test(String(match ?? "")) ? `${src}?match=${encodeURIComponent(String(match))}` : src;
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  // Click-to-play: the runtime iframe never mounts (no bytes, no metering,
  // no guest-quota burn) until the player presses Start Game on the branded
  // start screen. Reset per game so navigating between titles re-arms it.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    setGate({ kind: "checking" });
    setBroke("");
    setShowGuestAd(false);
    setActiveSecs(0);
    setStillAcks(0);
    setGuestRetry(0);
    sessionRef.current = null;
    startedRef.current = false;
    guestAdToken.current = null;
  }, [slug]);
  const [broke, setBroke] = useState("");
  const [showGuestAd, setShowGuestAd] = useState(false);
  // Age gate: resolved on mount from the catalog rating + Kids Mode, or from
  // a live child session (parent-attested band + hours + daily minutes; no
  // DOB is ever asked of children). "passed" means play may proceed; anything
  // else renders instead of the metering boot below. An entered DOB never
  // leaves the AgeGate component.
  const [age, setAge] = useState<
    "unknown" | "blocked" | "band-teens" | "gate-teens" | "gate-adults" | "kid-rating" | "kid-hours" | "kid-timeup" | "passed"
  >("unknown");
  const [kidHandle, setKidHandle] = useState<string | null>(null);
  // Why-blocked context for the band-fix UI: the server (/api/games/session)
  // enforces profiles.age_band authoritatively, so a DOB entry (in-memory
  // only, never stored) can never satisfy it. These mirror the resolution
  // inputs so the blocked/band-teens copy can point at the real fix.
  const [ageBand, setAgeBand] = useState<"unknown" | "kid" | "teen" | "adult">("unknown");
  const [kidsOn, setKidsOn] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const rating = getGameRating(slug);
  // Content modes (gravegain2d/gravegain3d/lastwordszombies): the stored mode
  // rides in the frame URL (?content=<mode>) and is sent to /api/games/session
  // as content_mode; live switches also postMessage into the running frame.
  const contentSupported = hasContentModes(slug);
  const [contentMode, setContentMode] = useState<ContentMode>(() => defaultContentMode());
  const [kidBand, setKidBand] = useState<string | null>(null);
  // Bumped when the picker changes so the age resolution below re-runs (a
  // kid-band viewer switching to kid mode can clear kid-rating live).
  const [contentNonce, setContentNonce] = useState(0);
  useEffect(() => {
    setContentMode(contentSupported ? readStoredContentMode(slug) : defaultContentMode());
  }, [slug, contentSupported]);
  const selectContentMode = useCallback(
    (next: ContentMode) => {
      if (!canUseContentMode(ageBand, kidBand, next)) return;
      setContentMode(next);
      writeStoredContentMode(slug, next);
      setContentNonce((n) => n + 1);
    },
    [slug, ageBand, kidBand],
  );
  const frameSrc = contentSupported ? withContentModeParam(matchSrc, contentMode) : matchSrc;
  const picker = contentSupported ? (
    <ContentModePicker slug={slug} band={ageBand} kidBand={kidBand} mode={contentMode} onSelect={selectContentMode} />
  ) : null;
  // Per-second metering state: cumulative active seconds (from heartbeat
  // receipts) + how many 5-hour still-playing checks were acknowledged.
  const [activeSecs, setActiveSecs] = useState(0);
  const [stillAcks, setStillAcks] = useState(0);
  const sessionRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  // Latest guest ad_token for the server-side token chain (over-quota loads
  // must present the previous load's token). Survives the interstitial
  // retry; reset per slug mount.
  const guestAdToken = useRef<string | null>(null);
  // Bumped when the guest interstitial is dismissed so the boot effect
  // re-runs guest-pass WITH the fresh token instead of playing blind.
  const [guestRetry, setGuestRetry] = useState(0);

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
          ...(contentSupported ? { content_mode: contentMode } : {}),
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
        const status = (error as { status?: number }).status;
        const msg = message.toLowerCase();
        if (status === 402 || /insufficient/.test(msg)) {
          setGate({ kind: "topup", message });
        } else if (kidHandle && /daily time limit|allowed play hours|monthly budget|suspended|session expired|rating blocked/i.test(message)) {
          // Child sessions fail CLOSED on parental limits: no unmetered play.
          setGate({ kind: "denied", message });
        } else if (
          status === 403 ||
          status === 401 ||
          status === 404 ||
          status === 409 ||
          /rating blocked|daily time limit|allowed play hours|monthly budget|suspended|session expired|not authorized|limit reached|cap reached|parental|child session/i.test(message) ||
          /age band/i.test(message) ||
          /content mode/i.test(message) ||
          /Adults \(18\+\) games need an Adult|Teens \(13\+\) games need a Teen/i.test(message)
        ) {
          // Authoritative server age-band denial: the profile band (not the
          // in-memory DOB check) decides. Never fall through to unmetered
          // "playing" here — that hid the 403 behind a "metering is down"
          // message and let DOB-passed players think billing broke.
          // Only network/5xx/RPC failures use the unmetered fallback below.
          // The copy names free play, not broken metering, so an age-gated
          // adults title never reads as a broken game.
          if (/Teens \(13\+\) games need a Teen/i.test(message)) {
            setGate({
              kind: "denied",
              message: `${message} Set your age band to Teen (13-17) or Adult (18+) in Account settings — entering a date of birth cannot bypass it.`,
            });
          } else {
            setGate({
              kind: "denied",
              message: `${message} Set your age band to Adult (18+) in Account settings — entering a date of birth cannot bypass it.`,
            });
          }
        } else {
          // True infra failure only (5xx / network / 20s timeout path): the
          // static game is already served, so play on free and unmetered
          // rather than bricking the game; the next load retries.
          // Reserved for network/5xx/RPC failures only (age-band 403s are
          // handled above and fail closed).
          setGate({ kind: "playing", signedIn: true, sessionId: null, loadFee: 0, freeLoad: false, coinsPerHour: 1 });
          setBroke("Free play this load (metering unavailable, game unaffected).");
        }
      }
    },
    [slug, version, kidHandle, contentSupported, contentMode],
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
          setKidBand(String(kid.age_band ?? ""));
          // Content-mode games enforce the EFFECTIVE minimum age, not the raw
          // catalog rating: a kid-band child with kid mode stored (min age 0)
          // passes here instead of hitting kid-rating; the server re-checks
          // the same effective age authoritatively.
          const effectiveMin = hasContentModes(slug)
            ? effectiveMinAge(slug, readStoredContentMode(slug))
            : requiredAgeFor(rating);
          if (bandMinAge(kid.age_band) < effectiveMin) {
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
        /* kid lookup failed; fall through to the standard gates */
      }
      if (!live) return;
      setKidHandle(null);
      setKidBand(null);
      const kids = isKidsMode();
      if (live) setKidsOn(kids);
      // Full-account band enforcement (COPPA: full accounts are 13+ only;
      // 13-17 → teen, 18+ → adult). The server (/api/games/session) is
      // authoritative: Adults (18+) needs profiles.age_band='adult',
      // Teens (13+) needs 'teen'/'adult'. The client DOB gate is in-memory
      // only (never stored) and can never satisfy the band check, so a DOB
      // gate is shown ONLY when it can actually succeed server-side:
      // adults → band=='adult' (plus no Kids Mode); teens → band in
      // teen/adult, or the Kids-Mode-device guest case (guest-pass path, no
      // band to check). Anything else renders a band-fix prompt (blocked for
      // adults, band-teens for teens) — never a DOB gate that passes then
      // 403s into "metering is down". Guests have no profile (a fetch would
      // just 401 + console noise), so check the session first and treat
      // no-session as band-less (actionable denied, not a DOB gate).
      let band: "unknown" | "kid" | "teen" | "adult" = "unknown";
      let signedIn = false;
      try {
        const sess = await fetch("/api/auth/session", { credentials: "include" });
        if (sess.ok) {
          signedIn = true;
          const pres = await fetch("/api/me/profile", { credentials: "include" });
          if (pres.ok) {
            const pbody = await pres.json().catch(() => ({}));
            const raw = String((pbody as { profile?: { age_band?: unknown } }).profile?.age_band ?? "unknown");
            if (raw === "adult" || raw === "teen" || raw === "kid" || raw === "unknown") band = raw;
          }
        }
      } catch {
        /* profile unreadable: fail closed below (band stays unknown) */
      }
      if (!live) return;
      setAgeBand(band);
      setHasSession(signedIn);
      // Content-mode games (gravegain2d/gravegain3d/lastwordszombies) enforce
      // the EFFECTIVE minimum age of the stored mode, not the raw catalog
      // rating — mirroring /api/games/session. A teen-band player with Teen
      // mode stored (gore on, 13+) takes the teens branch instead of the
      // adults hard block, and Kid mode (0+) passes outright. Without this
      // the picker above the block promised a choice that never unblocked
      // (branching on the raw rating re-blocked every teen/kid-mode player).
      const storedMode = hasContentModes(slug) ? readStoredContentMode(slug) : null;
      const effMin = storedMode ? effectiveMinAge(slug, storedMode) : requiredAgeFor(rating);
      const effRating: "kids" | "teens" | "adults" = effMin >= 18 ? "adults" : effMin >= 13 ? "teens" : "kids";
      if (effRating === "adults") {
        // Hard block unless an adult band can clear the server check. Kids
        // Mode, guests, and non-adult bands all land here with band-fix copy.
        if (kids || !signedIn || band !== "adult") setAge("blocked");
        else setAge("gate-adults");
      } else if (effRating === "teens") {
        const bandOk = band === "teen" || band === "adult";
        if (signedIn && bandOk && !kids) setAge("passed");
        else if (signedIn && bandOk && kids) setAge("gate-teens");
        else if (!signedIn && kids) setAge("gate-teens");
        else setAge("band-teens");
      } else setAge("passed");
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
  }, [rating, slug, contentNonce]);

  // Live content-mode switch: forward the newly picked mode into the running
  // runtime frame (the bridge applies gore + profanity without a reload; a
  // full reload via the ?content= frameSrc above is the fallback path).
  useEffect(() => {
    if (!contentSupported || !entered) return;
    try {
      document.querySelectorAll("iframe").forEach((frame) => {
        try {
          frame.contentWindow?.postMessage({ version: 1, type: "content-mode", mode: contentMode }, "*");
        } catch {
          /* cross-origin frame; the ?content= URL param already carried it */
        }
      });
    } catch {
      /* no DOM access; the ?content= URL param already carried the mode */
    }
  }, [contentSupported, contentMode, entered]);

  // Boot: signed in, guest, or metering-unavailable (local dev).
  // Runs only AFTER the player presses Start Game (entered): the guest-pass
  // quota, the coin session, and the iframe bytes must all wait for the
  // click, so landing on the page costs nothing.
  // A live child session skips straight to metering - /api/games/session
  // routes the kid_session cookie to the child wallet RPCs server-side.
  useEffect(() => {
    if (age !== "passed" || !entered) return;
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
      // Guest path: quota + ads. Over-quota loads chain the previous
      // load's ad_token (see /api/games/guest-pass); the ref carries it
      // across the interstitial retry. A 403 denial still carries a fresh
      // ad + token, so showing the interstitial and retrying converges.
      try {
        const guestRes = await fetch("/api/games/guest-pass", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_slug: slug, ...(guestAdToken.current ? { ad_token: guestAdToken.current } : {}) }),
        });
        const pass = (await guestRes.json().catch(() => ({}))) as {
          allowed?: boolean;
          loads_used?: number;
          loads_free?: number;
          ad_required?: boolean;
          ad?: HouseAd | null;
          ad_token?: string;
          error?: string;
        };
        if (!live) return;
        if (typeof pass.ad_token === "string" && pass.ad_token) guestAdToken.current = pass.ad_token;
        try {
          const key = `4weird-guest-loads:${new Date().toISOString().slice(0, 10)}`;
          window.localStorage.setItem(key, String(pass.loads_used));
        } catch {
          /* private mode; server quota still enforced */
        }
        if (pass.ad_required && pass.ad) {
          setGate({ kind: "guest-ad", ad: pass.ad, loadsUsed: pass.loads_used ?? 0, loadsFree: pass.loads_free ?? 0 });
        } else if (!guestRes.ok || pass.allowed === false) {
          setGate({ kind: "denied", message: pass.error ?? "Guest play unavailable." });
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
  }, [slug, age, kidHandle, guestRetry, entered]);

  // Signed-in metering: wait for the bridge's byte report, else bill the load.
  // Only after Start (entered): the frame - and its byte report - doesn't
  // exist before the click, so the unmeasured fallback must not fire early.
  useEffect(() => {
    if (gate.kind !== "metering" || !entered) return;
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
  }, [gate.kind, slug, startSession, entered]);

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
        if (/insufficient/i.test(message)) {
          // Single concise broke line: keep the first notice, never spam one
          // per 60s beat. Infra heartbeat failures stay silent on purpose.
          setBroke((prev) => prev || "Out of coins; metering paused. Top up to keep your play counted (the game keeps running).");
        } else if (/daily time limit|allowed play hours|monthly budget|suspended|session expired/i.test(message)) {
          // Parental limits hit mid-play: the game keeps running, but the
          // child sees why metering stopped (server stays authoritative).
          setBroke((prev) => prev || `⏸️ ${message}; the game keeps running, but play time is paused.`);
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
    // Adults (18+) hard block. The server requires profiles.age_band='adult';
    // an in-memory DOB entry can never bypass it, so there is deliberately no
    // DOB gate here — only the real fix per cause.
    const guestBlock = !hasSession;
    return (
      <>
      {picker}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" role="alert">
        <p className="text-lg font-black text-white">
          {kidsOn ? "🔒 Kids Mode is on" : "🔞 Adults (18+) — Adult age band required"}
        </p>
        <div className="mt-2 text-sm text-slate-300">
          <p>
            {title} is rated <RatingBadge rating={rating} />.{" "}
            {kidsOn
              ? "It can't be played while Kids Mode is on. Turn Kids Mode off in account settings (or the games catalog) to play it — Adults games still ask for an 18+ age check every time, and your account's age band must be Adult (18+)."
              : guestBlock
                ? "Sign in with an Adult (18+) account to play it. Guests can't clear the age check, and entering a date of birth cannot bypass the band — the server checks your account's age band."
                : `Your account's age band is ${ageBand === "unknown" ? "not set (legacy)" : ageBand}. Adults (18+) games need an Adult (18+) age band — entering a date of birth cannot bypass it.`}
          </p>
          {!kidsOn && !guestBlock && (
            <p className="mt-2">
              Fix: open <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">Account settings</Link> and
              set your age band to <b className="text-white">Adult (18+)</b>, then come back — you&apos;ll get the 18+ age check, and play starts after you pass it.
            </p>
          )}
          {!kidsOn && guestBlock && (
            <p className="mt-2">
              Fix: <Link href="/auth/sign-up" className="font-bold text-cyan-300 hover:underline">sign up as Adult (18+)</Link> (or{" "}
              <Link href="/auth/login" className="font-bold text-cyan-300 hover:underline">log in</Link>), and make sure your age band is
              Adult (18+) in <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">Account settings</Link>.
            </p>
          )}
          {kidsOn && (
            <p className="mt-2">
              Fix: turn Kids Mode off in <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">account settings</Link> (or
              the games catalog). Your account&apos;s age band must also be <b className="text-white">Adult (18+)</b> — set it there; a date-of-birth
              entry cannot bypass the band.
            </p>
          )}
          {contentSupported && (
            <p className="mt-2">
              🧟 Tip: the Content mode picker above changes this check — <b className="text-white">Teen</b> mode needs only a Teen (13-17) or Adult
              band, and <b className="text-white">Kid</b> mode plays for every band. Only Uncut (18+) needs the Adult band.
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!kidsOn && !guestBlock && (
            <Link href="/account#age-band" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Open Account settings
            </Link>
          )}
          {guestBlock && !kidsOn && (
            <>
              <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Sign up free - 100 coins
              </Link>
              <Link href="/auth/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                Log in
              </Link>
            </>
          )}
          <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Browse kid-friendly games
          </Link>
        </div>
      </div>
      </>
    );
  }

  if (age === "band-teens") {
    // Teens (13+) band-fix prompt. Shown instead of a DOB gate whenever the
    // server would 403 (signed-in band unknown/kid, or guests with no band
    // and no Kids-Mode device flag). DOB entry cannot bypass the band.
    const guestBand = !hasSession;
    return (
      <>
      {picker}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" role="alert">
        <p className="text-lg font-black text-white">🔒 Teens (13+) — age band required</p>
        <div className="mt-2 text-sm text-slate-300">
          <p>
            {title} is rated <RatingBadge rating={rating} />.{" "}
            {guestBand
              ? "Guests can't clear this check — sign in with a Teen (13-17) or Adult (18+) account. Entering a date of birth cannot bypass the band; the server checks your account's age band."
              : `Your account's age band is ${ageBand === "unknown" ? "not set (legacy)" : ageBand}. Teens (13+) games need a Teen (13-17) or Adult (18+) age band — entering a date of birth cannot bypass it.`}
          </p>
          <p className="mt-2">
            Fix: {guestBand ? (
              <>
                <Link href="/auth/sign-up" className="font-bold text-cyan-300 hover:underline">sign up as Teen or Adult</Link> (or{" "}
                <Link href="/auth/login" className="font-bold text-cyan-300 hover:underline">log in</Link>), then set your band in{" "}
                <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">Account settings</Link>.
              </>
            ) : (
              <>
                open <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">Account settings</Link> and
                set your age band to <b className="text-white">Teen (13-17)</b> or <b className="text-white">Adult (18+)</b>, then come back.
              </>
            )}
          </p>
          {contentSupported && (
            <p className="mt-2">
              🧟 Tip: the Content mode picker above changes this check — <b className="text-white">Kid</b> mode plays for every band, no sign-in needed.
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {guestBand ? (
            <>
              <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Sign up free - 100 coins
              </Link>
              <Link href="/auth/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                Log in
              </Link>
            </>
          ) : (
            <Link href="/account#age-band" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Open Account settings
            </Link>
          )}
          <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Browse games
          </Link>
        </div>
      </div>
      </>
    );
  }

  if (age === "kid-rating" || age === "kid-hours" || age === "kid-timeup") {
    const copy =
      age === "kid-rating"
        ? { head: "🔒 Not for your age band yet", body: `${title} is rated ${rating === "adults" ? "Adults (18+)" : "Teens (13-17)"}, and your parent set your account to a younger band. Ask them to change it in Account → Family if that’s wrong.` }
        : age === "kid-hours"
          ? { head: "🕒 Outside your play hours", body: "Your parent set hours when you can play. Come back when the window opens; your games and coins will be right here." }
          : { head: "⏰ Daily time is up!", body: "You’ve used today’s play minutes. Great session; see you tomorrow!" };
    return (
      <div>
        <KidBanner />
        {picker}
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
        {picker}
        <div className="mb-2">
          <RatingBadge rating={rating} />
        </div>
        <AgeGate rating={age === "gate-adults" ? "adults" : "teens"} title={title} onPass={() => setAge("passed")} />
      </div>
    );
  }

  // Branded click-to-play start screen: shown once the age pass resolves,
  // before the boot runs. The runtime iframe never mounts until Start, so
  // landing here downloads nothing, meters no coins, and burns no guest
  // quota - the load starts (and only starts) on the click.
  if (!entered && age === "passed") {
    return (
      <div>
      {picker}
      <div className="overflow-hidden rounded-2xl border border-cyan-300/30 bg-gradient-to-b from-slate-950 via-black to-slate-950">
        <div className="play-frame-height grid min-h-[420px] place-items-center p-8 text-center">
          <div className="max-w-md">
            <p aria-hidden="true" className="text-6xl">{emoji ?? "🎮"}</p>
            <p className="mt-3 text-xs font-bold tracking-widest text-cyan-300">4WEIRD ARCADE</p>
            <p className="mt-1 text-2xl font-black text-white">{title}</p>
            <button
              type="button"
              onClick={() => setEntered(true)}
              autoFocus
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-300 px-10 py-3.5 text-lg font-black text-slate-950 transition hover:bg-cyan-200"
            >
              ▶ Start Game
            </button>
            <p className="mt-3 text-xs text-white/60">
              Nothing loads and no coins are metered until you press Start.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Click the game once after it loads to focus keyboard controls · Fullscreen or Pop out for the full window
            </p>
          </div>
        </div>
      </div>
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
          Guests keep playing by watching a quick ad; or sign in and play on coins (daily bonuses alone cover 5+
          hours a day, no ads, plus cloud saves and multiplayer).
        </p>
        <div className="mt-4">
          <AdSlot
            slot={`play-${slug}`}
            forceAd={gate.ad}
            onSkipped={() => {
              setGate({ kind: "checking" });
              setGuestRetry((n) => n + 1);
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Sign up; get 100 free coins
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
    // Server age-band denial (403 from /api/games/session): surface the real
    // fix with direct links instead of the generic guest-limit copy. Never
    // show "metering is down / playing unmetered" for these.
    const bandDenied = !kidBlock && /age band/i.test(gate.message);
    return (
      <div>
        {kidHandle && <KidBanner />}
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10">
          <p className="text-lg font-black text-white">
            {kidBlock ? "⏸️ Paused by parental controls" : bandDenied ? "🔒 Age band required" : "🚦 Guest limit reached"}
          </p>
          <p className="mt-2 text-sm text-slate-300">{gate.message}</p>
          {bandDenied && (
            <div className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-300/[.06] px-4 py-3 text-sm text-slate-200">
              <p className="font-bold text-white">Why you still see this after entering your age</p>
              <p className="mt-1 text-slate-300">
                The date-of-birth check on the game page is device-only and is never saved.
                The server unlocks Adults / Teens games from your account&apos;s age band instead.
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
                <li>
                  Open <Link href="/account#age-band" className="font-bold text-cyan-300 hover:underline">Account → age band</Link> and
                  set it to <b className="text-white">Adult (18+)</b> for Adults games (Teen or Adult for Teens games).
                </li>
                <li>Come back here and reload the game page.</li>
                <li>Pass the 18+ age check again — play starts right after.</li>
              </ol>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {kidBlock ? (
              <Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Browse your games
              </Link>
            ) : bandDenied ? (
              <>
                <Link href="/account#age-band" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                  Open Account settings
                </Link>
                <Link href="/games" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
                  Browse games
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-up" className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                  Sign up free - 100 coins
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
            Get coins - 100 = $1.00
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
  // frame, so the frame must mount before metering can complete; blocking
  // it forced every load down the unmeasured-fallback path (full fee even
  // for cached loads).
  const metering = gate.kind === "metering";
  const playing = gate.kind === "playing" ? gate : null;
  // Still-playing check: every 5 hours of active play, ask for confirmation.
  // The game keeps running either way; this only confirms metering.
  const hoursPlayed = playing?.signedIn && playing.sessionId ? activeSecs / 3600 : 0;
  const needStillCheck =
    playing?.signedIn && playing.sessionId ? activeSecs >= (stillAcks + 1) * GAME_STILL_PLAYING_SECONDS : false;

  return (
    <div>
      {kidHandle && <KidBanner />}
      {picker}
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
            <>Free play this load (metering unavailable, game unaffected).</>
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
            The game keeps running either way; confirm metering should continue, or just close the tab.
          </p>
          <button
            className="mt-2 rounded-full bg-amber-300 px-4 py-1.5 font-bold text-slate-950 hover:bg-amber-200"
            onClick={() => setStillAcks((n) => n + 1)}
          >
            Yes, still playing; keep metering
          </button>
        </div>
      )}
      {playing && !playing.signedIn && (
        <p className="mb-2 rounded-xl border border-amber-300/30 bg-amber-300/[.06] px-4 py-2 text-xs text-slate-300">
          Playing as a guest; free with ads, no cloud saves or multiplayer.{" "}
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
