"use client";

import { useState } from "react";
import { parseSeed } from "@/lib/vocrehab-seed";

/**
 * VocrehabSeedBadge — one-line seed chip for every game surface.
 *
 * Shows the run seed (`VRHB-XXXXXX`), copies a replay link (`?seed=...`),
 * and offers "New shuffle" where the caller supports it. Counselors paste
 * the seed into the arcade replay box (or open the link) to auto-load the
 * exact same questions, order, and criteria the learner saw.
 *
 * Frozen contract: seed shape comes from lib/vocrehab-seed.ts (parseSeed).
 * This file never invents seed formats.
 */
export default function VocrehabSeedBadge({
  seed,
  replayHref,
  onNewShuffle,
}: {
  seed: string;
  /** Base URL the seed replays on, e.g. "/vocrehab/play/file-sort". Defaults to this page. */
  replayHref?: string;
  onNewShuffle?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const valid = parseSeed(seed);
  // Default replay target is this page: counselors open the link and the
  // exact seeded deck auto-loads.
  const base =
    replayHref ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const replayUrl = base && valid ? `${base}?seed=${encodeURIComponent(valid)}` : null;

  const copy = async () => {
    if (!replayUrl) return;
    const absolute = replayUrl.startsWith("http")
      ? replayUrl
      : `${window.location.origin}${replayUrl}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setBlocked(true);
      window.setTimeout(() => setBlocked(false), 2000);
    }
  };

  return (
    <p
      className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      aria-label={`Run seed ${seed}`}
    >
      <span className="rounded-full border px-2 py-0.5 font-mono" title="Share this seed with your counselor to replay exactly this set">
        seed {valid ?? seed}
      </span>
      {replayUrl && (
        <button type="button" onClick={copy} className="rounded-full border px-2 py-0.5 underline">
          {copied ? "✓ link copied" : "Copy replay link"}
        </button>
      )}
      {onNewShuffle && (
        <button type="button" onClick={onNewShuffle} className="rounded-full border px-2 py-0.5 underline">
          New shuffle
        </button>
      )}
      {blocked && <span role="status">Copy blocked — long-press the seed instead.</span>}
    </p>
  );
}
