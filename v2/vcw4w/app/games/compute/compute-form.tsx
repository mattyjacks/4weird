"use client";

/**
 * /games/compute submission form (Remastery §3.4 DPS game-job angle, Wave 2).
 *
 * Mirrors the /games/mods offline pattern: reads the local job queue first
 * (instant render), then tries a live POST; ANY failure (offline, 404, no
 * route yet) keeps the job in the local queue so the page never bricks
 * navigation (fail-open safety, §1.2 axiom 3).
 *
 * State hygiene per §1.2 axiom 4: localStorage is touched only inside
 * useEffect / event handlers behind the lib's SSR guards — no hydration
 * mismatch.
 */

import { useEffect, useState } from "react";
import {
  GAME_COMPUTE_BASE_COST_COINS,
  GAME_COMPUTE_TASK_TYPES,
  VIBE_COINS_PER_USD,
  describeGameComputeJob,
  enqueueGameComputeJob,
  readGameComputeQueue,
  validateGameComputeJobSpec,
  type GameComputeTaskType,
  type QueuedGameComputeJob,
} from "@/lib/game-compute";

type Source = "local" | "live";

const OFFLINE_COPY =
  "You're offline (or the job route isn't live yet) — your job is saved locally and will submit when you're back. Navigation still works.";

export function ComputeForm() {
  const [taskType, setTaskType] = useState<GameComputeTaskType>("game_bundle");
  const [payloadText, setPayloadText] = useState('{\n  "game": "gravegain3d"\n}');
  const [coinsBid, setCoinsBid] = useState("80");
  const [queue, setQueue] = useState<QueuedGameComputeJob[]>([]);
  const [source, setSource] = useState<Source>("local");
  const [notice, setNotice] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Mount: hydrate the local queue inside useEffect (axiom 4 — no SSR read).
  useEffect(() => {
    setQueue(readGameComputeQueue());
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    let payload: unknown;
    try {
      payload = payloadText.trim() ? JSON.parse(payloadText) : {};
    } catch {
      setFormErrors(["payload must be valid JSON (an object)"]);
      return;
    }

    const bid = Number(coinsBid);
    const checked = validateGameComputeJobSpec({
      taskType,
      payload,
      coinsBid: bid,
    });
    if (!checked.ok || !checked.spec) {
      setFormErrors(checked.errors);
      return;
    }
    setFormErrors([]);

    // Try live submission; ANY failure falls back to the local queue.
    try {
      const res = await fetch("/api/games/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checked.spec),
      });
      if (!res.ok) throw new Error(`live route responded ${res.status}`);
      setSource("live");
      setNotice("Job submitted to the live queue.");
    } catch {
      const enqueued = enqueueGameComputeJob(checked.spec);
      if (enqueued.queued && enqueued.entry) {
        setQueue(readGameComputeQueue());
        setSource("local");
        setNotice(OFFLINE_COPY);
      } else {
        setFormErrors(
          enqueued.errors.length > 0 ? enqueued.errors : ["could not save job locally"],
        );
        return;
      }
    }
  }

  return (
    <main
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "2rem 1rem 4rem",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <header>
        <h1>Queue a background compute job</h1>
        <p>
          Donate-Personal-Seconds game jobs: renders, transcodes, bundles,
          procedural terrain, and sprite packs — priced at {VIBE_COINS_PER_USD}{" "}
          coins = $1.00. Source: {source === "live" ? "live route" : "local queue"}.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "0.75rem" }}
        aria-label="Queue a compute job"
      >
        <label style={{ display: "grid", gap: "0.25rem" }}>
          Task type
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as GameComputeTaskType)}
          >
            {GAME_COMPUTE_TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} — base {GAME_COMPUTE_BASE_COST_COINS[t]} coins
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          Payload (JSON object)
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={5}
            spellCheck={false}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          Coins bid (whole coins)
          <input
            value={coinsBid}
            onChange={(e) => setCoinsBid(e.target.value)}
            inputMode="numeric"
            placeholder="80"
          />
        </label>

        {formErrors.length > 0 && (
          <ul role="alert">
            {formErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <button type="submit">Queue job</button>
      </form>

      {notice && <p role="status">{notice}</p>}

      <section aria-label="Pending jobs">
        <h2>Pending jobs ({queue.length})</h2>
        {queue.length === 0 ? (
          <p>No jobs queued yet — your background jobs will wait here when offline.</p>
        ) : (
          <ul>
            {queue.map((job) => (
              <li key={job.id}>{describeGameComputeJob(job.spec)}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
