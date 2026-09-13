"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline client island for the /code landing page (DS-404-06): paste a
 * submission ID → routes to /code/<id>. Input is validated locally with a
 * friendly error for empty input; a pasted audit URL is trimmed down to its
 * trailing ID.
 */
export function CodeLookupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) {
      setError("Paste a submission ID first — it’s the part after /code/ in your audit URL.");
      return;
    }
    // Accept either a bare ID or a pasted /code/<id> URL.
    const id = raw.includes("/code/")
      ? (raw.split("/code/").pop() ?? "").split(/[?#]/)[0].trim().replace(/\/+$/, "")
      : raw.split(/[?#]/)[0].trim();
    if (!id) {
      setError("That doesn’t look like a submission ID — check the part after /code/ and try again.");
      return;
    }
    setError("");
    router.push(`/code/${encodeURIComponent(id)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-5"
      aria-label="Look up a submission audit"
    >
      <label htmlFor="code-id" className="text-sm font-bold">
        Look up an audit
      </label>
      <p className="mt-1 text-sm text-slate-400">
        Paste your submission ID to open its verdict, findings, and audit.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="code-id"
          name="code-id"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. 9f2KxQ41 or a /code/… URL"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-id-error" : undefined}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-slate-950 px-4 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-black text-white"
        >
          Open audit →
        </button>
      </div>
      {error && (
        <p id="code-id-error" role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
