"use client";

/**
 * VocrehabInterviewRoom — live job interview rehearsal room (Wave 2).
 *
 * Text-first, voice-optional: typing + turn-based works fully with zero
 * coins, zero mic, zero key. Mic dictates into the composer (editable text);
 * speech output defaults OFF. Only sent text is POSTed — no audio is ever
 * recorded, uploaded, or stored. 6-turn cap, then a report card + explicit
 * Save (signed-in only, ephemeral by default).
 */

import { useMemo, useRef, useState } from "react";
import {
  vocrehabInterviewJobFor,
  vocrehabInterviewQuestionFor,
  type VocrehabInterviewJobId,
} from "@/lib/vocrehab-interview-jobs";
import {
  vocrehabInterviewAnswer,
  vocrehabInterviewInit,
  vocrehabInterviewTurnCap,
  type VocrehabInterviewDifficulty,
  type VocrehabInterviewSessionMode,
} from "@/lib/vocrehab-interview-machine";
import { vocrehabCreateInterviewVoice } from "@/lib/vocrehab-interview-voice";
import type { VocrehabReportCard } from "@/lib/vocrehab-roleplay";

interface ChatLine {
  role: "coach" | "user";
  text: string;
}

export interface VocrehabInterviewRoomProps {
  jobId: VocrehabInterviewJobId;
  initialDifficulty?: VocrehabInterviewDifficulty;
}

