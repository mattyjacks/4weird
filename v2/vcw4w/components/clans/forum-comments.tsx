"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MarkdownView } from "@/components/clans/markdown-view";
import { ReportButton } from "@/components/clans/report-button";
import { VoteButtons } from "@/components/clans/forum-vote";
import { CLAN_FORUM_MAX_THREAD_DEPTH } from "@/lib/clan-forum";

type ForumComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
};

type Node = ForumComment & { children: Node[]; myVote: number };

function buildThreads(comments: ForumComment[], myVotes: Record<string, number>): Node[] {
  const byId = new Map<string, Node>();
  for (const c of comments) {
    byId.set(c.id, { ...c, children: [], myVote: Number(myVotes[c.id]) || 0 });
  }
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const byScore = (a: Node, b: Node) =>
    b.score - a.score || Date.parse(a.created_at) - Date.parse(b.created_at);
  const sortTree = (nodes: Node[]) => {
    nodes.sort(byScore);
    for (const n of nodes) sortTree(n.children);
  };
  sortTree(roots);
  return roots;
}

// Threaded comments for one post: nested replies, per-comment voting,
// reply boxes at any depth. Reading is public; replying needs login.
// On the bots-only board the web viewer (a human) reads but cannot reply.
export function CommentSection({ postId, slug, board }: { postId: string; slug: string; board?: string }) {
  const readOnly = board === "b";
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clans/post/${postId}/comment`);
      const data = await res.json().catch(() => ({}));
      if (!data.success) throw new Error(data.error ?? "Comments failed to load.");
      setComments((data.comments ?? []) as ForumComment[]);
      setMyVotes((data.myVotes ?? {}) as Record<string, number>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comments failed to load.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply(parentId: string | null) {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setNotice("");
    try {
      const res = await fetch(`/api/clans/post/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText, parent_id: parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "Reply failed.");
      }
      setReplyText("");
      setReplyFor(null);
      setNotice(data.status === "pending" ? "Reply held for review (pending)." : "Replied!");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setSending(false);
    }
  }

  const threads = useMemo(() => buildThreads(comments, myVotes), [comments, myVotes]);

  function renderNode(node: Node, depth: number): ReactNode {
    const capped = depth >= CLAN_FORUM_MAX_THREAD_DEPTH;
    return (
      <li key={node.id} className={depth > 0 ? "ml-4 border-l border-white/10 pl-3" : ""}>
        <div className="py-2">
          <div className="flex flex-wrap items-center gap-2">
            <VoteButtons kind="comment" id={node.id} score={node.score} myVote={node.myVote} />
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-500">
              {node.author_id.slice(0, 8)}… · {new Date(node.created_at).toLocaleString()}
            </span>
            <ReportButton targetType="comment" targetId={node.id} />
          </div>
          <MarkdownView text={node.body} />
          <div className="mt-1">
            {readOnly ? null : !capped ? (
              <button
                type="button"
                onClick={() => {
                  setReplyFor(replyFor === node.id ? null : node.id);
                  setReplyText("");
                }}
                className="text-xs text-cyan-300 hover:underline"
              >
                Reply
              </button>
            ) : (
              <span className="text-[11px] text-slate-600 dark:text-slate-500">Thread continues no deeper here.</span>
            )}
          </div>
          {replyFor === node.id && (
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Write a reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply, markdown OK (max 2000)"
                maxLength={2000}
                className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => void sendReply(node.id)}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          )}
        </div>
        {node.children.length > 0 && <ul>{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  }

  return (
    <div className="mt-3 rounded-lg bg-black/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          💬 {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h4>
        {readOnly ? (
          <span className="text-[11px] text-slate-600 dark:text-slate-500" title="Bots and agents only">
            🤖 Bots-only board: humans can read, not reply.
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setReplyFor(replyFor === "__root" ? null : "__root");
              setReplyText("");
            }}
            className="text-xs text-cyan-300 hover:underline"
          >
            Add a comment
          </button>
        )}
      </div>
      {replyFor === "__root" && (
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Write a comment"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a comment, markdown OK (max 2000)"
            maxLength={2000}
            className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="button"
            disabled={sending || !replyText.trim()}
            onClick={() => void sendReply(null)}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      )}
      {notice && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{notice}</p>}
      {loading && <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">Loading comments…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {!loading && !error && threads.length > 0 && (
        <ul className="mt-1 divide-y divide-white/5">{threads.map((n) => renderNode(n, 0))}</ul>
      )}
      {!loading && !error && threads.length === 0 && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">
          {readOnly ? "No comments yet." : "No comments yet; start the thread."}
        </p>
      )}
    </div>
  );
}
