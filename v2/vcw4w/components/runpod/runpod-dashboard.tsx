"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { PodIdleWatch } from "@/components/runpod/pod-idle-watch";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

type PodAction = "stop" | "start" | "restart" | "terminate" | "delete";

const ACTIONS: { value: PodAction; label: string; danger?: boolean }[] = [
  { value: "stop", label: "Stop" },
  { value: "start", label: "Start" },
  { value: "restart", label: "Restart" },
  { value: "terminate", label: "Terminate", danger: true },
  { value: "delete", label: "Delete", danger: true },
];

type Desktop = {
  id: string;
  podId: string | null;
  kind: string;
  interface: string;
  endpointUrl: string | null;
  gpu: string | null;
  cpu: string | null;
  image: string | null;
  hourlyUsd: number;
  status: string;
  podStatus: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  policy: { warnMinutes: number | null; stopGraceMinutes: number | null; terminateHours: number | null } | null;
};

type Booking = {
  id: string;
  status: string;
  pod_id?: string | null;
  endpoint_url?: string | null;
  gpu_type?: string | null;
  started_at: string;
  agent_listings: { name: string } | null;
};

type RenderJob = {
  id: string;
  status: string;
  podId: string | null;
  gpu: string | null;
  hourlyUsd: number;
  frameCount: number;
};

type AutoplayRemote = {
  id: string;
  podId: string | null;
  gameSlug: string;
  compute: string;
  siteMode: string;
  endpointUrl: string | null;
  gpu: string | null;
  cpu: string | null;
  image: string | null;
  hourlyUsd: number;
  status: string;
  podStatus: string | null;
  createdAt: string;
  lastActivityAt: string | null;
};

type DashTab = "pods" | "serverless" | "templates" | "volumes" | "cost";

type RunpodStatus = {
  configured?: boolean;
  live?: boolean;
  base?: string;
  hint?: string;
};

type RpEndpoint = {
  id: string;
  name?: string | null;
  image?: string | null;
  gpuIds?: string | null;
  workersMin?: number | null;
  workersMax?: number | null;
  status?: string | null;
};

type GpuType = {
  id: string;
  displayName?: string | null;
  memoryGb?: number | null;
  securePriceHr?: number | null;
  availability?: string | null;
};

type RpTemplate = {
  id?: string;
  name: string;
  image: string;
  description?: string | null;
  serverless?: boolean | null;
};

type RpVolume = {
  id: string;
  name?: string | null;
  size?: number | null;
  dataCenter?: string | null;
  type?: string | null;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & Record<string, unknown>;
  if (!body.success) throw new Error(String(body.error || `Request failed (${res.status}).`));
  return body;
}

/** Graceful fetch for /api/agents/runpod-* routes: never throws; reports
 *  configured/live/unconfigured states so the UI degrades to a hint. */
async function fetchRunpodRoute(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  try {
    const res = await fetch(path, { credentials: "include", ...init });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, body };
    if (body && typeof body === "object" && "success" in body && body.success === false) {
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e instanceof Error ? e.message : "Network error." } };
  }
}

function runpodUnconfiguredMessage(status: number, body: Record<string, unknown>): string {
  const err = String((body as { error?: unknown }).error ?? "");
  if (status === 404) return "This /api/agents/runpod-* route is not deployed on this server yet.";
  if (status === 503 || /not set|not configured|unconfigured/i.test(err)) {
    return "RUNPOD_API_KEY is not set on the server. Set it (RunPod console → Settings → API Keys) to enable live data.";
  }
  if (status === 401 || /authentication required|login/i.test(err)) return "Login required to read RunPod data.";
  if (status === 429) return "Rate limited. Wait a minute and retry.";
  return err || `RunPod lookup failed (HTTP ${status || "network"}).`;
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "unknown";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PodButtons({
  onAct,
  busy,
  compact,
}: {
  onAct: (action: PodAction) => void;
  busy: string;
  compact: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {ACTIONS.map((a) => (
        <button
          key={a.value}
          type="button"
          disabled={busy !== ""}
          onClick={() => {
            if ((a.value === "terminate" || a.value === "delete") && typeof window !== "undefined") {
              const ok = window.confirm(
                `${a.value === "delete" ? "Delete" : "Terminate"} this pod? Billing ends permanently and the disk is lost. This cannot be undone.`,
              );
              if (!ok) return;
            }
            onAct(a.value);
          }}
          className={`rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-50 ${
            a.danger
              ? "border border-red-500/60 text-red-300 hover:bg-red-950"
              : "border border-white/20 text-slate-900 dark:text-white hover:bg-white/10"
          }`}
          aria-label={`${a.label} pod ${compact}`}
        >
          {busy === a.value ? `${a.label}…` : a.label}
        </button>
      ))}
      <InfoTip side="bottom" text="Stop pauses billing and keeps the disk so you can restart. Terminate or Delete ends billing permanently and the disk is lost." label="About Stop versus Terminate" />
    </div>
  );
}

function UnconfiguredNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-300/[.07] p-4 text-sm text-slate-700 dark:text-slate-200">
      <p className="font-bold text-slate-900 dark:text-white">RunPod API unconfigured or route unavailable</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{message}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Set <code className="font-mono">RUNPOD_API_KEY</code> (RunPod console → Settings → API Keys) as a server
        environment variable for live data. RunPod bills your card directly — never coins, no Vibe cut.
      </p>
    </div>
  );
}

