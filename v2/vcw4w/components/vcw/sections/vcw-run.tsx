"use client";

import { useCallback, useEffect, useState } from "react";

type Remote = {
  id: string;
  podId: string | null;
  gameSlug: string;
  compute: string;
  siteMode: string;
  endpointUrl: string | null;
  hourlyUsd: number;
  status: string;
  podStatus: string | null;
  createdAt: string;
};

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { success?: boolean }).success === false)
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as Record<string, unknown>;
}

async function getJson(path: string) {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("__signin__");
  if (!res.ok || (data as { success?: boolean }).success === false)
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as Record<string, unknown>;
}

/**
 * Native cloud-run section (replaces the framed run.html).
 *
 * The legacy page drives a BYOK key into a localhost control plane. This
 * page provisions through the hosted POST /api/vcw/autoplay instead: real
 * RunPod Kasm remotes with honest started:false states, ownership rows,
 * and the idle lifecycle. No iframe.
 */
export function VcwRun() {
  const [rules, setRules] = useState<string[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [auth, setAuth] = useState<"checking" | "in" | "out">("checking");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [gameSlug, setGameSlug] = useState("orbitaldrift");
  const [compute, setCompute] = useState("cpu");
  const [siteMode, setSiteMode] = useState("on-site");

  const refresh = useCallback(async () => {
    const mine = await getJson("/api/vcw/autoplay/mine");
    setRemotes(((mine.remotes as Remote[]) ?? []).map((r) => ({
      id: String(r.id),
      podId: r.podId ?? null,
      gameSlug: String(r.gameSlug ?? ""),
      compute: String(r.compute ?? ""),
      siteMode: String(r.siteMode ?? ""),
      endpointUrl: r.endpointUrl ?? null,
      hourlyUsd: Number(r.hourlyUsd) || 0,
      status: String(r.status ?? ""),
      podStatus: r.podStatus ?? null,
      createdAt: String(r.createdAt ?? ""),
    })));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pub = await getJson("/api/vcw/autoplay");
        setRules(((pub.rules as string[]) ?? []).map(String));
        if (typeof pub.max_minutes === "number") setMaxMinutes(pub.max_minutes);
      } catch {
        /* rules are advisory; the form still works */
      }
      try {
        await refresh();
        setAuth("in");
      } catch (e) {
        setAuth(e instanceof Error && e.message === "__signin__" ? "out" : "in");
      }
    })();
  }, [refresh]);

  const provision = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const data = await postJson("/api/vcw/autoplay", {
        game_slug: gameSlug.trim().toLowerCase(),
        compute,
        site_mode: siteMode,
      });
      if (data.started) {
        const conn = data.connection as { endpointUrl?: string; hourlyUsd?: number } | undefined;
        const quote = data.quote as { gross_coins?: number } | undefined;
        setNote(
          `Remote live: ${String(conn?.endpointUrl ?? "see /runpods")} at ~$${Number(conn?.hourlyUsd ?? 0).toFixed(2)}/hr` +
          (quote ? ` (${String(quote.gross_coins)} coins gross quote).` : ".") +
          " Open the stream URL, log in with the one-time VNC password, and open the locked game URL in the remote Chromium.",
        );
      } else {
        const provisionState = data.provision as { code?: string; message?: string } | undefined;
        setNote(`Not started (${String(provisionState?.code ?? "provision_failed")}): ${String(provisionState?.message ?? data.note ?? "retry later")}. No spend.`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provision failed.");
    } finally {
      setBusy(false);
    }
  }, [gameSlug, compute, siteMode, refresh]);

  const podAction = useCallback(
    async (id: string, action: string) => {
      setError(null);
      try {
        await postJson(`/api/vcw/autoplay/${id}/pod`, { action });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Pod action failed.");
      }
    },
    [refresh],
  );

  const heartbeat = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await postJson(`/api/vcw/autoplay/${id}/heartbeat`, {});
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Heartbeat failed.");
      }
    },
    [refresh],
  );

  if (auth === "checking") return <p className="text-sm text-slate-400">Loading cloud runs…</p>;
  if (auth === "out")
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.02] p-6 text-sm text-slate-300">
        <p className="font-bold text-white">Sign in to rent cloud remotes.</p>
        <p className="mt-1">Provisioning bills real RunPod spend, so it needs your account.</p>
        <a href="/auth/login" className="mt-4 inline-block rounded-full bg-cyan-300 px-5 py-2 font-black text-slate-950">
          Login →
        </a>
      </div>
    );

  const input = "w-full rounded-lg border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="rounded-xl border border-cyan-300/30 bg-cyan-300/[.06] px-4 py-2 text-sm text-slate-200">
          {note}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <h2 className="font-bold text-white">Provision a remote</h2>
        <p className="mt-1 text-sm text-slate-400">
          A real RunPod Kasm desktop (Chromium inside, stream on 6901). Catalog games run on-site only
          {maxMinutes ? `; hard cap ${maxMinutes} min` : ""}; billed per second.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="block text-xs text-slate-400">
            Game slug
            <input value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs text-slate-400">
            Compute
            <select value={compute} onChange={(e) => setCompute(e.target.value)} className={`${input} mt-1`}>
              <option value="cpu">cpu — cheapest</option>
              <option value="gpu">gpu</option>
              <option value="gpu-boosted">gpu-boosted (Xonotic, off-site)</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Site mode
            <select value={siteMode} onChange={(e) => setSiteMode(e.target.value)} className={`${input} mt-1`}>
              <option value="on-site">on-site</option>
              <option value="off-site">off-site (Xonotic only)</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void provision()}
          disabled={busy || !gameSlug.trim()}
          className="mt-3 rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
        >
          {busy ? "Provisioning…" : "Launch cloud run"}
        </button>
        {rules.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">My remotes</h2>
          <button
            type="button"
            onClick={() => void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : "Refresh failed."))}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {remotes.length === 0 && <p className="text-xs text-slate-500">No remotes yet.</p>}
          {remotes.map((r) => (
            <div key={r.id} className="rounded-xl bg-black/30 px-3 py-2 text-xs">
              <p className="font-bold text-white">
                {r.gameSlug} · {r.compute} · {r.siteMode}
                <span className="ml-2 font-normal text-slate-400">
                  {r.status}{r.podStatus ? ` · pod ${r.podStatus}` : ""} · ${r.hourlyUsd.toFixed(2)}/hr
                </span>
              </p>
              {r.endpointUrl && (
                <a href={r.endpointUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-cyan-300 hover:underline">
                  Open stream ↗
                </a>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {(["stop", "start", "restart"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => void podAction(r.id, a)}
                    className="rounded-lg border border-white/15 px-2 py-1 font-bold text-slate-300 hover:bg-white/10"
                  >
                    {a}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void heartbeat(r.id)}
                  className="rounded-lg border border-white/15 px-2 py-1 font-bold text-slate-300 hover:bg-white/10"
                >
                  heartbeat
                </button>
                <button
                  type="button"
                  onClick={() => void podAction(r.id, "terminate")}
                  className="rounded-lg border border-red-400/40 px-2 py-1 font-bold text-red-200 hover:bg-red-500/10"
                >
                  terminate
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Same remotes, same controls on <a href="/runpods" className="text-cyan-300 hover:underline">/runpods</a>. Stop
          remotes when finished — RunPod bills per second until then.
        </p>
      </section>
    </div>
  );
}
