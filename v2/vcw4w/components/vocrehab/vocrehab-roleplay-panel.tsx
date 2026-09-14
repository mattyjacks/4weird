"use client";

/**
 * VocrehabRoleplayPanel — usage doc
 *
 * Purpose: text-first interview rehearsal chat for one scenario
 * ("prep" | "pivot" | "disclosure"). Renders a chat list, a composer (always
 * present), and coach feedback shaped as praise (quotes you), one tweak, and
 * an invitation to retry.
 *
 * Props:
 * - scenario: which coach script to run (required)
 * - questionStarter?: pre-fills the composer on first render (optional)
 *
 * Voice (no audio recording, upload, or storage — ever):
 * - Mic toggle uses the browser Web Speech API (SpeechRecognition) with
 *   feature detection; when unsupported the button is disabled and the text
 *   box remains the full experience (text parity). Dictated words land in the
 *   composer as editable text; only the sent message is POSTed.
 * - Speech-output toggle uses window.speechSynthesis and defaults OFF.
 *
 * Session rules: the turn counter caps at 6 user turns, then a wrap-up with a
 * retry (start-over) offer appears. The save-rehearsal toggle defaults to
 * ephemeral (tab-only); when ON, the finished transcript is POSTed once to
 * /api/vocrehab/documents (signed-in users only). A “Practice script” badge
 * appears whenever the provider is offline and the built-in script answered.
 *
 * API: POSTs { session_id?, scenario, message, turn } to
 * /api/vocrehab/roleplay and renders { reply, feedback, done }.
 */

import { useEffect, useRef, useState } from "react";
import {
  vocrehabRoleplayMaxMessageChars,
  vocrehabRoleplayScenarioFor,
  vocrehabRoleplayTurnCap,
  type VocrehabRoleplayScenarioId,
} from "@/lib/vocrehab-roleplay";
import { vocrehabEmit } from "@/lib/vocrehab-interop";
import type { VocrehabDocumentKind } from "@/types/vocrehab-documents";

export type VocrehabRoleplayScenario = VocrehabRoleplayScenarioId;

export interface VocrehabRoleplayPanelProps {
  scenario?: VocrehabRoleplayScenario;
  questionStarter?: string;
  /** Legacy alias for scenario (kept for cross-lane callers); scenario wins. */
  initialScenario?: VocrehabRoleplayScenario;
  /** Reserved for cross-lane callers; the suite renders one panel per scenario. */
  showPicker?: boolean;
}

interface ChatMessage {
  role: "user" | "coach";
  text: string;
}

interface RoleplayFeedback {
  praise: string;
  tweak: string;
  invitation: string;
}

interface RoleplayApiBody {
  success?: boolean;
  reply?: unknown;
  feedback?: unknown;
  done?: unknown;
  offline?: unknown;
  fallback?: unknown;
  session_id?: unknown;
  error?: unknown;
}

// Minimal Web Speech API shapes (feature-detected at runtime).
interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  [index: number]: SpeechAlternativeLike;
  length: number;
}
interface SpeechResultsLike {
  [index: number]: SpeechResultLike;
  length: number;
}
interface SpeechRecognitionEventLike {
  results: SpeechResultsLike;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const SAVE_KIND: Record<VocrehabRoleplayScenario, VocrehabDocumentKind> = {
  prep: "prep",
  pivot: "pivot",
  disclosure: "script",
  "job-interview": "script",
};

function speechConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isFeedback(value: unknown): value is RoleplayFeedback {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.praise === "string" && typeof o.tweak === "string" && typeof o.invitation === "string"
  );
}

