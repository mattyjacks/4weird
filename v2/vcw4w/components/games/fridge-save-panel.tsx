"use client";

import { useCallback, useState } from "react";

const GAME_SLUG = "fridgesimulator";
const LOCAL_KEY = "fridge-sim-save";
const SLOTS = [0, 1, 2, 3] as const;

export type FridgeSavePanelProps = {
  getSnapshot: () => unknown;
  applySnapshot: (s: unknown) => void;
};

function slotUrl(slot: number): string {
  return `/api/saves?game=${GAME_SLUG}&slot=${slot}`;
}

function localKey(slot: number): string {
  return `${LOCAL_KEY}-slot-${slot}`;
}

function readLocal(slot: number): unknown {
  try {
    const raw = window.localStorage.getItem(localKey(slot));
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeLocal(slot: number, snapshot: unknown): void {
  try {
    window.localStorage.setItem(localKey(slot), JSON.stringify(snapshot));
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

export function FridgeSavePanel({ getSnapshot, applySnapshot }: FridgeSavePanelProps) {
  const [status, setStatus] = useState<string>("Pick a slot, then Save or Load.");
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const saveSlot = useCallback(
    async (slot: number) => {
      let snapshot: unknown;
      try {
        snapshot = getSnapshot();
      } catch {
        setStatus(`Slot ${slot}: could not read game state — save aborted.`);
        return;
      }
      setBusySlot(slot);
      setStatus(`Saving slot ${slot}…`);
      let cloudOk = false;
      try {
        const res = await fetch(slotUrl(slot), {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ game_slug: GAME_SLUG, slot, data: snapshot ?? null }),
        });
        cloudOk = res.ok;
      } catch {
        cloudOk = false;
      }
      // Fail-open offline mirror: the device copy always lands, even when the cloud is down.
      writeLocal(slot, snapshot ?? null);
      setStatus(
        cloudOk
          ? `Slot ${slot} saved to the cloud and this device.`
          : `Slot ${slot} saved on this device (cloud unreachable — signed-out or offline).`,
      );
      setBusySlot(null);
    },
    [getSnapshot],
  );

  const loadSlot = useCallback(
    async (slot: number) => {
      setBusySlot(slot);
      setStatus(`Loading slot ${slot}…`);
      // Cloud first; any failure falls through to the device copy.
      try {
        const res = await fetch(slotUrl(slot), { credentials: "include" });
        if (res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const snap = firstCloudSnapshot(body);
          if (snap.found) {
            try {
              applySnapshot(snap.data);
              writeLocal(slot, snap.data);
              setStatus(`Slot ${slot} loaded from the cloud.`);
            } catch {
              setStatus(`Slot ${slot}: cloud save could not be applied to the game.`);
            }
            setBusySlot(null);
            return;
          }
        }
      } catch {
        // Offline / unreachable — fall through to localStorage below.
      }
      const local = readLocal(slot);
      if (local !== undefined) {
        try {
          applySnapshot(local);
          setStatus(`Slot ${slot} loaded from this device (cloud empty or unreachable).`);
        } catch {
          setStatus(`Slot ${slot}: device save could not be applied to the game.`);
        }
      } else {
        setStatus(`Slot ${slot} is empty — nothing to load yet.`);
      }
      setBusySlot(null);
    },
    [applySnapshot],
  );

  return (
    <section aria-label="Fridge Simulator save slots">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
        {SLOTS.map((slot) => {
          const busy = busySlot === slot;
          return (
            <li
              key={slot}
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            >
              <span aria-hidden="true">Slot {slot}</span>
              <button
                type="button"
                style={touchButton}
                disabled={busySlot !== null}
                aria-label={`Save to slot ${slot}`}
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
                aria-label={`Load from slot ${slot}`}
                onClick={() => {
                  void loadSlot(slot);
                }}
              >
                {busy ? "Loading…" : "Load"}
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
