"use client";

/**
 * Vocrehab schedule address book (SJ-09).
 *
 * Strengths-first address list for schedule-juggle travel estimates:
 * keep your Home / Work / training places in one tidy list, then pick a
 * From + To + travel mode to estimate the trip. Types are local on purpose
 * (the SavedAddress shape is duplicated inline; no SJ imports).
 *
 * Usage:
 *   import VocrehabScheduleAddresses from "@/components/vocrehab/vocrehab-schedule-addresses";
 *   <VocrehabScheduleAddresses addresses={list} onChange={setList} onEstimate={runEstimate} />
 */

import { useMemo, useState } from "react";

export type VocrehabAddressCategory = "home" | "work" | "training" | "other";
export type VocrehabTravelMode = "drive" | "transit" | "walk";

/** Local SavedAddress shape — duplicated inline so this file needs no SJ imports. */
export type VocrehabSavedAddress = {
  id: string;
  label: string;
  address: string;
  category: VocrehabAddressCategory;
};

export type VocrehabScheduleAddressesProps = {
  addresses: VocrehabSavedAddress[];
  onChange: (next: VocrehabSavedAddress[]) => void;
  onEstimate: (fromId: string, toId: string, mode: VocrehabTravelMode) => void;
};

const VOCREHAB_CATEGORIES: VocrehabAddressCategory[] = ["home", "work", "training", "other"];

const VOCREHAB_MODES: Array<{ id: VocrehabTravelMode; label: string }> = [
  { id: "drive", label: "Drive" },
  { id: "transit", label: "Transit" },
  { id: "walk", label: "Walk" },
];

const VOCREHAB_CATEGORY_BADGE: Record<VocrehabAddressCategory, string> = {
  home: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  work: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  training: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  other: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200",
};

const VOCREHAB_SAMPLES: VocrehabSavedAddress[] = [
  {
    id: "sample-home",
    label: "Sample Home",
    address: "123 Maple St, Springfield",
    category: "home",
  },
  {
    id: "sample-work",
    label: "Sample Workplace",
    address: "456 Elm Ave, Springfield",
    category: "work",
  },
];

