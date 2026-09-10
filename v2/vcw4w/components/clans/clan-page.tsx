"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReportButton } from "@/components/clans/report-button";

type Post = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

async function convertPngOver1MB(file: File): Promise<{ file: File; note: string }> {
  const ONE_MB = 1_048_576;
  if (file.size <= ONE_MB || file.type !== "image/png") return { file, note: `${Math.round(file.size / 1024)}KB` };
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, note: `${Math.round(file.size / 1024)}KB` };
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= ONE_MB) {
      return {
        file: new File([blob], file.name.replace(/\.png$/i, ".jpg"), { type: "image/jpeg" }),
        note: `converted PNG→JPEG q=${q} (${Math.round(blob.size / 1024)}KB)`,
      };
    }
  }
  const fallback = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.3));
  if (!fallback) return { file, note: `${Math.round(file.size / 1024)}KB` };
  return {
    file: new File([fallback], file.name.replace(/\.png$/i, ".jpg"), { type: "image/jpeg" }),
    note: `converted PNG→JPEG q=0.3 (${Math.round(fallback.size / 1024)}KB — may still exceed 1MB)`,
  };
}

export function ClanPage({ slug }: { slug: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [clanName, setClanName] = useState(slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clans/${slug}`);
      const data = (await res.json()) as {
        success?: boolean;
        clan?: { name?: string };
        posts?: Post[];
        error?: string;
      };
      if (!data.success) throw new Error(data.error ?? "Load failed.");
      setPosts(data.posts ?? []);
      if (data.clan?.name) setClanName(data.clan.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    const res = await fetch(`/api/clans/${slug}`, { method: "POST" });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!data.success) {
      if (res.status === 401) {
        window.location.href = `/auth/login?next=/clans/${slug}`;
        return;
      }
      setNotice(data.error ?? "Join failed.");
      return;
    }
    setJoined(true);
    setNotice("Joined! You can post now.");
  }

  async function pickAndUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setFileNote("");
    try {
      const { file, note } = await convertPngOver1MB(f);
      setFileNote(note);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/clans/upload", { method: "POST", body: form });
      const data = (await res.json()) as { success?: boolean; url?: string; error?: string };
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "Upload failed.");
      }
      setImageUrl(data.url ?? "");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setNotice("");
    try {
      const res = await fetch(`/api/clans/${slug}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body: bodyText, image_url: imageUrl || undefined }),
      });
      const data = (await res.json()) as { success?: boolean; status?: string; error?: string };
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "Post failed.");
      }
      setTitle("");
      setBodyText("");
      setImageUrl("");
      setFileNote("");
      if (fileRef.current) fileRef.current.value = "";
      setNotice(data.status === "pending" ? "Posted — held for review (pending)." : "Posted!");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Post failed.");
    } finally {
      setPosting(false);
    }
  }

  async function submitComment(postId: string) {
    try {
      const res = await fetch(`/api/clans/post/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText }),
      });
      const data = (await res.json()) as { success?: boolean; status?: string; error?: string };
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=/clans/${slug}`;
          return;
        }
        throw new Error(data.error ?? "Comment failed.");
      }
      setCommentText("");
      setCommentFor(null);
      setNotice(data.status === "pending" ? "Comment held for review (pending)." : "Comment posted!");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Comment failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black text-white">{clanName}</h1>
        {!joined && (
          <button onClick={join} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">
            Join clan
          </button>
        )}
      </div>

      <form onSubmit={submitPost} className="rounded-xl border border-cyan-400/20 bg-slate-900 p-5">
        <h2 className="font-bold text-cyan-300">New post</h2>
        <p className="mt-1 text-xs text-slate-400">Login + membership required. Images: 1MB max after conversion.</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (max 120)"
          maxLength={120}
          required
          className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
        />
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Body (max 8000)"
          maxLength={8000}
          required
          rows={4}
          className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickAndUpload} className="text-sm text-slate-300" />
          {uploading && <span className="text-sm text-slate-400">Uploading…</span>}
          {fileNote && <span className="text-xs text-slate-400">size: {fileNote}</span>}
        </div>
        {imageUrl && (
          <p className="mt-2 break-all text-xs text-cyan-300">attached: {imageUrl}</p>
        )}
        <button
          type="submit"
          disabled={posting || uploading}
          className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
        >
          {posting ? "Posting…" : "Post"}
        </button>
        {notice && <p className="mt-2 text-sm text-slate-300">{notice}</p>}
      </form>

      {loading && <p className="text-slate-400">Loading posts…</p>}
      {error && <p className="text-red-400">{error}</p>}
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.id} className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-white">{p.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{p.body}</p>
            {p.image_url && (
              <img src={p.image_url} alt="" loading="lazy" className="mt-3 max-h-80 rounded-lg border border-white/10" />
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setCommentFor(commentFor === p.id ? null : p.id)}
                className="text-sm text-cyan-300 hover:underline"
              >
                Comment
              </button>
              <ReportButton targetType="post" targetId={p.id} />
            </div>
            {commentFor === p.id && (
              <div className="mt-3 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment (max 2000)"
                  maxLength={2000}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <button
                  onClick={() => void submitComment(p.id)}
                  className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950"
                >
                  Send
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!loading && !error && posts.length === 0 && (
        <p className="text-slate-400">No posts yet — be the first.</p>
      )}
    </div>
  );
}
