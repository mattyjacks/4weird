"use client";

import { useEffect, useState, type FormEvent } from "react";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { readStoredSchedule } from "@/components/vocrehab/vocrehab-schedule-store";

const gameIds = ["schedule-juggle", "file-sort", "inbox-sprint", "focus-shift", "barrier-run", "time-punch", "tool-match", "resume-rescue", "phone-greeting", "paycheck-plan", "energy-budget"];
type Child = { id: string; username: string; discriminator: string };
type Enrollment = { id: string; kid_id: string; client_label: string };
type Template = { id: string; title: string; game_id: string; state: Record<string, unknown>; enrollment_id: string | null; is_shared: boolean };
type SavedState = { id: string; title: string; game_id: string; state: Record<string, unknown>; stateText?: string; updated_at: string; template_id: string | null };

export default function VocrehabLibraryPage() {
  const [message, setMessage] = useState("");
  const [kids, setKids] = useState<Child[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [editingState, setEditingState] = useState<SavedState | null>(null);
  const [launchHref, setLaunchHref] = useState("");
  const [selectedKid, setSelectedKid] = useState("");
  const [passwordKid, setPasswordKid] = useState("");
  const [assignedEnrollment, setAssignedEnrollment] = useState("");
  const [isKid, setIsKid] = useState(false);
  async function refresh() {
    const [clientResponse, templateResponse, savedResponse] = await Promise.all([fetch("/api/vocrehab/clients"), fetch("/api/vocrehab/templates"), fetch(`/api/vocrehab/saved-states${selectedKid ? `?kid_id=${encodeURIComponent(selectedKid)}` : ""}`)]);
    const clientData = await clientResponse.json(); const templateData = await templateResponse.json();
    if (clientResponse.ok) { setKids(clientData.kids ?? []); setEnrollments(clientData.enrollments ?? (clientData.enrollment ? [clientData.enrollment] : [])); setIsKid(clientData.actor === "kid"); }
    if (templateResponse.ok) setTemplates(templateData.templates ?? []);
    const savedData = await savedResponse.json();
    if (savedResponse.ok) setSavedStates(savedData.saved_states ?? []);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- refresh is the async load for the currently selected child scope.
  useEffect(() => { void refresh(); }, [selectedKid]);
  async function enroll(kidId: string) {
    const response = await fetch("/api/vocrehab/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kid_id: kidId }) });
    const json = await response.json(); setMessage(response.ok ? "VocRehab client link enabled for this parent-owned child account." : json.error || "Could not enable link.");
    if (response.ok) void refresh();
  }
  async function saveTemplate(form: FormData) {
    const raw = String(form.get("state") || "{}"); let state: unknown;
    try { state = JSON.parse(raw); } catch { setMessage("State must be valid JSON."); return; }
    if (!state || typeof state !== "object" || Array.isArray(state)) { setMessage("State must be a JSON object."); return; }
    const stateObject = state as Record<string, unknown>;
    state = { ...stateObject, seed: parseSeed(typeof stateObject.seed === "string" ? stateObject.seed : null) ?? makeSeed() };
    const enrollmentId = String(form.get("enrollment_id") || "");
    const response = await fetch("/api/vocrehab/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game_id: form.get("game_id"), title: form.get("title"), description: form.get("description"), state, enrollment_id: enrollmentId || null }) });
    const json = await response.json(); setMessage(response.ok ? `Template saved${json.template.enrollment_id ? " for the selected child account" : " privately"}.` : json.error || "Could not save template.");
    if (response.ok) void refresh();
  }
  async function saveDeviceCalendarTemplate() {
    const calendar = readStoredSchedule();
    if (!calendar) { setMessage("No saved Schedule Juggle calendar was found on this device."); return; }
    const state = { ...calendar, seed: makeSeed() };
    const response = await fetch("/api/vocrehab/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game_id: "schedule-juggle", title: "Schedule Juggle calendar", description: "Full calendar snapshot saved from this device.", state, enrollment_id: !isKid ? assignedEnrollment || null : null }) });
    const json = await response.json();
    setMessage(response.ok ? `Full calendar saved${json.template.enrollment_id ? " and assigned to the selected client" : " privately"}.` : json.error || "Could not save calendar template.");
    if (response.ok) void refresh();
  }
  async function saveState(form: FormData) {
    let state: unknown;
    try { state = JSON.parse(String(form.get("state") || "{}")); } catch { setMessage("State must be valid JSON."); return; }
    const response = await fetch("/api/vocrehab/saved-states", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game_id: form.get("game_id"), title: form.get("title"), state, kid_id: selectedKid || null }) });
    const json = await response.json(); setMessage(response.ok ? `Saved game state (${json.saved_state.id}).` : json.error || "Could not save state.");
    if (response.ok) void refresh();
  }
  async function updateSavedState() {
    if (!editingState) return;
    let state: unknown;
    try { state = JSON.parse(String(editingState.stateText ?? JSON.stringify(editingState.state, null, 2))); } catch { setMessage("State must be valid JSON."); return; }
    if (!state || typeof state !== "object" || Array.isArray(state)) { setMessage("State must be a JSON object."); return; }
    const response = await fetch("/api/vocrehab/saved-states", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingState.id, title: editingState.title, state }) });
    const json = await response.json(); setMessage(response.ok ? "Saved game data updated." : json.error || "Could not update saved state.");
    if (response.ok) { setEditingState(null); void refresh(); }
  }
  async function deleteSavedState(id: string) {
    const response = await fetch(`/api/vocrehab/saved-states?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await response.json(); setMessage(response.ok ? "Saved game data deleted." : json.error || "Could not delete saved state.");
    if (response.ok) { if (editingState?.id === id) setEditingState(null); void refresh(); }
  }
  async function changeChildPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const response = await fetch("/api/vocrehab/clients/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current_password: fields.get("current_password"), new_password: fields.get("new_password") }) });
    const json = await response.json();
    setMessage(response.ok ? json.notice || "Password changed." : json.error || "Could not change password.");
    if (response.ok) form.reset();
  }
  async function resetProviderChildPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const kidId = String(fields.get("kid_id") || "");
    const response = await fetch(`/api/family/kids/${encodeURIComponent(kidId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: fields.get("new_password") }) });
    const json = await response.json();
    setMessage(response.ok ? "Password reset. The child must sign in again on all devices." : json.error || "Could not reset child password.");
    if (response.ok) form.reset();
  }
  async function copyTemplate(template: Template) {
    const seed = parseSeed(typeof template.state.seed === "string" ? template.state.seed : null) ?? makeSeed();
    const state = { ...template.state, seed };
    const assignedClient = template.enrollment_id ? enrollments.find(link => link.id === template.enrollment_id) : undefined;
    const kidId = isKid ? undefined : assignedClient?.kid_id;
    const response = await fetch("/api/vocrehab/saved-states", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game_id: template.game_id, title: template.title, state, template_id: template.id, ...(kidId ? { kid_id: kidId } : {}) }) });
    const json = await response.json();
    if (response.ok) {
      const savedStateId = typeof json.saved_state?.id === "string" ? json.saved_state.id : "";
      const launchParams = new URLSearchParams({ seed });
      if (savedStateId) {
        launchParams.set("savedStateId", savedStateId);
        if (kidId) launchParams.set("kid_id", kidId);
      }
      setLaunchHref(`/vocrehab/play/${template.game_id}?${launchParams.toString()}`);
      setMessage(`“${template.title}” copied to saved game states. Its authored setup is ready to play${template.game_id === "schedule-juggle" ? " as a full calendar" : ` (seed ${seed})`}.`);
    } else setMessage(json.error || "Could not use template.");
  }
  function openSavedState(saved: SavedState) {
    const seed = parseSeed(typeof saved.state.seed === "string" ? saved.state.seed : null) ?? makeSeed();
    const launchParams = new URLSearchParams({ seed, savedStateId: saved.id });
    if (!isKid && selectedKid) launchParams.set("kid_id", selectedKid);
    setLaunchHref(`/vocrehab/play/${saved.game_id}?${launchParams.toString()}`);
    setMessage(`“${saved.title}” is ready to resume in ${saved.game_id}.`);
  }
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <h1 className="text-2xl font-bold">Game templates and saved states</h1>
    <p>The adult parent account remains the source of truth for child identity. Providers assign a scenario directly to a parent-owned child; children use the existing child login to access assigned templates and keep their own saved states.</p>
    {isKid && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Change child account password</h2><p>Enter the current password to set a new password. If you have forgotten it, ask the parent account holder to reset it.</p><form onSubmit={changeChildPassword} className="grid gap-3 sm:max-w-md"><label>Current password<input name="current_password" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded border bg-transparent p-2" /></label><label>New password<input name="new_password" type="password" autoComplete="new-password" minLength={8} required className="mt-1 block w-full rounded border bg-transparent p-2" /></label><p className="text-sm">Use at least 8 characters and include 3 of: lowercase, uppercase, number, or symbol.</p><button className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground">Change password</button></form></section>}
    {!isKid && kids.length > 0 && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Enable client workspace for a child</h2><div className="flex flex-wrap gap-2">{kids.map(k => <button key={k.id} onClick={() => void enroll(k.id)} className="rounded border px-3 py-2">Enable for {k.username}#{k.discriminator}</button>)}</div><label>Save-state child<select value={selectedKid} onChange={e => { setSelectedKid(e.target.value); setEditingState(null); }} className="ml-2 rounded border bg-transparent p-2"><option value="">My account</option>{kids.map(k => <option key={k.id} value={k.id}>{k.username}#{k.discriminator}</option>)}</select></label></section>}
    {!isKid && kids.length > 0 && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Reset a child’s password</h2><p>The new password applies to the existing family child account. The child will need to sign in again on every device.</p><form onSubmit={resetProviderChildPassword} className="grid gap-3 sm:max-w-md"><label>Child account<select name="kid_id" value={passwordKid} onChange={e => setPasswordKid(e.target.value)} required className="mt-1 block w-full rounded border bg-transparent p-2"><option value="" disabled>Select a child</option>{kids.map(k => <option key={k.id} value={k.id}>{k.username}#{k.discriminator}</option>)}</select></label><label>New password<input name="new_password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-1 block w-full rounded border bg-transparent p-2" /></label><p className="text-sm">Use at least 8 characters and include 3 of: lowercase, uppercase, number, or symbol.</p><button className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground">Reset password</button></form></section>}
    <section className="space-y-3 rounded-xl border border-emerald-300 p-5"><h2 className="text-lg font-bold">Save a Schedule Juggle calendar as a template</h2><p className="text-sm">Uses the full calendar snapshot saved from Schedule Juggle, including planned dates, times, activity types, and places. Choose a client below to assign it, or leave the template private.</p>{!isKid && enrollments.length > 0 ? <label>Assign calendar to client<select value={assignedEnrollment} onChange={e => setAssignedEnrollment(e.target.value)} className="ml-2 rounded border bg-transparent p-2"><option value="">Keep private</option>{enrollments.map(link => <option key={link.id} value={link.id}>{kids.find(k => k.id === link.kid_id)?.username ?? link.client_label ?? "Client"}</option>)}</select></label> : null}<button onClick={() => void saveDeviceCalendarTemplate()} className="rounded bg-primary px-4 py-2 text-primary-foreground">Save full calendar template</button></section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Create a template</h2>
      <form action={saveTemplate} className="grid gap-3"><label>Game<select name="game_id" className="ml-2 rounded border bg-transparent p-2">{gameIds.map(g => <option key={g}>{g}</option>)}</select></label><label>Title<input name="title" required maxLength={100} className="ml-2 rounded border bg-transparent p-2" /></label><label>Description<input name="description" maxLength={500} className="ml-2 rounded border bg-transparent p-2" /></label>
        {!isKid && enrollments.length > 0 && <label>Assign to child<select name="enrollment_id" value={assignedEnrollment} onChange={e => setAssignedEnrollment(e.target.value)} className="ml-2 rounded border bg-transparent p-2"><option value="">Keep private</option>{enrollments.map(link => <option key={link.id} value={link.id}>{kids.find(k => k.id === link.kid_id)?.username ?? link.client_label ?? "Client"}</option>)}</select></label>}
        <label>State JSON<textarea name="state" defaultValue="{}" rows={5} className="block w-full rounded border bg-transparent p-2 font-mono text-sm" /></label><button className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground">Save template</button>
      </form></section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Templates available to this account</h2>{templates.length ? <ul className="space-y-2">{templates.map(t => <li key={t.id} className="flex items-center justify-between gap-3 rounded border p-3"><span><strong>{t.title}</strong><small className="block">{t.game_id}{t.is_shared ? " · assigned scenario" : " · private template"}</small></span><button onClick={() => void copyTemplate(t)} className="rounded border px-3 py-2">Use starting state</button></li>)}</ul> : <p>No templates yet.</p>}</section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Save game data</h2><form action={saveState} className="grid gap-3"><label>Game<select name="game_id" className="ml-2 rounded border bg-transparent p-2">{gameIds.map(g => <option key={g}>{g}</option>)}</select></label><label>Title<input name="title" maxLength={100} className="ml-2 rounded border bg-transparent p-2" /></label><label>State JSON<textarea name="state" defaultValue="{}" rows={4} className="block w-full rounded border bg-transparent p-2 font-mono text-sm" /></label><button className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground">Save state</button></form></section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">Saved game data</h2>{savedStates.length ? <ul className="space-y-3">{savedStates.map(saved => <li key={saved.id} className="rounded border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{saved.title}</strong><small className="block">{saved.game_id} · Updated {new Date(saved.updated_at).toLocaleString()}</small></span><div className="flex gap-2"><button onClick={() => openSavedState(saved)} className="rounded bg-primary px-3 py-2 text-primary-foreground">Open saved setup</button><button onClick={() => setEditingState({ ...saved, stateText: JSON.stringify(saved.state, null, 2) })} className="rounded border px-3 py-2">Edit</button><button onClick={() => void deleteSavedState(saved.id)} className="rounded border px-3 py-2">Delete</button></div></div>{editingState?.id === saved.id && <div className="mt-3 grid gap-3"><label>Title<input value={editingState.title} maxLength={100} onChange={e => setEditingState({ ...editingState, title: e.target.value })} className="ml-2 rounded border bg-transparent p-2" /></label><label>State JSON<textarea value={editingState.stateText ?? ""} onChange={e => setEditingState({ ...editingState, stateText: e.target.value })} rows={6} className="block w-full rounded border bg-transparent p-2 font-mono text-sm" /></label><div className="flex gap-2"><button onClick={() => void updateSavedState()} className="rounded bg-primary px-4 py-2 text-primary-foreground">Save changes</button><button onClick={() => setEditingState(null)} className="rounded border px-4 py-2">Cancel</button></div></div>}</li>)}</ul> : <p>No saved game data for this account.</p>}</section>
    {launchHref && <a href={launchHref} className="inline-block rounded bg-primary px-4 py-2 text-primary-foreground">Open selected game</a>}
    <p role="status" aria-live="polite">{message}</p>
  </main>;
}
