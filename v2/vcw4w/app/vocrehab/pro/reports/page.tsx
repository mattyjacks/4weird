"use client";

import { useEffect, useMemo, useState } from "react";

const states = ["WA", "NY", "NH"] as const;
type StateCode = (typeof states)[number];
type Enroll = { id: string; kid_id: string; client_label: string };
type Source = { title: string; url: string; revision: string; sections: string[] };
type FieldDefinition = { key: string; label: string };
type Jurisdiction = { name: string; agency: string; sourceMetadata: Source[]; fieldSet: string; fields: FieldDefinition[] };
type Report = {
  document_type: string;
  state: StateCode;
  jurisdiction: Jurisdiction;
  prepared_at: string;
  client: { label: string; age_band: string; handle: string };
  notice: string;
  field_set: string;
  practitioner_fields: Record<string, string>;
  field_definitions: FieldDefinition[];
  activity: { game_sessions: unknown[]; saved_game_states: unknown[] };
};

function draftKey(state: StateCode, enrollmentId: string) {
  return `vocrehab-report-draft:${state}:${enrollmentId}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function VocrehabReportsPage() {
  const [state, setState] = useState<StateCode>("WA");
  const [enrollments, setEnrollments] = useState<Enroll[]>([]);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const clientLabel = useMemo(() => enrollments.find(item => item.id === enrollmentId)?.client_label || "Child account", [enrollments, enrollmentId]);

  useEffect(() => {
    void fetch("/api/vocrehab/clients").then(r => r.json()).then(j => {
      const items: Enroll[] = j.enrollments ?? [];
      setEnrollments(items);
      if (items[0]) setEnrollmentId(items[0].id);
    }).catch(() => setError("Could not load enrolled child accounts."));
  }, []);

  useEffect(() => {
    if (!report || !enrollmentId) return;
    const storageKey = draftKey(state, enrollmentId);
    window.localStorage.setItem(storageKey, JSON.stringify(report));
  }, [report, state, enrollmentId]);

  async function generate() {
    setError(""); setReport(null);
    if (!enrollmentId) { setError("Enable a VocRehab client workspace for a child first."); return; }
    try {
      const r = await fetch(`/api/vocrehab/reports?state=${state}&enrollment_id=${encodeURIComponent(enrollmentId)}`);
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Unable to prepare report."); return; }
      const fresh = j.report as Report;
      const saved = window.localStorage.getItem(draftKey(state, enrollmentId));
      if (saved) {
        try {
          const draft = JSON.parse(saved) as Report;
          if (draft.state === state && Object.keys(fresh.practitioner_fields).every(key => typeof draft.practitioner_fields?.[key] === "string")) {
            fresh.practitioner_fields = { ...fresh.practitioner_fields, ...draft.practitioner_fields };
          }
        } catch { window.localStorage.removeItem(draftKey(state, enrollmentId)); }
      }
      setReport(fresh);
    } catch { setError("Unable to prepare worksheet. Check your connection and try again."); }
  }

  function loadDraft() {
    if (!enrollmentId) { setError("Select a client first."); return; }
    const saved = window.localStorage.getItem(draftKey(state, enrollmentId));
    if (!saved) { setError("No saved draft was found on this device for this state and client."); return; }
    try {
      const draft = JSON.parse(saved) as Report;
      if (draft.state !== state || !draft.practitioner_fields || !draft.field_definitions) throw new Error("Invalid draft");
      setError(""); setReport(draft);
    } catch {
      window.localStorage.removeItem(draftKey(state, enrollmentId));
      setError("The saved draft could not be read. Prepare a new worksheet.");
    }
  }

  function updateField(key: string, value: string) {
    setReport(current => current ? { ...current, practitioner_fields: { ...current.practitioner_fields, [key]: value } } : current);
  }

  function download(format: "json" | "csv") {
    if (!report) return;
    const content = format === "json"
      ? JSON.stringify(report, null, 2)
      : [
          ["Section", "Field", "Value"].map(csvCell).join(","),
          ...report.field_definitions.map(field => ["Counselor worksheet", field.label, report.practitioner_fields[field.key] ?? ""].map(csvCell).join(",")),
          ...report.activity.game_sessions.map((item, index) => ["Game activity", `Session ${index + 1}`, JSON.stringify(item)].map(csvCell).join(",")),
          ...report.activity.saved_game_states.map((item, index) => ["Saved game data", `Saved state ${index + 1}`, JSON.stringify(item)].map(csvCell).join(",")),
        ].join("\r\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `vocrehab-${state.toLowerCase()}-${enrollmentId.slice(0, 8)}-draft.${format}`; a.click(); URL.revokeObjectURL(url);
  }

  return <main className="mx-auto max-w-4xl space-y-5 p-6">
    <h1 className="text-2xl font-bold">State report worksheet</h1>
    <p>Build an editable activity summary for counselor review. Washington DVR, New York ACCES-VR, and New Hampshire VR have distinct records and provider forms. This worksheet is not an official form or compliance guarantee.</p>
    <section className="flex flex-wrap items-end gap-3 rounded-xl border p-4" aria-label="Worksheet setup">
      <label className="grid gap-1">State<select value={state} onChange={e => { setState(e.target.value as StateCode); setReport(null); setError(""); }} className="rounded border bg-transparent p-2">{states.map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="grid gap-1">Client<select value={enrollmentId} onChange={e => { setEnrollmentId(e.target.value); setReport(null); setError(""); }} className="min-w-48 rounded border bg-transparent p-2">{enrollments.map(link => <option key={link.id} value={link.id}>{link.client_label || "Child account"}</option>)}</select></label>
      <button onClick={generate} className="rounded bg-primary px-4 py-2 text-primary-foreground">Prepare worksheet</button>
      <button onClick={loadDraft} className="rounded border px-4 py-2">Load device draft</button>
    </section>
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {report && <section className="space-y-5 rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{report.jurisdiction.name} · {report.jurisdiction.agency} draft worksheet</h2><p>Client: {report.client.label || clientLabel}{report.client.age_band ? ` · ${report.client.age_band}` : ""}</p><p className="text-sm opacity-70">Prepared {new Date(report.prepared_at).toLocaleString()}</p></div><span aria-live="polite" className="text-sm">Autosaved on this device</span></div>
      <p className="rounded bg-amber-500/10 p-3 text-sm">{report.notice}</p>
      <div><h3 className="font-semibold">Source and revision</h3><ul className="mt-2 list-disc space-y-2 pl-5">{report.jurisdiction.sourceMetadata.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span> — {source.revision}</span><ul className="list-[circle] pl-5">{source.sections.map(section => <li key={section}>{section}</li>)}</ul></li>)}</ul></div>
      <div className="space-y-3"><div><h3 className="font-semibold">Counselor worksheet · {report.field_set.replaceAll("_", " ")}</h3><p className="text-sm opacity-70">Enter case information for review. Drafts auto-save in this browser on this device.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{report.field_definitions.map(field => <label key={field.key} className="grid gap-1 text-sm"><span className="font-medium">{field.label}</span><textarea value={report.practitioner_fields[field.key] ?? ""} onChange={e => updateField(field.key, e.target.value)} rows={field.key.includes("history") || field.key.includes("rationale") || field.key.includes("duties") || field.key.includes("results") || field.key.includes("progress") ? 4 : 2} className="w-full rounded border bg-transparent p-2" /></label>)}</div>
      </div>
      <details><summary className="cursor-pointer font-semibold">Supplemental game activity ({report.activity.game_sessions.length} sessions, {report.activity.saved_game_states.length} saved states)</summary><p className="mt-2 text-sm">This supplemental activity log is included in the exports. Review it for relevance and accuracy before sharing.</p><pre className="mt-2 max-h-72 overflow-auto rounded bg-black/5 p-3 text-xs dark:bg-white/5">{JSON.stringify(report.activity, null, 2)}</pre></details>
      <div className="flex flex-wrap gap-2"><button onClick={() => download("json")} className="rounded border px-4 py-2">Download JSON</button><button onClick={() => download("csv")} className="rounded border px-4 py-2">Download CSV</button><button onClick={() => window.print()} className="rounded border px-4 py-2">Print / save PDF</button><button onClick={() => setReport(null)} className="rounded border px-4 py-2">Close worksheet</button></div>
    </section>}
    <aside className="rounded-xl border p-4 text-sm"><strong>State-specific draft worksheets</strong><p className="mt-2">The cited agency sources and field lists are shown with each worksheet. Drafts stay in this browser and are not synchronized to the server or shared with other devices. Exports include the filled fields and supplemental activity.</p><p className="mt-2">Verify current forms, timelines, documentation, and consent rules with the state agency before submitting. This export is not an official case record.</p></aside>
  </main>;
}
