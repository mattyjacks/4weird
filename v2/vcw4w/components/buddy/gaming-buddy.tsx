"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUDDY_VOICES } from "@/lib/game-ai";
import { TRUSTED_GAME_ORIGINS } from "@/components/games/game-runtime-frame";

type BuddyMessage = { role: "buddy" | "you"; text: string; at: string };
type SessionSpend = { gross: number; cut: number; provider: number; turns: number };

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

/**
 * Universal Gaming Buddy widget. VCW-engine loop in the browser:
 * OBSERVE (game title + score events + visible screen text) -> REASON
 * (POST /api/buddy/chat) -> ACT (POST /api/buddy/tts, else browser voice)
 * -> METER (server meters every turn; widget polls /api/my/usage for the
 * live session / total / last-hour / last-24h credit readout).
 */
export function GamingBuddy({ gameSlug, gameTitle }: { gameSlug: string; gameTitle: string }) {
  const [voice, setVoice] = useState("alloy");
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    if (!sessionId) return;
    void refreshSpend(sessionId);
    const timer = setInterval(() => void refreshSpend(sessionId), 15_000);
    return () => clearInterval(timer);
  }, [sessionId, refreshSpend]);

  useEffect(() => stopVoice, [stopVoice]);

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
    try {
      await post("/api/buddy/session", { action: "end", session_id: sessionId });
      setStatus("Session ended. Spend stays on /my/usage/ forever.");
    } catch {
      setStatus("Session closed locally.");
    }
    setSessionId(null);
    setOpen(false);
    void refreshSpend(null);
  };

  const observeScreenText = (): string => {
    // Screen reading without new deps: visible headings + live region text.
    try {
      const els = [...document.querySelectorAll("h1, h2, [role=status]")].slice(0, 8);
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
    setMessages((m) => [...m, { role: "you", text: text.trim(), at: new Date().toLocaleTimeString() }]);
    setDraft("");
    try {
      const r = await post<{ reply: string; voice: string; fallback: boolean }>("/api/buddy/chat", {
        game_slug: gameSlug,
        game_title: gameTitle,
        screen_text: screen || text.trim(),
        score,
        voice,
        session_id: sessionId,
      });
      setMessages((m) => [...m, { role: "buddy", text: r.reply, at: new Date().toLocaleTimeString() }]);
      // ACT: voice output in the selected voice.
      try {
        const t = await post<{ fallback: boolean; audio?: string; mime?: string }>("/api/buddy/tts", {
          text: r.reply,
          voice,
          model,
          speed,
          game_slug: gameSlug,
          session_id: sessionId,
        });
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
      setStatus(r.fallback ? "AI is unavailable — Buddy answered locally at no cost." : "Buddy answered and spoke.");
      void refreshSpend(sessionId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Buddy could not answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Gaming Buddy" className="mt-4 rounded-2xl border border-violet-300/30 bg-gradient-to-b from-violet-400/10 to-white/[.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">🎧 Gaming Buddy — universal screen reader + voice</h2>
          <p className="mt-1 text-sm text-slate-300">
            Talks while you play in any of 9 OpenAI voices. Reads the screen, reacts to score changes, and runs on the
            VibeCodeWorker observe→reason→act loop. OpenAI turns meter Vibe Coins with the 25% cut included; local
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
                {v.label} · {v.tone}
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
          <a href={sessionId ? `/my/usage/?session=${sessionId}` : "/my/usage/"} className="mt-1 inline-block text-cyan-300 hover:underline">
            Full breakdown →
          </a>
        </div>
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
