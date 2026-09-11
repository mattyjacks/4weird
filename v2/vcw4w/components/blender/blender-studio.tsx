"use client";

import { useCallback, useEffect, useState } from "react";
import { ProxyLink } from "@/components/runpod/proxy-link";
import {
  BLENDER_DEMO_FILES_URL,
  BLENDER_MAX_FRAMES,
  BLENDER_MAX_SCENE_BYTES,
  BLENDER_REF_HOURLY_USD,
  blenderCoinsPerMinute,
  quoteBlenderCap,
} from "@/lib/blender-render";

type Job = {
  id: string;
  status: string;
  sceneBytes: number;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  podId: string | null;
  gpu: string | null;
  hourlyUsd: number;
  hasOutput?: boolean;
  error: string | null;
  createdAt: string;
};

type JobDetail = {
  job: Job;
  downloadUrl: string | null;
  podStatus: string | null;
  workerQuiet: boolean;
};

const ACTIVE = new Set(["starting", "rendering"]);

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & { success?: boolean; error?: string };
  if (!body.success) throw new Error(String(body.error || `Request failed (${res.status}).`));
  return body;
}

/**
 * Blender Studio; upload a .blend, render it on a pinned RTX 4090, get an
 * mp4 back. First-timers: grab a free demo scene, no Blender install needed.
 */
