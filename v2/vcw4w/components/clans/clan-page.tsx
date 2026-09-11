"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReportButton } from "@/components/clans/report-button";
import { ClanChat } from "@/components/clans/clan-chat";
import { ClanSupport } from "@/components/clans/clan-support";
import { LoveButtons } from "@/components/clans/love-buttons";
import { LoveQuests } from "@/components/clans/love-quests";
import { MarkdownEditor } from "@/components/clans/markdown-editor";
import { MarkdownView } from "@/components/clans/markdown-view";
import { CLAN_TYPE_META, type ClanType } from "@/lib/clan-types";
import { clanLevelForXp } from "@/lib/clan-xp";

type Post = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

type ClanInfo = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  owner_id?: string;
  clan_type?: string;
  upkeep_status?: string;
  upkeep_grace_until?: string;
};

type Bot = { id: string; name: string; created_at: string };
type Channel = { id: string; kind: string; label: string; target_url: string; active: boolean };
type LedgerRow = { kind: string; qty: number; gross: number; cut: number; provider: number; note: string; created_at: string };
type Leader = { user_id: string; xp: number; events: number };
type MinuteRate = {
  per_minute_coins?: number;
  per_day_coins?: number;
  members?: number;
  image_mb?: number;
  db_kb?: number;
  breakdown?: { server?: number; members?: number; images?: number; database?: number };
};

const TYPE_BADGE: Record<string, string> = {
  hclan: "🧍 hclan · humans only",
  sclan: "🤝 sclan · humans + bots",
  bclan: "🤖 bclan · bot-native",
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
    note: `converted PNG→JPEG q=0.3 (${Math.round(fallback.size / 1024)}KB; may still exceed 1MB)`,
  };
}

