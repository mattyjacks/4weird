"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SLOTS = [0, 1, 2, 3] as const;

export type UniversalSavePanelProps = {
  slug: string;
  /** Return the current game snapshot to save. Defaults to the slot's device mirror. */
  getSnapshot?: (slot: number) => unknown;
  /** Apply a loaded snapshot to the game. Defaults to a `fourweird-universal-load` window event. */
  applySnapshot?: (snapshot: unknown, slot: number) => void;
  /** Autosave slot 0 on an interval when `getSnapshot` is provided. Defaults to true (opt-out). */
  autosave?: boolean;
  /** Autosave interval in milliseconds. Defaults to 60000 (every minute). */
  autosaveIntervalMs?: number;
};

function slotUrl(slug: string, slot: number, kind: "manual" | "auto"): string {
  return `/api/saves?game=${encodeURIComponent(slug)}&slot=${slot}&kind=${kind}`;
}

function localKey(slug: string, slot: number): string {
  return `save:${slug}:slot:${slot}`;
}

function autoLocalKey(slug: string, slot: number): string {
  return `save:${slug}:slot:${slot}:auto`;
}

function readLocal(slug: string, slot: number): unknown {
  try {
    const raw = window.localStorage.getItem(localKey(slug, slot));
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeLocal(slug: string, slot: number, snapshot: unknown): void {
  try {
    window.localStorage.setItem(localKey(slug, slot), JSON.stringify(snapshot));
  } catch {
    // Fail open: private-mode/quota errors must never break the game.
  }
}

function readLocalAuto(slug: string, slot: number): unknown {
  try {
    const raw = window.localStorage.getItem(autoLocalKey(slug, slot));
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeLocalAuto(slug: string, slot: number, snapshot: unknown): void {
  try {
    window.localStorage.setItem(autoLocalKey(slug, slot), JSON.stringify(snapshot));
  } catch {
    // Fail open: private-mode/quota errors must never break the game.
  }
}

type CloudSaveRow = {
  data?: unknown;
};

type SavesListBody = {
  saves?: CloudSaveRow[];
};

function firstCloudSnapshot(body: unknown): { found: true; data: unknown } | { found: false } {
  if (!body || typeof body !== "object") return { found: false };
  const saves = (body as SavesListBody).saves;
  if (!Array.isArray(saves) || saves.length === 0) return { found: false };
  const row = saves[0];
  if (!row || typeof row !== "object" || !("data" in row)) return { found: false };
  if ((row as CloudSaveRow).data === undefined) return { found: false };
  return { found: true, data: (row as CloudSaveRow).data };
}

/** /api/saves only accepts plain JSON objects — wrap anything else. */
function toSaveData(snapshot: unknown): Record<string, unknown> {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return snapshot as Record<string, unknown>;
  }
  return { value: snapshot ?? null };
}

const touchButton: React.CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  padding: "10px 16px",
  fontSize: 16,
  borderRadius: 10,
  border: "1px solid currentColor",
  background: "transparent",
  cursor: "pointer",
};

export function UniversalSavePanel({
  slug,
  getSnapshot,
  applySnapshot,
  autosave = true,
  autosaveIntervalMs = 60000,
}: UniversalSavePanelProps) {
  const [status, setStatus] = useState<string>("Pick a slot, then Save or Load.");
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(autosave);
  const autoLoaded = useRef<string | null>(null);
  const busyRef = useRef<number | null>(null);
  // Last manually saved/loaded slot (default 0). The autosave tick writes
  // the auto companion of this slot — never hardcoded slot 0.
  const activeSlotRef = useRef<number>(0);

  useEffect(() => {
    busyRef.current = busySlot;
  }, [busySlot]);

  const apply = useCallback(
    (snapshot: unknown, slot: number) => {
      if (applySnapshot) {
        applySnapshot(snapshot, slot);
        return;
      }
      try {
        window.dispatchEvent(
          new CustomEvent("fourweird-universal-load", { detail: { slug, slot, data: snapshot } }),
        );
      } catch {
        /* event dispatch is best-effort; the mirror below still lands */
      }
    },
    [applySnapshot, slug],
  );

  const loadSlot = useCallback(
    async (slot: number, opts?: { silentEmpty?: boolean }) => {
      activeSlotRef.current = slot;
      setBusySlot(slot);
      if (!opts?.silentEmpty) setStatus(`Loading slot ${slot}…`);
      // Cloud manual first; any failure falls through to the device copy.
      try {
        const res = await fetch(slotUrl(slug, slot, "manual"), { credentials: "include" });
        if (res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const snap = firstCloudSnapshot(body);
          if (snap.found) {
            try {
              apply(snap.data, slot);
              writeLocal(slug, slot, snap.data);
              setStatus(`Slot ${slot} loaded from the cloud.`);
            } catch {
              setStatus(`Slot ${slot}: cloud save could not be applied to the game.`);
            }
            setBusySlot(null);
            return true;
          }
        }
      } catch {
        // Offline / unreachable — fall through to localStorage below.
      }
      const local = readLocal(slug, slot);
      if (local !== undefined) {
        try {
          apply(local, slot);
          setStatus(`Slot ${slot} loaded from this device (cloud empty or unreachable).`);
        } catch {
          setStatus(`Slot ${slot}: device save could not be applied to the game.`);
        }
        setBusySlot(null);
        return true;
      }
      if (!opts?.silentEmpty) setStatus(`Slot ${slot} is empty — nothing to load yet.`);
      setBusySlot(null);
      return false;
    },
    [apply, slug],
  );

  const loadSlotAuto = useCallback(
    async (slot: number) => {
      setBusySlot(slot);
      setStatus(`Loading slot ${slot} autosave…`);
      // Cloud auto (GET kind=auto only); any failure falls through to the local auto copy.
      try {
        const res = await fetch(slotUrl(slug, slot, "auto"), { credentials: "include" });
        if (res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const snap = firstCloudSnapshot(body);
          if (snap.found) {
            try {
              apply(snap.data, slot);
              writeLocalAuto(slug, slot, snap.data);
              setStatus(`Slot ${slot} autosave loaded from the cloud.`);
            } catch {
              setStatus(`Slot ${slot}: autosave from the cloud could not be applied to the game.`);
            }
            setBusySlot(null);
            return true;
          }
        }
      } catch {
        // Offline / unreachable — fall through to localStorage below.
      }
      const local = readLocalAuto(slug, slot);
      if (local !== undefined) {
        try {
          apply(local, slot);
          setStatus(`Slot ${slot} autosave loaded from this device (cloud empty or unreachable).`);
        } catch {
          setStatus(`Slot ${slot}: device autosave could not be applied to the game.`);
        }
        setBusySlot(null);
        return true;
      }
      setStatus(`Slot ${slot} autosave is empty — nothing to load yet.`);
      setBusySlot(null);
      return false;
    },
    [apply, slug],
  );

  const saveSlot = useCallback(
    async (slot: number, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      activeSlotRef.current = slot;
      let snapshot: unknown;
      if (getSnapshot) {
        try {
          snapshot = getSnapshot(slot);
        } catch {
          if (!silent) setStatus(`Slot ${slot}: could not read game state — save aborted.`);
          return;
        }
      } else {
        snapshot = readLocal(slug, slot);
        if (snapshot === undefined) {
          if (!silent) setStatus(`Slot ${slot}: no game state on this device yet — play first, then save.`);
          return;
        }
      }
      setBusySlot(slot);
      if (!silent) setStatus(`Saving slot ${slot}…`);
      let cloudOk = false;
      try {
        const res = await fetch(slotUrl(slug, slot, "manual"), {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            game_slug: slug,
            slot,
            kind: "manual",
            schema_version: 1,
            data: toSaveData(snapshot ?? null),
          }),
        });
        cloudOk = res.ok;
      } catch {
        cloudOk = false;
      }
      // Fail-open offline mirror: the device copy always lands, even when the cloud is down.
      writeLocal(slug, slot, snapshot ?? null);
      if (!silent) {
        setStatus(
          cloudOk
            ? `Slot ${slot} saved to the cloud and this device.`
            : `Slot ${slot} saved on this device (cloud unreachable — signed-out or offline).`,
        );
      }
      setBusySlot(null);
    },
    [getSnapshot, slug],
  );

  // Autosave companion (Load-only backup): writes the local auto key plus a
  // PUT kind=auto. Always silent and fail-open — never throws, never touches
  // the manual slot, never updates status text.
  const saveSlotAuto = useCallback(
    async (slot: number) => {
      let snapshot: unknown;
      if (getSnapshot) {
        try {
          snapshot = getSnapshot(slot);
        } catch {
          return;
        }
      } else {
        snapshot = readLocal(slug, slot);
        if (snapshot === undefined) return;
      }
      try {
        await fetch(slotUrl(slug, slot, "auto"), {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            game_slug: slug,
            slot,
            kind: "auto",
            schema_version: 1,
            data: toSaveData(snapshot ?? null),
          }),
        });
      } catch {
        // Fail open: cloud errors must never break the game.
      }
      writeLocalAuto(slug, slot, snapshot ?? null);
    },
    [getSnapshot, slug],
  );

  // Slot 0 auto-loads once via the runtime "ready" handler in
  // game-runtime-frame.tsx (single path, applied pre-interaction). This
  // panel deliberately does NOT auto-load on mount: a second manual-reason
  // load racing the ready load replaced live state mid-boot and left
  // players stuck behind the save box. Manual Save/Load below always wins.
  useEffect(() => {
    if (autoLoaded.current === slug) return;
    autoLoaded.current = slug;
  }, [slug]);

  // Autosave (default ON): every intervalMs, best-effort silent saveSlotAuto
  // for the active slot (last manually saved/loaded slot, default 0).
  // Skips ticks while another save/load is in flight and requires getSnapshot.
  // The local auto mirror always lands (saveSlotAuto is fail-open); cloud PUT is fail-open.
  useEffect(() => {
    if (!autosaveEnabled || !getSnapshot) return;
    const intervalMs =
      Number.isFinite(autosaveIntervalMs) && autosaveIntervalMs > 0 ? autosaveIntervalMs : 60000;
    const timer = window.setInterval(() => {
      if (busyRef.current !== null) return;
      void saveSlotAuto(activeSlotRef.current);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autosaveEnabled, autosaveIntervalMs, getSnapshot, saveSlotAuto]);

  return (
    <section aria-label={`${slug} save slots`}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={autosaveEnabled}
          onChange={(e) => setAutosaveEnabled(e.target.checked)}
          aria-label={`Autosave ${slug} to slot 0 every minute`}
        />
        Autosave every minute
      </label>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
        {SLOTS.map((slot) => {
          const busy = busySlot === slot;
          const label = slot === 0 ? `Slot ${slot} — cheat-free / cheat-proof (auto-loads)` : `Slot ${slot}`;
          return (
            <li
              key={slot}
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            >
              <span aria-hidden="true">{label}</span>
              <button
                type="button"
                style={touchButton}
                disabled={busySlot !== null}
                aria-label={`Save to slot ${slot} for ${slug}`}
                onClick={() => {
                  void saveSlot(slot);
                }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                style={touchButton}
                disabled={busySlot !== null}
                aria-label={`Load from slot ${slot} for ${slug}`}
                onClick={() => {
                  void loadSlot(slot);
                }}
              >
                {busy ? "Loading…" : "Load"}
              </button>
              <button
                type="button"
                style={touchButton}
                disabled={busySlot !== null}
                aria-label={`Load autosave from slot ${slot} for ${slug}`}
                onClick={() => {
                  void loadSlotAuto(slot);
                }}
              >
                {busy ? "Loading…" : "Load autosave"}
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" style={{ marginTop: 12, minHeight: 24 }}>
        {status}
      </p>
    </section>
  );
}