/**
 * One-line pod state badge: Live only when RunPod reports RUNNING.
 * Starting shows an inline spinner; Paused means compute billing stopped
 * (Stop — disk kept, Start resumes); Terminated/Delete are permanent.
 */
function PodStatusBadge({ dbStatus, podStatus }: { dbStatus: string; podStatus: string | null }) {
  const pod = String(podStatus ?? "").toUpperCase();
  const db = String(dbStatus ?? "").toLowerCase();
  if (pod.includes("RUNNING")) {
    return (
      <span role="status" title="Pod is running — the desktop/stream link should load." className="inline-flex items-center rounded-full bg-emerald-900 px-2 py-0.5 text-xs font-bold text-emerald-200">
        🟢 Live
      </span>
    );
  }
  if (/TERMINAT/.test(pod) || db === "terminated" || db === "deleted") {
    return (
      <span role="status" title="Pod terminated or deleted — billing ended permanently, disk lost." className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300">
        ⚫ {db === "deleted" ? "Deleted" : "Terminated"}
      </span>
    );
  }
  if (/ERROR|FAILED/.test(pod)) {
    return (
      <span role="alert" title="Pod reported an error — try Restart, then Terminate and re-rent if it persists." className="inline-flex items-center rounded-full bg-red-900 px-2 py-0.5 text-xs font-bold text-red-200">
        🔴 Error
      </span>
    );
  }
  if (/EXITED|STOPPED|PAUSED|SUSPENDED/.test(pod) || db === "stopped") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-200" title="Compute billing stopped; disk kept. Press Start to resume.">
        ⏸ Paused — billing stopped
      </span>
    );
  }
  if (/PROVISION|STARTING|PENDING|CREAT|INITIALIZ|RESTARTING/.test(pod)) {
    return (
      <span role="status" title="Pod is still starting — the link may 404 until it reports Live." className="inline-flex items-center rounded-full bg-amber-900 px-2 py-0.5 text-xs font-bold text-amber-200">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden="true" />
        Starting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300" title={podStatus ? `RunPod reports: ${podStatus}` : "RunPod status check unavailable right now"}>
      {podStatus ? `❔ ${podStatus}` : `❔ ${dbStatus || "unknown"}`}
    </span>
  );
}

const TERMINAL_JOB = new Set(["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"]);

/** Live only when RunPod itself reports RUNNING — the proxy link 404s until then. */
function isLivePod(podStatus: string | null): boolean {
  return String(podStatus ?? "").toUpperCase().includes("RUNNING");
}

/** Non-terminal dashboard rows keep the 30s auto-refresh alive. */
function isRowActive(status: string, podStatus: string | null): boolean {
  const db = String(status ?? "").toLowerCase();
  if (db === "terminated" || db === "deleted") return false;
  if (/TERMINAT|DELETED/.test(String(podStatus ?? "").toUpperCase())) return false;
  return true;
}

