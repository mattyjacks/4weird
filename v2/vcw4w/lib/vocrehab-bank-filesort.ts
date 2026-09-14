// Bank for file-sort: random-by-default card pool, deal with seed for replay.
// Pure module — zero imports. Pass a `rand: () => number` (e.g. a seeded
// PRNG like mulberry32) into dealFileSort so rounds are replayable without
// importing any cross-lane seed helper.

export type VocrehabFileSortFolder = "Invoices" | "Schedules" | "Client Notes";

export interface VocrehabFileSortCard {
  id: string;
  name: string;
  folder: VocrehabFileSortFolder;
}

export const vocrehabFileSortBank: readonly VocrehabFileSortCard[] = [
  // Invoices (20) — strengths-first: careful, accurate billing paperwork.
  { id: "fs-inv-01", name: "Invoice — March office supplies", folder: "Invoices" },
  { id: "fs-inv-02", name: "Invoice #1042 — printer paper", folder: "Invoices" },
  { id: "fs-inv-03", name: "Past-due invoice reminder", folder: "Invoices" },
  { id: "fs-inv-04", name: "Receipt — March (file with invoices)", folder: "Invoices" },
  { id: "fs-inv-05", name: "Invoice — April cleaning services", folder: "Invoices" },
  { id: "fs-inv-06", name: "Invoice #1077 — break-room restock", folder: "Invoices" },
  { id: "fs-inv-07", name: "Utility bill — electricity, May", folder: "Invoices" },
  { id: "fs-inv-08", name: "Invoice — shredding service pickup", folder: "Invoices" },
  { id: "fs-inv-09", name: "Receipt — postage meter refill", folder: "Invoices" },
  { id: "fs-inv-10", name: "Invoice #1103 — safety gloves order", folder: "Invoices" },
  { id: "fs-inv-11", name: "Credit memo — returned toner", folder: "Invoices" },
  { id: "fs-inv-12", name: "Invoice — June landscaping visit", folder: "Invoices" },
  { id: "fs-inv-13", name: "Receipt — parking validation stickers", folder: "Invoices" },
  { id: "fs-inv-14", name: "Invoice #1148 — file folders bulk pack", folder: "Invoices" },
  { id: "fs-inv-15", name: "Utility bill — water, second quarter", folder: "Invoices" },
  { id: "fs-inv-16", name: "Invoice — copier maintenance plan", folder: "Invoices" },
  { id: "fs-inv-17", name: "Receipt — packing tape and labels", folder: "Invoices" },
  { id: "fs-inv-18", name: "Invoice #1190 — first-aid kit refill", folder: "Invoices" },
  { id: "fs-inv-19", name: "Deposit slip — petty cash top-up", folder: "Invoices" },
  { id: "fs-inv-20", name: "Invoice — annual fire-extinguisher check", folder: "Invoices" },
  // Schedules (20) — strengths-first: dependable, on-time planning paperwork.
  { id: "fs-sch-01", name: "April shift schedule", folder: "Schedules" },
  { id: "fs-sch-02", name: "Holiday coverage rota", folder: "Schedules" },
  { id: "fs-sch-03", name: "Training calendar invite", folder: "Schedules" },
  { id: "fs-sch-04", name: "Swap request — Friday evening", folder: "Schedules" },
  { id: "fs-sch-05", name: "Weekly rota — front desk", folder: "Schedules" },
  { id: "fs-sch-06", name: "Overtime sign-up sheet", folder: "Schedules" },
  { id: "fs-sch-07", name: "Team meeting agenda — Monday", folder: "Schedules" },
  { id: "fs-sch-08", name: "Lunch break roster", folder: "Schedules" },
  { id: "fs-sch-09", name: "Deep-clean timetable — June", folder: "Schedules" },
  { id: "fs-sch-10", name: "Delivery window notice — Thursday", folder: "Schedules" },
  { id: "fs-sch-11", name: "Orientation day timetable", folder: "Schedules" },
  { id: "fs-sch-12", name: "Weekend on-call list", folder: "Schedules" },
  { id: "fs-sch-13", name: "Shift-bid form — next quarter", folder: "Schedules" },
  { id: "fs-sch-14", name: "Fire-drill schedule", folder: "Schedules" },
  { id: "fs-sch-15", name: "Vacation request calendar", folder: "Schedules" },
  { id: "fs-sch-16", name: "Stock-count night plan", folder: "Schedules" },
  { id: "fs-sch-17", name: "Morning huddle agenda", folder: "Schedules" },
  { id: "fs-sch-18", name: "Bus-run timetable printout", folder: "Schedules" },
  { id: "fs-sch-19", name: "Interview slot list — helpers", folder: "Schedules" },
  { id: "fs-sch-20", name: "Closing-duty checklist rota", folder: "Schedules" },
  // Client Notes (20) — strengths-first: kind, careful client paperwork.
  { id: "fs-note-01", name: "Client note — prefers mornings", folder: "Client Notes" },
  { id: "fs-note-02", name: "Client feedback form", folder: "Client Notes" },
  { id: "fs-note-03", name: "Case note draft — intake call", folder: "Client Notes" },
  { id: "fs-note-04", name: "Thank-you email from client", folder: "Client Notes" },
  { id: "fs-note-05", name: "Client note — large-print forms help", folder: "Client Notes" },
  { id: "fs-note-06", name: "Welcome packet checklist", folder: "Client Notes" },
  { id: "fs-note-07", name: "Client note — call ahead before visit", folder: "Client Notes" },
  { id: "fs-note-08", name: "Satisfaction survey reply", folder: "Client Notes" },
  { id: "fs-note-09", name: "Client note — step-free entrance needed", folder: "Client Notes" },
  { id: "fs-note-10", name: "Appointment follow-up card", folder: "Client Notes" },
  { id: "fs-note-11", name: "Client note — quiet room works best", folder: "Client Notes" },
  { id: "fs-note-12", name: "Referral thank-you letter", folder: "Client Notes" },
  { id: "fs-note-13", name: "Client note — bring extra forms", folder: "Client Notes" },
  { id: "fs-note-14", name: "Compliment slip — tidy workspace", folder: "Client Notes" },
  { id: "fs-note-15", name: "Client note — afternoon visits best", folder: "Client Notes" },
  { id: "fs-note-16", name: "Intake checklist — new client", folder: "Client Notes" },
  { id: "fs-note-17", name: "Client note — needs reminder call", folder: "Client Notes" },
  { id: "fs-note-18", name: "Suggestion card — clearer signs", folder: "Client Notes" },
  { id: "fs-note-19", name: "Client note — prefers written updates", folder: "Client Notes" },
  { id: "fs-note-20", name: "Check-in sheet — visitor log", folder: "Client Notes" },
];

