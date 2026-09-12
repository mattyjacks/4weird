"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES, quoteAvatarMinutes, quoteCameraFrames } from "@/lib/game-ai";
import { AvatarLoadout, COSMETIC_SLOTS, CosmeticItem, outfitColor } from "@/lib/cosmetics";
import { priceLine } from "@/lib/monetization-policy";
import { TRUSTED_GAME_ORIGINS } from "@/components/games/game-runtime-frame";
import { BuddyAvatar, BuddyAvatarType } from "@/components/buddy/buddy-avatar";
import {
  estimateDraftCoins,
  expandBuddySlashCommand,
  greetingForGame,
  transcriptToText,
} from "@/lib/buddy-engine";
import { autoReactPrompt, capAutos, shouldAutoReactScore } from "@/lib/buddy-proactive";
import { catalogForBuddy, falPayloadFor, type BuddyAction } from "@/lib/buddy-actions";
import { planSpecialists, runOrchestrator, type OrchestratorPack } from "@/lib/buddy-orchestrator";
import {
  InterruptionSnapshot,
  VadState,
  buildInterruptionSnapshot,
  frameEnergy,
  mergePartialTranscript,
  snapshotToPrompt,
  updateVad,
} from "@/lib/buddy-voice";

type BuddyMessage = { role: "buddy" | "you"; text: string; at: string; interrupted?: boolean; tag?: string };

/** One buddy chat turn (JSON body or SSE done frame - same shape). */
type ChatTurn = {
  reply: string;
  voice: string;
  fallback: boolean;
  brain?: string;
  intent?: string;
  model?: string;
  cost?: TurnCost | null;
  falHint?: FalHint | null;
};

/**
 * Read one SSE buddy turn: live deltas via onDelta, terminal done payload.
 * Throws on error frames, aborts, or a stream that ends without an answer.
 */
async function readBuddyStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (fullText: string) => void,
  signal: AbortSignal,
): Promise<ChatTurn> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  try {
    for (;;) {
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx = buf.indexOf("\n\n");
      while (idx >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of raw.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(payload) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (typeof evt.delta === "string" && evt.delta) {
            full += String(evt.delta);
            onDelta(full.slice(0, 600));
          } else if (evt.done === true) {
            return evt as unknown as ChatTurn;
          } else if (typeof evt.error === "string" && evt.error) {
            throw new Error(String(evt.error).slice(0, 200));
          }
        }
        idx = buf.indexOf("\n\n");
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  throw new Error("Buddy stream ended without an answer.");
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  try {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  } catch {
    return null;
  }
}
type SessionSpend = { gross: number; cut: number; provider: number; turns: number };
type TurnCost = {
  grossCoins: number;
  grossCenticentcoins: number;
  cut: number;
  provider: number;
  usdProvider: number;
  usdGross: number;
  parts: Record<string, number>;
  display: string;
};
type FalHint = { op: string; model: string; prompt: string; coins: number };
type OpenSession = { id: string; game_slug: string; voice: string; started_at: string };

type HttpError = Error & { status?: number; retryAfter?: number };

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(String((data as { error?: unknown }).error ?? `Request failed (${response.status})`)) as HttpError;
    err.status = response.status;
    // Honor server Retry-After so the countdown matches the real window.
    const ra = Number(response.headers.get("retry-after"));
    if (Number.isFinite(ra) && ra > 0 && ra <= 300) err.retryAfter = Math.ceil(ra);
    throw err;
  }
  return data as T;
}

/** Runner binding the orchestrator to the metered plays endpoint. Never throws. */
async function playRunner(playId: string, input: string): Promise<{ text: string; fallback: boolean }> {
  try {
    const r = await post<{ output?: unknown; fallback?: unknown }>("/api/openrouter-plays", { playId, input });
    return { text: String(r.output ?? ""), fallback: r.fallback === true };
  } catch {
    return { text: "", fallback: true };
  }
}

/** Persisted widget prefs (voice, TTS, avatar, VAD). No session data. */
const PREF_KEY = "buddy-prefs-v1";
function loadPrefs(): Record<string, unknown> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    return (JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "{}") ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanAvatarType(value: unknown): BuddyAvatarType {
  return value === "cloud" || value === "anime" || value === "cube" ? value : "cube";
}

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const hh = Math.floor(s / 3600);
  return hh > 0 ? `${hh}:${mm.slice(-2)}:${ss}` : `${mm}:${ss}`;
}

/** FNV-1a hash over a 32px thumbnail sample: cheap frame-change detection (~ms). */
function thumbHash(canvas: HTMLCanvasElement): string {
  try {
    const thumb = document.createElement("canvas");
    thumb.width = 32;
    thumb.height = 32;
    const tctx = thumb.getContext("2d");
    if (!tctx) return `${Date.now()}`;
    tctx.drawImage(canvas, 0, 0, 32, 32);
    const d = tctx.getImageData(0, 0, 32, 32).data;
    let h = 0x811c9dc5;
    for (let i = 0; i < d.length; i += 16) {
      h ^= d[i] ^ (d[i + 1] << 8) ^ (d[i + 2] << 16);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  } catch {
    return `${Date.now()}`;
  }
}

/**
 * Encode a canvas as a small JPEG data URL. Adaptive: starts at q0.6 and
 * shrinks toward 0.7x at q0.5 until under targetBytes, so busy game art on
 * slow uplinks never stalls a turn on a giant frame. Always JPEG, even if a
 * future caller hands us a PNG-sourced canvas. Returns null when even the
 * smallest encode is unusable.
 */
function smallJpeg(canvas: HTMLCanvasElement, targetBytes = 350_000): string | null {
  try {
    let current = canvas;
    let quality = 0.6;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const url = current.toDataURL("image/jpeg", quality);
      if (url.length <= targetBytes || attempt === 2) return url.length > 900_000 ? null : url;
      // Shrink and retry into a smaller canvas.
      const smaller = document.createElement("canvas");
      smaller.width = Math.max(160, Math.round(current.width * 0.7));
      smaller.height = Math.max(90, Math.round(current.height * 0.7));
      const sctx = smaller.getContext("2d");
      if (!sctx) return url.length > 900_000 ? null : url;
      sctx.drawImage(current, 0, 0, smaller.width, smaller.height);
      current = smaller;
      quality = 0.5;
    }
    return null;
  } catch {
    return null;
  }
}

type ShareMode = "off" | "tab" | "screen";

/**
 * Universal Gaming Buddy widget. VCW-engine loop in the browser:
 * OBSERVE (game title + score events + visible screen text + optional
 * screen-share snapshot) -> REASON (POST /api/buddy/chat) -> ACT
 * (POST /api/buddy/tts, else browser voice) -> METER (server meters every
 * turn at true cost; widget polls /api/my/usage for the live session /
 * total / last-hour / last-24h credit readout and shows the last turn's
 * Coins + CentiCentCoins breakdown inline).
 *
 * Screen sharing is explicit opt-in, off by default. "Tab only" constrains
 * the picker to this browser tab (other tabs and apps stay private); the
 * browser picker itself enforces the choice and the user can stop anytime.
 * At most one small JPEG snapshot per sent message leaves the device -
 * never video, never stored server-side; unchanged screens skip the
 * re-upload so the turn answers faster, and every snapshot turn is
 * itemized in that turn's cost line.
 */
