"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

type DropletAction = "power_on" | "power_off" | "reboot" | "snapshot" | "delete";

const ACTIONS: { value: DropletAction; label: string; danger?: boolean }[] = [
  { value: "power_on", label: "Power on" },
  { value: "power_off", label: "Power off" },
  { value: "reboot", label: "Reboot" },
  { value: "snapshot", label: "Snapshot" },
  { value: "delete", label: "Delete", danger: true },
];

type Droplet = {
  id: number | string;
  name: string;
  status: string;
  region?: { slug?: string; name?: string } | string | null;
  size_slug?: string | null;
  size?: { slug?: string } | string | null;
  image?: { slug?: string; name?: string; distribution?: string } | string | null;
  networks?: { v4?: { ip_address?: string; type?: string }[] } | null;
  ipv4?: string | null;
  endpointUrl?: string | null;
  monthlyUsd?: number | null;
  created_at?: string | null;
};

type DoSize = {
  slug: string;
  price_monthly?: number | null;
  price_hourly?: number | null;
};

type DoRegion = {
  slug: string;
  name?: string | null;
  available?: boolean | null;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
  } & Record<string, unknown>;
  if (!body.success) throw new Error(String(body.error || `Request failed (${res.status}).`));
  return body;
}

function pickArray(body: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const v = body[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const nested = (v as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested;
    }
    const data = body["data"];
    if (data && typeof data === "object") {
      const nested = (data as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

function regionLabel(d: Droplet): string {
  const r = d.region;
  if (!r) return "unknown region";
  if (typeof r === "string") return r;
  return r.name || r.slug || "unknown region";
}

function sizeSlug(d: Droplet): string {
  if (d.size_slug) return d.size_slug;
  if (!d.size) return "unknown size";
  return typeof d.size === "string" ? d.size : d.size.slug || "unknown size";
}

function imageLabel(d: Droplet): string | null {
  const img = d.image;
  if (!img) return null;
  if (typeof img === "string") return img;
  return img.name || img.slug || img.distribution || null;
}

function ipv4Of(d: Droplet): string | null {
  if (d.ipv4) return d.ipv4;
  const v4 = d.networks?.v4;
  if (!Array.isArray(v4)) return null;
  const pub = v4.find((n) => n?.type === "public" && n?.ip_address);
  return pub?.ip_address || v4.find((n) => n?.ip_address)?.ip_address || null;
}

/** USD → Vibe Coin display equivalent (100 coins = $1.00). Informational only. */
function usdToCoins(usd: number): number {
  return Math.round(Number(usd) * 100 * 100) / 100;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function DropletButtons({
  onAct,
  busy,
  compact,
}: {
  onAct: (action: DropletAction) => void;
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
            if (a.value === "delete" && typeof window !== "undefined") {
              const ok = window.confirm(
                "Delete this droplet? Monthly billing ends permanently and the disk is lost. This cannot be undone.",
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
          aria-label={`${a.label} droplet ${compact}`}
        >
          {busy === a.value ? `${a.label}…` : a.label}
        </button>
      ))}
      <InfoTip
        side="bottom"
        text="Power off stops the server but the droplet (and monthly billing) remains until you Delete. Snapshot copies the disk for a point-in-time keep. Delete ends billing permanently and the disk is lost."
        label="About Power off versus Delete"
      />
    </div>
  );
}

/**
 * DigitalOcean dashboard: every long-term server in one place. Each droplet
 * card shows name, region, size, status, public IP, and monthly cost in USD
 * plus the Vibe Coin equivalent (100 coins = $1.00), with power on / off /
 * reboot / snapshot / delete controls. Droplets never auto-terminate: they
 * stay up (and bill monthly) until you delete them.
 */
export function DigitaloceanDashboard() {
  const [droplets, setDroplets] = useState<Droplet[] | null>(null);
  const [sizes, setSizes] = useState<DoSize[] | null>(null);
  const [regions, setRegions] = useState<DoRegion[] | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [size, setSize] = useState("");
  const [image, setImage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const load = useCallback(async () => {
    // Per-source settle: one failing lane (droplets, sizes, or regions)
    // must never pin the whole dashboard on "Loading…" forever.
    setError("");
    const [d, s, r] = await Promise.allSettled([
      api("/api/agents/digitalocean-droplets"),
      api("/api/agents/digitalocean-sizes"),
      api("/api/agents/digitalocean-regions"),
    ]);
    const reasonOf = (x: PromiseRejectedResult) =>
      x.reason instanceof Error ? x.reason.message : "Failed to load.";
    const problems: string[] = [];
    if (d.status === "fulfilled") {
      setDroplets(pickArray(d.value, ["droplets"]) as Droplet[]);
    } else {
      setDroplets([]);
      problems.push(`droplets (${reasonOf(d)})`);
    }
    if (s.status === "fulfilled") {
      setSizes(pickArray(s.value, ["sizes"]) as DoSize[]);
    } else {
      setSizes([]);
      problems.push(`sizes (${reasonOf(s)})`);
    }
    if (r.status === "fulfilled") {
      setRegions(pickArray(r.value, ["regions"]) as DoRegion[]);
    } else {
      setRegions([]);
      problems.push(`regions (${reasonOf(r)})`);
    }
    if (problems.length > 0) {
      const joined = problems.join("; ");
      if (/DIGITALOCEAN_TOKEN is not set|not configured|unconfigured/i.test(joined)) {
        setUnconfigured(true);
      } else if (/authentication required|login/i.test(joined)) {
        setNeedsLogin(true);
      } else {
        setError(`Some sections failed to load: ${joined}`);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const priceBySlug = new Map(
    (sizes ?? []).map((x) => [x.slug, Number(x.price_monthly) || 0]),
  );

  function monthlyUsdOf(d: Droplet): number | null {
    if (typeof d.monthlyUsd === "number" && Number.isFinite(d.monthlyUsd)) return d.monthlyUsd;
    const slug = sizeSlug(d);
    const p = priceBySlug.get(slug);
    return typeof p === "number" && p > 0 ? p : null;
  }

  async function control(id: number | string, action: DropletAction) {
    const key = `droplet:${String(id)}:${action}`;
    if (action === "snapshot" && typeof window !== "undefined") {
      const snapName = window.prompt("Snapshot name (point-in-time copy of this droplet's disk):", "");
      if (snapName === null) return;
      const clean = snapName.trim();
      if (!clean) {
        setMsg((m) => ({ ...m, [`droplet:${String(id)}`]: "Snapshot needs a name." }));
        return;
      }
      setBusy(key);
      try {
        await api(`/api/agents/digitalocean-droplets/${encodeURIComponent(String(id))}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot", name: clean }),
        });
        setMsg((m) => ({ ...m, [`droplet:${String(id)}`]: `snapshot "${clean}" started.` }));
        await load();
      } catch (e) {
        setMsg((m) => ({
          ...m,
          [`droplet:${String(id)}`]: e instanceof Error ? e.message : "snapshot failed.",
        }));
      } finally {
        setBusy("");
      }
      return;
    }
    setBusy(key);
    try {
      if (action === "delete") {
        await api(`/api/agents/digitalocean-droplets/${encodeURIComponent(String(id))}`, {
          method: "DELETE",
        });
        setMsg((m) => ({ ...m, [`droplet:${String(id)}`]: "delete sent; billing ends permanently." }));
      } else {
        const body = await api(
          `/api/agents/digitalocean-droplets/${encodeURIComponent(String(id))}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const status = String((body.status as string) ?? (body.action as string) ?? "");
        setMsg((m) => ({
          ...m,
          [`droplet:${String(id)}`]: `${action} sent${status ? `; ${status}` : ""}.`,
        }));
      }
      await load();
    } catch (e) {
      setMsg((m) => ({
        ...m,
        [`droplet:${String(id)}`]: e instanceof Error ? e.message : `${action} failed.`,
      }));
    } finally {
      setBusy("");
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !region.trim() || !size.trim() || !image.trim()) {
      setCreateMsg("Name, region, size, and image are all required.");
      return;
    }
    setCreating(true);
    setCreateMsg("");
    try {
      await api("/api/agents/digitalocean-droplets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          region: region.trim(),
          size: size.trim(),
          image: image.trim(),
        }),
      });
      setCreateMsg(`Droplet "${name.trim()}" creating; it appears below once active.`);
      setName("");
      setImage("");
      await load();
    } catch (e) {
      setCreateMsg(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  if (needsLogin) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] p-4 text-sm text-slate-700 dark:text-slate-200"
      >
        <p className="font-bold text-slate-900 dark:text-white">Login required to manage servers</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Your long-term DigitalOcean servers live here once you sign in.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/auth/login"
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Login
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  if (unconfigured) {
    return (
      <div className="space-y-4">
        <div
          role="note"
          className="rounded-xl border border-amber-300/50 bg-amber-300/[.08] p-4 text-sm text-slate-700 dark:text-slate-200"
        >
          <p className="font-bold text-slate-900 dark:text-white">
            DigitalOcean = long-term servers, monthly billing, no auto-terminate
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Whole servers that stay up for days or weeks: power them off when idle, snapshot the
            disk for keeps, delete only when done. Nothing here stops or deletes itself.
          </p>
        </div>
        <div
          role="alert"
          className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-600 dark:text-slate-300"
        >
          <p className="font-bold text-slate-900 dark:text-white">DigitalOcean is not configured</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            The server has no DIGITALOCEAN_TOKEN set, so no droplets can be listed or created.
            This is an honest empty state, not an error on your side.
          </p>
        </div>
      </div>
    );
  }

  const loading = droplets === null || sizes === null || regions === null;
  const monthlyTotal = (droplets ?? []).reduce((sum, d) => sum + (monthlyUsdOf(d) ?? 0), 0);

  return (
    <div className="space-y-8">
      <div
        role="note"
        className="rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] p-4 text-sm text-slate-700 dark:text-slate-200"
      >
        <p className="font-bold text-slate-900 dark:text-white">
          DigitalOcean = long-term servers, monthly billing, no auto-terminate
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Whole servers that stay up for days or weeks: power them off when idle, snapshot the disk
          for keeps, delete only when done. Nothing here stops or deletes itself.{" "}
          <InfoTip
            side="bottom"
            text="RunPod is short bursty GPU work billed per second with idle guards. DigitalOcean is the opposite: persistent boxes billed monthly that run until you delete them."
            label="About DigitalOcean versus RunPod"
          />
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-bold underline">
            Retry
          </button>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading your servers…</p>
      ) : (
        <>
          <section aria-label="Monthly cost">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">💰 Monthly cost</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {fmtUsd(monthlyTotal)}/mo across {(droplets ?? []).length} droplet
              {(droplets ?? []).length === 1 ? "" : "s"} · ≈{usdToCoins(monthlyTotal).toFixed(0)}{" "}
              coins/mo (100 coins = $1.00, informational)
            </p>
          </section>

          <section aria-label="Create a server">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">➕ Create a server</h2>
            <CompactDetails summary="Monthly billing reminder">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                New droplets bill monthly from creation until you delete them. Powering off stops
                the server but does not stop billing; only Delete ends it.
              </p>
            </CompactDetails>
            <form onSubmit={(e) => void create(e)} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-longterm-box"
                  maxLength={64}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Region
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="nyc3"
                  list="do-regions"
                  maxLength={64}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 font-normal"
                />
                <datalist id="do-regions">
                  {(regions ?? []).map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name ?? r.slug}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Size
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="s-1vcpu-1gb"
                  list="do-sizes"
                  maxLength={64}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 font-normal"
                />
                <datalist id="do-sizes">
                  {(sizes ?? []).map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {typeof s.price_monthly === "number"
                        ? `${fmtUsd(s.price_monthly)}/mo`
                        : s.slug}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Image
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="ubuntu-24-04-x64"
                  maxLength={128}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 font-normal"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create droplet"}
                </button>
                {createMsg && <p className="mt-1 text-xs text-amber-300">{createMsg}</p>}
              </div>
            </form>
          </section>

          {(droplets ?? []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">No servers yet</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Create your first long-term droplet above. It stays up (and bills monthly) until
                you delete it; snapshots keep a point-in-time copy of the disk.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/agents"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10"
                >
                  Browse AI agents
                </Link>
              </div>
            </div>
          ) : (
            <section aria-label="Your servers">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                🖥️ Your servers ({(droplets ?? []).length})
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Power off stops the server but keeps billing; Reboot restarts in place; Snapshot
                copies the disk; Delete ends billing permanently (disk lost).
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {(droplets ?? []).map((d) => {
                  const ip = ipv4Of(d);
                  const monthly = monthlyUsdOf(d);
                  const img = imageLabel(d);
                  const id = String(d.id);
                  return (
                    <li key={id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {d.status} · {regionLabel(d)} · {sizeSlug(d)}
                      </p>
                      {ip && (
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">
                          {ip}
                        </p>
                      )}
                      {img && (
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-600 dark:text-slate-500">
                          image: {img}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">
                        {monthly !== null ? (
                          <>
                            {fmtUsd(monthly)}/mo · ≈{usdToCoins(monthly).toFixed(0)} coins/mo{" "}
                            <InfoTip
                              side="bottom"
                              text="100 Vibe Coins = $1.00. Coin figure is informational; DigitalOcean bills dollars monthly."
                              label="About the coin equivalent"
                            />
                          </>
                        ) : (
                          "monthly price unknown for this size"
                        )}
                        {d.created_at
                          ? ` · since ${new Date(d.created_at).toLocaleString()}`
                          : ""}
                      </p>
                      {d.endpointUrl && (
                        <p className="mt-2 text-xs">
                          <ProxyLink href={d.endpointUrl} label="Open server" />
                        </p>
                      )}
                      <DropletButtons
                        onAct={(a) => void control(d.id, a)}
                        busy={busy.startsWith(`droplet:${id}:`) ? busy.split(":")[2] : ""}
                        compact={id.slice(0, 8)}
                      />
                      {msg[`droplet:${id}`] && (
                        <p className="mt-1 text-xs text-amber-300">{msg[`droplet:${id}`]}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
