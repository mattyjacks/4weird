"use client";

import { useState } from "react";

type VocrehabOutreachKind = "tour" | "trial" | "training";

const VOCREHAB_DETAILS_MAX = 2000;

export default function Page() {
  const [employer, setEmployer] = useState("");
  const [kind, setKind] = useState<VocrehabOutreachKind>("tour");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/vocrehab/pro/outreach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employer: employer.trim(), kind, details }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        subject?: string;
        body?: string;
      };
      if (!res.ok || data.success !== true) {
        throw new Error(data.error ?? "Outreach draft failed.");
      }
      setResult({ subject: String(data.subject ?? ""), body: String(data.body ?? "") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outreach draft failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.body);
      setCopied(true);
    } catch {
      setError("Copy failed — select the text and copy manually.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Business outreach generator</h1>
      <p className="text-sm text-muted-foreground">
        Short professional email drafts in your voice. Copy-only: you send
        from your own email client. VocRehab never sends and never stores
        contacts.
      </p>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-white/15 p-5"
      >
        <label className="block text-sm font-medium" htmlFor="vocrehab-employer">
          Employer name
          <input
            id="vocrehab-employer"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            maxLength={120}
            required
            autoComplete="off"
            placeholder="e.g. Harborview Bakery"
            className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="vocrehab-kind">
          Partnership type
          <select
            id="vocrehab-kind"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as VocrehabOutreachKind)
            }
            className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
          >
            <option value="tour">Site tour</option>
            <option value="trial">Trial work experience</option>
            <option value="training">Training partnership</option>
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="vocrehab-details">
          Two local details ({details.length}/{VOCREHAB_DETAILS_MAX})
          <textarea
            id="vocrehab-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={VOCREHAB_DETAILS_MAX}
            placeholder="e.g. Hiring part-time weekends on Route 9; manager mentioned job trials at the chamber breakfast."
            className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Drafting…" : "Draft outreach (copy-only)"}
        </button>
      </form>

      {result ? (
        <section
          aria-labelledby="vocrehab-outreach-result"
          className="rounded-xl border border-white/15 p-5"
        >
          <h2 id="vocrehab-outreach-result" className="text-lg font-bold">
            {result.subject}
          </h2>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white/5 p-3 text-sm">
            {result.body}
          </pre>
          <div className="mt-3 flex items-center gap-2" aria-live="polite">
            <button
              type="button"
              onClick={copy}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Copy draft
            </button>
            {copied ? (
              <span className="text-sm text-green-400">
                Copied — paste into your own email client to send.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