function ServerlessPanel() {
  const [status, setStatus] = useState<RunpodStatus | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [endpoints, setEndpoints] = useState<RpEndpoint[] | null>(null);
  const [epMsg, setEpMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [endpointId, setEndpointId] = useState("");
  const [inputJson, setInputJson] = useState('{"prompt": "hello"}');
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [jobOutput, setJobOutput] = useState("");
  const [jobMsg, setJobMsg] = useState("");
  const [running, setRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const load = useCallback(async () => {
    setLoading(true);
    setStatusMsg("");
    setEpMsg("");
    const st = await fetchRunpodRoute("/api/agents/runpod-status");
    if (st.ok) {
      setStatus({
        configured: Boolean((st.body as { configured?: unknown }).configured),
        live: Boolean((st.body as { live?: unknown }).live),
        base: String((st.body as { base?: unknown }).base ?? ""),
        hint: String((st.body as { hint?: unknown }).hint ?? ""),
      });
      if (!(st.body as { configured?: unknown }).configured) {
        setStatusMsg(String((st.body as { hint?: unknown }).hint ?? "RUNPOD_API_KEY is not set on the server."));
      } else if (!(st.body as { live?: unknown }).live) {
        setStatusMsg("Key is set but the live probe failed. Check the key and retry shortly.");
      }
    } else {
      setStatus(null);
      setStatusMsg(runpodUnconfiguredMessage(st.status, st.body));
    }
    const ep = await fetchRunpodRoute("/api/agents/runpod-endpoints");
    if (ep.ok) {
      const list = (ep.body as { endpoints?: unknown }).endpoints;
      setEndpoints(Array.isArray(list) ? (list as RpEndpoint[]) : []);
    } else {
      setEndpoints(null);
      setEpMsg(runpodUnconfiguredMessage(ep.status, ep.body));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function pollJob(eid: string, jid: string) {
    const r = await fetchRunpodRoute(`/api/agents/runpod-jobs/${encodeURIComponent(jid)}?endpointId=${encodeURIComponent(eid)}`);
    if (!r.ok) {
      // Fallback: some servers expose status under runpod-run.
      const alt = await fetchRunpodRoute(`/api/agents/runpod-run?jobId=${encodeURIComponent(jid)}&endpointId=${encodeURIComponent(eid)}`);
      if (!alt.ok) {
        setJobMsg(runpodUnconfiguredMessage(alt.status, alt.body));
        return;
      }
      applyJobBody(alt.body);
      return;
    }
    applyJobBody(r.body);
  }

  function applyJobBody(body: Record<string, unknown>) {
    const s = String((body as { status?: unknown }).status ?? (body as { jobStatus?: unknown }).jobStatus ?? "");
    if (s) setJobStatus(s.toUpperCase());
    const out = (body as { output?: unknown }).output ?? (body as { result?: unknown }).result ?? (body as { data?: unknown }).data;
    if (out !== undefined) {
      try {
        setJobOutput(typeof out === "string" ? out.slice(0, 4000) : JSON.stringify(out).slice(0, 4000));
      } catch {
        setJobOutput(String(out).slice(0, 4000));
      }
    }
    if (s && TERMINAL_JOB.has(s.toUpperCase())) {
      stopPolling();
      setRunning(false);
      setJobMsg(s.toUpperCase() === "COMPLETED" ? "Job completed." : `Job ended: ${s.toUpperCase()}.`);
    }
  }

  async function runJob() {
    const eid = endpointId.trim();
    if (!eid) {
      setJobMsg("Enter an endpoint ID first.");
      return;
    }
    let parsed: unknown = {};
    try {
      parsed = inputJson.trim() ? (JSON.parse(inputJson) as unknown) : {};
    } catch {
      setJobMsg("Input must be valid JSON.");
      return;
    }
    setRunning(true);
    setJobMsg("");
    setJobStatus("IN_QUEUE");
    setJobOutput("");
    stopPolling();
    // Primary: POST /api/agents/runpod-jobs { endpointId, input }.
    let r = await fetchRunpodRoute("/api/agents/runpod-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpointId: eid, input: parsed }),
    });
    if (!r.ok && r.status === 404) {
      // Fallback: POST /api/agents/runpod-run (alternate route name).
      r = await fetchRunpodRoute("/api/agents/runpod-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId: eid, input: parsed }),
      });
    }
    if (!r.ok) {
      setRunning(false);
      setJobStatus("");
      setJobMsg(runpodUnconfiguredMessage(r.status, r.body));
      return;
    }
    const jid = String((r.body as { jobId?: unknown }).jobId ?? (r.body as { id?: unknown }).id ?? "");
    if (!jid) {
      setRunning(false);
      setJobMsg("Server accepted the job but returned no job ID.");
      return;
    }
    setJobId(jid);
    setJobMsg(`Job ${jid.slice(0, 12)} submitted. Polling status…`);
    pollRef.current = setInterval(() => {
      void pollJob(eid, jid);
    }, 3000);
    void pollJob(eid, jid);
  }

  return (
    <section aria-label="Serverless endpoints" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">⚡ Serverless endpoints</h3>
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.configured && status.live ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"}`}>
            {status.configured && status.live ? "RunPod live" : status.configured ? "key set · probe failed" : "unconfigured"}
          </span>
        )}
        <InfoTip side="bottom" text="Serverless = scale-to-zero workers you call per job. Billed per execution by RunPod; no pod to stop." label="About serverless" />
      </div>
      {statusMsg && <UnconfiguredNote message={statusMsg} />}
      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading endpoints…</p>
      ) : endpoints ? (
        endpoints.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No serverless endpoints on this key yet. Create one in the RunPod console.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {endpoints.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="font-bold text-slate-900 dark:text-white">{e.name || e.id.slice(0, 12)}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">id: {e.id}</p>
                {e.image && <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">image: {e.image}</p>}
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">
                  {[e.gpuIds ? `gpus: ${e.gpuIds}` : "", e.workersMin != null || e.workersMax != null ? `workers ${e.workersMin ?? 0}–${e.workersMax ?? "…"}` : "", e.status ? e.status : ""].filter(Boolean).join(" · ") || "serverless worker"}
                </p>
                <button
                  type="button"
                  onClick={() => setEndpointId(e.id)}
                  className="mt-2 rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10"
                >
                  Use in run form
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <UnconfiguredNote message={epMsg || "Endpoint list unavailable."} />
      )}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h4 className="font-bold text-slate-900 dark:text-white">Run a job</h4>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Submits to <code className="font-mono">POST /api/agents/runpod-jobs</code> (falls back to{" "}
          <code className="font-mono">/api/agents/runpod-run</code>), then polls job status every 3s until terminal.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Endpoint ID
            <input
              value={endpointId}
              onChange={(e) => setEndpointId(e.target.value)}
              placeholder="e.g. abc123…"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-white"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Input (JSON)
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-white"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => void runJob()}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {running ? "Running…" : "Run job"}
          </button>
          {jobId && <span className="font-mono text-[11px] text-slate-600 dark:text-slate-500">job {jobId.slice(0, 18)}</span>}
          {jobStatus && (
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">status: {jobStatus}</span>
          )}
          <button type="button" onClick={() => void load()} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-white hover:bg-white/10">
            Refresh
          </button>
        </div>
        {jobMsg && <p className="mt-2 text-xs text-amber-300">{jobMsg}</p>}
        {jobOutput && (
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 p-3 font-mono text-[11px] text-emerald-200">{jobOutput}</pre>
        )}
      </div>
    </section>
  );
}

const REFERENCE_GPUS: GpuType[] = [
  { id: "NVIDIA GeForce RTX 4090", displayName: "RTX 4090 · 24GB", securePriceHr: 0.69, availability: "reference" },
  { id: "NVIDIA GeForce RTX 5090", displayName: "RTX 5090 · 32GB", securePriceHr: 0.92, availability: "reference" },
  { id: "NVIDIA RTX A6000", displayName: "RTX A6000 · 48GB", securePriceHr: 0.79, availability: "reference" },
  { id: "NVIDIA A100 80GB PCIe", displayName: "A100 80GB · 80GB", securePriceHr: 1.64, availability: "reference" },
  { id: "NVIDIA H100 NVL", displayName: "H100 NVL · 94GB", securePriceHr: 2.69, availability: "reference" },
];

const REFERENCE_TEMPLATES: RpTemplate[] = [
  { name: "runpod-torch-v240", image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04", description: "PyTorch + CUDA dev base for agents and training.", serverless: false },
  { name: "runpod-ubuntu-2204", image: "runpod/base:1.0.2-ubuntu2204", description: "Plain Ubuntu 22.04 base for custom workers.", serverless: false },
  { name: "runpod-desktop-kasm", image: "runpod/desktop-gpu", description: "Kasm graphical desktop (stream on 6901).", serverless: false },
  { name: "serverless-worker", image: "runpod/worker-comfyui", description: "Scale-to-zero example: ComfyUI worker image.", serverless: true },
];

function TemplatesPanel() {
  const [gpus, setGpus] = useState<GpuType[] | null>(null);
  const [gpuMsg, setGpuMsg] = useState("");
  const [templates, setTemplates] = useState<RpTemplate[] | null>(null);
  const [tplMsg, setTplMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, t, s] = await Promise.all([
      fetchRunpodRoute("/api/agents/runpod-gpus"),
      fetchRunpodRoute("/api/agents/runpod-templates"),
      fetchRunpodRoute("/api/agents/runpod-status"),
    ]);
    if (s.ok && (s.body as { configured?: unknown }).configured && (s.body as { live?: unknown }).live) setLive(true);
    else setLive(false);
    if (g.ok) {
      const list = (g.body as { gpus?: unknown; gpuTypes?: unknown }).gpus ?? (g.body as { gpuTypes?: unknown }).gpuTypes;
      setGpus(Array.isArray(list) ? (list as GpuType[]) : []);
      setGpuMsg("");
    } else {
      setGpus(null);
      setGpuMsg(runpodUnconfiguredMessage(g.status, g.body));
    }
    if (t.ok) {
      const list = (t.body as { templates?: unknown }).templates;
      setTemplates(Array.isArray(list) ? (list as RpTemplate[]) : []);
      setTplMsg("");
    } else {
      setTemplates(null);
      setTplMsg(runpodUnconfiguredMessage(t.status, t.body));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shownGpus = gpus ?? REFERENCE_GPUS;
  const shownTemplates = templates ?? REFERENCE_TEMPLATES;

  return (
    <section aria-label="GPU types and templates" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">🧰 GPU types + templates</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${live ? "bg-emerald-900 text-emerald-200" : "bg-amber-900 text-amber-200"}`}>
          {live ? "live catalog" : "reference prices"}
        </span>
        <InfoTip side="bottom" text="Live catalog needs RUNPOD_API_KEY. Reference prices are ballpark Secure-cloud rates so you can estimate before the key is set." label="About GPU prices" />
      </div>
      {!live && (gpuMsg || tplMsg) && <UnconfiguredNote message={[gpuMsg, tplMsg].filter(Boolean).join(" ")} />}
      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading catalog…</p>
      ) : (
        <>
          <h4 className="font-bold text-slate-900 dark:text-white">GPU types</h4>
          <ul className="grid gap-3 md:grid-cols-2">
            {shownGpus.map((g) => (
              <li key={g.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="font-bold text-slate-900 dark:text-white">{g.displayName || g.id}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-500">{g.id}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {g.securePriceHr != null && Number.isFinite(Number(g.securePriceHr)) ? `~$${Number(g.securePriceHr).toFixed(2)}/hr` : "price on request"}
                  {g.memoryGb ? ` · ${g.memoryGb}GB` : ""}
                  {g.availability ? ` · ${g.availability}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <h4 className="font-bold text-slate-900 dark:text-white">Templates grid</h4>
          <ul className="grid gap-3 md:grid-cols-2">
            {shownTemplates.map((t) => (
              <li key={`${t.name}-${t.image}`} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="font-bold text-slate-900 dark:text-white">
                  {t.name} {t.serverless ? <span className="ml-1 rounded-full bg-cyan-900 px-2 py-0.5 text-[11px] text-cyan-200">serverless</span> : null}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">{t.image}</p>
                {t.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.description}</p>}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void load()} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-white hover:bg-white/10">
            Refresh catalog
          </button>
        </>
      )}
    </section>
  );
}

function VolumesPanel() {
  const [volumes, setVolumes] = useState<RpVolume[] | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchRunpodRoute("/api/agents/runpod-volumes");
    if (r.ok) {
      const list = (r.body as { volumes?: unknown; networkVolumes?: unknown }).volumes ?? (r.body as { networkVolumes?: unknown }).networkVolumes;
      setVolumes(Array.isArray(list) ? (list as RpVolume[]) : []);
      setMsg("");
    } else {
      setVolumes(null);
      setMsg(runpodUnconfiguredMessage(r.status, r.body));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section aria-label="Network volumes" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">💾 Network volumes</h3>
        <InfoTip side="bottom" text="Network volumes persist beyond any single pod. Mount one path per pod; delete the volume to stop storage billing." label="About volumes" />
      </div>
      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading volumes…</p>
      ) : volumes ? (
        volumes.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No network volumes on this key yet. Create one in the RunPod console, then mount it at a path like /workspace.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {volumes.map((v) => (
              <li key={v.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="font-bold text-slate-900 dark:text-white">{v.name || v.id.slice(0, 12)}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">id: {v.id}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {[v.size != null ? `${v.size}GB` : "", v.dataCenter ? v.dataCenter : "", v.type ? v.type : ""].filter(Boolean).join(" · ") || "persistent network storage"}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <UnconfiguredNote message={msg || "Volume list unavailable."} />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void load()} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-white hover:bg-white/10">
          Refresh volumes
        </button>
        <a href="https://www.runpod.io/console/storage" target="_blank" rel="noreferrer noopener" className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">
          Open RunPod storage ↗
        </a>
      </div>
    </section>
  );
}

function CostEstimator() {
  const [rate, setRate] = useState("0.69");
  const [hours, setHours] = useState(4);
  const hourly = Number(rate);
  const safeRate = Number.isFinite(hourly) && hourly >= 0 ? hourly : 0;
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.min(24, hours)) : 0;
  const totalUsd = Math.round(safeRate * safeHours * 10000) / 10000;
  const coins = Math.round(totalUsd * 100 * 100) / 100;
  const perSec = safeRate > 0 ? safeRate / 3600 : 0;

  return (
    <section aria-label="Cost estimator" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">🧮 Cost estimator</h3>
        <InfoTip side="bottom" text="RunPod bills your card per second in dollars. Coin figures are display equivalents only (100 coins = $1.00)." label="About cost math" />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            GPU $/hr (Secure rate)
            <input
              type="number"
              min={0}
              max={20}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
            />
            <span className="mt-2 flex flex-wrap gap-2">
              {[["4090", "0.69"], ["5090", "0.92"], ["A100", "1.64"], ["H100", "2.69"]].map(([label, v]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRate(v)}
                  className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-bold text-slate-900 dark:text-white hover:bg-white/10"
                >
                  {label} ${v}
                </button>
              ))}
            </span>
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Hours (slider, 0–24)
            <input
              type="range"
              min={0}
              max={24}
              step={0.5}
              value={safeHours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-2 w-full"
              aria-label="Hours"
            />
            <span className="mt-1 block font-mono text-xs text-slate-600 dark:text-slate-400">{safeHours.toFixed(1)}h × ${safeRate.toFixed(2)}/hr</span>
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          ≈ <strong className="text-slate-900 dark:text-white">${totalUsd.toFixed(2)}</strong> ·{" "}
          <strong className="text-slate-900 dark:text-white">{coins.toLocaleString()} coins</strong> display-equivalent
          {perSec > 0 && <span className="text-slate-600 dark:text-slate-500"> (≈ ${perSec.toFixed(4)}/sec, billed per second)</span>}.
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
          Formula: gpu $/hr × hours = USD; USD × 100 = coins. Short GPU runs (&lt;24h) and serverless jobs stay cheapest — stop pods when done.
        </p>
      </div>
    </section>
  );
}

/**
 * RunPods dashboard; every RunPod you created, in one place: Virtual
 * Desktops, web-app test remotes (autoplay), agent-rental servers, and
 * Blender render workers. Each card shows its container image, live pod
 * status, last activity + idle guard, a clickable proxy link, and Stop /
 * Start / Restart / Terminate / Delete buttons. Only the creator sees (and
 * can touch) their own pods; every control route enforces ownership
 * server-side (desktop owner, autoplay creator, booking renter-or-owner,
 * blender job owner).
 */
export function RunpodDashboard() {
  const [desktops, setDesktops] = useState<Desktop[] | null>(null);
  const [autoplay, setAutoplay] = useState<AutoplayRemote[] | null>(null);
  const [rentals, setRentals] = useState<Booking[] | null>(null);
  const [jobs, setJobs] = useState<RenderJob[] | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<DashTab>("pods");
  const [stopAllBusy, setStopAllBusy] = useState(false);
  const [stopAllMsg, setStopAllMsg] = useState("");
  const [stopAllOk, setStopAllOk] = useState<boolean | null>(null);
  const loadFlightRef = useRef(false);

  const load = useCallback(async () => {
    // Per-source settle: one failing lane (desktops, autoplay, rentals, or
    // renders) must never pin the whole dashboard on "Loading your RunPods…"
    // forever. Each lane resolves independently; failures show inline.
    setError("");
    const [d, a, m, j] = await Promise.allSettled([
      api("/api/desktop/mine"),
      api("/api/vcw/autoplay/mine"),
      api("/api/agents/bookings/mine"),
      api("/api/blender/jobs"),
    ]);
    const reasonOf = (r: PromiseRejectedResult) =>
      r.reason instanceof Error ? r.reason.message : "Failed to load.";
    const problems: string[] = [];
    if (d.status === "fulfilled") {
      setDesktops(((d.value.desktops as Desktop[]) ?? []));
    } else {
      setDesktops([]);
      problems.push(`desktops (${reasonOf(d)})`);
    }
    if (a.status === "fulfilled") {
      setAutoplay(((a.value.remotes as AutoplayRemote[]) ?? []));
    } else {
      setAutoplay([]);
      problems.push(`test remotes (${reasonOf(a)})`);
    }
    if (m.status === "fulfilled") {
      setRentals((((m.value.rentals as Booking[]) ?? []).filter((b) => b.pod_id || b.endpoint_url)));
    } else {
      setRentals([]);
      problems.push(`rentals (${reasonOf(m)})`);
    }
    if (j.status === "fulfilled") {
      setJobs((((j.value.jobs as RenderJob[]) ?? []).filter((job) => job.podId)));
    } else {
      setJobs([]);
      problems.push(`renders (${reasonOf(j)})`);
    }
    if (problems.length > 0) {
      const joined = problems.join("; ");
      if (/authentication required|login/i.test(joined)) setNeedsLogin(true);
      else setError(`Some sections failed to load: ${joined}`);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActivePods =
    (desktops ?? []).some((d) => isRowActive(d.status, d.podStatus)) ||
    (autoplay ?? []).some((r) => isRowActive(r.status, r.podStatus)) ||
    (rentals ?? []).some((b) => Boolean(b.pod_id)) ||
    (jobs ?? []).some((j) => !TERMINAL_JOB.has(String(j.status ?? "").toUpperCase()));

  // Pods-tab auto-refresh: re-run load() every 30s while at least one pod
  // is non-terminal. Gated on document visibility (no polling when the tab
  // is hidden) and never fights the user: ticks are skipped while a
  // per-card control (busy), the bulk stop (stopAllBusy), or a previous
  // load is still in flight.
  useEffect(() => {
    if (tab !== "pods" || !hasActivePods) return;
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (busy !== "" || stopAllBusy || loadFlightRef.current) return;
      loadFlightRef.current = true;
      void load().finally(() => {
        loadFlightRef.current = false;
      });
    }, 30_000);
    return () => {
      window.clearInterval(id);
    };
  }, [tab, hasActivePods, busy, stopAllBusy, load]);

  type PodKind = "desktop" | "autoplay" | "booking" | "blender";

  function controlUrl(kind: PodKind, id: string) {
    return kind === "desktop"
      ? `/api/desktop/${id}/pod`
      : kind === "autoplay"
        ? `/api/vcw/autoplay/${id}/pod`
        : kind === "booking"
          ? `/api/agents/bookings/${id}/pod`
          : `/api/blender/jobs/${id}/pod`;
  }

  async function postControl(kind: PodKind, id: string, action: PodAction): Promise<string> {
    const body = await api(controlUrl(kind, id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    return String((body.podStatus as string) ?? "");
  }

  async function control(kind: PodKind, id: string, action: PodAction) {
    const key = `${kind}:${id}:${action}`;
    setBusy(key);
    try {
      const status = await postControl(kind, id, action);
      setMsg((m) => ({ ...m, [`${kind}:${id}`]: `${action} sent${status ? `; pod ${status}` : ""}.` }));
      await load();
    } catch (e) {
      setMsg((m) => ({ ...m, [`${kind}:${id}`]: e instanceof Error ? e.message : `${action} failed.` }));
    } finally {
      setBusy("");
    }
  }

  /** Every pod Stop-all can pause (skips already terminated/deleted rows;
   *  the server treats already-exited pods as stopped, so this never errors
   *  on idle pods — it just confirms billing already ended). */
  function collectStopTargets(): { kind: PodKind; id: string; label: string }[] {
    const targets: { kind: PodKind; id: string; label: string }[] = [];
    for (const d of desktops ?? []) {
      if (d.status !== "deleted" && d.status !== "terminated") {
        targets.push({ kind: "desktop", id: d.id, label: `Desktop ${d.id.slice(0, 8)}` });
      }
    }
    for (const r of autoplay ?? []) {
      if (r.status !== "deleted" && r.status !== "terminated") {
        targets.push({ kind: "autoplay", id: r.id, label: `Test ${r.gameSlug} ${r.id.slice(0, 8)}` });
      }
    }
    for (const b of rentals ?? []) {
      if (b.pod_id) targets.push({ kind: "booking", id: b.id, label: `Server ${b.agent_listings?.name ?? b.id.slice(0, 8)}` });
    }
    for (const j of jobs ?? []) {
      targets.push({ kind: "blender", id: j.id, label: `Render ${j.id.slice(0, 8)}` });
    }
    return targets;
  }

  async function stopAll() {
    const targets = collectStopTargets();
    if (targets.length === 0) {
      setStopAllMsg("Nothing to stop — no active pods.");
      return;
    }
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Stop ${targets.length} pod(s) at once? Compute billing pauses on each (disks kept, storage still bills). Terminate/Delete stay per-card.`,
      );
      if (!ok) return;
    }
    setStopAllBusy(true);
    setStopAllMsg(`Stopping ${targets.length} pod(s)…`);
    const results = await Promise.allSettled(targets.map((t) => postControl(t.kind, t.id, "stop")));
    let stopped = 0;
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        stopped += 1;
        const status = r.value;
        setMsg((m) => ({ ...m, [`${targets[i].kind}:${targets[i].id}`]: `stop sent${status ? `; pod ${status}` : ""}.` }));
      } else {
        failed.push(targets[i].label);
      }
    });
    setStopAllMsg(
      failed.length === 0
        ? `Stopped ${stopped} of ${targets.length} pod(s). Billing paused; disks kept — Start any card to resume.`
        : `Stopped ${stopped} of ${targets.length}. These still need attention: ${failed.join(", ")}.`,
    );
    setStopAllBusy(false);
    await load();
  }

  if (needsLogin) {
    return (
      <div role="alert" className="rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] p-4 text-sm text-slate-700 dark:text-slate-200">
        <p className="font-bold text-slate-900 dark:text-white">Login required to manage RunPods</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Your desktops, test remotes, rental servers, and render workers live here once you sign in.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/auth/login" className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Login
          </Link>
          <Link href="/auth/sign-up" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const loading = desktops === null || autoplay === null || rentals === null || jobs === null;
  const total = (desktops?.length ?? 0) + (autoplay?.length ?? 0) + (rentals?.length ?? 0) + (jobs?.length ?? 0);
  const stopTargets = collectStopTargets();

  const tabs: { value: DashTab; label: string }[] = [
    { value: "pods", label: "Pods" },
    { value: "serverless", label: "Serverless" },
    { value: "templates", label: "Templates" },
    { value: "volumes", label: "Volumes" },
    { value: "cost", label: "Cost Estimator" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-900 px-3 py-1 text-xs font-black text-violet-200">
          RunPod = short GPU &lt;24h + serverless
        </span>
        <InfoTip side="bottom" text="RunPod fits short GPU bursts under 24h and scale-to-zero serverless jobs. Longer rentals belong on DigitalOcean or your own box." label="About the RunPod fit" />
      </div>
      <div role="tablist" aria-label="RunPod sections" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              tab === t.value
                ? "bg-cyan-300 text-slate-950"
                : "border border-white/20 text-slate-900 dark:text-white hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-bold underline">
            Retry
          </button>
        </p>
      )}
      {tab === "serverless" && <ServerlessPanel />}
      {tab === "templates" && <TemplatesPanel />}
      {tab === "volumes" && <VolumesPanel />}
      {tab === "cost" && <CostEstimator />}
      {tab === "pods" && (
      loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading your RunPods…</p>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white">No RunPods yet</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Rent one and it will appear here with a clickable link and power controls.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/desktop" className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Rent a Virtual Desktop
            </Link>
            <Link href="/agents" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10">
              Rent an AI agent
            </Link>
            <Link href="/blender" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10">
              Render on RTX 4090
            </Link>
          </div>
        </div>
      ) : (
        <>
          {stopTargets.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/[.05] p-3">
              <button
                type="button"
                disabled={stopAllBusy || busy !== ""}
                onClick={() => void stopAll()}
                className="rounded-full bg-amber-300 px-5 py-2 text-xs font-black text-slate-950 hover:bg-amber-200 disabled:opacity-50"
              >
                {stopAllBusy ? "Stopping all…" : `⏸ Stop all pods (${stopTargets.length}) — pause billing`}
              </button>
              <InfoTip side="bottom" text="Stops every pod below at once: compute billing pauses, disks are kept so you can Start again. Terminate/Delete stay per-card." label="About Stop all" />
              {stopAllMsg && (
                <p role="status" className="w-full text-xs text-amber-200">{stopAllMsg}</p>
              )}
            </div>
          )}
          {desktops && desktops.length > 0 && (
            <section aria-label="Your Virtual Desktops">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">🖥️ Your Virtual Desktops ({desktops.length})</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Stop ends compute billing (disk kept, storage still bills); Start boots a stopped pod; Restart reboots in place;
                Terminate/Delete ends billing permanently (disk lost). Idle pods chime at 60 min, stop 15 min later, terminate after 24h untended.
              </p>
              <CompactDetails summary="Stop vs Terminate/Delete?">
                <p className="text-xs text-slate-600 dark:text-slate-400">Stop ends compute billing but keeps the disk so you can Start again later. Terminate or Delete ends billing permanently and the disk is lost.</p>
              </CompactDetails>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {desktops.map((d) => (
                  <li key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {d.kind === "gpu" ? "GPU" : "CPU"} Desktop · {d.interface === "gui" ? "Ubuntu GUI" : "Jupyter"}{" "}
                      <PodStatusBadge dbStatus={d.status} podStatus={d.podStatus} />
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {d.status}
                      {d.podStatus ? ` · pod ${d.podStatus}` : ""} · {d.gpu || d.cpu || "…"} · ~${d.hourlyUsd.toFixed(2)}/hr ·
                      since {new Date(d.createdAt).toLocaleString()}
                    </p>
                    {d.image && <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">image: {d.image}</p>}
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">last activity {fmtAgo(d.lastActivityAt)} · idle guard on{" "}
                      <InfoTip side="bottom" text="Idle guard: 60-min chime → +15-min stop → 24h terminate. Any input resets the clock." label="About idle guard" />
                    </p>
                    {d.endpointUrl && (
                      <p className="mt-2 text-xs">
                        <ProxyLink href={d.endpointUrl} label={d.interface === "gui" ? "Open desktop" : "Open Jupyter"} />
                      </p>
                    )}
                    {d.status !== "deleted" && d.status !== "terminated" && (
                      <PodButtons onAct={(a) => void control("desktop", d.id, a)} busy={busy.startsWith(`desktop:${d.id}:`) ? busy.split(":")[2] : ""} compact={d.id.slice(0, 8)} />
                    )}
                    {msg[`desktop:${d.id}`] && <p className="mt-1 text-xs text-amber-300">{msg[`desktop:${d.id}`]}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {autoplay && autoplay.length > 0 && (
            <section aria-label="Your web-app test remotes">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">🧪 Your web-app test remotes ({autoplay.length})</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Kasm desktops that test 4weird games remotely: open the stream, log in with your saved VNC password, and open the locked game URL in its Chromium. Same power controls + idle guard as desktops.
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {autoplay.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-slate-900 dark:text-white">Test: {r.gameSlug} · {r.compute}{" "}<PodStatusBadge dbStatus={r.status} podStatus={r.podStatus} /></p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {r.status}
                      {r.podStatus ? ` · pod ${r.podStatus}` : ""} · {r.siteMode} · {r.gpu || r.cpu || "…"} · ~${r.hourlyUsd.toFixed(2)}/hr ·
                      since {r.createdAt ? new Date(r.createdAt).toLocaleString() : "…"}
                    </p>
                    {r.image && <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">image: {r.image}</p>}
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">last activity {fmtAgo(r.lastActivityAt)} · idle guard on</p>
                    {r.endpointUrl && (
                      <p className="mt-2 text-xs">
                        <ProxyLink href={r.endpointUrl} label="Open stream" />
                      </p>
                    )}
                    {r.status !== "deleted" && r.status !== "terminated" && (
                      <PodButtons onAct={(a) => void control("autoplay", r.id, a)} busy={busy.startsWith(`autoplay:${r.id}:`) ? busy.split(":")[2] : ""} compact={r.id.slice(0, 8)} />
                    )}
                    {msg[`autoplay:${r.id}`] && <p className="mt-1 text-xs text-amber-300">{msg[`autoplay:${r.id}`]}</p>}
                    {r.status === "running" && (
                      <PodIdleWatch
                        heartbeatUrl={`/api/vcw/autoplay/${r.id}/heartbeat`}
                        stopUrl={`/api/vcw/autoplay/${r.id}/pod`}
                        policy={{ warnMinutes: 60, stopGraceMinutes: 15, terminateHours: 24 }}
                        label={`Test (${r.gameSlug})`}
                        compact
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rentals && rentals.length > 0 && (
            <section aria-label="Your rental servers">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">🤖 Your rental servers ({rentals.length})</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Rented agent servers bill while running.{" "}
                <InfoTip side="bottom" text="Rented agent servers bill while running. Open the server link to use it; Stop ends billing, Terminate deletes the disk." label="About rental servers" />
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {rentals.map((b) => (
                  <li key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-slate-900 dark:text-white">{b.agent_listings?.name ?? "Agent server"}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {b.status} · since {new Date(b.started_at).toLocaleString()}
                      {b.gpu_type ? ` · ${b.gpu_type}` : ""}
                    </p>
                    {b.endpoint_url && (
                      <p className="mt-2 text-xs">
                        <ProxyLink href={b.endpoint_url} label="Open server" />
                      </p>
                    )}
                    {b.pod_id && (
                      <PodButtons onAct={(a) => void control("booking", b.id, a)} busy={busy.startsWith(`booking:${b.id}:`) ? busy.split(":")[2] : ""} compact={b.id.slice(0, 8)} />
                    )}
                    {msg[`booking:${b.id}`] && <p className="mt-1 text-xs text-amber-300">{msg[`booking:${b.id}`]}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {jobs && jobs.length > 0 && (
            <section aria-label="Your render workers">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">🎬 Your render workers ({jobs.length})</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Render workers bill while the pod runs.{" "}
                <InfoTip side="bottom" text="RunPod bills dollars per second, never coins, no Vibe cut. Open the worker log to follow progress; stop it when the render finishes." label="About render workers" />
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {jobs.map((j) => (
                  <li key={j.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-mono text-xs text-cyan-300">{j.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {j.status} · {j.frameCount} frames · {j.gpu ?? "no GPU"}
                      {j.hourlyUsd > 0 ? ` · $${j.hourlyUsd.toFixed(2)}/hr` : ""}
                    </p>
                    {j.podId && (
                      <p className="mt-2 text-xs">
                        <ProxyLink href={`https://${j.podId}-8888.proxy.runpod.net`} label="Open worker log" />
                      </p>
                    )}
                    <PodButtons onAct={(a) => void control("blender", j.id, a)} busy={busy.startsWith(`blender:${j.id}:`) ? busy.split(":")[2] : ""} compact={j.id.slice(0, 8)} />
                    {msg[`blender:${j.id}`] && <p className="mt-1 text-xs text-amber-300">{msg[`blender:${j.id}`]}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
        )
      )}
    </div>
  );
}