export function ClanPage({ slug }: { slug: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [clan, setClan] = useState<ClanInfo>({});
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
  const [wallet, setWallet] = useState<{ balance: number }>({ balance: 0 });
  const [bots, setBots] = useState<Bot[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [myXp, setMyXp] = useState(0);
  const [botName, setBotName] = useState("");
  const [botHook, setBotHook] = useState("");
  const [econNote, setEconNote] = useState("");
  const [fundCoins, setFundCoins] = useState("");
  const [donateCoins, setDonateCoins] = useState("");
  const [minuteRate, setMinuteRate] = useState<MinuteRate | null>(null);
  const [chanKind, setChanKind] = useState("house-ad");
  const [chanLabel, setChanLabel] = useState("");
  const [chanUrl, setChanUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clans/${slug}`);
      const data = (await res.json()) as {
        success?: boolean;
        clan?: ClanInfo;
        posts?: Post[];
        wallet?: { balance: number };
        bots?: Bot[];
        channels?: Channel[];
        ledger?: LedgerRow[];
        leaders?: Leader[];
        minuteRate?: MinuteRate | null;
        myXp?: number;
        error?: string;
      };
      if (!data.success) throw new Error(data.error ?? "Load failed.");
      setPosts(data.posts ?? []);
      setClan(data.clan ?? {});
      if (data.clan?.name) setClanName(data.clan.name);
      setWallet(data.wallet ?? { balance: 0 });
      setBots(data.bots ?? []);
      setChannels(data.channels ?? []);
      setLedger(data.ledger ?? []);
      setLeaders(data.leaders ?? []);
      setMinuteRate(data.minuteRate ?? null);
      setMyXp(Number(data.myXp) || 0);
      // House-ad revenue: one credited view per active house-ad channel per
      // page load (server IP-throttles to 10/hr; revenue offsets upkeep).
      for (const c of data.channels ?? []) {
        if (c.kind === "house-ad" && c.active) {
          void fetch(`/api/clans/${slug}/economy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "ad-view", channel_id: c.id }),
          });
        }
      }
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
      setNotice(data.status === "pending" ? "Posted; held for review (pending)." : "Posted! Server-cost fee charged (min 0.01 coins, 25% cut included).");
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

  async function econ(path: string, payload: Record<string, unknown>, okMsg: string) {
    setEconNote("");
    try {
      const res = await fetch(`/api/clans/${slug}/economy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? "Failed.");
      setEconNote(okMsg);
      await load();
    } catch (err) {
      setEconNote(err instanceof Error ? err.message : "Failed.");
    }
  }

  async function deployBot(e: React.FormEvent) {
    e.preventDefault();
    setEconNote("");
    try {
      const res = await fetch(`/api/clans/${slug}/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy", bot_username: botName, webhook_url: botHook || undefined }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? "Deploy failed.");
      setBotName("");
      setBotHook("");
      setEconNote("Bot deployed on this clan.");
      await load();
    } catch (err) {
      setEconNote(err instanceof Error ? err.message : "Deploy failed.");
    }
  }

  async function removeBot(id: string) {
    setEconNote("");
    try {
      const res = await fetch(`/api/clans/${slug}/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? "Remove failed.");
      setEconNote("Bot removed.");
      await load();
    } catch (err) {
      setEconNote(err instanceof Error ? err.message : "Remove failed.");
    }
  }

  async function affiliateClick(c: Channel) {
    try {
      const res = await fetch(`/api/clans/${slug}/economy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "affiliate-click", channel_id: c.id }),
      });
      // Interstitial + noreferrer: owner-controlled URLs open without Referer
      // leak; users see the full destination before leaving.
      if (res.ok && c.target_url) {
        const okGo = window.confirm(`Leave 4weird for:\n${c.target_url}`);
        if (okGo) window.open(c.target_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (c.target_url) window.open(c.target_url, "_blank", "noopener,noreferrer");
    }
  }

  const clanType = (clan.clan_type ?? "sclan") as ClanType;
  const typeMeta = CLAN_TYPE_META[clanType] ?? CLAN_TYPE_META.sclan;
  const level = clanLevelForXp(myXp);
  const upkeep = clan.upkeep_status ?? "healthy";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black text-white">{clanName}</h1>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
          {TYPE_BADGE[clanType] ?? clanType}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          🛡️ Protected by Valley Net
        </span>
        {!joined && (
          <button onClick={join} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">
            Join clan
          </button>
        )}
      </div>
      <p className="text-sm text-slate-400">{typeMeta.blurb} {typeMeta.bots}</p>

      <form onSubmit={submitPost} className="rounded-xl border border-cyan-400/20 bg-slate-900 p-5">
        <h2 className="font-bold text-cyan-300">New post</h2>
        <p className="mt-1 text-xs text-slate-400">
          Login + membership required. Markdown supported. Images: 1MB max after conversion.
          Every post pays a linear server-cost fee (min 0.01 coins, 25% cut included).
        </p>
        <input
          id="clan-post-title"
          name="postTitle"
          aria-label="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (max 120)"
          maxLength={120}
          required
          className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
        />
        <div className="mt-3">
          <MarkdownEditor value={bodyText} onChange={setBodyText} placeholder="Body markdown (max 8000)" maxLength={8000} rows={4} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input id="clan-post-file" name="postFile" aria-label="Attach image" ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickAndUpload} className="text-sm text-slate-300" />
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
            <MarkdownView text={p.body} />
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
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
            <LoveButtons postId={p.id} />
            {commentFor === p.id && (
              <div className="mt-3 flex gap-2">
                <input
                  id={`clan-comment-input-${p.id}`}
                  name="commentText"
                  aria-label="Write a comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment, markdown OK (max 2000)"
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
        <p className="text-slate-400">No posts yet; be the first.</p>
      )}

      <ClanChat slug={slug} />

      <LoveQuests clanId={clan.id} clanSlug={slug} />

      <ClanSupport slug={slug} />

      <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
        <h2 className="font-bold text-cyan-300">🪙 Clan upkeep + wallet</h2>
        <p className="mt-1 text-xs text-slate-400">
          The creator funds the server wallet and any member can donate directly (1:1, no cut).
          Upkeep is billed every minute at :00; stored images, database bytes, measured
          bandwidth, Luna AI moderation, and base server share. Delinquent clans pause
          posting/chat until funded. Ad views + affiliate clicks earn revenue that offsets
          upkeep. New clans get 14 days grace.
        </p>
        {minuteRate && (
          <div className="mt-3 rounded-lg bg-black/40 px-3 py-2 text-xs text-slate-300">
            <span className="font-bold text-white">⏱️ Live server rate: </span>
            {Number(minuteRate.per_minute_coins ?? 0).toFixed(6)} coins/min
            {" "}(≈ {Number(minuteRate.per_day_coins ?? 0).toFixed(4)}/day ·{" "}
            {minuteRate.members ?? 0} members · {minuteRate.image_mb ?? 0} MB images ·{" "}
            {minuteRate.db_kb ?? 0} KB text)
            {minuteRate.breakdown && (
              <span className="text-slate-500">
                {" "}- server {Number(minuteRate.breakdown.server ?? 0).toFixed(6)} · members{" "}
                {Number(minuteRate.breakdown.members ?? 0).toFixed(6)} · images{" "}
                {Number(minuteRate.breakdown.images ?? 0).toFixed(6)} · db{" "}
                {Number(minuteRate.breakdown.database ?? 0).toFixed(6)}
              </span>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-black/40 px-3 py-2 text-white">Wallet: <b>{wallet.balance}</b> coins</span>
          <span className="rounded-lg bg-black/40 px-3 py-2 text-white">
            Upkeep: <b className={upkeep === "healthy" ? "text-emerald-300" : upkeep === "low" ? "text-amber-300" : "text-red-300"}>{upkeep}</b>
          </span>
          <span className="rounded-lg bg-black/40 px-3 py-2 text-white">Your XP: <b>{myXp}</b> ({level.title})</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Fund wallet (creator)</h3>
            <div className="mt-2 flex gap-2">
              <input id="fund-coins-input" name="fundCoins" aria-label="Coins to fund" value={fundCoins} onChange={(e) => setFundCoins(e.target.value)} placeholder="coins" inputMode="decimal" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <button onClick={() => void econ("", { action: "fund", coins: Number(fundCoins) }, "Wallet funded.")} className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950">Fund</button>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-200">Donate upkeep (members)</h3>
            <p className="mt-1 text-xs text-slate-500">Any member can chip in directly, 1:1, no cut.</p>
            <div className="mt-2 flex gap-2">
              <input id="donate-coins-input" name="donateCoins" aria-label="Coins to donate" value={donateCoins} onChange={(e) => setDonateCoins(e.target.value)} placeholder="coins" inputMode="decimal" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <button onClick={() => void econ("", { action: "donate", coins: Number(donateCoins) }, "Donation received; thank you!")} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950">Donate</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Add revenue channel (owner)</h3>
            <div className="mt-2 space-y-2">
              <select id="channel-kind-select" name="chanKind" aria-label="Revenue channel kind" value={chanKind} onChange={(e) => setChanKind(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                <option value="house-ad">house-ad (0.01/view)</option>
                <option value="affiliate">affiliate (0.05/click)</option>
                <option value="sponsor">sponsor</option>
              </select>
              <input id="channel-label-input" name="chanLabel" aria-label="Channel label" value={chanLabel} onChange={(e) => setChanLabel(e.target.value)} placeholder="Label" maxLength={120} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <input id="channel-url-input" name="chanUrl" aria-label="Channel target URL" value={chanUrl} onChange={(e) => setChanUrl(e.target.value)} placeholder="https://… (optional)" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <button onClick={() => void econ("", { action: "channel", kind: chanKind, label: chanLabel, target_url: chanUrl }, "Channel added.")} className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950">Add channel</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Clan type (owner)</h3>
            <div className="mt-2 flex gap-2">
              <select id="clan-type-pick" name="clanType" aria-label="Clan type" defaultValue={clanType} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                <option value="hclan">hclan; humans only</option>
                <option value="sclan">sclan; shared</option>
                <option value="bclan">bclan; bot-native</option>
              </select>
              <button
                onClick={() => {
                  const el = document.getElementById("clan-type-pick") as HTMLSelectElement | null;
                  void econ("", { action: "type", clan_type: el?.value ?? "sclan" }, "Clan type changed.");
                }}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950"
              >
                Set
              </button>
            </div>
          </div>
        </div>
        {econNote && <p className="mt-2 text-sm text-slate-300">{econNote}</p>}
        {channels.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-200">Revenue channels</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {channels.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-black/40 px-2 py-1">{c.kind}</span>
                  <span>{c.label}</span>
                  {c.kind === "affiliate" && c.target_url && (
                    <button onClick={() => void affiliateClick(c)} className="text-cyan-300 hover:underline">visit ↗</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ledger.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-200">Recent ledger</h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {ledger.slice(0, 10).map((r, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 border-t border-white/5 pt-1">
                  <span>{r.kind} · {r.note}</span>
                  <span>+{r.provider} wallet · {r.cut} cut · gross {r.gross}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
        <h2 className="font-bold text-cyan-300">🤖 Deployed bots {clanType === "hclan" ? "(disabled; hclan)" : `(${bots.length})`}</h2>
        <p className="mt-1 text-xs text-slate-400">
          {clanType === "hclan"
            ? "hclans are hardened against bots: no bot reads, joins, posts, or deploys."
            : "Owners/mods can deploy their own bots here by bot username (+ optional https webhook)."}
        </p>
        {bots.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {bots.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">🤖 {b.name}</span>
                <button onClick={() => void removeBot(b.id)} className="text-xs text-red-300 hover:underline">remove</button>
              </li>
            ))}
          </ul>
        )}
        {clanType !== "hclan" && (
          <form onSubmit={deployBot} className="mt-3 flex flex-wrap gap-2">
            <input value={botName} onChange={(e) => setBotName(e.target.value.toLowerCase())} placeholder="bot username" pattern="[a-z0-9_]{3,24}" required className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={botHook} onChange={(e) => setBotHook(e.target.value)} placeholder="https webhook (optional)" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <button type="submit" className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950">Deploy bot</button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
        <h2 className="font-bold text-cyan-300">🏆 Clan leaderboard (XP)</h2>
        <p className="mt-1 text-xs text-slate-400">Posts +10 · comments +3 · bot deploys +15 · funding upkeep +20. Daily cap 100 XP.</p>
        {leaders.length > 0 ? (
          <ol className="mt-3 space-y-1 text-sm text-slate-300">
            {leaders.map((l, i) => (
              <li key={l.user_id} className="flex flex-wrap justify-between gap-2 border-t border-white/5 pt-1">
                <span>#{i + 1} <span className="font-mono text-xs">{l.user_id.slice(0, 8)}…</span></span>
                <span><b className="text-white">{l.xp}</b> XP · {l.events} events</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No XP yet; post something.</p>
        )}
      </section>
    </div>
  );
}
