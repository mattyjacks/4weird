"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { PodIdleWatch } from "@/components/runpod/pod-idle-watch";

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

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & Record<string, unknown>;
  if (!body.success) throw new Error(String(body.error || `Request failed (${res.status}).`));
  return body;
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

  async function control(kind: "desktop" | "autoplay" | "booking" | "blender", id: string, action: PodAction) {
    const key = `${kind}:${id}:${action}`;
    setBusy(key);
    try {
      const url =
        kind === "desktop"
          ? `/api/desktop/${id}/pod`
          : kind === "autoplay"
            ? `/api/vcw/autoplay/${id}/pod`
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
        <p className="mt-1 text-xs text-slate-300">Your desktops, test remotes, rental servers, and render workers live here once you sign in.</p>
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

  const loading = desktops === null || autoplay === null || rentals === null || jobs === null;
  const total = (desktops?.length ?? 0) + (autoplay?.length ?? 0) + (rentals?.length ?? 0) + (jobs?.length ?? 0);

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
              <p className="mt-1 text-xs text-slate-500">
                Stop ends compute billing (disk kept, storage still bills); Start boots a stopped pod; Restart reboots in place;
                Terminate/Delete ends billing permanently (disk lost). Idle pods chime at 60 min, stop 15 min later, terminate after 24h untended.
              </p>
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
                    {d.image && <p className="mt-1 break-all font-mono text-[11px] text-slate-500">image: {d.image}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">last activity {fmtAgo(d.lastActivityAt)} · idle guard on</p>
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
              <h2 className="text-xl font-black text-white">🧪 Your web-app test remotes ({autoplay.length})</h2>
              <p className="mt-1 text-xs text-slate-500">
                Kasm desktops that test 4weird games remotely: open the stream, log in with your saved VNC password, and open the locked game URL in its Chromium. Same power controls + idle guard as desktops.
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {autoplay.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="font-bold text-white">Test: {r.gameSlug} · {r.compute}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {r.status}
                      {r.podStatus ? ` · pod ${r.podStatus}` : ""} · {r.siteMode} · {r.gpu || r.cpu || "…"} · ~${r.hourlyUsd.toFixed(2)}/hr ·
                      since {r.createdAt ? new Date(r.createdAt).toLocaleString() : "…"}
                    </p>
                    {r.image && <p className="mt-1 break-all font-mono text-[11px] text-slate-500">image: {r.image}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">last activity {fmtAgo(r.lastActivityAt)} · idle guard on</p>
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
