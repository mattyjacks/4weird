"use client";

import { useCallback, useEffect, useState } from "react";
import { FAL_CUT_NOTE, FAL_OPS, type FalOp } from "@/lib/fal";

type OpsResponse = {
  ops: { op: string; name: string; unit: string; coinsPerUnit: number; blurb: string; category: string; kind: string; needsImage: boolean; needsPrompt: boolean }[];
  count: number;
  configured: boolean;
};

type GenerateResponse = {
  started?: boolean;
  configured?: boolean;
  op?: string;
  model?: string;
  request_id?: string;
  status_url?: string;
  quote?: { gross: number; cut: number; provider: number };
  usage?: unknown;
  status?: unknown;
  error?: string;
  note?: string;
  hint?: string;
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Game Art": "🎨",
  "3D": "🧊",
  Video: "🎬",
  Audio: "🔊",
  Coding: "💻",
};

export function FalStudio() {
  const [catalog, setCatalog] = useState<OpsResponse | null>(null);
  const [op, setOp] = useState<FalOp>("concept-art");
  const [prompt, setPrompt] = useState("a neon dungeon crawler hero selecting a glowing sword, 4weird arcade poster");
  const [gameSlug, setGameSlug] = useState("lobby");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [message, setMessage] = useState("Pick a tool — every price already includes the 25% cut.");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/fal/ops", { cache: "no-store" });
      const body = (await res.json()) as OpsResponse;
      if (res.ok) setCatalog(body);
    } catch {
      // Static FAL_OPS fallback below still renders the 15 tools.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ops = catalog?.ops ?? FAL_OPS;
  const active = ops.find((o) => o.op === op) ?? ops[0];
  const configured = catalog?.configured ?? true;

  async function run() {
    setBusy(true);
    setResult(null);
    setMessage("Queuing your fal run…");
    try {
      const res = await fetch("/api/fal/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, prompt, game_slug: gameSlug || "lobby", image_url: imageUrl || undefined, source: "fal-studio" }),
      });
      const body = (await res.json()) as GenerateResponse;
      setResult(body);
      if (!res.ok) {
        setMessage(String(body.error ?? `Request failed (${res.status})`));
      } else if (body.started) {
        setMessage(`Queued! Request ${body.request_id} — poll status below. ${body.quote?.gross ?? ""} coins gross.`);
      } else {
        setMessage(body.hint ?? "fal.ai is not configured on this deployment — quote shown, nothing charged.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to queue.");
    } finally {
      setBusy(false);
    }
  }

  async function poll() {
    const id = result?.request_id;
    if (!id) return;
    setMessage("Polling fal queue…");
    try {
      const res = await fetch(`/api/fal/status?op=${encodeURIComponent(op)}&id=${encodeURIComponent(id)}`, { credentials: "include" });
      const body = (await res.json()) as GenerateResponse;
      setResult((prev) => ({ ...(prev ?? {}), status: body.status ?? body }));
      setMessage("Status refreshed from the live fal queue.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Poll failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${configured ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
          {configured ? "● fal.ai live" : "● fal.ai not configured — quotes only"}
        </span>
        <span className="text-xs text-slate-400">{FAL_CUT_NOTE}</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ops.map((o) => (
          <button
            key={o.op}
            type="button"
            onClick={() => setOp(o.op as FalOp)}
            aria-pressed={op === o.op}
            className={`rounded-2xl border p-4 text-left transition ${op === o.op ? "border-fuchsia-300/70 bg-fuchsia-300/10" : "border-white/10 bg-white/[.03] hover:border-white/25"}`}
          >
            <p className="text-lg">{CATEGORY_EMOJI[o.category] ?? "✨"} <strong>{o.name}</strong></p>
            <p className="mt-1 text-sm text-slate-300">{o.blurb}</p>
            <p className="mt-2 text-xs text-slate-400">{o.coinsPerUnit} coins / {o.unit} (incl. 25% cut) · {o.category}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">Run: {active?.name}</h2>
        <p className="mt-1 text-sm text-slate-400">{active?.blurb}</p>
        <div className="mt-4 grid gap-3">
          <label className="block text-sm">
            Prompt (the magic words)
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" placeholder="describe the art, clip, voice line, riff…" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Game slug (usage is attributed per game)
              <input value={gameSlug} onChange={(e) => setGameSlug(e.target.value.toLowerCase())} maxLength={64} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2" placeholder="lobby" />
            </label>
            <label className="block text-sm">
              Source image_url {active?.needsImage ? "(required for this tool)" : "(optional)"}
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs" placeholder="https://…" />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void run()} disabled={busy || (!!active?.needsPrompt && prompt.trim().length < 3)} className="rounded-lg bg-fuchsia-300 px-5 py-2 font-bold text-slate-950 disabled:opacity-50">
              {busy ? "Queuing…" : `✨ Generate — ${active?.coinsPerUnit} coins/${active?.unit} gross`}
            </button>
            {!!result?.request_id && (
              <button onClick={() => void poll()} className="rounded-lg border border-white/15 px-4 py-2 font-semibold">Refresh status</button>
            )}
          </div>
        </div>
        <p role="status" className="mt-3 text-sm text-slate-400">{message}</p>
        {!!result && (
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-slate-300">{JSON.stringify(result, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
