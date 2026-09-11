"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES, quoteAvatarMinutes, quoteCameraFrames } from "@/lib/game-ai";
import { AvatarLoadout, COSMETIC_SLOTS, CosmeticItem, outfitColor } from "@/lib/cosmetics";
import { priceLine } from "@/lib/monetization-policy";
import { TRUSTED_GAME_ORIGINS } from "@/components/games/game-runtime-frame";
import { BuddyAvatar, BuddyAvatarType } from "@/components/buddy/buddy-avatar";
import {
  InterruptionSnapshot,
  VadState,
  buildInterruptionSnapshot,
  frameEnergy,
  mergePartialTranscript,
  snapshotToPrompt,
  updateVad,
} from "@/lib/buddy-voice";

type BuddyMessage = { role: "buddy" | "you"; text: string; at: string; interrupted?: boolean };

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

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((data as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return data as T;
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
 * Only one downscaled JPEG snapshot per sent message leaves the device —
 * never video, never stored server-side — and every snapshot turn is
 * itemized in that turn's cost line.
 */
export function GamingBuddy({ gameSlug, gameTitle }: { gameSlug: string; gameTitle: string }) {
  const [voice, setVoice] = useState(BUDDY_DEFAULT_VOICE);
  const [model, setModel] = useState("tts-1");
  const [speed, setSpeed] = useState(1.0);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Buddy is off. Start a session to talk while you play.");
  const [spend, setSpend] = useState<{ session: SessionSpend; total: SessionSpend; lastHour: SessionSpend; last24h: SessionSpend } | null>(null);
  const [lastCost, setLastCost] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>("off");
  const [sharing, setSharing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // --- Voice presence (mic + smart speech detection + barge-in) ---
  const [micOn, setMicOn] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [vadSmart, setVadSmart] = useState(true);
  const [hearing, setHearing] = useState(false);
  const [interim, setInterim] = useState("");
  const [speechSupported] = useState(() => typeof window !== "undefined" && getSpeechRecognition() !== null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micBufRef = useRef<Uint8Array>(new Uint8Array(512));
  const micRafRef = useRef(0);
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
  // Screen-text cache: DOM queries run at most once per second so rapid
  // sends never force layout back-to-back on the main thread.
  const screenCache = useRef<{ at: number; text: string }>({ at: 0, text: "" });

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
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void refreshSpend(sessionId);
    // Hidden tabs skip spend polls — the metered ledger stays authoritative.
    const timer = setInterval(() => {
      if (!document.hidden) void refreshSpend(sessionId);
    }, 15_000);
    const onVis = () => {
      if (!document.hidden) void refreshSpend(sessionId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sessionId, refreshSpend]);

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
          acceptedQuote: `${item.name} — ${priceLine(item.price)}`,
        },
      );
      if (r.pendingMigration) {
        setWardrobeMsg("Shop isn't metered on this deploy yet — nothing bought, no coins moved.");
        return;
      }
      setWardrobeMsg(`Bought ${item.name} for ${r.receipt?.price ?? `${item.price} coins`} — check your avatar!`);
      void refreshWardrobe();
      if (sessionId) void refreshSpend(sessionId);
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
      setStatus("Screen sharing is not supported in this browser — text + score context still works.");
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
      setShareMode(mode);
      const [track] = stream.getVideoTracks();
      track?.addEventListener("ended", () => stopSharing());
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus(
        mode === "tab"
          ? "Sharing this 4weird tab only — other tabs and apps stay private. Stop anytime below or via the browser bar."
          : "Sharing your screen — pick just the game window/tab in the browser picker to keep everything else private.",
      );
    } catch {
      setSharing(false);
      setStatus("Screen share cancelled — nothing is shared until you approve the browser picker.");
    }
  };

  /** One downscaled JPEG snapshot from the live share (per message only). */
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
      const url = canvas.toDataURL("image/jpeg", 0.6);
      // ~700 KB cap: drop oversized frames rather than failing the turn.
      if (url.length > 900_000) return null;
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

  /** Barge-in: user cut in — stop Buddy, snapshot both sides, resume next turn. */
  const handleBargeIn = useCallback(() => {
    const partial = interimRef.current.trim();
    const soFar = replyProgress();
    stopVoice();
    replyRef.current = null;
    const snap = buildInterruptionSnapshot({ partialUserText: partial, buddyReplySoFar: soFar, gameTitle });
    pendingRef.current = snap;
    setStatus(
      partial
        ? `Heard you cut in (“${partial.slice(0, 60)}${partial.length > 60 ? "…" : ""}”) — finishing your sentence, then Buddy resumes from it.`
        : "Heard you cut in — finishing your sentence, then Buddy resumes from it.",
    );
  }, [gameTitle, replyProgress, stopVoice]);

  const autoSendVoice = useCallback(() => {
    const text = interimRef.current.trim();
    interimRef.current = "";
    setInterim("");
    if (!text || !sessionIdRef.current || busyRef.current || micMutedRef.current) return;
    const resumed = pendingRef.current;
    pendingRef.current = null;
    void talkRef.current(text, { resumed, interrupted: resumed !== null });
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
      if (!navigator.mediaDevices?.getUserMedia) setStatus("Microphone is not supported in this browser — typed messages still work.");
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
          ? "Mic live — talk to interrupt Buddy anytime; smart detection sends your sentence when you pause. Mute anytime below."
          : "Mic live for interruption detection — typed messages still send turns (this browser has no speech-to-text).",
      );
    } catch {
      setStatus("Microphone blocked — allow mic access in the browser bar, or keep typing.");
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
    setMicOn(false);
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
      } else if (micOnRef.current) {
        startRecognition();
      }
    } catch {
      /* mute toggle is best-effort */
    }
    setStatus(next ? "Mic muted — Buddy can't hear you until you unmute." : "Mic live again.");
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
      setStatus("Camera on — attach a frame to any message and Buddy reads your energy, posture, and backdrop. Each attached frame is itemized in that turn (~3 centicentcoins). Stop anytime.");
    } catch {
      setStatus("Camera blocked — allow camera access in the browser bar, or keep playing without it.");
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

  /** One downscaled camera frame for the next explicit turn (never silent). */
  const captureCameraFrame = (): string | null => {
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
      const url = canvas.toDataURL("image/jpeg", 0.55);
      if (url.length > 900_000) return null;
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
            setStatus("Avatar ran out of meterable coins — avatar paused, chat still works.");
            setAvatarOn(false);
            avatarStartRef.current = null;
            if (avatarTimerRef.current) clearInterval(avatarTimerRef.current);
            avatarTimerRef.current = null;
          }
        })();
      }, 60_000);
      setStatus(`Avatar on — cute companion renders beside chat at ${quoteAvatarMinutes(1).display}/min. Turn it off anytime.`);
    } else {
      setAvatarOn(false);
      void stopAvatarMeter();
      setStatus("Avatar off — presence metering stopped.");
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      const r = await post<{ session: { id: string } }>("/api/buddy/session", {
        action: "start",
        game_slug: gameSlug,
        voice,
      });
      setSessionId(r.session.id);
      setOpen(true);
      setStatus(`Buddy is live as ${voice}. It reads your screen and reacts out loud.`);
      pushMessage({ role: "buddy", text: `Hey, I'm your Gaming Buddy for ${gameTitle}. I'm watching the screen — talk to me while you play.`, at: new Date().toLocaleTimeString() });
      void refreshWardrobe();
      void refreshSpend(r.session.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start buddy.");
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!sessionId) return;
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
    setOpen(false);
    void refreshSpend(null);
  };

  const observeScreenText = (): string => {
    // Screen reading without new deps: visible headings + live region text —
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

  const talk = async (text: string, opts?: { resumed?: InterruptionSnapshot | null; interrupted?: boolean }) => {
    // Guarded: without this, double-Enter submits two concurrent turns and
    // the user is metered twice for one message.
    if (!sessionId || !text.trim() || busy) return;
    setBusy(true);
    const screen = text.trim().startsWith("/") ? observeScreenText() : `${observeScreenText()} ${text.trim()}`.trim();
    const snapshot = shareMode === "off" ? null : captureSnapshot();
    // Camera frames only ever ride an explicit user turn — never silent.
    const camFrame = !camOn ? null : captureCameraFrame();
    if (shareMode !== "off" && !snapshot) {
      setStatus("Screen share is on but no frame was ready — sent text context only (no image charge). Re-pick the tab if this persists.");
    }
    if (camOn && !camFrame) {
      setStatus("Camera is on but no frame was ready — sent without a camera frame (no camera charge).");
    }
    const resumedNote = opts?.resumed ? snapshotToPrompt(opts.resumed) : "";
    pushMessage({ role: "you", text: text.trim(), at: new Date().toLocaleTimeString(), ...(opts?.interrupted ? { interrupted: true } : {}) });
    setDraft("");
    const history = messagesRef.current.slice(-8).map((m) => ({
      role: m.role === "buddy" ? ("buddy" as const) : ("user" as const),
      text: m.text.slice(0, 300),
      ...(m.interrupted ? { interrupted: true as const } : {}),
    }));
    try {
      const r = await post<{ reply: string; voice: string; fallback: boolean; cost?: TurnCost | null }>("/api/buddy/chat", {
        game_slug: gameSlug,
        game_title: gameTitle,
        screen_text: screen || text.trim(),
        message: `${resumedNote} ${text.trim()}`.trim().slice(0, 900),
        history,
        score,
        voice,
        session_id: sessionId,
        ...(snapshot ? { screen_image: snapshot } : {}),
        ...(camFrame ? { camera_image: camFrame } : {}),
      });
      pushMessage({ role: "buddy", text: r.reply, at: new Date().toLocaleTimeString() });
      setScript(r.reply);
      setScriptAt(Date.now());
      replyRef.current = { text: r.reply, startedAt: Date.now() };
      if (r.cost) {
        const p = r.cost.parts ?? {};
        const bits: string[] = [];
        if (p.chatUsd) bits.push(`chat $${Number(p.chatUsd).toFixed(6)}`);
        if (p.imageUsd) bits.push(`screen $${Number(p.imageUsd).toFixed(6)}`);
        if (p.dbUsd) bits.push(`DB $${Number(p.dbUsd).toFixed(6)}`);
        setLastCost(`Last turn: ${r.cost.display} (25% cut incl.${bits.length ? ` — ${bits.join(" + ")}` : ""})`);
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
          });
          if (t.cost) {
            setLastCost((prev) => {
              const voiceBit = `voice ${t.cost!.display}`;
              return prev ? `${prev} + ${voiceBit}` : `Last turn: ${voiceBit} (25% cut incl.)`;
            });
          }
          if (!t.fallback && t.audio) {
            const el = audioRef.current ?? new Audio();
            el.src = `data:${t.mime ?? "audio/mpeg"};base64,${t.audio}`;
            el.onended = () => {
              speakingRef.current = false;
              setSpeaking(false);
              replyRef.current = null;
            };
            el.onpause = () => {
              // Pause also fires on barge-in stopVoice() — flag clears there.
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
          speakBrowser(r.reply);
        }
      }
      setStatus(r.fallback ? "AI is unavailable — Buddy answered locally at no cost." : camFrame ? "Buddy answered (camera frame itemized in the turn cost) and spoke." : "Buddy answered and spoke.");
      void refreshSpend(sessionId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Buddy could not answer.");
    } finally {
      setBusy(false);
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

  return (
    <section data-buddy aria-label="Gaming Buddy" className="mt-4 rounded-2xl border border-violet-300/30 bg-gradient-to-b from-violet-400/10 to-white/[.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">🎧 Gaming Buddy — universal screen reader + voice</h2>
          <p className="mt-1 text-sm text-slate-300">
            Talks while you play in any of 9 OpenAI voices (default Nova). Reads the screen, reacts to score changes,
            and runs on the VibeCodeWorker observe→reason→act loop. OpenAI + database turns meter Vibe Coins at true
            cost with the 25% cut included — every turn shows its Coins + CentiCentCoins below; local
            fallback answers are free.
          </p>
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
        </label>
        <label className="block text-sm">
          Model
          <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">
            <option value="tts-1">tts-1 (fast)</option>
            <option value="tts-1-hd">tts-1-hd (rich)</option>
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
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
          <p className="font-bold text-white">Credits spent</p>
          <p className="mt-1">Session: <b className="text-violet-200">{spend?.session.gross ?? 0}</b> ({spend?.session.turns ?? 0} turns)</p>
          <p>Total: <b>{spend?.total.gross ?? 0}</b> · 24h: <b>{spend?.last24h.gross ?? 0}</b> · 1h: <b>{spend?.lastHour.gross ?? 0}</b></p>
          {lastCost && <p className="mt-1 text-cyan-200">{lastCost}</p>}
          <a href={sessionId ? `/my/usage/?session=${sessionId}` : "/my/usage/"} className="mt-1 inline-block text-cyan-300 hover:underline">
            Full breakdown →
          </a>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
        <p className="font-bold text-white">👁️ Let the buddy see your screen <span className="font-normal text-slate-400">(off unless you approve — the browser picker enforces your choice)</span></p>
        <p className="mt-1 text-slate-400">
          <b className="text-emerald-200">Tab only (safest):</b> shares just this 4weird tab — other tabs, windows, and apps stay
          private. <b className="text-amber-200">Full screen:</b> you pick what to share in the browser picker — choose the game
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

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
        <p className="font-bold text-white">🎙️ Talk to Buddy <span className="font-normal text-slate-400">(optional mic — mute anytime, Buddy never records you)</span></p>
        <p className="mt-1 text-slate-400">
          Turn the mic on to interrupt Buddy mid-sentence — it stops, remembers what both of you said, and resumes
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
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${hearing ? "bg-emerald-400/20 text-emerald-200" : micMuted ? "bg-rose-400/20 text-rose-200" : "bg-white/10 text-slate-300"}`}>
              {micMuted ? "Muted" : hearing ? "● Hearing you…" : "Listening"}
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
          <p className="mt-1 text-slate-500">This browser has no speech-to-text — mic still detects interruptions; type or dictate elsewhere to send words.</p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
        <p className="font-bold text-white">📷 Let Buddy see you <span className="font-normal text-slate-400">(optional camera — you approve every frame by sending)</span></p>
        <p className="mt-1 text-slate-400">
          Buddy reads your energy, posture, props, and backdrop to match your mood — kindly, never diagnosing, never
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
            </>
          )}
        </div>
        <video ref={camVideoRef} muted playsInline className={camOn ? "mt-2 max-h-32 rounded-lg border border-white/10" : "hidden"} aria-label="Camera preview" />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
        <p className="font-bold text-white">✨ Buddy avatar <span className="font-normal text-slate-400">(optional 3D companion — {quoteAvatarMinutes(1).display}/min, free when hidden)</span></p>
        <p className="mt-1 text-slate-400">
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
            Color
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
            <p className="text-slate-500">{sessionId ? "Avatar hidden — no presence cost. Show it anytime." : "Start a Buddy session to meet the avatar."}</p>
          )}
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="font-bold text-white">🎩 Wardrobe <span className="font-normal text-slate-400">(one shop everywhere — every look costs 10 coins, looks-only, never pay-to-win)</span></p>
          <p className="mt-1 text-slate-400">
            Buying shows the exact price first and charges only what you confirm (singleplayer boosts live behind
            guarded dev charges, capped at 10,000 coins each and 1,000/day per game — multiplayer boosts are banned).
          </p>
          {wardrobePending && <p className="mt-1 text-amber-200">Shop isn&apos;t metered on this deploy yet — browsing is free, buying is disabled.</p>}
          {wardrobeMsg && <p className="mt-1 text-cyan-200">{wardrobeMsg}</p>}
          {COSMETIC_SLOTS.map((slot) => (
            <div key={slot} className="mt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{slot}</p>
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

      <p role="status" className="mt-3 text-sm text-slate-400">{status}</p>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="perf-list max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3" aria-live="polite">
            {messages.length ? (
              messages.map((m, i) => (
                <p key={i} className={`text-sm ${m.role === "buddy" ? "text-violet-100" : "text-slate-300"}`}>
                  <b>{m.role === "buddy" ? "Buddy" : "You"}:</b> {m.text}{m.interrupted ? <em className="text-amber-200"> (cut in)</em> : null}{" "}
                  <small className="text-slate-500">{m.at}</small>
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">Say hi — buddy reads the screen and answers out loud.</p>
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Talk to your buddy while you play…"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
            />
            <button disabled={busy || !draft.trim()} className="rounded-lg bg-violet-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">
              {busy ? "…" : "Send"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk(`/react ${observeScreenText() || "to the current screen"}`)}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm"
            >
              React to screen
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk("Give me one concise tactical recommendation based on the current battle state.")}
              className="rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
            >
              🧠 Ask for tactics
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void talk("Hail the enemy commander: give one short fictional radio taunt, then one fair counter-tactic.")}
              className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-300/10 disabled:opacity-60"
            >
              📡 Hail enemy AI
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
