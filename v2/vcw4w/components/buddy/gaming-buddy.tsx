"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUDDY_DEFAULT_VOICE, BUDDY_VOICES } from "@/lib/game-ai";
import { TRUSTED_GAME_ORIGINS } from "@/components/games/game-runtime-frame";

type BuddyMessage = { role: "buddy" | "you"; text: string; at: string };
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

function speakWithBrowser(text: string, voiceId: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 400));
    utter.rate = 1.0;
    utter.pitch = voiceId === "echo" || voiceId === "onyx" ? 0.7 : voiceId === "nova" || voiceId === "shimmer" ? 1.3 : 1.0;
    window.speechSynthesis.speak(utter);
  } catch {
    // Audio is best-effort; the transcript below is the source of truth.
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
  const stopVoice = useCallback(() => {
    try {
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      /* audio teardown is best-effort */
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
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void refreshSpend(sessionId);
    const timer = setInterval(() => void refreshSpend(sessionId), 15_000);
    return () => clearInterval(timer);
  }, [sessionId, refreshSpend]);

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
      setMessages((m) => [...m, { role: "buddy", text: `Hey, I'm your Gaming Buddy for ${gameTitle}. I'm watching the screen — talk to me while you play.`, at: new Date().toLocaleTimeString() }]);
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
    try {
      const els = [...document.querySelectorAll("h1, h2, [role=status]")]
        .filter((e) => !e.closest("[data-buddy]"))
        .slice(0, 8);
      return els.map((e) => (e.textContent ?? "").trim()).filter(Boolean).join(" · ").slice(0, 500);
    } catch {
      return "";
    }
  };

  const talk = async (text: string) => {
    // Guarded: without this, double-Enter submits two concurrent turns and
    // the user is metered twice for one message.
    if (!sessionId || !text.trim() || busy) return;
    setBusy(true);
    const screen = text.trim().startsWith("/") ? observeScreenText() : `${observeScreenText()} ${text.trim()}`.trim();
    const snapshot = shareMode === "off" ? null : captureSnapshot();
    if (shareMode !== "off" && !snapshot) {
      setStatus("Screen share is on but no frame was ready — sent text context only (no image charge). Re-pick the tab if this persists.");
    }
    setMessages((m) => [...m, { role: "you", text: text.trim(), at: new Date().toLocaleTimeString() }]);
    setDraft("");
    try {
      const r = await post<{ reply: string; voice: string; fallback: boolean; cost?: TurnCost | null }>("/api/buddy/chat", {
        game_slug: gameSlug,
        game_title: gameTitle,
        screen_text: screen || text.trim(),
        score,
        voice,
        session_id: sessionId,
        ...(snapshot ? { screen_image: snapshot } : {}),
      });
      setMessages((m) => [...m, { role: "buddy", text: r.reply, at: new Date().toLocaleTimeString() }]);
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
        speakWithBrowser(r.reply, voice);
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
            audioRef.current = el;
            await el.play().catch(() => speakWithBrowser(r.reply, voice));
          } else {
            speakWithBrowser(r.reply, voice);
          }
        } catch {
          speakWithBrowser(r.reply, voice);
        }
      }
      setStatus(r.fallback ? "AI is unavailable — Buddy answered locally at no cost." : "Buddy answered and spoke.");
      void refreshSpend(sessionId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Buddy could not answer.");
    } finally {
      setBusy(false);
    }
  };

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

      <p role="status" className="mt-3 text-sm text-slate-400">{status}</p>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3" aria-live="polite">
            {messages.length ? (
              messages.map((m, i) => (
                <p key={i} className={`text-sm ${m.role === "buddy" ? "text-violet-100" : "text-slate-300"}`}>
                  <b>{m.role === "buddy" ? "Buddy" : "You"}:</b> {m.text}{" "}
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