export function BlenderStudio() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<JobDetail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("Pick a .blend file to begin; or grab a free demo scene below.");
  const [pendingJob, setPendingJob] = useState<{ jobId: string } | null>(null);
  const [workerLogUrl, setWorkerLogUrl] = useState("");
  const [startFrame, setStartFrame] = useState("1");
  const [endFrame, setEndFrame] = useState("60");

  const refreshJobs = useCallback(async () => {
    try {
      const body = await api("/api/blender/jobs");
      setJobs((body.jobs as Job[]) ?? []);
    } catch {
      /* logged-out or unconfigured: the panel explains itself */
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const refreshSelected = useCallback(
    async (id: string) => {
      try {
        const body = await api(`/api/blender/jobs/${id}`);
        setSelected(body as unknown as JobDetail);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unable to load job.");
      }
    },
    [],
  );

  useEffect(() => {
    const id = selected?.job.id;
    if (!id || !ACTIVE.has(selected.job.status)) return;
    const t = setInterval(() => void refreshSelected(id), 5000);
    return () => clearInterval(t);
  }, [selected?.job.id, selected?.job.status, refreshSelected]);

  useEffect(() => {
    if (!jobs.some((j) => ACTIVE.has(j.status))) return;
    const t = setInterval(() => void refreshJobs(), 15000);
    return () => clearInterval(t);
  }, [jobs, refreshJobs]);

  async function upload() {
    if (!file) return;
    setBusy("upload");
    setMessage("Reserving render job…");
    try {
      if (!file.name.toLowerCase().endsWith(".blend")) throw new Error("Pick a .blend scene file.");
      if (file.size > BLENDER_MAX_SCENE_BYTES) {
        throw new Error(`Scene is ${(file.size / 1_048_576).toFixed(1)} MB - ${BLENDER_MAX_SCENE_BYTES / 1_048_576} MB max.`);
      }
      const created = await api("/api/blender/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, bytes: file.size }),
      });
      const jobId = String(created.jobId);
      const uploadUrl = String(created.uploadUrl);
      setMessage(`Uploading ${(file.size / 1_048_576).toFixed(1)} MB straight to storage…`);
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status}). Retry.`);
      setMessage("Confirming upload…");
      await api(`/api/blender/jobs/${jobId}/ready`, { method: "POST" });
      setPendingJob({ jobId });
      setMessage("Scene ready. Set your frame range and start the render.");
      await refreshJobs();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function start() {
    if (!pendingJob) return;
    setBusy("start");
    setMessage("Provisioning the RTX 4090 worker…");
    try {
      const body = await api(`/api/blender/jobs/${pendingJob.jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startFrame: Number(startFrame), endFrame: Number(endFrame) }),
      });
      setPendingJob(null);
      setWorkerLogUrl(String(body.workerLog ?? ""));
      setMessage(
        body.started
          ? `Worker live on ${String((body.connection as { gpu?: string })?.gpu ?? "RTX 4090")}; render started. It exits itself when done.`
          : `Not started: ${String((body.provision as { message?: string })?.message ?? body.note ?? "provisioning deferred")}`,
      );
      await refreshJobs();
      await refreshSelected(pendingJob.jobId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Start failed.");
    } finally {
      setBusy("");
    }
  }

  async function stop(id: string) {
    setBusy(`stop:${id}`);
    try {
      await api(`/api/blender/jobs/${id}/stop`, { method: "POST" });
      setMessage("Worker stopped - GPU billing ended.");
      await refreshJobs();
      await refreshSelected(id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Stop failed.");
    } finally {
      setBusy("");
    }
  }

  const rate = blenderCoinsPerMinute(BLENDER_REF_HOURLY_USD);
  const cap = quoteBlenderCap(BLENDER_REF_HOURLY_USD);

  return (
    <div className="space-y-6">
      <section aria-label="Render cost" className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-300">
        <p className="font-bold text-white">
          Pinned RTX 4090 · ~{rate} coins/min (~${(rate * 0.6).toFixed(2)}/hr gross, 25% cut included)
        </p>
        <p className="mt-1 text-slate-400">
          RunPod bills the card per second from the first second (50-min wall cap ≈ ${((BLENDER_REF_HOURLY_USD / 60) * 50).toFixed(2)} ≈ {cap.gross} coins max).
          The worker exits itself when your mp4 is uploaded, ending billing with no clicks. First ~5 minutes install Blender, then it renders.
        </p>
      </section>

      <section aria-label="New render" className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.05] p-5">
        <p className="font-black text-cyan-200">🎬 New render</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="file"
            accept=".blend"
            aria-label="Blender scene file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="button"
            disabled={!file || busy === "upload"}
            onClick={() => void upload()}
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy === "upload" ? "Uploading…" : "Upload scene"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          .blend up to {BLENDER_MAX_SCENE_BYTES / 1_048_576} MB · uploads go straight to storage ·{" "}
          <a href={BLENDER_DEMO_FILES_URL} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
            free Blender demo scenes →
          </a>
        </p>

        {pendingJob && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-bold text-white">Frame range <span className="font-normal text-slate-400">(max {BLENDER_MAX_FRAMES} frames per render)</span></p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-300">
                Start
                <input value={startFrame} onChange={(e) => setStartFrame(e.target.value)} inputMode="numeric" className="ml-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white" />
              </label>
              <label className="text-xs text-slate-300">
                End
                <input value={endFrame} onChange={(e) => setEndFrame(e.target.value)} inputMode="numeric" className="ml-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white" />
              </label>
              <button
                type="button"
                disabled={busy === "start"}
                onClick={() => void start()}
                className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-200 disabled:opacity-50"
              >
                {busy === "start" ? "Provisioning…" : "Render on RTX 4090"}
              </button>
            </div>
          </div>
        )}
        <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>
        {workerLogUrl && (
          <p className="mt-2 text-xs">
            <ProxyLink href={workerLogUrl} label="Open worker log" />
          </p>
        )}
      </section>

      <section aria-label="Your renders">
        <p className="font-black text-white">Your renders</p>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No renders yet; your jobs will appear here with live status.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => void refreshSelected(j.id)} className="font-mono text-xs text-cyan-300 hover:underline">
                    {j.id.slice(0, 8)}
                  </button>
                  <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs font-bold text-slate-200">{j.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {(j.sceneBytes / 1_048_576).toFixed(1)} MB · frames {j.startFrame}-{j.endFrame} ({j.frameCount}) · {j.gpu ?? "no GPU yet"}
                  {j.hourlyUsd > 0 ? ` · $${j.hourlyUsd.toFixed(2)}/hr` : ""}
                </p>
                {j.error && <p className="mt-1 text-xs text-red-300">{j.error}</p>}
                {selected?.job.id === j.id && selected.downloadUrl && (
                  <p className="mt-2">
                    <a href={selected.downloadUrl} className="font-bold text-emerald-300 hover:underline">
                      ⬇ Download render.mp4 (1-hour link)
                    </a>
                  </p>
                )}
                {selected?.job.id === j.id && selected.workerQuiet && (
                  <p className="mt-1 text-xs text-amber-200">Worker is up but quiet; still installing Blender (first ~5 min), or starting up. It will report in.</p>
                )}
                {ACTIVE.has(j.status) && (
                  <button
                    type="button"
                    disabled={busy === `stop:${j.id}`}
                    onClick={() => void stop(j.id)}
                    className="mt-2 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy === `stop:${j.id}` ? "Stopping…" : "Stop worker (ends billing)"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