export default function VocrehabInterviewRoom({ jobId, initialDifficulty = "beginner" }: VocrehabInterviewRoomProps) {
  const job = useMemo(() => vocrehabInterviewJobFor(jobId), [jobId]);
  const [difficulty, setDifficulty] = useState<VocrehabInterviewDifficulty>(initialDifficulty);
  const [mode, setMode] = useState<VocrehabInterviewSessionMode>("turn");
  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState(1);
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [report, setReport] = useState<VocrehabReportCard | null>(null);
  const [offline, setOffline] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const voiceRef = useRef<ReturnType<typeof vocrehabCreateInterviewVoice> | null>(null);

  function voice() {
    if (!voiceRef.current) voiceRef.current = vocrehabCreateInterviewVoice();
    return voiceRef.current;
  }

  const done = turn > vocrehabInterviewTurnCap || report !== null;
  const currentQuestion = vocrehabInterviewQuestionFor(job.id, lines.filter((l) => l.role === "user").length);

  function start() {
    setStarted(true);
    setLines([{ role: "coach", text: job.questions[0] }]);
    setTurn(1);
    setReport(null);
    setSavedId(null);
    setNotice(null);
    void vocrehabInterviewInit();
  }

  function toggleMic() {
    const v = voice();
    if (!v.supported.stt) {
      setNotice("Voice typing is not supported in this browser — typing works fully.");
      return;
    }
    if (listening) {
      v.stopListening();
      setListening(false);
    } else {
      v.startListening((partial) => setDraft(partial));
      setListening(true);
    }
  }

  function interrupt() {
    voice().interrupt();
    setNotice("Interrupted — the coach stopped. Edit your answer and send when ready.");
  }

  async function send() {
    const message = draft.trim().slice(0, 2000);
    if (!message || busy || done) return;
    voice().stopListening();
    setListening(false);
    setBusy(true);
    setNotice(null);
    const userTurn = turn;
    setLines((prev) => [...prev, { role: "user", text: message }]);
    setDraft("");
    try {
      const res = await fetch("/api/vocrehab/roleplay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: "job-interview", message, turn: userTurn, jobId: job.id, difficulty, mode }),
      });
      const body = (await res.json().catch(() => null)) as {
        reply?: unknown; offline?: unknown; done?: unknown;
      } | null;
      const reply = typeof body?.reply === "string" ? body.reply : vocrehabInterviewQuestionFor(job.id, userTurn);
      if (body?.offline) setOffline(true);
      const next = vocrehabInterviewAnswer(
        { state: "asking", turn: userTurn, turns: [], done: false },
        currentQuestion,
        message,
      );
      void next;
      setLines((prev) => [...prev, { role: "coach", text: reply }]);
      if (voiceOn) voice().speak(reply);
      if (userTurn >= vocrehabInterviewTurnCap || body?.done) {
        await finish([...lines, { role: "user", text: message }]);
      } else {
        setTurn(userTurn + 1);
      }
    } catch {
      setLines((prev) => [...prev, { role: "coach", text: vocrehabInterviewQuestionFor(job.id, userTurn) }]);
      setOffline(true);
      setTurn(userTurn + 1);
    } finally {
      setBusy(false);
    }
  }

  async function finish(all: ChatLine[]) {
    try {
      const answers = all.filter((l) => l.role === "user").map((l) => l.text).slice(0, 6);
      const res = await fetch("/api/vocrehab/roleplay/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: "job-interview", answers }),
      });
      const body = (await res.json().catch(() => null)) as { reportCard?: VocrehabReportCard } | null;
      if (body?.reportCard) setReport(body.reportCard);
    } catch { /* report stays null; transcript still visible */ }
  }

  async function save() {
    setNotice(null);
    const turns: Array<{ role: "user" | "manager" | "feedback"; text: string }> = lines.map((l) =>
      l.role === "user" ? { role: "user" as const, text: l.text } : { role: "manager" as const, text: l.text },
    );
    try {
      const res = await fetch("/api/vocrehab/roleplay/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: "job-interview", turns, jobId: job.id, difficulty, mode, reportCard: report ?? undefined }),
      });
      const body = (await res.json().catch(() => null)) as { session_id?: unknown; error?: unknown } | null;
      if (!res.ok) {
        setNotice(res.status === 401 ? "Sign in to save your rehearsal — it stays in this tab until then." : "Save did not go through. Your transcript is still above.");
        return;
      }
      setSavedId(typeof body?.session_id === "string" ? body.session_id : "saved");
      setNotice("Saved to your VocRehab record (transcript + report card, never audio).");
    } catch {
      setNotice("Save did not go through. Your transcript is still above.");
    }
  }

  if (!started) {
    return (
      <section aria-label="Start rehearsal" className="space-y-4 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">{job.title} — rehearsal setup</h2>
        <p className="text-sm text-muted-foreground">
          Turn-based + typing is the calmest path and always free. Live voice uses your browser mic;
          only the text you send is ever transmitted. Nothing is saved unless you tap Save.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
          {(["beginner", "advanced", "expert"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`rounded-full border px-3 py-1 text-sm ${difficulty === d ? "bg-stone-900 text-white" : ""}`}>
              {d === "beginner" ? "Beginner · Patient Coach" : d === "advanced" ? "Advanced · Brisk Professional" : "Expert · Stern + Technical"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Session mode">
          {(["turn", "live"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-full border px-3 py-1 text-sm ${mode === m ? "bg-stone-900 text-white" : ""}`}>
              {m === "turn" ? "Turn-based (take your time)" : "Live (realtime + barge-in)"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Feedback targets phrasing choices only — never accent, dialect, speech pattern, disability, or voice.
          Grades are a practice signal, not a hiring decision.
        </p>
        <button type="button" onClick={start} className="rounded-lg bg-stone-900 px-4 py-2 text-white">
          Start rehearsal
        </button>
      </section>
    );
  }

  return (
    <section aria-label={`${job.title} rehearsal room`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-0.5">{job.title}</span>
        <span className="rounded-full border px-2 py-0.5">{difficulty}</span>
        <span className="rounded-full border px-2 py-0.5">{mode === "live" ? "live" : "turn-based"}</span>
        <span className="rounded-full border px-2 py-0.5">turn {Math.min(turn, 6)} / 6</span>
        {offline && <span className="rounded-full border px-2 py-0.5">Practice script — provider offline</span>}
      </div>
      <ol aria-live="polite" className="space-y-3">
        {lines.map((l, i) => (
          <li key={i} className={`rounded-xl border p-3 ${l.role === "user" ? "bg-stone-100" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {l.role === "user" ? "You" : "Coach"}
            </p>
            <p className="mt-1 text-sm">{l.text}</p>
          </li>
        ))}
      </ol>
      {report && (
        <div className="rounded-xl border p-4" aria-label="Report card">
          <h2 className="text-lg font-semibold">Report card — {report.grade} ({report.verdict === "pass" ? "pass" : "retry — no score defines you"})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Overall {report.overall} / 5 · clarity {report.axes.clarity} · example {report.axes.example} ·
            role fit {report.axes.roleFit} · professionalism {report.axes.professionalism} · disclosure {report.axes.disclosure}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={save} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
              Save rehearsal
            </button>
            <button type="button" onClick={start} className="rounded-lg border px-4 py-2 text-sm">
              Rehearse again
            </button>
          </div>
          {savedId && <p className="mt-2 text-xs text-muted-foreground">Saved.</p>}
        </div>
      )}
      {!done && (
        <div className="space-y-2 rounded-xl border p-3">
          <label htmlFor="interview-draft" className="text-sm font-medium">Your answer</label>
          <textarea
            id="interview-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Type or dictate your answer, then send…"
            className="w-full rounded-lg border p-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy || !draft.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? "Coach is replying…" : "Send"}
            </button>
            <button type="button" onClick={toggleMic} className="rounded-lg border px-3 py-2 text-sm" aria-pressed={listening}>
              {listening ? "Stop mic" : "Dictate"}
            </button>
            <button type="button" onClick={interrupt} className="rounded-lg border px-3 py-2 text-sm">
              Interrupt
            </button>
            <button type="button" onClick={() => setVoiceOn((v) => !v)} className="rounded-lg border px-3 py-2 text-sm" aria-pressed={voiceOn}>
              {voiceOn ? "Voice output: on" : "Voice output: off"}
            </button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    </section>
  );
}
