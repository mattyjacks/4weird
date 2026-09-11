"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SWARM_TOOLS, SWARM_MAX_AGENTS } from "@/lib/swarm";
import { RUNTIME_LABELS, type Runtime } from "@/lib/agent-market";
import { BUDDY_VOICES, BUDDY_DEFAULT_VOICE } from "@/lib/game-ai";

type SwarmSession = {
  id: string;
  name: string;
  size: number;
  runtimes: string[];
  system_prompt: string;
  agent_prompts: string[];
  orchestration: string;
  model: string;
  temperature: number;
  tools: string[];
  status: string;
  turns: number;
  gross_coins: number;
};

type ChatMsg = {
  id: string;
  role: string;
  agent_index: number;
  agent_name: string;
  text: string;
  tool_calls: { id: string; args: string }[];
  gross_coins: number;
  created_at: string;
};

type Reply = {
  agent: number;
  agentName: string;
  runtime: string;
  text: string;
  toolCalls: { id: string; args: string }[];
  brain: string;
  fallback: boolean;
};

const AGENT_COLORS = ["text-cyan-300", "text-amber-300", "text-violet-300", "text-emerald-300", "text-rose-300"];
const RUNTIME_OPTIONS = Object.keys(RUNTIME_LABELS) as Runtime[];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Markdown-lite: code fences, inline code, bold, line breaks. Escape-first, never raw HTML. */
function renderLite(text: string): string {
  const parts = String(text ?? "").split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => {
      if (part.startsWith("```")) {
        const code = part.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "");
        return `<pre class="mt-2 overflow-x-auto rounded-md bg-black/50 p-2 text-xs">${escapeHtml(code)}</pre>`;
      }
      let h = escapeHtml(part);
      h = h.replace(/`([^`]+)`/g, "<code class=\"rounded bg-black/50 px-1 text-cyan-200\">$1</code>");
      h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
      h = h.replace(/\[tool:\s*([^\]]+)\]/g, "<span class=\"rounded bg-violet-900 px-1 text-xs text-violet-200\">🛠 $1</span>");
      return h.replace(/\n/g, "<br/>");
    })
    .join("");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & T;
  if (!res.ok || data.success === false) throw new Error(String(data.error ?? `Request failed (${res.status})`));
  return data as T;
}

export function SwarmChat() {
  const [sessions, setSessions] = useState<SwarmSession[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Hire a swarm below, then chat with it.");
  const [lastCost, setLastCost] = useState("");
  const [trace, setTrace] = useState<string[]>([]);
  const [showTrace, setShowTrace] = useState(true);
  const [search, setSearch] = useState("");
  const [pins, setPins] = useState<string[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const raw = JSON.parse(window.localStorage.getItem("swarm-pins") ?? "[]") as unknown;
      return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
    } catch {
      return [];
    }
  });
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [voice, setVoice] = useState(BUDDY_DEFAULT_VOICE);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [listening, setListening] = useState(false);

  // Hire form state (swarm config panel).
  const [name, setName] = useState("My Swarm");
  const [size, setSize] = useState(3);
  const [runtimes, setRuntimes] = useState<string[]>(["vibecodeworker", "vibecodeworker", "vibecodeworker"]);
  const [systemPrompt, setSystemPrompt] = useState("You are a playful build crew: plan first, then split the work, then report back with evidence.");
  const [agentPrompts, setAgentPrompts] = useState<string[]>(["Leads with the built-in reasoning plan.", "Digs into code + tests.", "Makes it delightful: media + voice."]);
  const [orchestration, setOrchestration] = useState("auto");
  const [model, setModel] = useState("auto");
  const [temperature, setTemperature] = useState(0.8);
  const [tools, setTools] = useState<string[]>(SWARM_TOOLS.map((t) => t.id));

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recogRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  // Which session is on screen right now (ref mirror: send() must not trust
  // its stale activeId closure when the reply lands after a session switch).
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  useEffect(() => {
    try {
      window.localStorage.setItem("swarm-pins", JSON.stringify(pins.slice(0, 200)));
    } catch {
      // Private mode etc: pins just don't survive reloads.
    }
  }, [pins]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await api<{ sessions: SwarmSession[] }>("/api/swarm/sessions");
      setSessions(body.sessions ?? []);
      if (!activeId && body.sessions?.length) setActiveId(body.sessions[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load swarms.");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActive = useCallback(async () => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    try {
      const body = await api<{ session: SwarmSession; messages: ChatMsg[] }>(`/api/swarm/sessions/${activeId}`);
      setMessages(body.messages ?? []);
      setStatus(`Chatting with ${body.session.name} (${body.session.size} agents, ${body.session.orchestration}).`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to load messages.");
    }
  }, [activeId]);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? null, [sessions, activeId]);

  function toggleTool(id: string) {
    setTools((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  async function hire() {
    setBusy(true);
    setStatus("Hiring your swarm…");
    try {
      const body = await api<{ session: SwarmSession; estimate: { display: string } }>("/api/swarm/sessions", {
        method: "POST",
        body: JSON.stringify({
          name,
          size,
          runtimes: runtimes.slice(0, size),
          system_prompt: systemPrompt,
          agent_prompts: agentPrompts.slice(0, size),
          orchestration,
          model,
          temperature,
          tools,
        }),
      });
      setSessions((s) => [body.session, ...s]);
      setActiveId(body.session.id);
      setMessages([]);
      setStatus(`Hired ${body.session.name}! Est. ${body.session.size}-agent turn: ${body.estimate.display}. Say hi.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Hire failed.");
    } finally {
      setBusy(false);
    }
  }

  function speak(text: string, force = false) {
    try {
      if ((!force && !speakReplies) || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      // Never read tool-call tags aloud; voice the human-readable part.
      const clean = text.replace(/\[tool:[^\]]*\]/gi, " ").replace(/\s+/g, " ").trim().slice(0, 300);
      if (!clean) return;
      const u = new SpeechSynthesisUtterance(clean);
      const v = window.speechSynthesis.getVoices().find((vv) => vv.name.toLowerCase().includes(voice));
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      // Voice is best-effort only.
    }
  }

  async function send(messageOverride?: string) {
    const raw = (messageOverride ?? draft).trim();
    const sendSessionId = activeIdRef.current;
    if (!raw || !sendSessionId || busy) return;
    // /commands; post-modern command palette inline.
    if (raw.startsWith("/")) {
      handleCommand(raw);
      return;
    }
    // Reply threading is real: quote the target message into the turn so the
    // swarm reasons with the context (the API only sees message text).
    const target = replyTo ? messages.find((m) => m.id === replyTo) : undefined;
    const quoted = target
      ? `↩ Replying to ${target.role === "user" ? "you" : target.agent_name || "swarm"}: "${target.text.slice(0, 300)}"\n${raw}`
      : raw;
    setReplyTo(null);
    setLastSent(raw);
    setBusy(true);
    setDraft("");
    const optimistic: ChatMsg = {
      id: `local-${Date.now()}`,
      role: "user",
      agent_index: -1,
      agent_name: "",
      text: quoted,
      tool_calls: [],
      gross_coins: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setStatus("Swarm is reasoning (observe→reason→act)…");
    try {
      const body = await api<{
        replies: Reply[];
        plan: { trace: string[] };
        cost: { display: string };
        fallback: boolean;
      }>(`/api/swarm/sessions/${sendSessionId}/chat`, { method: "POST", body: JSON.stringify({ message: quoted }) });
      // Session switch mid-turn: the reply belongs to the session that was
      // asked, not the one on screen. Never merge into the wrong thread;
      // the trail is on the server, so switching back shows it.
      if (activeIdRef.current !== sendSessionId) {
        setStatus("Swarm replied in the other session; switch back to see it.");
        void loadSessions();
        return;
      }
      setTrace(body.plan.trace ?? []);
      const at = new Date().toISOString();
      const userMsg: ChatMsg = { ...optimistic, id: `u-${Date.now()}` };
      const full: ChatMsg[] = body.replies.map((r, i) => ({
        id: `r-${Date.now()}-${i}`,
        role: "swarm",
        agent_index: r.agent,
        agent_name: r.agentName,
        text: r.text,
        tool_calls: r.toolCalls,
        gross_coins: 0,
        created_at: at,
      }));
      if (streaming) {
        // Spark-like typewriter fan-out: reveal each agent reply progressively.
        const shells: ChatMsg[] = full.map((f) => ({ ...f, text: "" }));
        setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), userMsg, ...shells]);
        const longest = Math.max(1, ...body.replies.map((r) => r.text.length));
        for (let ch = 3; ch <= longest; ch += 12) {
          await new Promise((r) => setTimeout(r, 12));
          const n = ch;
          setMessages((m) =>
            m.map((msg) => {
              if (!msg.id.startsWith("r-")) return msg;
              const idx = Number(msg.id.split("-")[2] ?? 0);
              const target = body.replies[idx]?.text ?? "";
              return { ...msg, text: target.slice(0, n) };
            }),
          );
        }
        setMessages((m) =>
          m.map((msg) => {
            if (!msg.id.startsWith("r-")) return msg;
            const idx = Number(msg.id.split("-")[2] ?? 0);
            return { ...msg, text: body.replies[idx]?.text ?? msg.text };
          }),
        );
      } else {
        setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), userMsg, ...full]);
      }
      setLastCost(`${body.cost.display}${body.fallback ? " (free local engine)" : ""}`);
      const first = body.replies[0];
      if (first) speak(`${first.agentName}: ${first.text}`);
      setStatus(body.fallback ? "Local engine replied free; add OPENAI_API_KEY for full reasoning." : "Swarm replied. Your turn.");
      void loadSessions();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Chat failed.");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setBusy(false);
    }
  }

  function handleCommand(raw: string) {
    const [cmd, ...rest] = raw.slice(1).split(" ");
    const arg = rest.join(" ").trim();
    setDraft("");
    if (cmd === "reset") {
      setMessages([]);
      setTrace([]);
      setStatus("Cleared locally; the saved trail stays on the server. Export first if it matters.");
    } else if (cmd === "persona" && arg) {
      setSystemPrompt(arg.slice(0, 2000));
      setStatus("Swarm instructions updated for the NEXT hire (running swarms keep theirs).");
    } else if (cmd === "delegate" && arg) {
      void send(arg);
    } else if (cmd === "export") {
      exportTrail("md");
    } else if (cmd === "voice" && arg) {
      if ((BUDDY_VOICES as { id: string }[]).some((v) => v.id === arg.toLowerCase())) {
        setVoice(arg.toLowerCase());
        setStatus(`Voice set to ${arg}.`);
      } else {
        setStatus(`Unknown voice. Try: ${BUDDY_VOICES.map((v) => v.id).join(", ")}`);
      }
    } else {
      setStatus("Commands: /reset /persona <text> /delegate <task> /export /voice <id>");
    }
  }

  function exportTrail(kind: "md" | "json") {
    const data = kind === "json" ? JSON.stringify(messages, null, 2) : messages.map((m) => `${m.role === "user" ? "You" : m.agent_name || "Swarm"}: ${m.text}`).join("\n\n");
    const blob = new Blob([data], { type: kind === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarm-${active?.name ?? "chat"}.${kind === "json" ? "json" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${messages.length} messages as ${kind.toUpperCase()}.`);
  }

  function startListening() {
    try {
      const w = window as unknown as { SpeechRecognition?: new () => { start: () => void; stop: () => void; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; onend: (() => void) | null } };
      const Rec = w.SpeechRecognition;
      if (!Rec) {
        setStatus("Voice input needs Chrome SpeechRecognition.");
        return;
      }
      const rec = new Rec();
      recogRef.current = rec;
      rec.onresult = (e) => {
        try {
          setDraft((d) => `${d} ${String(e.results[0][0].transcript ?? "")}`.trim().slice(0, 4000));
        } catch {
          // ignore partial failures
        }
      };
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setStatus("Could not start voice input.");
    }
  }

  async function endSwarm() {
    if (!activeId) return;
    try {
      await api(`/api/swarm/sessions/${activeId}/end`, { method: "POST", body: "{}" });
      setStatus("Swarm retired. Hire another anytime.");
      setActiveId("");
      setMessages([]);
      void loadSessions();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "End failed.");
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(q) || m.agent_name.toLowerCase().includes(q));
  }, [messages, search]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Spark-like config rail */}
      <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="Hire a swarm">
        <h2 className="text-lg font-bold">Hire an agent swarm</h2>
        <p className="mt-1 text-xs text-slate-400">
          {SWARM_MAX_AGENTS} agents max, billed per turn across the swarm; every price includes the 25% platform cut, never on top.
        </p>
        <label className="mt-4 block text-sm">Swarm name
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
        </label>
        <label className="mt-3 block text-sm">Agents: {size}
          <input type="range" min={1} max={SWARM_MAX_AGENTS} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
        </label>
        {Array.from({ length: size }, (_, i) => (
          <div key={i} className="mt-3 rounded-lg border border-white/10 p-2">
            <div className="flex items-center gap-2">
              <b className={AGENT_COLORS[i % AGENT_COLORS.length]}>Agent {i + 1}</b>
              <select value={runtimes[i] ?? "vibecodeworker"} onChange={(e) => setRuntimes((r) => { const n = [...r]; n[i] = e.target.value; return n; })} className="rounded-md border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-white">
                {RUNTIME_OPTIONS.map((r) => (<option key={r} value={r}>{RUNTIME_LABELS[r]}</option>))}
              </select>
            </div>
            <input value={agentPrompts[i] ?? ""} onChange={(e) => setAgentPrompts((p) => { const n = [...p]; n[i] = e.target.value.slice(0, 1200); return n; })} placeholder={`Role for agent ${i + 1} (e.g. planner, coder, artist)`} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" />
          </div>
        ))}
        <label className="mt-3 block text-sm">Custom system prompt (whole swarm)
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value.slice(0, 2000))} rows={3} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <label>Orchestration
            <select value={orchestration} onChange={(e) => setOrchestration(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white">
              <option value="auto">Auto (built-in reasoning)</option>
              <option value="lead">Lead agent</option>
              <option value="round-robin">Round-robin</option>
            </select>
          </label>
          <label>Model
            <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white">
              <option value="auto">Auto</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="local">Local (free)</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm">Temperature: {temperature.toFixed(2)}
          <input type="range" min={0} max={1.5} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full" />
        </label>
        <fieldset className="mt-3">
          <legend className="text-sm font-bold">Tools (every agent auto-uses these)</legend>
          {SWARM_TOOLS.map((t) => (
            <label key={t.id} className="mt-1 flex items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={tools.includes(t.id)} onChange={() => toggleTool(t.id)} className="mt-0.5" />
              <span><b className="text-white">{t.label}</b> <span className="text-slate-500">{t.id}</span><br />{t.blurb}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" disabled={busy} onClick={() => void hire()} className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "Hiring…" : `Hire ${size} agent${size === 1 ? "" : "s"}`}
        </button>
        <div className="mt-4 border-t border-white/10 pt-3">
          <h3 className="text-sm font-bold">My swarms</h3>
          {loading && <p className="text-xs text-slate-400">Loading…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <ul className="mt-2 space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setActiveId(s.id)} className={`w-full rounded-md px-2 py-1 text-left text-xs ${s.id === activeId ? "bg-cyan-900 text-cyan-100" : "bg-black/30 text-slate-300 hover:bg-black/50"}`}>
                  {s.name} · {s.size} agents · {s.status} · {s.turns} turns
                </button>
              </li>
            ))}
            {!sessions.length && !loading && <li className="text-xs text-slate-500">No swarms yet; hire your first above.</li>}
          </ul>
        </div>
      </aside>

      {/* Chat column */}
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="Swarm chat">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{active ? `${active.name} - ${active.size} agents` : "Swarm chat"}</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" aria-label="Search messages" className="ml-auto w-32 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" />
          <button type="button" onClick={() => exportTrail("md")} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">Export MD</button>
          <button type="button" onClick={() => exportTrail("json")} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">JSON</button>
          {active && active.status === "open" && <button type="button" onClick={() => void endSwarm()} className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-300">Retire</button>}
        </div>
        <p className="mt-1 text-xs text-slate-400" role="status">{status}</p>
        {(lastCost || trace.length > 0) && (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-slate-300">
            {lastCost && <p>💰 {lastCost}; includes 25% platform cut.</p>}
            {trace.length > 0 && (
              <div className="mt-1">
                <button type="button" onClick={() => setShowTrace((s) => !s)} className="text-cyan-300 hover:underline">
                  {showTrace ? "Hide" : "Show"} harness orchestration trace
                </button>
                {showTrace && <ul className="mt-1 list-disc pl-5 text-slate-400">{trace.map((t, i) => (<li key={i}>{t}</li>))}</ul>}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-1"><input type="checkbox" checked={streaming} onChange={(e) => setStreaming(e.target.checked)} /> Streaming</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={speakReplies} onChange={(e) => setSpeakReplies(e.target.checked)} /> Speak replies</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-white" aria-label="Voice">
            {BUDDY_VOICES.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
          </select>
          {replyTo && <button type="button" onClick={() => setReplyTo(null)} className="text-amber-300 hover:underline">↩ replying; cancel</button>}
        </div>
        <ul className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {visible.map((m) => (
            <li key={m.id} className={`rounded-xl border p-3 text-sm ${m.role === "user" ? "border-cyan-800 bg-cyan-950/40" : "border-white/10 bg-black/30"} ${pins.includes(m.id) ? "ring-1 ring-amber-400" : ""}`}>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <b className={m.role === "user" ? "text-cyan-200" : AGENT_COLORS[Math.max(0, m.agent_index) % AGENT_COLORS.length]}>
                  {m.role === "user" ? "You" : `${m.agent_name || "Swarm"} · agent ${(m.agent_index ?? 0) + 1}`}
                </b>
                <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                {m.gross_coins > 0 && <span title="This reply's share of the turn gross (25% cut included)">🪙{m.gross_coins}</span>}
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => setReplyTo(m.id)} className="hover:text-white">Reply</button>
                  <button type="button" onClick={() => setPins((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))} className="hover:text-white">{pins.includes(m.id) ? "Unpin" : "Pin"}</button>
                  <button type="button" onClick={() => { try { void navigator.clipboard.writeText(m.text); setStatus("Copied to clipboard."); } catch { setStatus("Copy failed."); } }} className="hover:text-white">Copy</button>
                  {m.role !== "user" && <button type="button" onClick={() => speak(`${m.agent_name ? `${m.agent_name}: ` : ""}${m.text}`, true)} className="hover:text-white" aria-label={`Speak this ${m.agent_name || "swarm"} message aloud`}>🔊</button>}
                  {m.role === "user" && <button type="button" onClick={() => { setDraft(m.text); setStatus("Editing; tweak and resend to branch the thread."); }} className="hover:text-white">Branch</button>}
                </span>
              </div>
              {replyTo === m.id && <p className="mt-1 text-xs text-amber-300">↩ replying to this message</p>}
              <div className="mt-1 text-slate-100" dangerouslySetInnerHTML={{ __html: renderLite(m.text) }} />
              {m.tool_calls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.tool_calls.map((t, i) => (<span key={i} className="rounded bg-violet-900 px-1.5 py-0.5 text-xs text-violet-100">🛠 {t.id} - {t.args.slice(0, 60)}</span>))}
                </div>
              )}
            </li>
          ))}
          {!visible.length && <li className="text-sm text-slate-500">{search ? "No messages match." : "No messages yet; say hi to your swarm."}</li>}
          <div ref={bottomRef} />
        </ul>
        <div className="mt-3 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(); }}
            rows={2}
            placeholder={active ? "Message the swarm… (Ctrl+Enter to send, / for commands)" : "Hire a swarm first, then chat here."}
            aria-label="Message the swarm"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="flex flex-col gap-2">
            <button type="button" disabled={busy || !activeId} onClick={() => void send()} className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
              {busy ? "…" : "Send"}
            </button>
            <button type="button" disabled={busy || !activeId || !lastSent} onClick={() => void send(lastSent)} title="Resend your last message as a fresh turn" className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 disabled:opacity-50">
              ↻ Regenerate
            </button>
            <button type="button" onClick={() => (listening ? recogRef.current?.stop() : startListening())} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">
              {listening ? "Stop 🎙" : "🎙 Voice"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Modern + beyond: streaming fan-out · markdown + code copy · ↻ regenerate (resends your last message) · branch any message · reply threading (quoted into the turn) · pins (saved on this device) · search · MD/JSON export · voice in/out + per-message 🔊 · per-agent roles + custom system prompts · orchestration trace · per-turn coin + 25% cut readout. Commands: /reset /persona /delegate /export /voice.
        </p>
      </section>
    </div>
  );
}
