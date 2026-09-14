"use client";

import type { JSX } from "react";
import { parseSeed } from "@/lib/vocrehab-seed";

export interface VocrehabRunSeedChipProps {
  seed?: unknown;
  gameId?: unknown;
  replayBase?: string;
}

const KNOWN_GAME_IDS: ReadonlySet<string> = new Set([
  "file-sort",
  "inbox-sprint",
  "focus-shift",
  "barrier-run",
  "schedule-juggle",
  "phone-greeting",
  "time-punch",
  "tool-match",
  "resume-rescue",
  "energy-budget",
  "paycheck-plan",
]);

const REPLAY_TITLE: string =
  "Opens the exact questions, order, and criteria from this run";

export default function VocrehabRunSeedChip({
  seed,
  gameId,
  replayBase,
}: VocrehabRunSeedChipProps): JSX.Element | null {
  const valid: string | null = parseSeed(typeof seed === "string" ? seed : null);
  if (valid === null) return null;

  const base: string =
    typeof replayBase === "string" ? replayBase.trim() : "";
  const gid: string = typeof gameId === "string" ? gameId.trim() : "";
  const href: string | null =
    base !== ""
      ? `${base}?seed=${encodeURIComponent(valid)}`
      : KNOWN_GAME_IDS.has(gid)
        ? `/vocrehab/play/${gid}?seed=${encodeURIComponent(valid)}`
        : null;

  return (
    <span aria-label={`Run seed ${valid}`}>
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
        {valid}
      </code>
      {href !== null ? (
        <a
          className="ml-2 text-xs underline"
          href={href}
          target="_blank"
          rel="noreferrer"
          title={REPLAY_TITLE}
        >
          Replay this set
        </a>
      ) : null}
    </span>
  );
}
