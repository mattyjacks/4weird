"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownView } from "@/components/clans/markdown-view";

type ChatChannel = {
  id: string;
  slug: string;
  name: string;
  topic: string;
  kind: string;
  position: number;
  readonly: boolean;
};

type ChatMessage = {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  reply_to: string | null;
  status: string;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
};

type Reaction = { message_id: string; user_id: string; emoji: string };
type Member = { user_id: string; role: string };
type ClanEvent = {
  id: string;
  channel_id: string | null;
  title: string;
  description: string;
  starts_at: string;
};

const QUICK_EMOJI = ["👍", "❤️", "😂", "🔥", "👾"];

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

export function ClanChat({ slug }: { slug: string }) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [newChan, setNewChan] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? channels[0] ?? null;

  // Reaction lookup is O(1) per message: the feed re-renders every 5s poll,
  // so a linear filter per message would be O(messages x reactions) on the
  // main thread. Grouped once here instead.
  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    for (const r of reactions) {
      const list = map.get(r.message_id);
      if (list) list.push(r);
      else map.set(r.message_id, [r]);
    }
    return map;
  }, [reactions]);

  const loadSidebar = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${slug}/channels`);
      const data = (await res.json()) as {
        success?: boolean;
        channels?: ChatChannel[];
        members?: Member[];
        member_total?: number;
        events?: ClanEvent[];
      };
      if (!data.success) return;
      setChannels(data.channels ?? []);
      setMembers(data.members ?? []);
      setMemberTotal(Number(data.member_total) || (data.members ?? []).length);
      setEvents(data.events ?? []);
    } catch {
      // Sidebar stays as-is on failure; polling retries.
    }
  }, [slug]);

  const loadMessages = useCallback(
    async (channelId: string) => {
      if (!channelId) return;
      try {
        const res = await fetch(`/api/clans/${slug}/channels/${channelId}?limit=50`);
        const data = (await res.json()) as {
          success?: boolean;
          messages?: ChatMessage[];
          reactions?: Reaction[];
        };
        if (!data.success) return;
        setMessages(data.messages ?? []);
        setReactions(data.reactions ?? []);
      } catch {
        // Keep the last good snapshot.
      }
    },
    [slug],
  );

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  useEffect(() => {
    const id = active?.id;
    if (!id) return;
    setActiveId(id);
    void loadMessages(id);
    // Hidden tabs skip polls: no GPU/CPU/network burned for an unseen feed.
    // Visible tabs poll every 5s as before.
    const tick = () => {
      if (!document.hidden) void loadMessages(id);
    };
    const timer = setInterval(tick, 5000);
    const onVis = () => {
      if (!document.hidden) void loadMessages(id);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active?.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || sending || !text.trim()) return;
    setSending(true);
    setNotice("");
    try {
      const res = await fetch(`/api/clans/${slug}/channels/${active.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim(), reply_to: replyTo }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "Send failed.");
      }
      setText("");
      setReplyTo(null);
      await loadMessages(active.id);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    try {
      const res = await fetch(`/api/clans/${slug}/messages/${messageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "React failed.");
      }
      if (active) await loadMessages(active.id);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "React failed.");
    }
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = newChan.trim().replace(/^#+/, "");
    if (!name) return;
    setNotice("");
    try {
      const res = await fetch(`/api/clans/${slug}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: name.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), name: `#${name}` }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? "Create failed.");
      setNewChan("");
      await loadSidebar();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Create failed.");
    }
  }

  const owners = members.filter((m) => m.role === "owner");
  const mods = members.filter((m) => m.role === "mod");
  const regulars = members.filter((m) => m.role === "member");

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="font-bold text-cyan-300">💬 Clan chat</h2>
        <p className="mt-1 text-xs text-slate-400">
          Channels, threads (reply), emoji reactions, pins, events, and roles. Every message is
          Valley Net screened and pays the standard server-cost fee.
        </p>
      </div>
      <div className="grid md:grid-cols-[200px_1fr_180px]">
        {/* Channel sidebar */}
        <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r">
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Channels</p>
          <ul className="mt-1 space-y-1">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  title={c.topic || c.name}
                  className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-sm ${
                    active?.id === c.id
                      ? "bg-cyan-400/15 font-bold text-cyan-200"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {c.readonly ? "📢" : c.kind === "media" ? "🖼️" : "#"} {c.name.replace(/^#/, "")}
                </button>
              </li>
            ))}
            {channels.length === 0 && (
              <li className="px-2 text-xs text-slate-500">No channels yet; check back soon.</li>
            )}
          </ul>
          <form onSubmit={createChannel} className="mt-3 flex gap-1">
            <input
              id="new-channel-name-input"
              name="newChannelName"
              aria-label="New channel name"
              value={newChan}
              onChange={(e) => setNewChan(e.target.value)}
              placeholder="+ channel"
              maxLength={30}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"
            />
            <button type="submit" className="rounded-lg bg-cyan-400 px-2 py-1.5 text-xs font-bold text-slate-950">
              Add
            </button>
          </form>
          {events.length > 0 && (
            <div className="mt-4">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Events</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-300">
                {events.map((ev) => (
                  <li key={ev.id} className="rounded-lg bg-black/30 px-2 py-1.5">
                    <span className="font-bold text-white">📅 {ev.title}</span>
                    <br />
                    <span className="text-slate-400">{new Date(ev.starts_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Message feed */}
        <div className="flex flex-col">
          <div className="border-b border-white/10 px-4 py-2 text-sm text-slate-300">
            <span className="font-bold text-white">{active?.readonly ? "📢" : active?.kind === "media" ? "🖼️" : "#"} {active?.name ?? "general"}</span>
            {active?.topic && <span className="ml-2 text-xs text-slate-400">- {active.topic}</span>}
          </div>
          <div className="perf-list flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "420px" }}>
            {messages.map((m) => {
              const myReactions = reactionsByMessage.get(m.id) ?? [];
              return (
                <div key={m.id} className="group rounded-lg p-2 transition hover:bg-white/5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">{shortId(m.author_id)}</span>
                    <span className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleTimeString()}</span>
                    {m.reply_to && (
                      <span className="text-[10px] text-slate-400">↳ replying to {shortId(m.reply_to)}</span>
                    )}
                    {m.status === "pending" && (
                      <span className="rounded bg-amber-400/20 px-1 text-[10px] text-amber-300">pending</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-100">
                    <MarkdownView text={m.body} />
                  </div>
                  {m.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" loading="lazy" className="mt-2 max-h-60 rounded border border-white/10" />
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    {QUICK_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => void react(m.id, emoji)}
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          myReactions.some((r) => r.emoji === emoji) ? "bg-cyan-400/20 text-cyan-200" : "hover:bg-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setReplyTo(m.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-cyan-300"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">No messages yet; say hi.</p>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="border-t border-white/10 p-3">
            {replyTo && (
              <p className="mb-2 text-xs text-slate-400">
                Replying to {shortId(replyTo)}{" "}
                <button type="button" onClick={() => setReplyTo(null)} className="text-red-300 hover:underline">
                  cancel
                </button>
              </p>
            )}
            <div className="flex gap-2">
              <input
                id="clan-chat-input"
                name="chatText"
                aria-label="Chat message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={active?.readonly ? "📢 announcements; owners/mods only" : `Message ${active?.name ?? ""} (markdown OK)`}
                maxLength={2000}
                className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
            {notice && <p className="mt-2 text-xs text-slate-300">{notice}</p>}
          </form>
        </div>

        {/* Member sidebar */}
        <div className="border-t border-white/10 p-3 md:border-l md:border-t-0">
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Members ({memberTotal.toLocaleString()}{memberTotal > members.length ? ` · showing ${members.length}` : ""})
          </p>
          {[
            ["👑 Owner", owners],
            ["🛡️ Mods", mods],
            ["👾 Members", regulars],
          ].map(([label, list]) => {
            const rows = list as Member[];
            if (rows.length === 0) return null;
            return (
              <div key={label as string} className="mt-2">
                <p className="px-2 text-xs font-bold text-slate-400">{label as string}</p>
                <ul className="mt-1 space-y-1">
                  {rows.slice(0, 30).map((m) => (
                    <li key={m.user_id} className="truncate px-2 font-mono text-xs text-slate-300">
                      {shortId(m.user_id)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {members.length === 0 && <p className="px-2 text-xs text-slate-500">Just you (so far).</p>}
        </div>
      </div>
    </section>
  );
}
