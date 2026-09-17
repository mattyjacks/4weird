/**
 * VocRehab schedule-juggle repeat helper (tiny, dependency-free).
 *
 * Pure date math only — no imports, no I/O, safe for client + server.
 * Expansions always stay inside the planning window (1 month back through
 * 3 months ahead of the base month) and cap at 93 dates so saved months
 * stay small.
 */

export type RepeatChoice =
  | "none"
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly"
  | "monthly";

/** Max materialized dates per repeat — keeps localStorage snapshots tiny. */
export const REPEAT_MAX_DATES = 93;

export const REPEAT_CHOICES: ReadonlyArray<{
  id: RepeatChoice;
  label: string;
  blurb: string;
}> = [
  { id: "none", label: "➖ Once", blurb: "Just this day." },
  { id: "daily", label: "🔁 Daily", blurb: "Every day." },
  { id: "weekdays", label: "🏙️ Weekdays", blurb: "Mon–Fri only." },
  { id: "weekends", label: "🎉 Weekends", blurb: "Sat–Sun only." },
  { id: "weekly", label: "📅 Weekly", blurb: "Same weekday each week." },
  { id: "monthly", label: "🗓️ Monthly", blurb: "Same date each month." },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toId(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function parseId(dayId: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayId);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function dim(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/** JS weekday 0=Sun..6=Sat for a Y/M/D triple (noon-safe, no TZ shift). */
function weekday(y: number, m: number, d: number): number {
  return new Date(y, m, d).getDay();
}

function cmp(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

function nextDay(p: { y: number; m: number; d: number }): { y: number; m: number; d: number } {
  if (p.d < dim(p.y, p.m)) return { ...p, d: p.d + 1 };
  if (p.m < 11) return { y: p.y, m: p.m + 1, d: 1 };
  return { y: p.y + 1, m: 0, d: 1 };
}

/**
 * Last plannable date: end of the month 3 ahead of the base month.
 * Matches the calendar travel window (base -1 … base +3).
 */
export function repeatWindowEnd(baseYear: number, baseMonthIndex: number): {
  y: number;
  m: number;
  d: number;
} {
  const total = baseYear * 12 + baseMonthIndex + 3;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  return { y, m, d: dim(y, m) };
}

/** True when a date sits on/after start and on/before the window end. */
function inWindow(p: { y: number; m: number; d: number }, start: { y: number; m: number; d: number }, end: { y: number; m: number; d: number }): boolean {
  return cmp(p, start) >= 0 && cmp(p, end) <= 0;
}

/**
 * Expand a repeat choice into concrete day ids, starting at `startDayId`
 * and stopping at the 3-months-out window edge. Always includes the start
 * day (when valid) so "once" and filtered choices still place one block.
 */
export function expandRepeat(
  startDayId: string,
  choice: RepeatChoice,
  baseYear: number,
  baseMonthIndex: number,
): string[] {
  const start = parseId(startDayId);
  if (!start) return [];
  if (choice === "none") return [startDayId];
  const end = repeatWindowEnd(baseYear, baseMonthIndex);
  if (cmp(start, end) > 0) return [startDayId];

  if (choice === "monthly") {
    const out: string[] = [startDayId];
    const dayNum = start.d;
    let y = start.y;
    let m = start.m;
    for (let i = 0; i < 4; i += 1) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      const last = { y, m, d: dim(y, m) };
      if (cmp({ y, m, d: 1 }, end) > 0) break;
      if (dayNum > last.d) continue; // e.g. Jan 31 has no Feb — skip kindly.
      const cand = { y, m, d: dayNum };
      if (cmp(cand, end) > 0) break;
      out.push(toId(y, m, dayNum));
      if (out.length >= REPEAT_MAX_DATES) break;
    }
    return out;
  }

  const startWd = weekday(start.y, start.m, start.d);
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cmp(cur, end) <= 0 && out.length < REPEAT_MAX_DATES && guard < 400) {
    guard += 1;
    const wd = weekday(cur.y, cur.m, cur.d); // 0=Sun..6=Sat
    const isWeekday = wd >= 1 && wd <= 5;
    const isWeekend = wd === 0 || wd === 6;
    let keep = false;
    if (choice === "daily") keep = true;
    else if (choice === "weekdays") keep = isWeekday;
    else if (choice === "weekends") keep = isWeekend;
    else if (choice === "weekly") keep = wd === startWd;
    if (keep && inWindow(cur, start, end)) out.push(toId(cur.y, cur.m, cur.d));
    cur = nextDay(cur);
  }
  if (out.length === 0) return [startDayId];
  return out;
}

/** Friendly one-liner for confirmations, e.g. "🔁 Daily · 12 dates". */
export function repeatSummary(choice: RepeatChoice, count: number): string {
  const found = REPEAT_CHOICES.find((c) => c.id === choice);
  const label = found ? found.label : "➖ Once";
  if (choice === "none" || count <= 1) return `${label} · 1 day`;
  return `${label} · ${count} days`;
}
