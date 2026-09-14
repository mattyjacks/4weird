"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  vocrehabConsentText,
  vocrehabRedactPii,
} from "@/lib/vocrehab-privacy";

/** Minimal local shape — never import @/types/vocrehab-* here. */
interface VocrehabInboxSession {
  id: string;
  client_ref: string;
  consent_id: string | null;
  source: string;
  created_at: string;
}

const VOCREHAB_TRANSCRIPT_MAX = 20000;

export default function Page() {
  const router = useRouter();
  const [sessions, setSessions] = useState<VocrehabInboxSession[]>([]);
  const [inboxNote, setInboxNote] = useState<string | null>(null);
  const [clientRef, setClientRef] = useState("");
  const [source, setSource] = useState<"pasted" | "dictated">("pasted");
  const [transcript, setTranscript] = useState("");
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/vocrehab/pro/sessions", { method: "GET" })
      .then(async (res) => {
        const data = (await res.json()) as {
          success?: boolean;
          sessions?: VocrehabInboxSession[];
          error?: string;
        };
        if (!live) return;
        if (data.success === true) {
          setSessions(data.sessions ?? []);
        } else {
          setInboxNote(data.error ?? "Inbox unavailable.");
        }
      })
      .catch(() => {
        if (live) setInboxNote("Inbox unavailable. Sign in to view sessions.");
      });
    return () => {
      live = false;
    };
  }, []);

  const pii = useMemo(() => vocrehabRedactPii(transcript), [transcript]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vocrehab/pro/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript_text: transcript,
          client_ref: clientRef.trim(),
          source,
          attested,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        session_id?: string;
      };
      if (!res.ok || data.success !== true || !data.session_id) {
        throw new Error(data.error ?? "Draft request failed.");
      }
      router.push(`/vocrehab/pro/sessions/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Session assistant inbox</h1>
      <p className="text-sm text-muted-foreground">
        Paste or dictate one session&apos;s notes. You get four draft boxes to
        review — case note, progress measure, rationale, outreach. Nothing
        files or sends itself.
      </p>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-white/15 p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor="vocrehab-client-ref">
            Client (initials or role label)
            <input
              id="vocrehab-client-ref"
              value={clientRef}
              onChange={(e) => setClientRef(e.target.value)}
              maxLength={64}
              required
              placeholder="e.g. J.D. / job seeker"
              autoComplete="off"
              className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="vocrehab-source">
            Note source
            <select
              id="vocrehab-source"
              value={source}
              onChange={(e) =>
                setSource(e.target.value === "dictated" ? "dictated" : "pasted")
              }
              className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
            >
              <option value="pasted">Pasted transcript / notes</option>
              <option value="dictated">Dictated in browser</option>
            </select>
          </label>
        </div>

        <label
          className="block text-sm font-medium"
          htmlFor="vocrehab-transcript"
        >
          Session notes ({transcript.length}/{VOCREHAB_TRANSCRIPT_MAX})
          <textarea
            id="vocrehab-transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            maxLength={VOCREHAB_TRANSCRIPT_MAX}
            required
            placeholder="Paste session notes or dictation here. Use initials/role labels, not full names."
            className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
          />
        </label>

        <div aria-live="polite">
          {pii.redactions_applied.length > 0 ? (
            <div className="rounded-md border border-amber-300/40 bg-amber-300/10 p-3 text-sm">
              <p>
                Warning: this text looks like it contains PII shapes (
                {pii.redactions_applied.join(", ")}). Redact before
                drafting.
              </p>
              <button
                type="button"
                onClick={() => setTranscript(pii.text)}
                className="mt-2 rounded-md border border-amber-300/60 px-3 py-1.5 text-sm hover:bg-amber-300/20"
              >
                Redact now (one tap)
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No SSN / email / phone / DOB shapes detected. Double-check for
              full names before drafting.
            </p>
          )}
        </div>

        <label
          htmlFor="vocrehab-consent"
          className="flex cursor-pointer items-start gap-2 text-sm"
        >
          <input
            id="vocrehab-consent"
            type="checkbox"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            required
            className="mt-1"
          />
          <span>{vocrehabConsentText("session-assist")}</span>
        </label>

        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !attested}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Drafting…" : "Draft four boxes for review"}
        </button>
      </form>

      <section aria-labelledby="vocrehab-inbox-heading">
        <h2 id="vocrehab-inbox-heading" className="text-lg font-bold">
          Prior sessions (yours only)
        </h2>
        {inboxNote ? (
          <p className="mt-1 text-sm text-muted-foreground">{inboxNote}</p>
        ) : sessions.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No sessions yet. Your first draft run will appear here.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/vocrehab/pro/sessions/${s.id}`}
                  className="block rounded-xl border border-white/15 p-4 hover:bg-white/5"
                >
                  <span className="font-bold">{s.client_ref}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {s.source} · {s.created_at}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