export function GamingBuddy({ gameSlug, gameTitle }: { gameSlug: string; gameTitle: string }) {
  // SSR-stable initial state: the first render (server + client hydration)
  // must be byte-identical, so NO localStorage/window reads here. Persisted
  // prefs hydrate in the mount effect below (post-hydration update, no 418).
  const [voice, setVoice] = useState(BUDDY_DEFAULT_VOICE);
  const [model, setModel] = useState("tts-1");
  const [speed, setSpeed] = useState(1.0);
  const [brain, setBrain] = useState("auto");
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Buddy is off. Start a session to talk while you play.");
  const [spend, setSpend] = useState<{ session: SessionSpend; total: SessionSpend; lastHour: SessionSpend; last24h: SessionSpend } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastCost, setLastCost] = useState<string | null>(null);
  const [falHint, setFalHint] = useState<FalHint | null>(null);
  const [falBusy, setFalBusy] = useState(false);
  const [falMsg, setFalMsg] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>("off");
  const [sharing, setSharing] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [proactiveOn, setProactiveOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [actMsg, setActMsg] = useState<string | null>(null);
  const [actBusy, setActBusy] = useState(false);
  // Super-pack (multi-agent fan-out over OpenRouter plays).
  const [packGoal, setPackGoal] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [pack, setPack] = useState<OrchestratorPack | null>(null);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const proPrevRef = useRef<number | null>(null);
  const lastAutoAtRef = useRef(0);
  const autoCountRef = useRef(0);
  const liveActiveRef = useRef(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  // True while SSE deltas stream in: screen readers stay quiet until the
  // full reply lands (a polite live-region per token is unusable).
  const [streamingActive, setStreamingActive] = useState(false);
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserRef = useRef("");
  const lastFailedRef = useRef("");
  const lastReplyRef = useRef("");
  const lastAudioUrlRef = useRef<string | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  // --- Voice presence (mic + smart speech detection + barge-in) ---
  const [micOn, setMicOn] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [vadSmart, setVadSmart] = useState(true);
  const [hearing, setHearing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micBufRef = useRef<Uint8Array>(new Uint8Array(512));
  const micRafRef = useRef(0);
  const micFrameRef = useRef(0);
  const vadRef = useRef<VadState>({ speaking: false, hang: 0 });
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const interimRef = useRef("");
  const pendingRef = useRef<InterruptionSnapshot | null>(null);
  const micOnRef = useRef(false);
  const micMutedRef = useRef(false);
  const vadSmartRef = useRef(true);
  // --- Buddy speech tracking (for barge-in + avatar lips) ---
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const [script, setScript] = useState("");
  const [scriptAt, setScriptAt] = useState<number | null>(null);
  const [voiceEl, setVoiceEl] = useState<HTMLAudioElement | null>(null);
  const replyRef = useRef<{ text: string; startedAt: number } | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // --- Camera presence (opt-in emotion / body-language frames) ---
  const [camOn, setCamOn] = useState(false);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  // --- Avatar presence (optional 3D companion, metered per minute) ---
  const [avatarOn, setAvatarOn] = useState(false);
  const [avatarType, setAvatarType] = useState<BuddyAvatarType>("cube");
  const [avatarColor, setAvatarColor] = useState("#7c6cf6");
  const [avatarCents, setAvatarCents] = useState(0);
  const avatarStartRef = useRef<number | null>(null);
  const avatarTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // --- Wardrobe (unified cosmetics shop: 10 coins each, looks-only) ---
  const [catalog, setCatalog] = useState<CosmeticItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<AvatarLoadout>({});
  const [wardrobeMsg, setWardrobeMsg] = useState<string | null>(null);
  const [wardrobePending, setWardrobePending] = useState(false);

  type TalkOpts = { resumed?: InterruptionSnapshot | null; interrupted?: boolean };
  const talkRef = useRef<(text: string, opts?: TalkOpts) => Promise<void>>(async () => undefined);
  // Single-slot turn queue: a voice cut-in or auto-react that lands mid-turn
  // waits instead of vanishing. Voice always wins the slot over auto-reacts.
  type QueuedTurn = { text: string; opts?: TalkOpts; kind: "voice" | "auto" };
  const queuedTurnRef = useRef<QueuedTurn | null>(null);
  const cancelledRef = useRef(false);
  // Screen-text cache: DOM queries run at most once per second so rapid
  // sends never force layout back-to-back on the main thread.
  const screenCache = useRef<{ at: number; text: string }>({ at: 0, text: "" });
  // Frame-change detection: hashes of the last SENT screen/camera frames. An
  // unchanged frame carries no new info, so the turn skips the re-upload
  // (faster + no image charge); the text context still goes every turn.
  const lastScreenHashRef = useRef("");
  const screenUnchangedRef = useRef(false);
  const lastCamHashRef = useRef("");
  const camUnchangedRef = useRef(false);

  const refreshSpend = useCallback(async (sid: string | null) => {
    try {
      const url = sid ? `/api/my/usage?session=${encodeURIComponent(sid)}&limit=5` : "/api/my/usage?limit=5";
      const res = await fetch(url, { credentials: "include" });
      const body = await res.json().catch(() => null);
      if (body?.success) {
        setSpend({ session: body.session, total: body.total, lastHour: body.lastHour, last24h: body.last24h });
      }
    } catch {
      // Spend readout is best-effort; the metered ledger stays authoritative.
    }
  }, []);

  const balanceGoneRef = useRef(false);
  const refreshBalance = useCallback(async () => {
    if (balanceGoneRef.current) return;
    try {
      const res = await fetch("/api/coins/balance", { credentials: "include" });
      if (res.status === 401) {
        // Logged-out/expired: stop polling the balance (browser logs every
        // 401 to the console, so repeat polls = endless spam). Header badges
        // own the re-login signal; a remount retries.
        balanceGoneRef.current = true;
        return;
      }
      const body = await res.json().catch(() => null);
      if (body?.success && Number.isFinite(Number(body.balance))) setBalance(Number(body.balance));
    } catch {
      // Balance readout is best-effort; metering fails closed server-side.
    }
  }, []);

  // Hydrate persisted prefs once after mount (post-hydration, so the SSR
  // HTML and the first client render stay identical - no React 418).
  // Defaults above stay until this runs (Nova voice, tts-1, 1.0x, auto).
  useEffect(() => {
    try {
      setSpeechSupported(getSpeechRecognition() !== null);
    } catch {
      /* speech detection is optional */
    }
    try {
      const prefs = loadPrefs();
      const savedVoice = String(prefs.voice ?? "");
      if (savedVoice && (BUDDY_VOICES as { id: string }[]).some((v) => v.id === savedVoice)) setVoice(savedVoice);
      if (prefs.model === "tts-1-hd") setModel("tts-1-hd");
      if (typeof prefs.speed === "number" && prefs.speed >= 0.5 && prefs.speed <= 2) setSpeed(Number(prefs.speed));
      if (prefs.brain === "openai" || prefs.brain === "openrouter") setBrain(String(prefs.brain));
      if (prefs.proactive === true) setProactiveOn(true);
      if (prefs.remember === true) setRememberMe(true);
      if (prefs.vadSmart === false) setVadSmart(false);
      setAvatarType(cleanAvatarType(prefs.avatarType));
      if (typeof prefs.avatarColor === "string" && prefs.avatarColor) setAvatarColor(String(prefs.avatarColor));
    } catch {
      /* pref restore is best-effort */
    }
  }, []);

  // Persist prefs (voice/TTS/avatar/VAD/brain/extras) locally; sessions never persist.
  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ voice, model, speed, brain, avatarType, avatarColor, vadSmart, proactive: proactiveOn, remember: rememberMe }));
    } catch {
      /* prefs are best-effort */
    }
  }, [voice, model, speed, brain, avatarType, avatarColor, vadSmart, proactiveOn, rememberMe]);

  // Auto-scroll the transcript to the newest turn.
  useEffect(() => {
    try {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      /* scroll is best-effort */
    }
  }, [messages, open]);

  // Session clock.
  useEffect(() => {
    if (!sessionId || !sessionStartedAt) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - sessionStartedAt) / 1000));
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStartedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sessionId, sessionStartedAt]);

  // Look for an orphaned open session to resume (reload-proof buddy).
  // Signed-in only: guests get a 401 here, so check the session first and
  // skip the request entirely instead of logging a console error per load.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = await fetch("/api/auth/session", { credentials: "include" });
        if (!s.ok) return;
      } catch {
        return;
      }
      try {
        const r = await fetch("/api/buddy/session?open=1", { credentials: "include" });
        const b = await r.json().catch(() => null);
        if (live && b?.success && Array.isArray(b.sessions)) setOpenSessions(b.sessions as OpenSession[]);
      } catch {
        /* resume lookup is best-effort */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // OBSERVE: game score events forwarded by GameRuntimeFrame via postMessage.
  // Origin-checked: without this any iframe on the page (including ad
  // slots) could spoof score context into buddy prompts.
  useEffect(() => {
    const onMessage = (event: MessageEvent<{ version?: number; type?: string; score?: number }>) => {
      if (event.origin !== window.location.origin && !TRUSTED_GAME_ORIGINS.includes(event.origin)) return;
      if (event.data?.version !== 1 || event.data?.type !== "score") return;
      if (Number.isFinite(event.data.score)) setScore(Number(event.data.score));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Flash the score chip briefly when the game reports a new score.
  useEffect(() => {
    if (score === null || prevScoreRef.current === score) {
      prevScoreRef.current = score;
      return;
    }
    prevScoreRef.current = score;
    setScoreFlash(true);
    const t = setTimeout(() => setScoreFlash(false), 1200);
    return () => clearTimeout(t);
  }, [score]);

  // Stop any in-flight voice when the session ends or the widget unmounts.
  // Also the barge-in path: cutting Buddy off mid-sentence.
  const stopVoice = useCallback(() => {
    try {
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      /* audio teardown is best-effort */
    }
    speakingRef.current = false;
    setSpeaking(false);
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
  }, []);

  const messagesRef = useRef<BuddyMessage[]>([]);
  const pushMessage = useCallback((m: BuddyMessage) => {
    messagesRef.current = [...messagesRef.current, m].slice(-30);
    setMessages(messagesRef.current);
  }, []);

  /** Live-update the streaming placeholder (always the last message). */
  const updateLiveMessage = useCallback((text: string) => {
    messagesRef.current = messagesRef.current.map((m, i, arr) => (i === arr.length - 1 ? { ...m, text } : m));
    setMessages(messagesRef.current);
  }, []);

  const finalizeLiveMessage = useCallback((text: string, tag?: string) => {
    messagesRef.current = messagesRef.current.map((m, i, arr) => (i === arr.length - 1 ? { ...m, text, ...(tag ? { tag } : {}) } : m));
    setMessages(messagesRef.current);
  }, []);

  const dropLiveMessage = useCallback(() => {
    messagesRef.current = messagesRef.current.slice(0, -1);
    setMessages(messagesRef.current);
  }, []);

  const copyText = useCallback(async (text: string, idx: number) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      setStatus("Copy blocked by the browser; select the text manually.");
    }
  }, []);

  /** Approx what Buddy had spoken when the user cut in (audio clock, else 35%). */
  const replyProgress = useCallback((): string => {
    const cur = replyRef.current;
    if (!cur) return "";
    let frac = 0.35;
    try {
      const el = audioRef.current;
      if (el && Number.isFinite(el.duration) && el.duration > 0 && Number.isFinite(el.currentTime)) {
        frac = Math.min(0.95, Math.max(0.05, el.currentTime / el.duration));
      }
    } catch {
      /* clock is best-effort */
    }
    return cur.text.slice(0, Math.max(10, Math.floor(cur.text.length * frac)));
  }, []);

  const markSpeaking = useCallback((text: string) => {
    speakingRef.current = true;
    setSpeaking(true);
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    // Safety: clear the flag even if an audio event is missed.
    const ms = Math.min(60_000, Math.max(4_000, (text.length / 13) * 1000));
    speakTimerRef.current = setTimeout(() => {
      speakingRef.current = false;
      setSpeaking(false);
    }, ms);
  }, []);

  const speakBrowser = useCallback((text: string) => {
    markSpeaking(text);
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text.slice(0, 400));
      utter.rate = 1.0;
      utter.pitch = voice === "echo" || voice === "onyx" ? 0.7 : voice === "nova" || voice === "shimmer" ? 1.3 : 1.0;
      utter.onend = () => {
        speakingRef.current = false;
        setSpeaking(false);
        replyRef.current = null;
      };
      window.speechSynthesis.speak(utter);
    } catch {
      // Audio is best-effort; the transcript below is the source of truth.
    }
  }, [markSpeaking, voice]);

  /** Free voice preview: browser speech only, no session, no metering. */
  const previewVoice = useCallback((voiceId: string) => {
    try {
      if (!("speechSynthesis" in window)) {
        setStatus("Voice preview needs browser speech; this browser has none.");
        return;
      }
      setPreviewing(true);
      window.speechSynthesis.cancel();
      const label = BUDDY_VOICES.find((v) => v.id === voiceId)?.label ?? voiceId;
      const utter = new SpeechSynthesisUtterance(`Hi, I'm ${label}, your Gaming Buddy. Let's play.`);
      utter.rate = 1.0;
      utter.pitch = voiceId === "echo" || voiceId === "onyx" ? 0.7 : voiceId === "nova" || voiceId === "shimmer" ? 1.3 : 1.0;
      utter.onend = () => setPreviewing(false);
      window.speechSynthesis.speak(utter);
      setTimeout(() => setPreviewing(false), 6000);
    } catch {
      setPreviewing(false);
    }
  }, []);

  const stopSharing = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* track teardown is best-effort */
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShareMode("off");
    setSharing(false);
    lastScreenHashRef.current = "";
    screenUnchangedRef.current = false;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void refreshSpend(sessionId);
    void refreshBalance();
    // Hidden tabs skip spend polls; the metered ledger stays authoritative.
    const timer = setInterval(() => {
      if (!document.hidden) {
        void refreshSpend(sessionId);
        void refreshBalance();
      }
    }, 15_000);
    const onVis = () => {
      if (!document.hidden) {
        void refreshSpend(sessionId);
        void refreshBalance();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sessionId, refreshSpend, refreshBalance]);

  // Public price list (no auth) + owned wardrobe after login actions.
  useEffect(() => {
    let live = true;
    fetch("/api/cosmetics/catalog")
      .then((r) => r.json().catch(() => null))
      .then((b) => {
        if (live && b?.success && Array.isArray(b.items)) setCatalog(b.items);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const refreshWardrobe = useCallback(async () => {
    try {
      const res = await fetch("/api/cosmetics/inventory", { credentials: "include" });
      const body = await res.json().catch(() => null);
      if (body?.success) {
        setOwned(Array.isArray(body.owned) ? body.owned : []);
        setLoadout((body.loadout ?? {}) as AvatarLoadout);
        setWardrobePending(body.pendingMigration === true);
      }
    } catch {
      /* wardrobe is best-effort; shop stays visible */
    }
  }, []);

  const buyCosmetic = async (item: CosmeticItem) => {
    setWardrobeMsg(null);
    try {
      const r = await post<{ metered: unknown; pendingMigration?: boolean; quote?: string; receipt?: { price: string } }>(
        "/api/cosmetics/buy",
        {
          item_id: item.id,
          game_slug: gameSlug,
          session_id: sessionId,
          acceptedQuote: `${item.name} - ${priceLine(item.price)}`,
        },
      );
      if (r.pendingMigration) {
        setWardrobeMsg("Shop isn't metered on this deploy yet; nothing bought, no coins moved.");
        return;
      }
      setWardrobeMsg(`Bought ${item.name} for ${r.receipt?.price ?? `${item.price} coins`}; check your avatar!`);
      void refreshWardrobe();
      if (sessionId) void refreshSpend(sessionId);
      void refreshBalance();
    } catch (error) {
      setWardrobeMsg(error instanceof Error ? error.message : "Could not buy that.");
    }
  };

  const toggleEquip = async (item: CosmeticItem) => {
    setWardrobeMsg(null);
    const next: AvatarLoadout = { ...loadout };
    if (next[item.slot] === item.id) {
      delete next[item.slot];
    } else {
      next[item.slot] = item.id;
    }
    try {
      const r = await post<{ loadout: AvatarLoadout }>("/api/cosmetics/equip", { loadout: next, kind: avatarType });
      setLoadout(r.loadout);
      setWardrobeMsg(next[item.slot] ? `Equipped ${item.name}.` : `Unequipped ${item.name}.`);
    } catch (error) {
      setWardrobeMsg(error instanceof Error ? error.message : "Could not equip that.");
    }
  };

  useEffect(() => stopVoice, [stopVoice]);
  useEffect(() => () => stopSharing(), [stopSharing]);

  const startShare = async (mode: Exclude<ShareMode, "off">) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setStatus("Screen sharing is not supported in this browser; text + score context still works.");
      return;
    }
    try {
      setSharing(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: mode === "tab"
          ? ({ displaySurface: "browser", preferCurrentTab: true } as MediaTrackConstraints)
          : true,
        audio: false,
        // Hint the picker toward the current tab; the browser still enforces
        // the user's final choice and shows its own sharing indicator.
        preferCurrentTab: mode === "tab",
      } as DisplayMediaStreamOptions);
      streamRef.current = stream;
      lastScreenHashRef.current = "";
      screenUnchangedRef.current = false;
      setShareMode(mode);
      const [track] = stream.getVideoTracks();
      track?.addEventListener("ended", () => stopSharing());
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus(
        mode === "tab"
          ? "Sharing this 4weird tab only; other tabs and apps stay private. Stop anytime below or via the browser bar."
          : "Sharing your screen; pick just the game window/tab in the browser picker to keep everything else private.",
      );
    } catch {
      setSharing(false);
      setStatus("Screen share cancelled; nothing is shared until you approve the browser picker.");
    }
  };

  /** One small JPEG snapshot from the live share (per message only). */
  const captureSnapshot = (): string | null => {
    try {
      const stream = streamRef.current;
      const video = videoRef.current;
      if (!stream || !video || video.readyState < 2 || video.videoWidth < 2) return null;
      const maxW = 640;
      const scale = Math.min(1, maxW / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Unchanged screen = no new pixels for the model: skip the re-upload so
      // the turn answers faster with text context only (no image charge).
      const hash = thumbHash(canvas);
      if (lastScreenHashRef.current && lastScreenHashRef.current === hash) {
        screenUnchangedRef.current = true;
        return null;
      }
      screenUnchangedRef.current = false;
      // Always JPEG via smallJpeg (adaptive shrink past ~260 KB payloads).
      const url = smallJpeg(canvas);
      // ~700 KB cap: drop oversized frames rather than failing the turn.
      if (!url || url.length > 900_000) return null;
      lastScreenHashRef.current = hash;
      return url;
    } catch {
      return null;
    }
  };

  /** True while Buddy's own voice is audible (barge-in only counts then). */
  const isBuddySpeaking = useCallback((): boolean => {
    try {
      const el = audioRef.current;
      if (el && !el.paused && !el.ended) return true;
      if ("speechSynthesis" in window && window.speechSynthesis.speaking) return true;
    } catch {
      /* speaking check is best-effort */
    }
    return speakingRef.current;
  }, []);

  /** Barge-in: user cut in; stop Buddy, snapshot both sides, resume next turn. */
  const handleBargeIn = useCallback(() => {
    const partial = interimRef.current.trim();
    const soFar = replyProgress();
    stopVoice();
    replyRef.current = null;
    const snap = buildInterruptionSnapshot({ partialUserText: partial, buddyReplySoFar: soFar, gameTitle });
    pendingRef.current = snap;
    setStatus(
      partial
        ? `Heard you cut in (“${partial.slice(0, 60)}${partial.length > 60 ? "…" : ""}”); finishing your sentence, then Buddy resumes from it.`
        : "Heard you cut in; finishing your sentence, then Buddy resumes from it.",
    );
  }, [gameTitle, replyProgress, stopVoice]);

  const autoSendVoice = useCallback(() => {
    const text = interimRef.current.trim();
    interimRef.current = "";
    setInterim("");
    if (!text || !sessionIdRef.current || micMutedRef.current) return;
    const resumed = pendingRef.current;
    pendingRef.current = null;
    const opts = { resumed, interrupted: resumed !== null };
    if (busyRef.current) {
      // Buddy is mid-answer: queue the sentence (voice wins the slot) instead
      // of dropping the exact words the user spoke to interrupt.
      queuedTurnRef.current = { text, opts, kind: "voice" };
      cancelledRef.current = false;
      setStatus("Buddy is answering; queued your sentence - it sends the moment this turn lands.");
      return;
    }
    void talkRef.current(text, opts);
  }, []);

  const micLoop = useCallback(() => {
    const analyser = micAnalyserRef.current;
    if (!analyser) return;
    try {
      const buf = micBufRef.current;
      analyser.getByteTimeDomainData(buf as unknown as Uint8Array<ArrayBuffer>);
      const energy = frameEnergy(buf);
      const { state, event } = updateVad(vadRef.current, energy);
      vadRef.current = state;
      const active = state.speaking && !micMutedRef.current;
      setHearing((h) => (h === active ? h : active));
      micFrameRef.current += 1;
      if (micFrameRef.current % 6 === 0) setMicLevel(Math.min(1, energy * 12));
      if (event === "started" && !micMutedRef.current && isBuddySpeaking()) {
        handleBargeIn();
      } else if (event === "ended" && vadSmartRef.current) {
        autoSendVoice();
      }
    } catch {
      /* VAD tick is best-effort */
    }
    micRafRef.current = requestAnimationFrame(micLoop);
  }, [autoSendVoice, handleBargeIn, isBuddySpeaking]);

  const startRecognition = useCallback(() => {
    const Kind = getSpeechRecognition();
    if (!Kind || recogRef.current) return;
    try {
      const recog = new Kind();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";
      recog.onresult = (e) => {
        try {
          let interimText = "";
          for (let i = 0; i < e.results.length; i += 1) {
            const r = e.results[i];
            if (!r.isFinal) interimText += String(r[0]?.transcript ?? "");
          }
          interimRef.current = mergePartialTranscript(interimRef.current, interimText);
          setInterim(interimRef.current);
        } catch {
          /* transcript fold is best-effort */
        }
      };
      recog.onerror = () => undefined;
      recog.onend = () => {
        recogRef.current = null;
        // Keep listening across natural recognizer restarts while mic is live.
        if (micOnRef.current && !micMutedRef.current) {
          try {
            startRecognition();
          } catch {
            /* restart is best-effort */
          }
        }
      };
      recog.start();
      recogRef.current = recog;
    } catch {
      /* speech recognition is optional */
    }
  }, []);

  const enableMic = async () => {
    if (micOn || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) setStatus("Microphone is not supported in this browser; typed messages still work.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicStream(stream);
      micOnRef.current = true;
      micMutedRef.current = micMuted;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        micCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        micAnalyserRef.current = analyser;
        void ctx.resume().catch(() => undefined);
      }
      vadRef.current = { speaking: false, hang: 0 };
      micRafRef.current = requestAnimationFrame(micLoop);
      startRecognition();
      setMicOn(true);
      setStatus(
        speechSupported
          ? "Mic live; talk to interrupt Buddy anytime; smart detection sends your sentence when you pause. Mute anytime below."
          : "Mic live for interruption detection; typed messages still send turns (this browser has no speech-to-text).",
      );
    } catch {
      setStatus("Microphone blocked; allow mic access in the browser bar, or keep typing.");
    }
  };

  const disableMic = useCallback(() => {
    micOnRef.current = false;
    cancelAnimationFrame(micRafRef.current);
    try {
      recogRef.current?.stop();
    } catch {
      /* recognizer teardown is best-effort */
    }
    recogRef.current = null;
    try {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* track teardown is best-effort */
    }
    micStreamRef.current = null;
    setMicStream(null);
    try {
      void micCtxRef.current?.close().catch(() => undefined);
    } catch {
      /* context teardown is best-effort */
    }
    micCtxRef.current = null;
    micAnalyserRef.current = null;
    interimRef.current = "";
    setInterim("");
    setHearing(false);
    setMicLevel(0);
    setMicOn(false);
    inputRef.current?.focus();
  }, []);

  const toggleMute = () => {
    const next = !micMuted;
    setMicMuted(next);
    micMutedRef.current = next;
    try {
      micStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      if (next) {
        recogRef.current?.stop();
        recogRef.current = null;
        interimRef.current = "";
        setInterim("");
        setHearing(false);
        setMicLevel(0);
      } else if (micOnRef.current) {
        startRecognition();
      }
    } catch {
      /* mute toggle is best-effort */
    }
    setStatus(next ? "Mic muted - Buddy can't hear you until you unmute." : "Mic live again.");
  };

  const enableCamera = async () => {
    if (camOn || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) setStatus("Camera is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, facingMode: "user" },
        audio: false,
      });
      camStreamRef.current = stream;
      const [track] = stream.getVideoTracks();
      track?.addEventListener("ended", () => disableCamera());
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = stream;
        await camVideoRef.current.play().catch(() => undefined);
      }
      setCamOn(true);
      setStatus("Camera on; attach a frame to any message and Buddy reads your energy, posture, and backdrop. Each attached frame is itemized in that turn (~3 centicentcoins). Stop anytime.");
    } catch {
      setStatus("Camera blocked; allow camera access in the browser bar, or keep playing without it.");
    }
  };

  const disableCamera = useCallback(() => {
    try {
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* track teardown is best-effort */
    }
    camStreamRef.current = null;
    if (camVideoRef.current) camVideoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  /** One small JPEG camera frame for the next explicit turn (never silent). */
  const captureCameraFrame = (force = false): string | null => {
    try {
      const stream = camStreamRef.current;
      const video = camVideoRef.current;
      if (!stream || !video || video.readyState < 2 || video.videoWidth < 2) return null;
      const maxW = 480;
      const scale = Math.min(1, maxW / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Explicit vibe reads always carry a frame; otherwise skip unchanged
      // poses so the turn answers faster (no camera charge).
      const hash = thumbHash(canvas);
      if (!force && lastCamHashRef.current && lastCamHashRef.current === hash) {
        camUnchangedRef.current = true;
        return null;
      }
      camUnchangedRef.current = false;
      const url = smallJpeg(canvas);
      if (!url || url.length > 900_000) return null;
      lastCamHashRef.current = hash;
      return url;
    } catch {
      return null;
    }
  };

  /** Meter avatar minutes (heartbeat). Camera frames ride chat turns instead. */
  const meterPresence = useCallback(async (feature: "avatar", qty: number): Promise<boolean> => {
    if (!sessionId) return false;
    try {
      const r = await post<{ metered: unknown; pendingMigration?: boolean; quote: { display: string } }>(
        "/api/buddy/presence",
        { feature, qty, game_slug: gameSlug, session_id: sessionId },
      );
      const m = r.quote.display.match(/(\d+)\s+centicentcoins/);
      if (m) setAvatarCents((c) => c + Number(m[1]));
      void refreshSpend(sessionId);
      return true;
    } catch {
      return false;
    }
  }, [sessionId, gameSlug, refreshSpend]);

  const stopAvatarMeter = useCallback(async () => {
    if (avatarTimerRef.current) {
      clearInterval(avatarTimerRef.current);
      avatarTimerRef.current = null;
    }
    const started = avatarStartRef.current;
    avatarStartRef.current = null;
    if (started !== null && sessionId) {
      const secs = (Date.now() - started) / 1000;
      // Whole minutes tick while running; only the tail is fractional.
      const tail = (secs % 60) / 60;
      if (secs >= 5 && tail > 0.02) {
        await meterPresence("avatar", Math.round(tail * 100) / 100);
      }
    }
  }, [meterPresence, sessionId]);

  const setAvatarVisible = (on: boolean) => {
    if (on === avatarOn) return;
    if (on) {
      setAvatarOn(true);
      avatarStartRef.current = Date.now();
      if (avatarTimerRef.current) clearInterval(avatarTimerRef.current);
      avatarTimerRef.current = setInterval(() => {
        void (async () => {
          const okTick = await meterPresence("avatar", 1);
          if (!okTick) {
            setStatus("Avatar ran out of meterable coins; avatar paused, chat still works.");
            setAvatarOn(false);
            avatarStartRef.current = null;
            if (avatarTimerRef.current) clearInterval(avatarTimerRef.current);
            avatarTimerRef.current = null;
          }
        })();
      }, 60_000);
      setStatus(`Avatar on; cute companion renders beside chat at ${quoteAvatarMinutes(1).display}/min. Turn it off anytime.`);
    } else {
      setAvatarOn(false);
      void stopAvatarMeter();
      setStatus("Avatar off; presence metering stopped.");
    }
  };

  const beginSessionState = useCallback((id: string, startedAt?: string) => {
    setSessionId(id);
    setSessionStartedAt(startedAt ? Date.parse(startedAt) || Date.now() : Date.now());
    setOpen(true);
    setAuthNeeded(false);
    setLastError(null);
    setOpenSessions([]);
    lastScreenHashRef.current = "";
    screenUnchangedRef.current = false;
    lastCamHashRef.current = "";
    camUnchangedRef.current = false;
    proPrevRef.current = null;
    lastAutoAtRef.current = 0;
    autoCountRef.current = 0;
    liveActiveRef.current = false;
  }, []);

  const start = async () => {
    setBusy(true);
    try {
      const r = await post<{ session: { id: string } }>("/api/buddy/session", {
        action: "start",
        game_slug: gameSlug,
        voice,
      });
      beginSessionState(r.session.id);
      setStatus(`Buddy is live as ${voice}. It reads your screen and reacts out loud.`);
      if (rememberMe) {
        try {
          const mr = await fetch(`/api/buddy/memory?game_slug=${encodeURIComponent(gameSlug)}`, { credentials: "include" });
          const mb = await mr.json().catch(() => null);
          const len = String(mb?.memory ?? "").length;
          setStatus(`Buddy is live as ${voice}. It reads your screen and reacts out loud.${len > 0 ? ` Memory on - remembers ${len} chars from past ${gameTitle} sessions.` : ` Memory on - nothing remembered yet for ${gameTitle}.`}`);
        } catch {
          /* memory readout is best-effort */
        }
      }
      pushMessage({ role: "buddy", text: greetingForGame(gameTitle, gameSlug), at: new Date().toLocaleTimeString(), tag: voice });
      void refreshWardrobe();
      void refreshSpend(r.session.id);
      void refreshBalance();
      inputRef.current?.focus();
    } catch (error) {
      const code = (error as HttpError)?.status;
      if (code === 401) setAuthNeeded(true);
      if (code === 429) setRateLimitedUntil(Date.now() + (((error as HttpError)?.retryAfter ?? 60) * 1000));
      setStatus(error instanceof Error ? error.message : "Could not start buddy.");
    } finally {
      setBusy(false);
    }
  };

  const resumeSession = async (s: OpenSession) => {
    setBusy(true);
    try {
      beginSessionState(s.id, s.started_at);
      if (s.voice && s.voice !== voice) setVoice(s.voice);
      setStatus(`Resumed your open ${s.game_slug} session; nothing was lost. Talk while you play.`);
      pushMessage({ role: "buddy", text: `Welcome back - resuming our ${s.game_slug} session. What happened while I was away?`, at: new Date().toLocaleTimeString(), tag: "resumed" });
      void refreshWardrobe();
      void refreshSpend(s.id);
      void refreshBalance();
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!sessionId) return;
    abortRef.current?.abort();
    abortRef.current = null;
    stopVoice();
    stopSharing();
    disableMic();
    disableCamera();
    replyRef.current = null;
    await stopAvatarMeter();
    setAvatarOn(false);
    try {
      await post("/api/buddy/session", { action: "end", session_id: sessionId });
      setStatus("Session ended. Screen sharing stopped. Spend stays on /my/usage/ forever.");
    } catch {
      setStatus("Session closed locally.");
    }
    setSessionId(null);
    setSessionStartedAt(null);
    setOpen(false);
    void refreshSpend(null);
    void refreshBalance();
  };

  const observeScreenText = (): string => {
    // Screen reading without new deps: visible headings + live region text -
    // scoped OUTSIDE this widget (data-buddy) so the buddy never quotes its
    // own transcript back into the next prompt (the /react echo bug).
    // Cached 1s: rapid sends reuse the last snapshot instead of re-querying.
    const now = Date.now();
    if (now - screenCache.current.at < 1000) return screenCache.current.text;
    try {
      const els = [...document.querySelectorAll("h1, h2, [role=status]")]
        .filter((e) => !e.closest("[data-buddy]"))
        .slice(0, 8);
      const text = els.map((e) => (e.textContent ?? "").trim()).filter(Boolean).join(" · ").slice(0, 500);
      screenCache.current = { at: now, text };
      return text;
    } catch {
      return screenCache.current.text;
    }
  };

  // Proactive auto-reacts (opt-in, off by default): a meaningful score jump
  // spends one metered /react turn, spaced 60s apart, max 10 per session.
  // Mid-turn moments queue behind the live answer instead of vanishing.
  useEffect(() => {
    const prev = proPrevRef.current;
    proPrevRef.current = score;
    if (!proactiveOn || !sessionId || score === null || prev === null) return;
    const now = Date.now();
    if (!capAutos(autoCountRef.current)) return;
    if (!shouldAutoReactScore(prev, score, now, { lastAutoAt: lastAutoAtRef.current || undefined })) return;
    lastAutoAtRef.current = now;
    autoCountRef.current += 1;
    const prompt = autoReactPrompt(score, observeScreenText());
    if (busy) {
      // Voice cut-ins win the single slot; a waiting auto-react yields.
      if (!queuedTurnRef.current) {
        queuedTurnRef.current = { text: prompt, kind: "auto" };
        setStatus(`Score jumped to ${score}; queuing the reaction behind this answer (auto-react ${autoCountRef.current}/10 this session).`);
      }
      return;
    }
    setStatus(`Score jumped to ${score}; Buddy jumps in with a reaction (auto-react ${autoCountRef.current}/10 this session).`);
    void talkRef.current(prompt);
  }, [score, proactiveOn, sessionId, busy]);

  const buddyActs = useMemo(() => catalogForBuddy(gameSlug, gameTitle), [gameSlug, gameTitle]);

  /** One-click delegation: chat turns talk, links navigate, fal queues media. */
  const fireBuddyAction = async (a: BuddyAction) => {
    setActMsg(null);
    if (a.kind === "chat" && a.chatText) {
      void talk(a.chatText);
      return;
    }
    if (a.kind === "link" && a.href) {
      window.location.href = a.href(gameSlug);
      return;
    }
    const payload = falPayloadFor(a, gameSlug, `${a.label} for ${gameTitle}: ${lastReplyRef.current.slice(0, 200)}`.trim());
    if (!payload) {
      setActMsg("That action is unavailable right now.");
      return;
    }
    setActBusy(true);
    try {
      const r = await post<{ started?: boolean; configured?: boolean }>("/api/fal/generate", {
        op: payload.op,
        prompt: payload.prompt || `${a.label} for ${gameTitle}`,
        game_slug: payload.game_slug,
        source: "manual",
      });
      setActMsg(r.started ? `${a.label} queued; watch /fal for the result.` : "Media worker is not configured on this deploy; nothing queued, no coins moved.");
      void refreshBalance();
    } catch (error) {
      setActMsg(error instanceof Error ? error.message : "Could not queue that.");
    } finally {
      setActBusy(false);
    }
  };

  /** Cancel the in-flight turn (and any queued one); aborted turns are never metered. */
  const cancelTalk = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {
      /* abort is best-effort */
    }
    abortRef.current = null;
    cancelledRef.current = true;
    queuedTurnRef.current = null;
    setBusy(false);
    setStatus("Turn cancelled; the server never meters an aborted turn. Type a shorter message to retry.");
  }, []);

  /** Replay the last reply: cached audio replays free, else browser speech. */
  const replayVoice = useCallback(async () => {
    const text = lastReplyRef.current.trim();
    if (!text) {
      setStatus("Nothing to replay yet; send Buddy a message first.");
      return;
    }
    try {
      if (lastAudioUrlRef.current) {
        const el = audioRef.current ?? new Audio();
        el.src = lastAudioUrlRef.current;
        el.onended = () => {
          speakingRef.current = false;
          setSpeaking(false);
        };
        audioRef.current = el;
        setVoiceEl(el);
        markSpeaking(text);
        await el.play().catch(() => speakBrowser(text));
        return;
      }
      speakBrowser(text);
    } catch {
      speakBrowser(text);
    }
  }, [markSpeaking, speakBrowser]);

  const talk = async (text: string, opts?: { resumed?: InterruptionSnapshot | null; interrupted?: boolean }) => {
    // Guarded: without this, double-Enter submits two concurrent turns and
    // the user is metered twice for one message.
    if (!sessionId || !text.trim() || busy) return;
    cancelledRef.current = false;
    // Stop the previous reply before starting the next so voices never overlap.
    stopVoice();
    setBusy(true);
    setLastError(null);
    // Expand /tactics, /hail, /react, /vibe, /help locally so every shortcut
    // reasons identically even before the server normalizes it too.
    const expanded = expandBuddySlashCommand(text.trim(), observeScreenText());
    const outgoing = expanded.message;
    const screen = outgoing.startsWith("/") ? observeScreenText() : `${observeScreenText()} ${outgoing}`.trim();
    const snapshot = shareMode === "off" ? null : captureSnapshot();
    // Camera frames only ever ride an explicit user turn; never silent.
    // Explicit vibe reads force a fresh frame; other turns skip unchanged poses.
    const camFrame = !camOn ? null : captureCameraFrame(expanded.label === "vibe");
    if (shareMode !== "off" && !snapshot) {
      setStatus(screenUnchangedRef.current ? "Screen unchanged since the last turn; skipped the re-upload so Buddy answers faster (no image charge)." : "Screen share is on but no frame was ready; sent text context only (no image charge). Re-pick the tab if this persists.");
    }
    if (camOn && !camFrame) {
      setStatus(camUnchangedRef.current ? "Camera frame unchanged; sent text only so Buddy answers faster (no camera charge)." : "Camera is on but no frame was ready; sent without a camera frame (no camera charge).");
    }
    const resumedNote = opts?.resumed ? snapshotToPrompt(opts.resumed) : "";
    pushMessage({ role: "you", text: text.trim(), at: new Date().toLocaleTimeString(), ...(opts?.interrupted ? { interrupted: true } : {}) });
    lastUserRef.current = text.trim();
    setDraft("");
    const history = messagesRef.current.slice(-8).map((m) => ({
      role: m.role === "buddy" ? ("buddy" as const) : ("user" as const),
      text: m.text.slice(0, 300),
      ...(m.interrupted ? { interrupted: true as const } : {}),
    }));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let streamed = false;
    try {
      const chatBody = {
        game_slug: gameSlug,
        game_title: gameTitle,
        screen_text: screen || outgoing,
        message: `${resumedNote} ${outgoing}`.trim().slice(0, 900),
        history,
        score,
        voice,
        brain,
        session_id: sessionId,
        stream: true,
        ...(rememberMe ? { memory: true } : {}),
        ...(snapshot ? { screen_image: snapshot } : {}),
        ...(camFrame ? { camera_image: camFrame } : {}),
      };
      // Prefer SSE so first words render live; brains/deploys that answer
      // classically (openrouter, fallback) return JSON - same shape.
      const chatRes = await fetch("/api/buddy/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatBody),
        signal: ctrl.signal,
      });
      let r: ChatTurn;
      if (chatRes.ok && (chatRes.headers.get("content-type") ?? "").includes("text/event-stream") && chatRes.body) {
        streamed = true;
        pushMessage({ role: "buddy", text: "", at: new Date().toLocaleTimeString(), tag: "live…" });
        liveActiveRef.current = true;
        setStreamingActive(true);
        try {
          const doneEvt = await readBuddyStream(chatRes.body, (full) => updateLiveMessage(full), ctrl.signal);
          liveActiveRef.current = false;
          setStreamingActive(false);
          finalizeLiveMessage(doneEvt.reply, doneEvt.fallback ? "local · free" : (doneEvt.brain ?? "auto"));
          r = {
            reply: doneEvt.reply,
            voice: doneEvt.voice,
            fallback: doneEvt.fallback,
            ...(doneEvt.brain ? { brain: doneEvt.brain } : {}),
            ...(doneEvt.intent ? { intent: doneEvt.intent } : {}),
            ...(doneEvt.model ? { model: doneEvt.model } : {}),
            cost: doneEvt.cost ?? null,
            falHint: doneEvt.falHint ?? null,
          };
        } catch (streamErr) {
          liveActiveRef.current = false;
          setStreamingActive(false);
          dropLiveMessage();
          throw streamErr;
        }
      } else {
        const data = await chatRes.json().catch(() => ({}));
        if (!chatRes.ok) {
          const herr = new Error(String((data as { error?: unknown }).error ?? `Request failed (${chatRes.status})`)) as HttpError;
          herr.status = chatRes.status;
          const ra = Number(chatRes.headers.get("retry-after"));
          if (Number.isFinite(ra) && ra > 0 && ra <= 300) herr.retryAfter = Math.ceil(ra);
          throw herr;
        }
        r = data as ChatTurn;
      }
      const tag = r.fallback ? "local · free" : (r.brain ?? "auto");
      if (!streamed) pushMessage({ role: "buddy", text: r.reply, at: new Date().toLocaleTimeString(), tag });
      setScript(r.reply);
      setScriptAt(Date.now());
      lastReplyRef.current = r.reply;
      lastAudioUrlRef.current = null;
      replyRef.current = { text: r.reply, startedAt: Date.now() };
      setFalHint(r.falHint ?? null);
      setFalMsg(null);
      if (r.cost) {
        const p = r.cost.parts ?? {};
        const bits: string[] = [];
        if (p.chatUsd) bits.push(`chat $${Number(p.chatUsd).toFixed(6)}`);
        if (p.imageUsd) bits.push(`screen $${Number(p.imageUsd).toFixed(6)}`);
        if (p.dbUsd) bits.push(`DB $${Number(p.dbUsd).toFixed(6)}`);
        setLastCost(`Last turn: ${r.cost.display} (25% cut incl.${bits.length ? ` - ${bits.join(" + ")}` : ""})`);
      }
      // ACT: voice output in the selected voice.
      if (r.fallback) {
        speakBrowser(r.reply);
      } else {
        try {
          const t = await post<{ fallback: boolean; audio?: string; mime?: string; cost?: TurnCost | null }>("/api/buddy/tts", {
            text: r.reply,
            voice,
            model,
            speed,
            game_slug: gameSlug,
            session_id: sessionId,
          }, ctrl.signal);
          if (t.cost) {
            setLastCost((prev) => {
              const voiceBit = `voice ${t.cost!.display}`;
              return prev ? `${prev} + ${voiceBit}` : `Last turn: ${voiceBit} (25% cut incl.)`;
            });
          }
          if (!t.fallback && t.audio) {
            const el = audioRef.current ?? new Audio();
            el.src = `data:${t.mime ?? "audio/mpeg"};base64,${t.audio}`;
            lastAudioUrlRef.current = el.src;
            el.onended = () => {
              speakingRef.current = false;
              setSpeaking(false);
              replyRef.current = null;
            };
            el.onpause = () => {
              // Pause also fires on barge-in stopVoice(); flag clears there.
              if (el.ended) {
                speakingRef.current = false;
                setSpeaking(false);
              }
            };
            audioRef.current = el;
            setVoiceEl(el);
            markSpeaking(r.reply);
            await el.play().catch(() => speakBrowser(r.reply));
          } else {
            speakBrowser(r.reply);
          }
        } catch {
          if ((ctrl.signal as AbortSignal).aborted) throw new DOMException("aborted", "AbortError");
          speakBrowser(r.reply);
        }
      }
      setStatus(r.fallback ? "AI is unavailable - Buddy answered locally at no cost." : camFrame ? "Buddy answered (camera frame itemized in the turn cost) and spoke." : "Buddy answered and spoke.");
      void refreshSpend(sessionId);
      void refreshBalance();
      inputRef.current?.focus();
    } catch (error) {
      if (liveActiveRef.current) {
        liveActiveRef.current = false;
        setStreamingActive(false);
        dropLiveMessage();
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("Turn cancelled; the server never meters an aborted turn.");
        return;
      }
      const code = (error as HttpError)?.status;
      if (code === 401) setAuthNeeded(true);
      if (code === 429) {
        const waitSecs = (error as HttpError)?.retryAfter ?? 60;
        setRateLimitedUntil(Date.now() + waitSecs * 1000);
      }
      const msg = error instanceof Error ? error.message : "Buddy could not answer.";
      setStatus(msg);
      setLastError(msg);
      lastFailedRef.current = text.trim();
    } finally {
      abortRef.current = null;
      setBusy(false);
      // Flush one queued turn (voice cut-in or auto-react), unless the user
      // cancelled - Cancel means stop everything, not "send next".
      const queued = queuedTurnRef.current;
      queuedTurnRef.current = null;
      if (queued && sessionIdRef.current && !cancelledRef.current) {
        setStatus(queued.kind === "voice" ? "Sending your queued sentence…" : "Sending the queued reaction…");
        void talkRef.current(queued.text, queued.opts);
      }
    }
  };

  /** Super-pack: one goal fans out to specialist writers in parallel. */
  const fireSuperPack = async () => {
    const goal = packGoal.trim() || `Victory celebration for ${gameTitle}`;
    if (packBusy || !sessionId) return;
    setPackBusy(true);
    setPackMsg(null);
    setPack(null);
    try {
      const result = await runOrchestrator(
        goal.slice(0, 500),
        { gameTitle, screenText: observeScreenText(), score },
        playRunner,
        { timeoutMs: 20_000, concurrency: 3 },
      );
      setPack(result);
      setStatus(`Super-pack landed: ${result.specialists.length} specialists, ${result.fallbackCount} offline. Live legs meter ~1 centicentcoin each on /api/openrouter-plays.`);
      void refreshBalance();
    } catch {
      setPackMsg("Super-pack failed before any live leg was metered; retry or keep chatting.");
    } finally {
      setPackBusy(false);
    }
  };

  /** Queue a super-pack voice line / SFX prompt as Fal media (quoted first). */
  const firePackMedia = async (op: string, prompt: string, label: string) => {
    setPackMsg(null);
    if (actBusy || packBusy) return;
    setActBusy(true);
    try {
      const r = await post<{ started?: boolean; configured?: boolean }>("/api/fal/generate", {
        op,
        prompt: prompt.slice(0, 1000),
        game_slug: gameSlug,
        source: "manual",
      });
      setPackMsg(r.started ? `${label} queued; watch /fal for the result.` : "Media worker is not configured on this deploy; nothing queued, no coins moved.");
      void refreshBalance();
    } catch (error) {
      setPackMsg(error instanceof Error ? error.message : "Could not queue that.");
    } finally {
      setActBusy(false);
    }
  };

  /** Fire the ready-to-fire Fal media hint (metered at /api/fal/generate). */
  const fireFalHint = async () => {
    if (!falHint || falBusy) return;
    setFalBusy(true);
    setFalMsg(null);
    try {
      const r = await post<{ started?: boolean; configured?: boolean; quote?: { display?: string }; error?: string }>("/api/fal/generate", {
        op: falHint.op,
        prompt: falHint.prompt,
        game_slug: gameSlug,
        source: "manual",
      });
      setFalMsg(r.started ? `Media queued (${falHint.op}); watch /fal for the result.` : `Not queued: ${r.configured === false ? "media worker is not configured on this deploy." : "see /fal."}`);
      void refreshBalance();
    } catch (error) {
      setFalMsg(error instanceof Error ? error.message : "Could not queue media.");
    } finally {
      setFalBusy(false);
    }
  };

  /** Download the visible transcript (local only, never leaves the device). */
  const downloadTranscript = (format: "txt" | "json") => {
    try {
      const turns = messagesRef.current.map((m) => ({ role: m.role, text: m.text, at: m.at }));
      const blob = format === "txt"
        ? new Blob([transcriptToText(turns)], { type: "text/plain" })
        : new Blob([JSON.stringify({ gameSlug, gameTitle, sessionId, exportedAt: new Date().toISOString(), turns }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buddy-${gameSlug}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Transcript downloaded (${format.toUpperCase()}); local file only, nothing uploaded.`);
    } catch {
      setStatus("Download blocked by the browser.");
    }
  };

  // Ref mirrors for the mic RAF loop + recognizer (they outlive renders).
  const sessionIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    sessionIdRef.current = sessionId;
    busyRef.current = busy;
    vadSmartRef.current = vadSmart;
    talkRef.current = (t, o) => talk(t, o);
  });

  // Full teardown on unmount: mic, camera, avatar meter, voice.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(micRafRef.current);
      try {
        recogRef.current?.stop();
      } catch {
        /* teardown is best-effort */
      }
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        camStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        /* teardown is best-effort */
      }
      if (avatarTimerRef.current) clearInterval(avatarTimerRef.current);
    };
  }, []);

  const draftEst = useMemo(() => estimateDraftCoins(draft.trim().length, shareMode !== "off"), [draft, shareMode]);
  const visibleMessages = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(f) || m.role.includes(f));
  }, [messages, filter]);
  const turnCount = spend?.session.turns ?? messagesRef.current.filter((m) => m.role === "you").length;
  const rateWait = rateLimitedUntil && rateLimitedUntil > Date.now() ? Math.ceil((rateLimitedUntil - Date.now()) / 1000) : 0;
  const lowBalance = balance !== null && balance < 1;

  return (
    <section data-buddy aria-label="Gaming Buddy" className="mt-4 rounded-2xl border border-violet-300/30 bg-gradient-to-b from-violet-400/10 to-white/[.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">🎧 Gaming Buddy; universal screen reader + voice</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Talks while you play in any of 9 OpenAI voices (default Nova). Reads the screen, reacts to score changes,
            and runs on the VibeCodeWorker observe→reason→act loop. OpenAI + database turns meter Vibe Coins at true
            cost with the 25% cut included; every turn shows its Coins + CentiCentCoins below; local
            fallback answers are free.
          </p>
          {sessionId && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-bold text-emerald-200">● Live {formatElapsed(elapsed)}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{turnCount} turn{turnCount === 1 ? "" : "s"}</span>
              {score !== null && (
                <span className={`rounded-full px-3 py-1 font-bold ${scoreFlash ? "bg-amber-300 text-slate-950" : "bg-white/10 text-amber-100"}`}>
                  Score {score}{scoreFlash ? " · updated!" : ""}
                </span>
              )}
              <button type="button" onClick={() => void copyText(sessionId, -1)} className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/10" title="Copy session id">
                {copiedIdx === -1 ? "Copied id ✓" : `Session ${sessionId.slice(0, 8)}… (copy)`}
              </button>
            </p>
          )}
        </div>
        {sessionId ? (
          <button type="button" onClick={end} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            End session
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="rounded-full bg-violet-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-violet-200 disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start Buddy session"}
          </button>
        )}
      </div>

      {!sessionId && openSessions.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/[.05] p-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-amber-100">↩️ You have {openSessions.length} open session{openSessions.length === 1 ? "" : "s"} from before - resume instead of starting fresh:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {openSessions.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => void resumeSession(s)}
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-300/10 disabled:opacity-50"
              >
                Resume {s.game_slug} · {new Date(s.started_at).toLocaleDateString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {authNeeded && (
        <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-300/[.06] p-3 text-xs text-rose-100">
          <b>Sign in required.</b> Buddy sessions are metered per account, so anonymous turns are disabled.{" "}
          <a href="/login" className="font-bold text-cyan-300 hover:underline">Sign in →</a>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          Voice (9)
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            {BUDDY_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} · {v.tone}{v.id === BUDDY_DEFAULT_VOICE ? " (default)" : ""}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => previewVoice(voice)} disabled={previewing} className="mt-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
            {previewing ? "Previewing…" : "🔊 Preview voice (free)"}
          </button>
        </label>
        <label className="block text-sm">
          Model
          <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            <option value="tts-1">tts-1 (fast)</option>
            <option value="tts-1-hd">tts-1-hd (rich)</option>
          </select>
        </label>
        <label className="block text-sm">
          Reasoner
          <select value={brain} onChange={(e) => setBrain(e.target.value)} title="Which AI brain reasons this turn" className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            <option value="auto">auto (OpenAI → OpenRouter)</option>
            <option value="openai">OpenAI only</option>
            <option value="openrouter">OpenRouter only</option>
          </select>
        </label>
        <label className="block text-sm">
          Speed ({speed.toFixed(2)}x)
          <select value={String(speed)} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            {["0.5", "0.75", "1", "1.25", "1.5", "2"].map((s) => (
              <option key={s} value={s}>
                {Number(s).toFixed(2)}x
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300 sm:col-span-4">
          <p className="font-bold text-slate-900 dark:text-white">Credits spent</p>
          <p className="mt-1">Session: <b className="text-violet-200">{spend?.session.gross ?? 0}</b> ({spend?.session.turns ?? 0} turns)</p>
          <p>Total: <b>{spend?.total.gross ?? 0}</b> · 24h: <b>{spend?.last24h.gross ?? 0}</b> · 1h: <b>{spend?.lastHour.gross ?? 0}</b></p>
          <p className="mt-1">
            Wallet: <b className={lowBalance ? "text-amber-200" : "text-emerald-200"}>{balance === null ? "…" : `${balance} coins`}</b>
            {lowBalance && <span className="ml-1 text-amber-200">- low! Top up before long chats.</span>}
          </p>
          {lastCost && <p className="mt-1 text-cyan-200">{lastCost}</p>}
          <a href={sessionId ? `/my/usage/?session=${sessionId}` : "/my/usage/"} className="mt-1 inline-block text-cyan-300 hover:underline">
            Full breakdown →
          </a>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">👁️ Let the buddy see your screen <span className="font-normal text-slate-600 dark:text-slate-400">(off unless you approve; the browser picker enforces your choice)</span></p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          <b className="text-emerald-200">Tab only (safest):</b> shares just this 4weird tab; other tabs, windows, and apps stay
          private. <b className="text-amber-200">Full screen:</b> you pick what to share in the browser picker; choose the game
          window to keep the rest private. Only one small snapshot per message is sent (never video, never stored).
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {shareMode === "off" ? (
            <>
              <button
                type="button"
                disabled={!sessionId || sharing || busy}
                onClick={() => void startShare("tab")}
                title={!sessionId ? "Start a Buddy session first" : "Share just this 4weird tab"}
                className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
              >
                {sharing ? "Asking…" : "Share this tab only"}
              </button>
              <button
                type="button"
                disabled={!sessionId || sharing || busy}
                onClick={() => void startShare("screen")}
                title={!sessionId ? "Start a Buddy session first" : "Share your screen (you pick what in the browser picker)"}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                Share screen…
              </button>
            </>
          ) : (
            <>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200">
                ● {shareMode === "tab" ? "Sharing this tab" : "Sharing screen"}
              </span>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-200">Next turn attaches 1 small JPEG if the screen changed (~billed as image tokens)</span>
              <button
                type="button"
                onClick={stopSharing}
                className="rounded-lg border border-rose-300/50 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-300/10"
              >
                Stop sharing
              </button>
            </>
          )}
        </div>
        {/* Live preview so the user sees exactly what the buddy can see. */}
        <video ref={videoRef} muted playsInline className={shareMode === "off" ? "hidden" : "mt-2 max-h-32 rounded-lg border border-white/10"} aria-label="Screen share preview" />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">🎙️ Talk to Buddy <span className="font-normal text-slate-600 dark:text-slate-400">(optional mic; mute anytime, Buddy never records you)</span></p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Turn the mic on to interrupt Buddy mid-sentence; it stops, remembers what both of you said, and resumes
          from your cut-in. Only transcripts leave the device (never audio). Smart detection sends your sentence when
          you pause; turn it off to send manually.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!micOn ? (
            <button type="button" disabled={!sessionId} onClick={() => void enableMic()} title={!sessionId ? "Start a Buddy session first" : "Turn the microphone on"} className="rounded-lg bg-violet-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
              Enable mic
            </button>
          ) : (
            <>
              <button type="button" onClick={toggleMute} className={`rounded-lg px-4 py-2 text-xs font-bold ${micMuted ? "bg-rose-300 text-slate-950" : "border border-white/20 hover:bg-white/10"}`}>
                {micMuted ? "🔇 Unmute me" : "🎤 Mute me"}
              </button>
              <button type="button" onClick={disableMic} className="rounded-lg border border-white/20 px-4 py-2 text-xs hover:bg-white/10">
                Mic off
              </button>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={vadSmart} onChange={(e) => { setVadSmart(e.target.checked); vadSmartRef.current = e.target.checked; }} />
                Smart speech detection
              </label>
            </>
          )}
          {micOn && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${hearing ? "bg-emerald-400/20 text-emerald-200" : micMuted ? "bg-rose-400/20 text-rose-200" : "bg-white/10 text-slate-600 dark:text-slate-300"}`}>
              {micMuted ? "Muted" : hearing ? "● Hearing you…" : "Listening"}
            </span>
          )}
          {micOn && !micMuted && (
            <span className="flex items-center gap-1.5" title="Live mic level (never recorded)">
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-emerald-300 transition-[width]" style={{ width: `${Math.round(micLevel * 100)}%` }} />
              </span>
            </span>
          )}
        </div>
        {micOn && interim && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-xs text-cyan-200">“{interim}”</p>
            <button type="button" disabled={busy || !interim.trim()} onClick={() => { const t = interimRef.current.trim(); interimRef.current = ""; setInterim(""); const r = pendingRef.current; pendingRef.current = null; void talk(t, { resumed: r, interrupted: r !== null }); }} className="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50">
              Send what I said
            </button>
          </div>
        )}
        {!speechSupported && micOn && (
          <p className="mt-1 text-slate-600 dark:text-slate-500">This browser has no speech-to-text; mic still detects interruptions; type or dictate elsewhere to send words.</p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">📷 Let Buddy see you <span className="font-normal text-slate-600 dark:text-slate-400">(optional camera; you approve every frame by sending)</span></p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Buddy reads your energy, posture, props, and backdrop to match your mood; kindly, never diagnosing, never
          identifying. While on, each message you send carries one small frame, itemized in that turn
          (~{quoteCameraFrames(1).display} per frame). No video ever leaves the device, nothing is stored.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!camOn ? (
            <button type="button" disabled={!sessionId} onClick={() => void enableCamera()} title={!sessionId ? "Start a Buddy session first" : "Turn the camera on"} className="rounded-lg bg-violet-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
              Enable camera
            </button>
          ) : (
            <>
              <button type="button" onClick={disableCamera} className="rounded-lg border border-rose-300/50 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-300/10">
                Camera off
              </button>
              <button type="button" disabled={busy} onClick={() => void talk("Assess my current emotional state and body language from the camera frame, then match my energy.")} className="rounded-lg border border-cyan-300/40 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60">
                ✨ Read my vibe
              </button>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-200">Next turn attaches 1 small JPEG if the pose changed</span>
            </>
          )}
        </div>
        <video ref={camVideoRef} muted playsInline className={camOn ? "mt-2 max-h-32 rounded-lg border border-white/10" : "hidden"} aria-label="Camera preview" />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">✨ Buddy avatar <span className="font-normal text-slate-600 dark:text-slate-400">(optional 3D companion - {quoteAvatarMinutes(1).display}/min, free when hidden)</span></p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          A cute three.js companion whose mouth follows Buddy&apos;s voice waveform and words, eyes blink, track your
          cursor, and widen with excitement. Presence meters by the minute while visible
          (this session&apos;s avatar: <b className="text-violet-200">{avatarCents} centicentcoins</b>).
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={!sessionId} onClick={() => setAvatarVisible(!avatarOn)} title={!sessionId ? "Start a Buddy session first" : avatarOn ? "Hide the avatar (stops metering)" : "Show the avatar"} className="rounded-lg bg-violet-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
            {avatarOn ? "Hide avatar" : "Show avatar"}
          </button>
          <label className="flex items-center gap-1.5 text-xs">
            Shape
            <select value={avatarType} onChange={(e) => setAvatarType(e.target.value as BuddyAvatarType)} className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5">
              <option value="cube">oso cube (default)</option>
              <option value="cloud">Buddy cloud</option>
              <option value="anime">Anime girl</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            Avatar color
            <input type="color" value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-white/15 bg-black/40" aria-label="Avatar color" />
          </label>
          {["#7c6cf6", "#38e1c6", "#ff9db0", "#ffe066", "#ff8a5c"].map((c) => (
            <button key={c} type="button" onClick={() => setAvatarColor(c)} aria-label={`Avatar color ${c}`} className={`h-6 w-6 rounded-full border ${avatarColor === c ? "border-white" : "border-white/20"}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="mt-2">
          {avatarOn && sessionId ? (
            <BuddyAvatar type={avatarType} color={outfitColor(loadout.outfit) ?? avatarColor} script={script} scriptStartedAt={scriptAt} speaking={speaking} outputEl={voiceEl} micStream={micOn && !micMuted ? micStream : null} loadout={loadout} label={`Buddy ${avatarType}`} />
          ) : (
            <p className="text-slate-600 dark:text-slate-500">{sessionId ? "Avatar hidden; no presence cost. Show it anytime." : "Start a Buddy session to meet the avatar."}</p>
          )}
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="font-bold text-slate-900 dark:text-white">🎩 Wardrobe <span className="font-normal text-slate-600 dark:text-slate-400">(one shop everywhere; every look costs 10 coins, looks-only, never pay-to-win)</span></p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Buying shows the exact price first and charges only what you confirm (singleplayer boosts live behind
            guarded dev charges, capped at 10,000 coins each and 1,000/day per game; multiplayer boosts are banned).
          </p>
          {wardrobePending && <p className="mt-1 text-amber-200">Shop isn&apos;t metered on this deploy yet; browsing is free, buying is disabled.</p>}
          {wardrobeMsg && <p className="mt-1 text-cyan-200">{wardrobeMsg}</p>}
          {COSMETIC_SLOTS.map((slot) => (
            <div key={slot} className="mt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{slot}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {catalog.filter((c) => c.slot === slot && c.kinds.includes(avatarType)).map((c) => {
                  const have = owned.includes(c.id);
                  const worn = loadout[slot] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!sessionId || busy}
                      title={c.blurb}
                      onClick={() => void (have ? toggleEquip(c) : buyCosmetic(c))}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${worn ? "border-emerald-300 bg-emerald-300/15 font-bold text-emerald-100" : have ? "border-white/20 hover:bg-white/10" : "border-violet-300/40 text-violet-100 hover:bg-violet-300/10"} disabled:opacity-50`}
                    >
                      {c.name} · {have ? (worn ? "worn ✓" : "wear") : `buy ${c.price}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-900 dark:text-white">⚡ Buddy extras <span className="font-normal text-slate-600 dark:text-slate-400">(streaming answers are automatic; memory + auto-reacts are opt-in)</span></p>
        <label className="mt-2 flex items-start gap-2 text-xs">
          <input type="checkbox" checked={proactiveOn} onChange={(e) => setProactiveOn(e.target.checked)} className="mt-0.5" />
          <span><b className="text-slate-900 dark:text-white">Auto-react to big score moments.</b> Buddy jumps in on jumps of 10+, spaced 60s apart, max 10 per session. Each auto-react is a metered turn.</span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-xs">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mt-0.5" />
          <span><b className="text-slate-900 dark:text-white">Remember me across sessions.</b> Buddy keeps a short rolling note for {gameTitle} (your words, no screen dumps). Per-game, auto-trimmed, never shared.</span>
        </label>
      </div>

      <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-400">{status}</p>
      {rateWait > 0 && (
        <p className="mt-1 text-xs text-amber-200">Rate limited - wait ~{rateWait}s before the next turn. Your wallet was not charged.</p>
      )}
      {lastError && lastFailedRef.current && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-300/[.05] p-2.5 text-xs text-rose-100">
          <span className="min-w-0 flex-1">Last turn failed: {lastError}</span>
          <button
            type="button"
            disabled={busy || !sessionId}
            onClick={() => { const t = lastFailedRef.current; lastFailedRef.current = ""; void talk(t); }}
            className="rounded-lg border border-rose-300/50 px-3 py-1.5 font-semibold hover:bg-rose-300/10 disabled:opacity-50"
          >
            Retry turn
          </button>
        </div>
      )}
      {falHint && (
        <div className="mt-2 rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/[.05] p-3 text-xs text-slate-700 dark:text-slate-200">
          <p className="font-bold text-fuchsia-100">🎬 Buddy suggests media <span className="font-normal text-slate-600 dark:text-slate-400">({falHint.op} · ~{falHint.coins} coins · costs nothing until you fire it)</span></p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">“{falHint.prompt.slice(0, 180)}{falHint.prompt.length > 180 ? "…" : ""}”</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={falBusy || !sessionId} onClick={() => void fireFalHint()} className="rounded-lg bg-fuchsia-300 px-3 py-1.5 font-bold text-slate-950 disabled:opacity-50">
              {falBusy ? "Queueing…" : "Generate it"}
            </button>
            <button type="button" onClick={() => setFalHint(null)} className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">
              Dismiss
            </button>
          </div>
          {falMsg && <p className="mt-1 text-cyan-200">{falMsg}</p>}
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              maxLength={80}
              placeholder="Filter transcript…"
              aria-label="Filter transcript"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs"
            />
            {messages.length > 0 && (
              <>
                <button type="button" onClick={() => { const t = lastUserRef.current; if (t) void talk(t); }} disabled={busy || !lastUserRef.current} title="Resend your last message as a new (metered) turn" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50">
                  ↻ Retry last
                </button>
                <button type="button" onClick={() => void replayVoice()} title="Replay Buddy's last reply (cached audio replays free)" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                  🔊 Replay
                </button>
                <button type="button" onClick={() => downloadTranscript("txt")} title="Download transcript as text (local file)" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                  ⬇ .txt
                </button>
                <button type="button" onClick={() => downloadTranscript("json")} title="Download transcript as JSON (local file)" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                  ⬇ .json
                </button>
                <button type="button" onClick={() => { messagesRef.current = []; setMessages([]); setLastCost(null); setStatus("Transcript cleared locally; the metered ledger on /my/usage/ is unchanged."); }} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                  🧹 Clear
                </button>
              </>
            )}
          </div>
          <div ref={listRef} className="perf-list max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3" aria-live={streamingActive ? "off" : "polite"} aria-busy={streamingActive}>
            {(filter.trim() ? visibleMessages : messages).length ? (
              (filter.trim() ? visibleMessages : messages).map((m, i) => (
                <div key={i} className={`group flex items-start gap-2 text-sm ${m.role === "buddy" ? "text-violet-100" : "text-slate-600 dark:text-slate-300"}`}>
                  <p className="min-w-0 flex-1">
                    <b>{m.role === "buddy" ? "Buddy" : "You"}:</b> {m.text}{m.interrupted ? <em className="text-amber-200"> (cut in)</em> : null}{" "}
                    {m.tag ? <small className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-slate-600 dark:text-slate-400">{m.tag}</small> : null}{" "}
                    <small className="text-slate-600 dark:text-slate-500"><time>{m.at}</time></small>
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyText(m.text, i)}
                    title="Copy this message"
                    aria-label={`Copy message ${i + 1}`}
                    className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-400 opacity-0 hover:bg-white/10 focus:opacity-100 group-hover:opacity-100"
                  >
                    {copiedIdx === i ? "✓" : "⧉"}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-500">{filter.trim() ? "No turns match that filter." : "Say hi; buddy reads the screen and answers out loud."}</p>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void talk(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void talk(draft);
                } else if (e.key === "Escape" && draft) {
                  setDraft("");
                }
              }}
              maxLength={500}
              placeholder="Talk to your buddy while you play…"
              aria-label="Message your buddy"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
            />
            {busy ? (
              <button type="button" onClick={cancelTalk} title="Cancel the in-flight turn (never metered)" className="rounded-lg border border-rose-300/50 px-4 py-2 text-sm font-bold text-rose-100 hover:bg-rose-300/10">
                Cancel
              </button>
            ) : (
              <button disabled={busy || !draft.trim()} title={!draft.trim() ? "Type a message first" : `Send (~${draftEst} coins chat leg${shareMode !== "off" ? " + image" : ""})`} className="rounded-lg bg-violet-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">
                Send
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk(`/react ${observeScreenText() || "to the current screen"}`)}
              title={sessionId ? "Ask Buddy to react to the current screen" : "Start a Buddy session first"}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-60"
            >
              React to screen
            </button>
          </form>
          <p className="text-xs text-slate-600 dark:text-slate-500">
            {draft.trim().length}/500 · ~{draftEst} coins chat leg{shareMode !== "off" ? " + image tokens" : ""}{camOn ? " + 1 camera frame" : ""} · Ctrl+Enter sends · Esc clears · shortcuts: <code>/tactics</code> <code>/hail</code> <code>/react</code> <code>/vibe</code> <code>/help</code>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk("Give me one concise tactical recommendation based on the current battle state.")}
              title={sessionId ? "One fair tip grounded in the current screen" : "Start a Buddy session first"}
              className="rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
            >
              🧠 Ask for tactics
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk("Hail the enemy commander: give one short fictional radio taunt, then one fair counter-tactic.")}
              title={sessionId ? "In-character taunt plus one fair counter-tactic" : "Start a Buddy session first"}
              className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-300/10 disabled:opacity-60"
            >
              📡 Hail enemy AI
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white">⚡ One-click delegations <span className="font-normal text-slate-600 dark:text-slate-400">(chat fires a buddy turn; media quotes before it meters)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {buddyActs.map((a) => a.kind === "link" && a.href ? (
                <a key={a.id} href={a.href(gameSlug)} title={a.blurb} className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">
                  {a.label}
                </a>
              ) : (
                <button
                  key={a.id}
                  type="button"
                  disabled={busy || !sessionId || actBusy}
                  onClick={() => void fireBuddyAction(a)}
                  title={a.blurb ?? (!sessionId ? "Start a Buddy session first" : a.label)}
                  className="rounded-lg border border-fuchsia-300/40 px-3 py-1.5 text-fuchsia-100 hover:bg-fuchsia-300/10 disabled:opacity-50"
                >
                  {a.label}{typeof a.estCoins === "number" ? ` ~${a.estCoins}c` : ""}
                </button>
              ))}
            </div>
            {actMsg && <p className="mt-1 text-cyan-200">{actMsg}</p>}
          </div>
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[.04] p-3 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-bold text-amber-100">🔥 Super-pack <span className="font-normal text-slate-600 dark:text-slate-400">(multi-agent: one goal, parallel specialists)</span></p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              A coach, hype-caster, voice writer, lorekeeper and more riff on your goal at once. Each live leg meters
              ~1 centicentcoin on /api/openrouter-plays; offline legs are free and labelled.
            </p>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void fireSuperPack();
              }}
            >
              <input
                value={packGoal}
                onChange={(e) => setPackGoal(e.target.value)}
                maxLength={200}
                placeholder={`Victory celebration for ${gameTitle}…`}
                aria-label="Super-pack goal"
                disabled={!sessionId || packBusy}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={!sessionId || packBusy}
                title={!sessionId ? "Start a Buddy session first" : `Specialists: ${planSpecialists(packGoal.trim() || gameTitle).join(", ")}`}
                className="rounded-lg bg-amber-300 px-3 py-1.5 font-bold text-slate-950 disabled:opacity-50"
              >
                {packBusy ? "Writing…" : "Assemble pack"}
              </button>
            </form>
            {packMsg && <p className="mt-1 text-cyan-200">{packMsg}</p>}
            {pack && (
              <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
                <div className="flex flex-wrap gap-1.5" aria-label="Specialists">
                  {pack.specialists.map((s) => (
                    <span key={s.specialist} title={s.fallback ? "Offline reply (free)" : "Live reply (~1 centicentcoin)"} className={`rounded-full px-2 py-0.5 font-bold ${s.fallback ? "bg-white/10 text-slate-600 dark:text-slate-400" : "bg-emerald-400/15 text-emerald-200"}`}>
                      {s.specialist}{s.fallback ? " · offline" : " · live"}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-amber-50"><b>Pack:</b> {pack.reply}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => speakBrowser(pack.reply)} className="rounded-lg border border-white/20 px-2.5 py-1 hover:bg-white/10">
                    🔊 Speak it (free)
                  </button>
                  <button type="button" onClick={() => void copyText(pack.reply, -2)} className="rounded-lg border border-white/20 px-2.5 py-1 hover:bg-white/10">
                    {copiedIdx === -2 ? "Copied ✓" : "⧉ Copy"}
                  </button>
                </div>
                {pack.voiceLines && (
                  <div className="rounded-lg border border-white/10 p-2">
                    <p><b className="text-slate-900 dark:text-white">Voice lines:</b> {pack.voiceLines.slice(0, 300)}</p>
                    <button type="button" disabled={actBusy || packBusy} onClick={() => void firePackMedia("npc-voice", pack.voiceLines, "Voice line")} className="mt-1 rounded-lg border border-fuchsia-300/40 px-2.5 py-1 text-fuchsia-100 hover:bg-fuchsia-300/10 disabled:opacity-50">
                      🎙 Voice it on Fal
                    </button>
                  </div>
                )}
                {pack.sfxPrompts && (
                  <div className="rounded-lg border border-white/10 p-2">
                    <p><b className="text-slate-900 dark:text-white">SFX:</b> {pack.sfxPrompts.slice(0, 300)}</p>
                    <button type="button" disabled={actBusy || packBusy} onClick={() => void firePackMedia("sfx-burst", pack.sfxPrompts, "SFX")} className="mt-1 rounded-lg border border-fuchsia-300/40 px-2.5 py-1 text-fuchsia-100 hover:bg-fuchsia-300/10 disabled:opacity-50">
                      🔊 Make the SFX
                    </button>
                  </div>
                )}
                {pack.loreNote && (
                  <p className="rounded-lg border border-white/10 p-2"><b className="text-slate-900 dark:text-white">Lore:</b> {pack.loreNote.slice(0, 300)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
