"use client";

import { useEffect, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";

type MeshyOp = {
  op: string;
  name: string;
  coinsPerUnit: number;
  blurb: string;
  mode: string;
  api: string;
  needsPrompt: boolean;
  needsImage: boolean;
};

/**
 * Meshy Studio; full Meshy.ai through the API, improved: budget-first
 * quotes, preview-then-refine pipeline, auto-vault of finished models,
 * and browser-game readiness advice.
 */
export function MeshyStudio() {
  const [ops, setOps] = useState<MeshyOp[]>([]);
  const [configured, setConfigured] = useState(false);
  const [op, setOp] = useState("text-to-3d");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [advice, setAdvice] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/meshy/ops");
        const body = (await res.json()) as { ops?: MeshyOp[]; configured?: boolean };
        setOps(body.ops ?? []);
        setConfigured(Boolean(body.configured));
      } catch {
        setOps([]);
      }
    })();
  }, []);

  async function generate() {
    setMsg("");
    setAdvice([]);
    setJob(null);
    setBusy(true);
    try {
      const res = await fetch("/api/meshy/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, prompt, image_url: imageUrl || undefined }),
      });
      const body = (await res.json()) as {
        success: boolean;
        started?: boolean;
        job?: string;
        quote?: { gross: number; cut: number };
        error?: string;
      };
      if (!body.success) {
        setMsg(body.error ?? "Generate failed.");
        return;
      }
      if (!body.started) {
        setMsg(`Meshy is not configured on this server; quote would be ${body.quote?.gross ?? "?"} coins.`);
        return;
      }
      setJob(body.job ?? null);
      setStatus("processing");
      setMsg(`Queued (${body.quote?.gross ?? "?"} coins, 25% cut included). Polling…`);
    } catch {
      setMsg("Generate failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!job) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/meshy/status?job=${job}`, { credentials: "include" });
        const body = (await res.json()) as {
          success: boolean;
          status?: string;
          result_url?: string;
          advice?: string[];
        };
        if (!body.success || stop) return;
        setStatus(String(body.status ?? ""));
        if (Array.isArray(body.advice)) setAdvice(body.advice);
        if (body.status === "done") {
          setMsg(`Done; model auto-saved to your Vault. ${body.result_url ? "Result ready." : ""}`);
          stop = true;
        }
      } catch {
        // Keep polling.
      }
      if (!stop) setTimeout(tick, 8000);
    };
    const t = setTimeout(tick, 4000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [job]);

  return (
    <div className="space-y-4">
      {!configured && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200">
          MESHY_API_KEY is not set on this server; the catalog + quotes below are live, but
          queueing returns an honest not-configured state instead of faking a model.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ops.map((o) => (
          <button
            key={o.op}
            type="button"
            onClick={() => setOp(o.op)}
            className={`rounded-2xl border p-4 text-left transition ${op === o.op ? "border-cyan-500 bg-cyan-500/10" : "border-border bg-card hover:bg-accent"}`}
          >
            <p className="font-black">{o.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.blurb}</p>
            <p className="mt-2 font-mono text-xs text-cyan-600 dark:text-cyan-300">
              {o.coinsPerUnit} coins · {o.mode}{" "}
              <InfoTip side="bottom" text="Gross price — 25% platform cut included, never added on top. Mode is the Meshy pipeline used." label="About mode and price" />
            </p>
          </button>
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          Prompt or image?{" "}
          <InfoTip text="Text-to-3D uses the description; image-to-3D uses the image URL. Send only what your tool needs." label="About prompt versus image" />
        </p>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the 3D model…"
          maxLength={2000}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Source image_url (https); for image-to-3D"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="rounded-full bg-cyan-600 px-6 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? "Queueing…" : "Generate 3D"}
        </button>
        {msg && <p className="text-xs text-muted-foreground">{msg}{" "}
          <InfoTip text="Finished models auto-save to your Vault. The result link appears here when ready." label="About Vault autosave" />
        </p>}
        {status && <p className="font-mono text-xs">status: {status}{" "}
          <InfoTip text="Status refreshes on its own every few seconds. Keep this open until it says done." label="About auto-polling" />
        </p>}
        {advice.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {advice.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
