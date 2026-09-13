"use client";

/**
 * components/studio/video/video-nle-export.tsx — cloud-render export dialog (DS-REMASTER-W3-WEB1).
 *
 * Packages the timeline as versioned RenderExportPayload JSON and POSTs it to
 * POST /api/compute/render-video (compute lane owns that route; see QUEUE).
 * Fail-open: unreachable compute, timeouts, and non-JSON replies all land in a
 * stub status that keeps the timeline downloadable locally — never a throw.
 */

import { useState } from "react";
import { interopBus } from "@/lib/interop";
import {
  RENDER_ENDPOINT,
  RENDER_PROFILE,
  buildRenderPayload,
  type NleTimeline,
} from "./video-nle-types";

interface VideoNleExportProps {
  timeline: NleTimeline;
  open: boolean;
  onClose: () => void;
}

type ExportPhase = "idle" | "working" | "ok" | "stub" | "error";

const EXPORT_TIMEOUT_MS = 15000;

export function VideoNleExport(props: VideoNleExportProps) {
  const { timeline, open, onClose } = props;
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [detail, setDetail] = useState("");

  if (!open) return null;

  const clipCount = timeline.tracks.reduce((n, t) => n + t.clips.length, 0);
  const payload = buildRenderPayload(timeline);
  const payloadJson = JSON.stringify(payload);
  const payloadKb = (new Blob([payloadJson]).size / 1024).toFixed(1);

  async function handleExport(): Promise<void> {
    setPhase("working");
    setDetail("Posting timeline JSON to compute…");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);
    try {
      const res = await fetch(RENDER_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payloadJson,
        signal: controller.signal,
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        setPhase("stub");
        setDetail(
          `Compute answered ${res.status} — render route is not live yet. Timeline stays packaged; retry when the worker lands.`,
        );
        return;
      }
      setPhase("ok");
      const job =
        typeof body === "object" && body !== null && "jobId" in body
          ? String((body as { jobId: unknown }).jobId)
          : "unknown";
      setDetail(`Render job accepted (job ${job}).`);
      try {
        interopBus.emit("media:exported", { path: RENDER_ENDPOINT, type: "video" });
      } catch {
        // Fail-open: bus fan-out is best-effort.
      }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      setPhase("stub");
      setDetail(
        timedOut
          ? "Compute timed out after 15s — fail-open stub. Timeline stays packaged; retry when the worker lands."
          : "Compute unreachable (fal.ai/RunPod offline or route not live) — fail-open stub. Timeline stays packaged; retry when the worker lands.",
      );
    } finally {
      window.clearTimeout(timer);
    }
  }

  function handleDownload(): void {
    try {
      const blob = new Blob([payloadJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mogul-timeline.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fail-open: download is a convenience, not the contract.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export to cloud render"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-600 bg-slate-900 p-5 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-white">Export to cloud render</h2>
        <p className="mt-1 text-sm text-slate-400">
          Packages {clipCount} clips across {timeline.tracks.length} tracks as timeline JSON
          (v1, {payloadKb} KB) and POSTs it to <span className="font-mono">{RENDER_ENDPOINT}</span>{" "}
          for a {RENDER_PROFILE} render.
        </p>

        <div className="mt-4 rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-400">
          <p>target.profile: {RENDER_PROFILE}</p>
          <p>timeline.title: {timeline.title}</p>
          <p>timeline.durationSec: {timeline.durationSec}</p>
          <p>exportedAt: {payload.exportedAt}</p>
        </div>

        {phase !== "idle" ? (
          <p
            className={`mt-3 rounded-lg p-3 text-sm ${
              phase === "ok"
                ? "bg-emerald-900/60 text-emerald-200"
                : phase === "working"
                  ? "bg-slate-800 text-slate-300"
                  : "bg-amber-900/60 text-amber-200"
            }`}
          >
            {detail}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={phase === "working"}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {phase === "working" ? "Exporting…" : "Send to compute"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg px-4 py-2 text-sm text-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
