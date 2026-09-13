"use client";

import { useState, useRef, useEffect } from "react";
import {
  calculateEasyDncCost,
  sanitizeCsvCell,
  FTC_TSR_MAX_FINE_PER_CALL,
  TCPA_STATUTORY_FINE_MIN,
  TCPA_STATUTORY_FINE_MAX,
  SAFE_HARBOR_DAYS,
} from "@/lib/easydnc";

interface ProcessedRow {
  row: string[];
  dnc: boolean | null;
  status: string;
  originalPhone: string;
}

export function EasyDncChecker() {
  const [apiKey, setApiKey] = useState("");
  const [useByok, setUseByok] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [phoneColumnIndex, setPhoneColumnIndex] = useState<number>(-1);
  const [fileName, setFileName] = useState("");
  const [isOutscraperFormat, setIsOutscraperFormat] = useState(false);

  // Flow states
  const [step, setStep] = useState<"upload" | "column" | "price" | "processing" | "results">("upload");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchHash, setBatchHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("easydnc_byok_key");
    if (saved) {
      setApiKey(saved);
      setUseByok(true);
    }
  }, []);

  function handleSaveKey(keyToSave: string) {
    setApiKey(keyToSave);
    if (keyToSave) {
      localStorage.setItem("easydnc_byok_key", keyToSave);
    } else {
      localStorage.removeItem("easydnc_byok_key");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      parseUploadedCsv(text);
    };
    reader.readAsText(file);
  }

  function parseUploadedCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setErrorMsg("CSV file is empty or missing data rows.");
      return;
    }

    const parsedHeaders = parseCsvLine(lines[0]);
    const parsedRows = lines.slice(1).map(parseCsvLine).filter((r) => r.length > 0);

    setHeaders(parsedHeaders);
    setCsvData(parsedRows);

    // Detect Outscraper headers (query, phones_enricher, site, rating, reviews, etc.)
    const lowerHeaders = parsedHeaders.map((h) => h.toLowerCase().trim());
    const isOutscraper = lowerHeaders.some((h) =>
      ["phones_enricher", "query", "place_id", "google_id", "reviews_tags"].includes(h)
    );
    setIsOutscraperFormat(isOutscraper);

    // Auto-detect phone column index
    let detectedIdx = -1;
    const phoneKeywords = ["phone", "cell", "mobile", "tel", "contact", "phones_enricher", "phone_number"];
    for (const kw of phoneKeywords) {
      const found = lowerHeaders.findIndex((h) => h.includes(kw));
      if (found !== -1) {
        detectedIdx = found;
        break;
      }
    }

    setPhoneColumnIndex(detectedIdx !== -1 ? detectedIdx : 0);
    setStep("column");
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  async function startProcessing() {
    if (phoneColumnIndex < 0 || phoneColumnIndex >= headers.length) {
      setErrorMsg("Please select a valid phone number column.");
      return;
    }

    setStep("processing");
    setErrorMsg("");
    abortRef.current = false;

    // Collect candidate numbers
    const rawPhones = csvData.map((row) => row[phoneColumnIndex] ?? "").filter(Boolean);
    setProgress({ completed: 0, total: rawPhones.length });

    try {
      const payload: Record<string, unknown> = {
        numbers: rawPhones,
        is_byok: useByok,
      };
      if (useByok && apiKey) {
        payload.api_key = apiKey;
      }

      const res = await fetch("/api/easydnc/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete DNC check batch.");
      }

      setBatchId(data.batch_id ?? null);
      setBatchHash(data.batch_hash ?? null);

      // Map results back to original rows
      const resultMap = new Map<string, { dnc: boolean; status: string }>();
      if (Array.isArray(data.results)) {
        for (const r of data.results) {
          resultMap.set(r.original, { dnc: r.dnc, status: r.status });
          resultMap.set(r.number, { dnc: r.dnc, status: r.status });
        }
      }

      const finalRows: ProcessedRow[] = csvData.map((row) => {
        const phone = row[phoneColumnIndex] ?? "";
        const match = resultMap.get(phone);
        return {
          row,
          dnc: match ? match.dnc : false,
          status: match ? match.status : "Clean",
          originalPhone: phone,
        };
      });

      setProcessedData(finalRows);
      setProgress({ completed: rawPhones.length, total: rawPhones.length });
      setStep("results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred during DNC check.");
      setStep("column");
    }
  }

  function downloadCsv(type: "complete" | "clean") {
    const today = new Date().toISOString().slice(0, 10);
    const newHeaders = ["DNC_STATUS", "DATE_CHECKED_UTC", ...headers];

    const source = type === "clean" ? processedData.filter((r) => r.dnc === false) : processedData;

    const csvLines = [
      newHeaders.map(sanitizeCsvCell).join(","),
      ...source.map((item) => {
        const statusLabel = item.dnc ? "ON DNC" : "CLEAN";
        const prefixed = [statusLabel, today, ...item.row];
        return prefixed.map(sanitizeCsvCell).join(",");
      }),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = type === "clean" ? `clean_leads_${today}.csv` : `complete_dnc_scrub_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadCertificate() {
    if (!batchId) return;
    window.open(`/api/easydnc/certificate?batch_id=${encodeURIComponent(batchId)}`, "_blank");
  }

  function resetAll() {
    setCsvData([]);
    setHeaders([]);
    setProcessedData([]);
    setPhoneColumnIndex(-1);
    setFileName("");
    setStep("upload");
    setErrorMsg("");
  }

  const cost = calculateEasyDncCost(csvData.length);
  const onDncCount = processedData.filter((r) => r.dnc === true).length;
  const cleanCount = processedData.filter((r) => r.dnc === false).length;

  return (
    <div className="space-y-8">
      {/* Statutory Legal Alert Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
              FTC TSR Safe Harbor Standard · 31-Day Rule
            </span>
            <h2 className="text-xl font-bold text-white">Do Not Call Telephony Compliance Engine</h2>
            <p className="text-xs text-slate-300 sm:text-sm">
              Under FTC TSR (16 CFR § 310.4), you must scrub calling lists at least every{" "}
              <strong className="text-cyan-300">{SAFE_HARBOR_DAYS} days</strong> (weekly scrubbing strongly
              recommended).
            </p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-right text-xs">
            <p className="font-semibold text-red-300">Government Fine Per Call:</p>
            <p className="text-sm font-extrabold text-white">
              Up to ${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} <span className="text-xs font-normal text-slate-400">(TSR)</span>
            </p>
            <p className="text-xs text-slate-400">
              ${TCPA_STATUTORY_FINE_MIN}–${TCPA_STATUTORY_FINE_MAX.toLocaleString()} per call (TCPA)
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-slate-400">
          <strong>Disclaimer:</strong> MattyJacks LLC provides this tool strictly as-is and assumes no liability for you calling or contacting anyone on the DNC list. Upon request, we will at our sole discretion provide cryptographically signed evidence that your list was authentically run through EasyDNC at a certified date and time.
        </div>
      </div>

      {/* Mode & Key Configuration */}
      <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Billing & Credentials</h3>
            <p className="text-xs text-slate-400">
              {useByok
                ? "Using your personal EasyDNC API Key (BYOK Mode)."
                : "Paying seamlessly with 4weird Vibe Coins (2.5 🪙 / $0.025 per lookup). Includes our standard 25% platform cut."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseByok(false)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                !useByok ? "bg-cyan-600 text-white" : "border border-white/10 bg-white/[.05] text-slate-400"
              }`}
            >
              🪙 Vibe Coins (2.5 🪙)
            </button>
            <button
              type="button"
              onClick={() => setUseByok(true)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                useByok ? "bg-cyan-600 text-white" : "border border-white/10 bg-white/[.05] text-slate-400"
              }`}
            >
              🔑 BYOK API Key
            </button>
          </div>
        </div>

        {useByok && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              placeholder="Enter your EasyDNC API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSaveKey(apiKey)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
            >
              Save Key
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/50 bg-red-950/60 p-4 text-sm text-red-300">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Step 1: Upload CSV */}
      {step === "upload" && (
        <div className="rounded-2xl border-2 border-dashed border-white/20 bg-white/[.02] p-10 text-center transition hover:border-cyan-400/50">
          <input
            type="file"
            id="csv-file-upload"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="csv-file-upload" className="cursor-pointer space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-950/50 text-3xl">
              📂
            </div>
            <p className="text-lg font-bold text-white">Upload Lead List or Outscraper CSV</p>
            <p className="text-xs text-slate-400">
              Drag and drop or browse for a .csv file containing phone numbers to scrub.
            </p>
            <span className="inline-block rounded-xl border border-cyan-500/40 bg-cyan-950/70 px-4 py-2 text-xs font-bold text-cyan-300">
              Select CSV File
            </span>
          </label>
        </div>
      )}

      {/* Step 2: Column Selection & Outscraper Detection */}
      {step === "column" && (
        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Select Phone Number Column</h3>
              <p className="text-xs text-slate-400">
                File: <strong className="text-cyan-300">{fileName}</strong> ({csvData.length} rows detected)
              </p>
            </div>

            {isOutscraperFormat && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
                ✨ Outscraper.com Format Detected
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="phone-col-select" className="text-sm font-semibold text-slate-300">
              Phone Column:
            </label>
            <select
              id="phone-col-select"
              value={phoneColumnIndex}
              onChange={(e) => setPhoneColumnIndex(parseInt(e.target.value, 10))}
              className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h} (Column {i + 1})
                </option>
              ))}
            </select>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={`p-3 ${i === phoneColumnIndex ? "bg-cyan-950 text-cyan-300" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {csvData.slice(0, 4).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`p-3 ${cIdx === phoneColumnIndex ? "bg-cyan-950/40 font-mono text-cyan-200" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[.05]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep("price")}
              className="rounded-xl bg-cyan-600 px-6 py-2 text-sm font-bold text-white hover:bg-cyan-500"
            >
              Continue to Price Confirmation &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Price Confirmation */}
      {step === "price" && (
        <div className="rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white">Review & Confirm Scrub Run</h3>
          <p className="mt-1 text-xs text-slate-400">
            Confirm processing details and Vibe Coin debit for {csvData.length} telephone records.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Total Numbers</p>
              <p className="mt-1 text-2xl font-black text-white">{cost.totalNumbers}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Rate Per Lookup</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                2.5 🪙 <span className="text-xs text-slate-400">($0.025)</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-xs text-slate-400">Total Cost</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">
                {cost.grossCoins} 🪙 <span className="text-xs text-slate-400">(${cost.grossUsd})</span>
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs text-slate-400">
            <div className="flex justify-between py-1">
              <span>Upstream API & Provider Execution (75%):</span>
              <strong className="text-slate-200">{cost.providerCoins} 🪙 (${cost.providerUsd})</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>4weird Platform Security & Infrastructure Cut (25%):</span>
              <strong className="text-cyan-300">{cost.cutCoins} 🪙 (${cost.cutUsd})</strong>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("column")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[.05]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={startProcessing}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500"
            >
              Confirm & Start DNC Check ({cost.grossCoins} 🪙)
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {step === "processing" && (
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 animate-spin items-center justify-center rounded-full border-4 border-cyan-400 border-t-transparent text-2xl" />
          <h3 className="mt-6 text-xl font-bold text-white">Scrubbing Against National DNC Registry...</h3>
          <p className="mt-1 text-xs text-slate-400">
            Normalizing numbers, verifying against the FTC registry, and generating cryptographic safe-harbor audit trail.
          </p>

          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-slate-900">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === "results" && (
        <div className="space-y-6 rounded-2xl border border-emerald-500/40 bg-slate-950 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-white">Scrub Completed Successfully!</h3>
              <p className="text-xs text-slate-400">
                Safe Harbor active for <strong>{SAFE_HARBOR_DAYS} days</strong> under FTC TSR 16 CFR § 310.4.
              </p>
            </div>
            {batchId && (
              <button
                type="button"
                onClick={downloadCertificate}
                className="rounded-xl border border-cyan-400/40 bg-cyan-950/60 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60"
              >
                📜 View Authentic Safe Harbor Certificate
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-xs text-slate-400">Total Checked</p>
              <p className="mt-1 text-2xl font-black text-white">{processedData.length}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-center">
              <p className="text-xs text-red-300">Registered on DNC</p>
              <p className="mt-1 text-2xl font-black text-red-400">{onDncCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-center">
              <p className="text-xs text-emerald-300">Clean (Safe to Call)</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{cleanCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-xs text-slate-400">Total Coins Charged</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">{cost.grossCoins} 🪙</p>
            </div>
          </div>

          {onDncCount > 0 && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200">
              ⚠️ <strong>{onDncCount} numbers</strong> were identified on the National Do Not Call Registry. Calling these numbers incurs severe government penalties of up to <strong>${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} per call</strong>. Always use the Clean CSV export.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[.05]"
            >
              Scrub Another File
            </button>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => downloadCsv("complete")}
                className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[.10]"
              >
                Download Complete File
              </button>
              <button
                type="button"
                onClick={() => downloadCsv("clean")}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500"
              >
                Download Clean File ({cleanCount} Safe Numbers)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
