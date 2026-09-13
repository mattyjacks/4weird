"use client";

import { AudioLab } from "@/components/studio/audio-lab";

/**
 * Colocated client entry for /studio/audio: renders the on-device AliveSpeech
 * mastering bench (upload, real duration/peak/RMS analysis, gain and
 * normalize-to-peak, A/B playback, WAV export). Kept as the page's client
 * boundary so the route shell stays a server component.
 */
export function AudioClient() {
  return <AudioLab />;
}
