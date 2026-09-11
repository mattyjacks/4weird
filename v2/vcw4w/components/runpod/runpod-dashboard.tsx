"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";

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
  hourlyUsd: number;
  status: string;
  podStatus: string | null;
  createdAt: string;
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

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & Record<string, unknown>;
  if (!body.success) throw new Error(String(body.error || `Request failed (${res.status}).`));
  return body;
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
              : "border border-white/20 text-white hover:bg-white/10"
          }`}
          aria-label={`${a.label} pod ${compact}`}
        >
          {busy === a.value ? `${a.label}…` : a.label}
        </button>
      ))}
    </div>
  );
}

/**
 * RunPods dashboard; every RunPod you created, in one place: Virtual
 * Desktops, agent-rental servers, and Blender render workers. Each card has
 * a clickable proxy link, live pod status, and Stop / Start / Restart /
 * Terminate / Delete buttons. Only the creator sees (and can touch) their
 * own pods; every control route enforces ownership server-side.
 */
export function RunpodDashboard() {
  const [desktops, setDesktops] = useState<Desktop[] | null>(null);
  const [rentals, setRentals] = useState<Booking[] | null>(null);
  const [jobs, setJobs] = useState<RenderJob[] | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    // Per-source settle: one failing lane (desktops, rentals, or renders)
    // must never pin the whole dashboard on "Loading your RunPods…" forever.
    // Each lane resolves independently; failures show inline with a retry.
    setError("");
    const [d, m, j] = await Promise.allSettled([
      api("/api/desktop/mine"),
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

  async function control(kind: "desktop" | "booking" | "blender", id: string, action: PodAction) {
    const key = `${kind}:${id}:${action}`;
    setBusy(key);
    try {
      const url =
        kind === "desktop"
          ? `/api/desktop/${id}/pod`
          : kind === "booking"
            ? `/api/agents/bookings/${id}/pod`
            : `/api/blender/jobs/${id}/pod`;
      const body = await api(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const status = String((body.podStatus as string) ?? "");
      setMsg((m) => ({ ...m, [`${kind}:${id}`]: `${action} sent${status ? `; pod ${status}` : ""}.` }));
      await load();
    } catch (e) {
      setMsg((m) => ({ ...m, [`${kind}:${id}`]: e instanceof Error ? e.message : `${action} failed.` }));
    } finally {
      setBusy("");
    }
  }

  if (needsLogin) {
    return (
      <div role="alert" className="rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] p-4 text-sm text-slate-200">
        <p className="font-bold text-white">Login required to manage RunPods</p>
        <p className="mt-1 text-xs text-slate-300">Your desktops, rental servers, and render workers live here once you sign in.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/auth/login" className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Login
          </Link>
          <Link href="/auth/sign-up" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const loading = desktops === null || rentals === null || jobs === null;
  const total = (desktops?.length ?? 0) + (rentals?.length ?? 0) + (jobs?.length ?? 0);

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-bold underline">
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-400">Loading your RunPods…</p>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-300">
          <p className="font-bold text-white">No RunPods yet</p>
          <p className="mt-1 text-slate-400">Rent one and it will appear here with a clickable link and power controls.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/desktop" className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Rent a Virtual Desktop
            </Link>
            <Link href="/agents" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Rent an AI agent
            </Link>
            <Link href="/blender" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Render on RTX 4090
            </Link>
          </div>
        </div>
      ) : (
        <>
          {desktops && desktops.length > 0 && (
            <section aria-label="Your Virtual Desktops">
              <h2 className="text-xl font-black text-white">🖥️ Your Virtual Desktops ({desktops.length})</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {desktops.map((d) => (
                  <li key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-white">
                      {d.kind === "gpu" ? "GPU" : "CPU"} Desktop · {d.interface === "gui" ? "Ubuntu GUI" : "Jupyter"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {d.status}
                      {d.podStatus ? ` · pod ${d.podStatus}` : ""} · {d.gpu || d.cpu || "…"} · ~${d.hourlyUsd.toFixed(2)}/hr ·
                      since {new Date(d.createdAt).toLocaleString()}
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

          {rentals && rentals.length > 0 && (
            <section aria-label="Your rental servers">
              <h2 className="text-xl font-black text-white">🤖 Your rental servers ({rentals.length})</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {rentals.map((b) => (
                  <li key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-white">{b.agent_listings?.name ?? "Agent server"}</p>
                    <p className="mt-1 text-xs text-slate-400">
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
              <h2 className="text-xl font-black text-white">🎬 Your render workers ({jobs.length})</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {jobs.map((j) => (
                  <li key={j.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-mono text-xs text-cyan-300">{j.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-400">
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
      )}
    </div>
  );
}
