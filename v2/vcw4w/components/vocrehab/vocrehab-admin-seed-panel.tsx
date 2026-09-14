"use client";

export interface VocrehabAdminSeedEntry {
  seed: string;
  gameId: string;
  groupId: string;
  sessionRef: string;
  at: string;
  n: number;
  difficulty: string;
  itemIds: readonly string[];
  criteria: readonly string[];
}

export interface VocrehabAdminSeedPanelProps {
  groupId: string;
  entries: readonly VocrehabAdminSeedEntry[];
  onReplay: (e: VocrehabAdminSeedEntry) => void;
  replayPreview?: { gameId: string; seed: string; itemIds: readonly string[] } | null;
}

/**
 * VocrehabAdminSeedPanel — group practice-seed list with same-seed replay.
 *
 * Props-only: localStorage read/write lives in the host page, not here.
 * No PII is displayed — seeds + item ids only.
 */
export default function VocrehabAdminSeedPanel({
  groupId,
  entries,
  onReplay,
  replayPreview = null,
}: VocrehabAdminSeedPanelProps) {
  return (
    <section aria-label={`Group ${groupId} practice seeds`}>
      <h2>
        Group {groupId} — practice seeds
      </h2>
      {entries.length === 0 ? (
        <p>No seeds logged for this group yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={`${entry.sessionRef}:${entry.seed}`}>
              <div>
                <span>{entry.gameId}</span>{" "}
                <code>{entry.seed}</code>
              </div>
              <div>
                {entry.n} items · {entry.difficulty} ·{" "}
                <time dateTime={entry.at}>
                  {Number.isNaN(Date.parse(entry.at))
                    ? entry.at
                    : new Date(entry.at).toLocaleDateString()}
                </time>
              </div>
              {entry.criteria.length > 0 && (
                <p>Describe: {entry.criteria.join(", ")}</p>
              )}
              <button type="button" onClick={() => onReplay(entry)}>
                Load this seed
              </button>
            </li>
          ))}
        </ul>
      )}
      <div aria-live="polite">
        {replayPreview && (
          <div>
            <p>
              Replay preview — {replayPreview.gameId} ·{" "}
              <code>{replayPreview.seed}</code>
            </p>
            {replayPreview.itemIds.length > 0 ? (
              <ol>
                {replayPreview.itemIds.map((id) => (
                  <li key={id}>
                    <code>{id}</code>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No items in this replay.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