function vocrehabNewId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `addr-${crypto.randomUUID()}`;
    }
  } catch {
    // Fail-open to the timestamp fallback below.
  }
  return `addr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const VOCREHAB_EMPTY_FORM = { label: "", address: "", category: "home" as VocrehabAddressCategory };

export default function VocrehabScheduleAddresses({
  addresses,
  onChange,
  onEstimate,
}: VocrehabScheduleAddressesProps) {
  const [vocrehabEditingId, setVocrehabEditingId] = useState<string | null>(null);
  const [vocrehabForm, setVocrehabForm] = useState(VOCREHAB_EMPTY_FORM);
  const [vocrehabNote, setVocrehabNote] = useState<string | null>(null);
  const [vocrehabFromId, setVocrehabFromId] = useState("");
  const [vocrehabToId, setVocrehabToId] = useState("");
  const [vocrehabMode, setVocrehabMode] = useState<VocrehabTravelMode>("drive");

  const vocrehabHomeDefault = useMemo(
    () => addresses.find((a) => a.category === "home") ?? addresses[0] ?? null,
    [addresses],
  );
  const vocrehabWorkDefault = useMemo(
    () =>
      addresses.find((a) => a.category === "work") ??
      addresses.find((a) => a.id !== vocrehabHomeDefault?.id) ??
      null,
    [addresses, vocrehabHomeDefault],
  );
  const vocrehabFromValue = vocrehabFromId || vocrehabHomeDefault?.id || "";
  const vocrehabToValue = vocrehabToId || vocrehabWorkDefault?.id || "";

  const vocrehabStartAdd = () => {
    setVocrehabEditingId("new");
    setVocrehabForm(VOCREHAB_EMPTY_FORM);
    setVocrehabNote(null);
  };

  const vocrehabStartEdit = (entry: VocrehabSavedAddress) => {
    setVocrehabEditingId(entry.id);
    setVocrehabForm({ label: entry.label, address: entry.address, category: entry.category });
    setVocrehabNote(null);
  };

  const vocrehabCancelForm = () => {
    setVocrehabEditingId(null);
    setVocrehabForm(VOCREHAB_EMPTY_FORM);
    setVocrehabNote(null);
  };

  const vocrehabSaveForm = () => {
    const label = vocrehabForm.label.trim();
    const address = vocrehabForm.address.trim();
    if (!label || !address) {
      setVocrehabNote("Give the place a name and a street address — both help your plan stay clear.");
      return;
    }
    if (vocrehabEditingId === "new") {
      onChange([
        ...addresses,
        { id: vocrehabNewId(), label, address, category: vocrehabForm.category },
      ]);
      setVocrehabNote(`Nice — ${label} is on your list.`);
    } else if (vocrehabEditingId) {
      onChange(
        addresses.map((a) =>
          a.id === vocrehabEditingId ? { ...a, label, address, category: vocrehabForm.category } : a,
        ),
      );
      setVocrehabNote(`Updated — ${label} is looking good.`);
    }
    setVocrehabEditingId(null);
    setVocrehabForm(VOCREHAB_EMPTY_FORM);
  };

  const vocrehabRemove = (id: string) => {
    const removed = addresses.find((a) => a.id === id);
    onChange(addresses.filter((a) => a.id !== id));
    if (vocrehabEditingId === id) vocrehabCancelForm();
    setVocrehabNote(
      removed
        ? `${removed.label} is off the list — your other places are still here.`
        : "That place is off the list — your other places are still here.",
    );
  };

  const vocrehabLoadSamples = () => {
    const missing = VOCREHAB_SAMPLES.filter((s) => !addresses.some((a) => a.id === s.id));
    if (missing.length === 0) {
      setVocrehabNote("The sample places are already on your list — swap in your own anytime.");
      return;
    }
    onChange([...addresses, ...missing]);
    setVocrehabNote("Samples added — replace them with your own places whenever you're ready.");
  };

  const vocrehabRunEstimate = () => {
    if (!vocrehabFromValue || !vocrehabToValue) {
      setVocrehabNote("Pick a From place and a To place, then run the estimate.");
      return;
    }
    if (vocrehabFromValue === vocrehabToValue) {
      setVocrehabNote("From and To match — pick two different places to compare the trip.");
      return;
    }
    onEstimate(vocrehabFromValue, vocrehabToValue, vocrehabMode);
  };

  const vocrehabIsFormOpen = vocrehabEditingId !== null;

  return (
    <section
      aria-label="Saved places and travel estimates"
      className="vocrehab-schedule-addresses mx-auto w-full max-w-3xl rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
    >
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
        Your places, your starting line
      </h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
        Save the places that matter — Home, Work, training — and estimating the trip gets easy.
      </p>

      {addresses.length === 0 && !vocrehabIsFormOpen ? (
        <p className="mt-3 rounded-lg bg-stone-100 p-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          No places yet — adding Home and Work first unlocks travel estimates below.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {addresses.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 p-2.5 dark:border-stone-700"
            >
              <div className="min-w-0 flex-1 basis-48">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
                  <span className="truncate">{entry.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${VOCREHAB_CATEGORY_BADGE[entry.category]}`}
                  >
                    {entry.category}
                  </span>
                </p>
                <p className="truncate text-sm text-stone-500 dark:text-stone-400">{entry.address}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => vocrehabStartEdit(entry)}
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => vocrehabRemove(entry.id)}
                  aria-label={`Remove ${entry.label}`}
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!vocrehabIsFormOpen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={vocrehabStartAdd}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add a place
          </button>
          <button
            type="button"
            onClick={vocrehabLoadSamples}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Try with samples
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            {vocrehabEditingId === "new" ? "Add a place" : "Edit this place"}
          </h3>
          <label className="mt-2 block text-xs font-medium text-stone-600 dark:text-stone-300">
            Name
            <input
              type="text"
              value={vocrehabForm.label}
              onChange={(e) => setVocrehabForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Home, Downtown office"
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>
          <label className="mt-2 block text-xs font-medium text-stone-600 dark:text-stone-300">
            Street address
            <input
              type="text"
              value={vocrehabForm.address}
              onChange={(e) => setVocrehabForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="e.g. 123 Maple St, Springfield"
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>
          <label className="mt-2 block text-xs font-medium text-stone-600 dark:text-stone-300">
            Category
            <select
              value={vocrehabForm.category}
              onChange={(e) =>
                setVocrehabForm((f) => ({
                  ...f,
                  category: e.target.value as VocrehabAddressCategory,
                }))
              }
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            >
              {VOCREHAB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={vocrehabSaveForm}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save place
            </button>
            <button
              type="button"
              onClick={vocrehabCancelForm}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {vocrehabNote ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
        >
          {vocrehabNote}
        </p>
      ) : null}

      <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-700">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
          Estimate a trip
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
            From (starts at Home)
            <select
              value={vocrehabFromValue}
              onChange={(e) => setVocrehabFromId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            >
              <option value="">Choose a place…</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
            To (starts at Work)
            <select
              value={vocrehabToValue}
              onChange={(e) => setVocrehabToId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            >
              <option value="">Choose a place…</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div role="tablist" aria-label="Travel mode" className="mt-2 flex gap-1.5">
          {VOCREHAB_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={vocrehabMode === m.id}
              onClick={() => setVocrehabMode(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                vocrehabMode === m.id
                  ? "bg-emerald-600 text-white"
                  : "border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={vocrehabRunEstimate}
          className="mt-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Run estimate
        </button>
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        The sample places are just examples — swap in your own anytime.
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Private by default: your places stay in this browser unless you choose to export them —
        nothing here uploads or shares them.
      </p>
    </section>
  );
}