/** Deal `n` cards (default 12) with an even split across the 3 folders
 *  (default 4/4/4), shuffled deterministically with Fisher-Yates using the
 *  caller-supplied `rand`. Same rand sequence => same output (replayable). */
export function dealFileSort(
  rand: () => number,
  n: number = 12,
): VocrehabFileSortCard[] {
  const per = Math.floor(n / 3);
  const remainder = n - per * 3;
  const folders: readonly VocrehabFileSortFolder[] = [
    "Invoices",
    "Schedules",
    "Client Notes",
  ];
  const picked: VocrehabFileSortCard[] = [];
  for (let f = 0; f < folders.length; f += 1) {
    const pool = vocrehabFileSortBank.filter((c) => c.folder === folders[f]);
    // Deterministic take: stride-shuffle the pool with rand, then slice.
    const order = pool.slice();
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = order[i] as VocrehabFileSortCard;
      order[i] = order[j] as VocrehabFileSortCard;
      order[j] = tmp;
    }
    const take = per + (f < remainder ? 1 : 0);
    for (let k = 0; k < take && k < order.length; k += 1) {
      picked.push(order[k] as VocrehabFileSortCard);
    }
  }
  // Final deterministic shuffle so folders interleave.
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = picked[i] as VocrehabFileSortCard;
    picked[i] = picked[j] as VocrehabFileSortCard;
    picked[j] = tmp;
  }
  return picked;
}
