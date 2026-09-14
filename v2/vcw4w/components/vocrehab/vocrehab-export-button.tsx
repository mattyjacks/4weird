/**
 * VocRehab export button (C6 snapshot).
 *
 * Usage:
 *   import VocrehabExportButton from "@/components/vocrehab/vocrehab-export-button";
 *   <VocrehabExportButton />
 *
 * JSON|CSV picker + consent line + GET `/api/vocrehab/export?format=`
 * download. Fail-open retry note when the download cannot start.
 * Styling: Tailwind utilities + `vocrehab-*` hooks only.
 */

"use client";

import { useState } from "react";

export default function VocrehabExportButton() {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setNote(null);
    if (!consent) {
      setNote("Please confirm the consent line first — your export downloads only with your say-so.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/vocrehab/export?format=${format}`, { method: "GET" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setNote(`Export did not start (${body?.error ?? `status ${res.status}`}). Nothing was lost — retry when ready.`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vocrehab-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNote("Download started. The file holds only allowlisted tables, and the download was logged to your history.");
    } catch {
      setNote("Network hiccup — the export did not start. Nothing was lost; retry when ready.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vocrehab-export-button space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex gap-2" role="radiogroup" aria-label="Export format">
        {(["json", "csv"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            className={format === f ? "rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800" : "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800"}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        I understand this downloads my own VocRehab data (allowlisted tables only) to this device.
      </label>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Preparing…" : `Download my export (${format.toUpperCase()})`}
      </button>
      {note ? <p className="text-sm text-stone-700" role="status">{note}</p> : null}
    </div>
  );
}
