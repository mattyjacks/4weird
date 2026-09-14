/**
 * VocRehab voice interface (Wave 2) — INTERFACE ONLY.
 *
 * Zero interview imports, zero DOM, SSR-safe. The silo adapter
 * (lib/vocrehab-interview-voice.ts) implements this against the shared
 * site voice engine; the room component renders against this type only.
 * Text parity is mandatory: every voice turn must also render as text.
 */

export type VocrehabVoiceMode = "turn" | "live";
export type VocrehabVoiceInput = "type" | "speak";

export interface VocrehabVoiceEngine {
  readonly supported: { stt: boolean; tts: boolean };
  startListening(onPartial: (text: string) => void): void;
  stopListening(): void;
  speak(text: string): void;
  stopSpeaking(): void;
  /** Cancel TTS + stop STT stream; caller snapshots + restarts STT. */
  interrupt(): void;
}

export const vocrehabVoiceNoop: VocrehabVoiceEngine = {
  supported: { stt: false, tts: false },
  startListening() {},
  stopListening() {},
  speak() {},
  stopSpeaking() {},
  interrupt() {},
};