export function VocrehabRoleplayPanel({
  scenario,
  questionStarter,
  initialScenario,
}: VocrehabRoleplayPanelProps) {
  const resolvedScenario = scenario ?? initialScenario ?? "prep";
  const catalog = vocrehabRoleplayScenarioFor(resolvedScenario);
  const [turns, setTurns] = useState<ChatMessage[]>([{ role: "coach", text: catalog.opener }]);
  const [draft, setDraft] = useState(questionStarter ?? "");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<RoleplayFeedback | null>(null);
  const [fallbackSeen, setFallbackSeen] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakOut, setSpeakOut] = useState(false);
  const [saveRehearsal, setSaveRehearsal] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // Mount-once progressive enhancement: no cascade (empty deps, runs once).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSupported(speechConstructor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        // recognizer already stopped; nothing to do
      }
    };
  }, []);

  useEffect(() => {
    if (done) {
      vocrehabEmit("vocrehab:course:module-done", {
        module: `interview-${resolvedScenario}`,
      });
    }
  }, [done, resolvedScenario]);

  const turnCount = turns.filter((t) => t.role === "user").length;
  const capped = done || turnCount >= vocrehabRoleplayTurnCap;

  function stopListening() {
    const recog = recogRef.current;
    recogRef.current = null;
    if (!recog) return;
    try {
      recog.stop();
    } catch {
      // Mic was already idle; nothing to do.
    }
    setListening(false);
  }

  function toggleMic() {
    const Ctor = speechConstructor();
    if (!Ctor) return;
    if (listening) {
      stopListening();
      return;
    }
    try {
      const recog = new Ctor();
      recogRef.current = recog;
      recog.lang = "en-US";
      recog.interimResults = false;
      recog.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const first = event.results[i]?.[0];
          if (first && typeof first.transcript === "string" && first.transcript.trim()) {
            text += `${first.transcript.trim()} `;
          }
        }
        const cleaned = text.trim();
        if (cleaned) {
          setDraft((prev) =>
            (prev ? `${prev} ${cleaned}` : cleaned).slice(0, vocrehabRoleplayMaxMessageChars),
          );
        }
      };
      recog.onerror = () => {
        setListening(false);
      };
      recog.onend = () => {
        setListening(false);
        if (recogRef.current === recog) recogRef.current = null;
      };
      recog.start();
      setListening(true);
      setError(null);
    } catch {
      recogRef.current = null;
      setListening(false);
      setError("Voice input is not available right now. Typing works the same.");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(0, 500)));
    } catch {
      // Speech output is decorative; the text reply always stays visible.
    }
  }

  function toggleSpeak(checked: boolean) {
    setSpeakOut(checked);
    if (!checked && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  async function persistTranscript(full: ChatMessage[]) {
    try {
      const transcript = full
        .map((t) => ({ role: t.role, text: t.text }))
        .slice(-(vocrehabRoleplayTurnCap * 2 + 1));
      const res = await fetch("/api/vocrehab/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: SAVE_KIND[resolvedScenario],
          title: `${resolvedScenario} rehearsal transcript`,
          body: { scenario: resolvedScenario, turns: full.length, transcript },
        }).slice(0, 20000),
      });
      const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (!res.ok || !body || body.success !== true) {
        throw new Error("not saved");
      }
      setSaveNote("Saved to your documents.");
    } catch {
      setSaveNote("Couldn’t save (sign-in required). Your rehearsal stays in this tab only.");
    }
  }

  async function send() {
    const message = draft.trim();
    if (!message || busy || capped) return;
    if (message.length > vocrehabRoleplayMaxMessageChars) {
      setError(`Keep messages under ${vocrehabRoleplayMaxMessageChars} characters.`);
      return;
    }
    stopListening();
    setBusy(true);
    setError(null);
    const userTurn = turnCount + 1;
    const base: ChatMessage[] = [...turns, { role: "user", text: message }];
    setTurns(base);
    setDraft("");
    try {
      const res = await fetch("/api/vocrehab/roleplay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, scenario: resolvedScenario, message, turn: userTurn }),
      });
      const body = (await res.json().catch(() => null)) as RoleplayApiBody | null;
      if (!res.ok || !body || body.success !== true || typeof body.reply !== "string") {
        const detail =
          body && typeof body.error === "string" && body.error
            ? body.error
            : "Practice partner is unavailable right now.";
        throw new Error(detail);
      }
      const coachLine = body.reply;
      const full: ChatMessage[] = [...base, { role: "coach", text: coachLine }];
      setTurns(full);
      setLastFeedback(isFeedback(body.feedback) ? body.feedback : null);
      if (body.offline === true || body.fallback === true) setFallbackSeen(true);
      if (typeof body.session_id === "string" && body.session_id) {
        setSessionId(body.session_id);
      }
      const finished = body.done === true || userTurn >= vocrehabRoleplayTurnCap;
      if (finished) {
        setDone(true);
        if (saveRehearsal) void persistTranscript(full);
      }
      if (speakOut) speak(coachLine);
    } catch (err) {
      setFallbackSeen(true);
      setError(err instanceof Error ? err.message : "Practice partner is unavailable right now.");
      setDraft(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    stopListening();
    setTurns([{ role: "coach", text: catalog.opener }]);
    setDraft("");
    setSessionId(null);
    setDone(false);
    setLastFeedback(null);
    setFallbackSeen(false);
    setError(null);
    setSaveNote(null);
  }

  return (
    <section aria-labelledby="vocrehab-roleplay-heading" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="vocrehab-roleplay-heading" className="text-xl font-bold">
          {catalog.title} rehearsal
        </h2>
        {fallbackSeen ? (
          <span
            role="status"
            className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200"
          >
            Practice script — provider offline
          </span>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Turn {Math.min(turnCount, vocrehabRoleplayTurnCap)} of {vocrehabRoleplayTurnCap} ·{" "}
        {saveRehearsal
          ? "Saving ON: the finished transcript is stored to your documents."
          : "Ephemeral by default: turns stay in this tab and are never recorded, uploaded, or stored."}
      </p>

      <ol aria-live="polite" className="space-y-3">
        {turns.map((t, i) => (
          <li
            key={`${t.role}-${i}`}
            className={
              t.role === "user"
                ? "ml-auto max-w-[85%] rounded-xl bg-cyan-300/15 p-3 text-sm"
                : "mr-auto max-w-[85%] rounded-xl border border-white/15 p-3 text-sm"
            }
          >
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-70">
              {t.role === "user" ? "You" : "Coach"}
            </span>
            {t.text}
          </li>
        ))}
        {busy ? (
          <li className="mr-auto max-w-[85%] rounded-xl border border-white/15 p-3 text-sm italic opacity-70">
            Coach is thinking…
          </li>
        ) : null}
      </ol>

      {lastFeedback ? (
        <article aria-label="Coach feedback" className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
          <p>
            <strong>Praise: </strong>
            {lastFeedback.praise}
          </p>
          <p>
            <strong>One tweak: </strong>
            {lastFeedback.tweak}
          </p>
          <p>
            <strong>Next: </strong>
            {lastFeedback.invitation}
          </p>
        </article>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-amber-300">
          {error} Your words are still above — edit and retry.
        </p>
      ) : null}

      {capped ? (
        <div className="space-y-2 rounded-xl border border-white/15 p-4 text-sm">
          <p>
            <strong>That’s {vocrehabRoleplayTurnCap} turns — solid reps.</strong> Take the tweak
            above into your next real conversation.
          </p>
          {saveNote ? <p className="text-muted-foreground">{saveNote}</p> : null}
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950"
          >
            Start over with a fresh round
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="vocrehab-roleplay-composer" className="sr-only">
            Your practice answer
          </label>
          <textarea
            id="vocrehab-roleplay-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={vocrehabRoleplayMaxMessageChars}
            placeholder="Type your answer here — the mic is optional."
            className="w-full rounded-xl border border-white/15 bg-transparent p-3 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {draft.length}/{vocrehabRoleplayMaxMessageChars} characters
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={toggleMic}
              disabled={!micSupported}
              aria-pressed={listening}
              title={
                micSupported
                  ? "Dictate with your browser’s speech recognition (nothing is recorded)"
                  : "Voice input isn’t supported in this browser — typing works fully"
              }
              className="rounded-full border border-white/20 px-4 py-2 text-sm"
            >
              {listening ? "Stop mic" : "Mic (optional)"}
            </button>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={speakOut}
                onChange={(e) => toggleSpeak(e.target.checked)}
              />
              Read replies aloud
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={saveRehearsal}
                onChange={(e) => setSaveRehearsal(e.target.checked)}
              />
              Save rehearsal
            </label>
          </div>
          {!micSupported ? (
            <p className="text-xs text-muted-foreground">
              Voice input isn’t supported in this browser — typing works fully.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

export default VocrehabRoleplayPanel;
