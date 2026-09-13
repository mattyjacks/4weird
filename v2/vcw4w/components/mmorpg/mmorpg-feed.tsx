"use client";

// MmorpgFeed: last-6 event feed (kills, loot, joins, wipes).
// Pure props, SSR-safe (no browser APIs), fail-open (bad entries are
// skipped, empty input renders a quiet placeholder). ASCII-only.

export interface MmorpgFeedEvent {
  id?: string;
  text?: string;
  at?: string;
  kind?: string;
}

export interface MmorpgFeedProps {
  events?: MmorpgFeedEvent[] | null;
  title?: string | null;
}

export const FEED_MAX_LINES = 6;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 280);
  return trimmed.length > 0 ? trimmed : null;
}

function kindPrefix(kind: unknown): string {
  if (typeof kind !== "string") return ">";
  const k = kind.toLowerCase();
  if (k === "kill" || k === "boss") return "[X]";
  if (k === "loot") return "[$]";
  if (k === "join" || k === "leave") return "[o]";
  if (k === "wipe" || k === "death") return "[!]";
  return ">";
}

export function MmorpgFeed({ events, title }: MmorpgFeedProps) {
  const heading = typeof title === "string" && title.length > 0 ? title : "Event Feed";
  const raw: MmorpgFeedEvent[] = Array.isArray(events) ? events : [];
  const lines: Array<{ key: string; text: string; at: string | null; prefix: string }> = [];
  for (let i = raw.length - 1; i >= 0 && lines.length < FEED_MAX_LINES; i -= 1) {
    const entry = raw[i];
    if (!entry || typeof entry !== "object") continue;
    const text = cleanText(entry.text);
    if (text === null) continue;
    const at = typeof entry.at === "string" && entry.at.length > 0 ? entry.at : null;
    lines.push({
      key: typeof entry.id === "string" && entry.id.length > 0 ? entry.id : `line-${i}`,
      text,
      at,
      prefix: kindPrefix(entry.kind),
    });
  }

  return (
    <section aria-label={heading} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">{heading}</h2>
      {lines.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No events yet. Kills, loot, and joins show up here.</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <li key={line.key} className="flex gap-2 text-xs leading-relaxed">
              <span className="shrink-0 font-bold text-slate-500">{line.prefix}</span>
              <span className="min-w-0 flex-1 break-words text-slate-300">{line.text}</span>
              {line.at ? <span className="shrink-0 tabular-nums text-slate-600">{line.at}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
