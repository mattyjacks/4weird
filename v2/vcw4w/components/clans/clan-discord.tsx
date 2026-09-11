"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function ClanDiscord({ slug }: { slug: string }) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [newChan, setNewChan] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? channels[0] ?? null;

  const loadSidebar = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${slug}/channels`);
      const data = (await res.json()) as {
        success?: boolean;
        channels?: ChatChannel[];
        members?: Member[];
        events?: ClanEvent[];
      };
      if (!data.success) return;
      setChannels(data.channels ?? []);
      setMembers(data.members ?? []);
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
    const timer = setInterval(() => void loadMessages(id), 5000);
    return () => clearInterval(timer);
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
        <h2 className="font-bold text-cyan-300">💬 Clan chat (discord-style)</h2>
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
              <li className="px-2 text-xs text-slate-500">No channels yet — check back soon.</li>
            )}
          </ul>
          <form onSubmit={createChannel} className="mt-3 flex gap-1">
            <input
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
        <div className="flex min-h-[320px] flex-col">
          <div className="border-b border-white/5 px-4 py-2 text-sm text-slate-300">
            {active ? (
              <>
                <b className="text-white">{active.name}</b>
                {active.topic && <span className="ml-2 text-xs text-slate-500">{active.topic}</span>}
              </>
            ) : (
              "Pick a channel"
            )}
          </div>
          <div className="max-h-96 flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m) => {
              const replyTarget = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null;
              const mReacts = reactions.filter((r) => r.message_id === m.id);
              const counts = new Map<string, number>();
              for (const r of mReacts) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
              return (
                <div key={m.id} className="rounded-lg bg-black/30 px-3 py-2">
                  {m.pinned && <p className="text-[11px] font-bold text-amber-300">📌 Pinned</p>}
                  {replyTarget && (
                    <p className="truncate border-l-2 border-cyan-400/40 pl-2 text-xs text-slate-500">
                      ↳ {shortId(replyTarget.author_id)}: {replyTarget.body.slice(0, 80)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    <span className="font-mono text-cyan-300">{shortId(m.author_id)}</span> ·{" "}
                    {new Date(m.created_at).toLocaleString()}
                    {m.edited_at && " · edited"}
                  </p>
                  <div className="text-sm text-slate-200">
                    <MarkdownView text={m.body} />
                  </div>
                  {counts.size > 0 && (
                    <p className="mt-1 text-sm">
                      {[...counts.entries()].map(([emoji, n]) => (
                        <span key={emoji} className="mr-1 rounded bg-white/10 px-1.5 py-0.5">
                          {emoji} {n}
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {QUICK_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => void react(m.id, emoji)}
                        className="rounded px-1 text-sm hover:bg-white/10"
                        aria-label={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setReplyTo(m.id)}
                      className="rounded px-1 text-xs text-slate-400 hover:bg-white/10 hover:text-cyan-300"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">No messages yet — say hi.</p>
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={active?.readonly ? "📢 announcements — owners/mods only" : `Message ${active?.name ?? ""} (markdown OK)`}
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
            Members ({members.length})
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
