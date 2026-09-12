"use client";

import { useEffect, useState } from "react";

// Compact up/down voter for a post or comment. Toggle semantics: tapping
// the active vote clears it. Voting needs login + membership (server-enforced);
// guests are sent to login on 401.
export function VoteButtons({
  kind,
  id,
  score: initialScore,
  myVote: initialMine,
  onChange,
}: {
  kind: "post" | "comment";
  id: string;
  score: number;
  myVote: number;
  onChange?: (score: number, myVote: number) => void;
}) {
  const [score, setScore] = useState(initialScore);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setScore(initialScore);
    setMine(initialMine);
  }, [initialScore, initialMine, id]);

  async function vote(v: 1 | -1) {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const path = kind === "post" ? `/api/clans/post/${id}/vote` : `/api/clans/comment/${id}/vote`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: mine === v ? 0 : v }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=${window.location.pathname}`;
          return;
        }
        throw new Error(data.error ?? "Vote failed.");
      }
      const nextScore = Number(data.score) || 0;
      const nextMine = Number(data.myVote) || 0;
      setScore(nextScore);
      setMine(nextMine);
      onChange?.(nextScore, nextMine);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Vote failed.");
    } finally {
      setBusy(false);
    }
  }

  const upActive = mine === 1;
  const dnActive = mine === -1;
  return (
    <span className="inline-flex items-center gap-1" title={note || "Vote"}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void vote(1)}
        aria-label="Upvote"
        aria-pressed={upActive}
        className={`rounded px-1.5 py-0.5 text-sm font-black leading-none disabled:opacity-50 ${
          upActive ? "bg-orange-400 text-slate-950" : "bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-white/10"
        }`}
      >
        ▲
      </button>
      <span className={`min-w-8 text-center text-sm font-bold ${score > 0 ? "text-orange-300" : score < 0 ? "text-sky-300" : "text-slate-600 dark:text-slate-300"}`}>
        {score}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void vote(-1)}
        aria-label="Downvote"
        aria-pressed={dnActive}
        className={`rounded px-1.5 py-0.5 text-sm font-black leading-none disabled:opacity-50 ${
          dnActive ? "bg-sky-400 text-slate-950" : "bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-white/10"
        }`}
      >
        ▼
      </button>
    </span>
  );
}
