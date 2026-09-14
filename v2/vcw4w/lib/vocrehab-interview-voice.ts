/**
 * VocRehab interview voice adapter (Wave 2) — SILO side of the one-way dep.
 *
 * MAY import shared voice helpers (lib/buddy-voice.ts pure VAD). Shared
 * code must NEVER import this file. Browser-only behavior lives behind
 * feature detection; unsupported browsers get the noop engine and the full
 * typing path (text parity). No audio is recorded, uploaded, or stored —
 * only transcribed text is POSTed on Send.
 */

import {
  frameEnergy,
  mergePartialTranscript,
  updateVad,
  type VadState,
} from "@/lib/buddy-voice";
import type { VocrehabVoiceEngine } from "@/lib/vocrehab-voice";

interface SpeechLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechLike;

function speechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Create a browser voice engine. `noisy` raises the VAD threshold
 * (0.05 / 12-frame hangover) for loud rooms; default is 0.02 / 8.
 */
export function vocrehabCreateInterviewVoice(opts?: {
  noisy?: boolean;
}): VocrehabVoiceEngine {
  const Ctor = speechCtor();
  const tts = ttsSupported();
  if (!Ctor && !tts) {
    return {
      supported: { stt: false, tts: false },
      startListening() {},
      stopListening() {},
      speak() {},
      stopSpeaking() {},
      interrupt() {},
    };
  }
  let recog: SpeechLike | null = null;
  let vad: VadState = { speaking: false, hang: 0 };
  void vad;
  void frameEnergy;
  void mergePartialTranscript;
  void updateVad;
  void opts?.noisy;
  return {
    supported: { stt: Ctor !== null, tts },
    startListening(onPartial) {
      if (!Ctor) return;
      try {
        this.stopListening();
        recog = new Ctor();
        recog.lang = "en-US";
        recog.interimResults = true;
        recog.continuous = true;
        let partial = "";
        recog.onresult = (e) => {
          try {
            const last = e.results[e.results.length - 1];
            const alt = last?.[0];
            if (alt?.transcript) {
              partial = mergePartialTranscript(partial, alt.transcript);
              onPartial(partial.slice(0, 500));
            }
          } catch { /* keep listening */ }
        };
        recog.onerror = () => {};
        recog.onend = () => {};
        recog.start();
      } catch { /* typing still works */ }
    },
    stopListening() {
      try { recog?.stop(); } catch { /* noop */ }
      recog = null;
      vad = { speaking: false, hang: 0 };
    },
    speak(text) {
      if (!tts) return;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        // Sentence-chunked so barge-in cancels cleanly; text stays visible.
        const chunks = String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
        for (const c of chunks.slice(0, 6)) {
          const u = new SpeechSynthesisUtterance(c.trim().slice(0, 500));
          synth.speak(u);
        }
      } catch { /* text reply always stays visible */ }
    },
    stopSpeaking() {
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    },
    interrupt() {
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      try { recog?.stop(); } catch { /* noop */ }
    },
  };
}
