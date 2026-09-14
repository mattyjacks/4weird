/**
 * lib/vocrehab-bank-pack2.ts — VocRehab pack-2 content banks (pure, zero imports).
 *
 * Banks for the pack-2 games in lib/vocrehab-games2.ts (sibling-owned, never edited here):
 * - phone-greeting: front-desk callers (greet + recall one detail)
 * - time-punch: shift tasks with punch windows (+ late-bus surprise grace variants)
 * - tool-match: jobs matched to the right tool (+ safety-gear flag)
 *
 * Privacy: caller names are first-name + last-initial only. All labels are
 * strengths-first (what the caller/worker CAN do next).
 */

export interface VocrehabPack2Caller {
  id: string;
  /** First name + last initial only (no PII beyond this). */
  name: string;
  need: string;
  detail: string;
}

export interface VocrehabPack2Window {
  id: string;
  label: string;
  /** Length of the on-time punch window, in minutes. */
  windowMin: number;
  graceNote?: string;
}

export interface VocrehabPack2Tool {
  id: string;
  job: string;
  tool: string;
  needsSafety: boolean;
}

export const vocrehabPack2Callers: readonly VocrehabPack2Caller[] = [
  { id: "caller-01", name: "Rosa M.", need: "Order pickup time", detail: "Pickup is for 12 party subs at noon" },
  { id: "caller-02", name: "Devon K.", need: "Return without receipt", detail: "Has the box and card used to pay" },
  { id: "caller-03", name: "Priya S.", need: "Job application follow-up", detail: "Applied for weekend cashier role" },
  { id: "caller-04", name: "Marcus T.", need: "Delivery reschedule", detail: "Needs delivery moved to Thursday" },
  { id: "caller-05", name: "Lena W.", need: "Invoice copy request", detail: "Needs invoice #4821 re-sent" },
  { id: "caller-06", name: "Jamal H.", need: "Catering quote", detail: "Party of 40 next Saturday" },
  { id: "caller-07", name: "Sofia R.", need: "Lost jacket", detail: "Navy jacket left Tuesday evening" },
  { id: "caller-08", name: "Andre B.", need: "Shelf item hold", detail: "Wants two air filters held till 6pm" },
  { id: "caller-09", name: "Mei L.", need: "Appointment confirm", detail: "Confirming 10:30 intake meeting" },
  { id: "caller-10", name: "Carlos D.", need: "Bulk napkin order", detail: "Needs 10 cases by Friday" },
  { id: "caller-11", name: "Aisha N.", need: "Refund status", detail: "Refund for the blue mop bucket" },
  { id: "caller-12", name: "Tom E.", need: "Donation pickup", detail: "Three bags of canned goods" },
  { id: "caller-13", name: "Grace P.", need: "Gift card balance", detail: "Card ending in 2210" },
  { id: "caller-14", name: "Omar F.", need: "Interview directions", detail: "Interview at the back office at 2pm" },
  { id: "caller-15", name: "Nina G.", need: "Cake order change", detail: "Switch writing to 'Congrats Sam!'" },
  { id: "caller-16", name: "Victor C.", need: "Pallet pickup slot", detail: "Forklift slot at dock 2" },
  { id: "caller-17", name: "Hana Y.", need: "Menu allergy question", detail: "Asks about peanut-free options" },
  { id: "caller-18", name: "Eli J.", need: "Printer paper restock", detail: "Needs two reams for front desk" },
  { id: "caller-19", name: "Fatima A.", need: "Shift swap message", detail: "Message for supervisor Dana" },
  { id: "caller-20", name: "Greg O.", need: "Spill cleanup request", detail: "Spill near aisle 4 entrance" },
  { id: "caller-21", name: "Ivy Z.", need: "Loyalty signup help", detail: "Wants points on today's visit" },
  { id: "caller-22", name: "Kwame Q.", need: "Box tape refill", detail: "Packing station is out of tape" },
  { id: "caller-23", name: "Lucia V.", need: "Table reservation", detail: "Table for 6 at 7pm Friday" },
  { id: "caller-24", name: "Sam N.", need: "Broken cart report", detail: "Cart 12 has a stuck wheel" },
  { id: "caller-25", name: "Tara I.", need: "Uniform size swap", detail: "Swap medium shirt for large" },
  { id: "caller-26", name: "Umar X.", need: "Freezer alarm check", detail: "Alarm beeped twice this morning" },
  { id: "caller-27", name: "Wendy U.", need: "Thank-you callback", detail: "Thanks the crew for fast service" },
  { id: "caller-28", name: "Yusuf Z.", need: "Rain-check request", detail: "Rain check on sale paper towels" },
  { id: "caller-29", name: "Zoe H.", need: "New-menu feedback", detail: "Loved the veggie wrap special" },
  { id: "caller-30", name: "Ben A.", need: "Parking validation", detail: "Needs stamp for garage level B" },
  { id: "caller-31", name: "Dana L.", need: "Supervisor callback", detail: "Callback before 3pm about schedule" },
  { id: "caller-32", name: "Rex O.", need: "Morning bread hold", detail: "Hold four rolls till 9am" },
];

export const vocrehabPack2Windows: readonly VocrehabPack2Window[] = [
  { id: "window-01", label: "Morning doors — unlock and greet", windowMin: 5 },
  { id: "window-02", label: "Aisle 3 restock check", windowMin: 10 },
  { id: "window-03", label: "Register float count", windowMin: 5 },
  { id: "window-04", label: "Produce mist and rotate", windowMin: 10 },
  { id: "window-05", label: "Dock 2 pallet scan", windowMin: 15 },
  { id: "window-06", label: "Lunch rush sandwich line", windowMin: 10 },
  { id: "window-07", label: "Lobby wipe-down round", windowMin: 10 },
  { id: "window-08", label: "Trash run to compactor", windowMin: 5 },
  { id: "window-09", label: "Fitting room reset", windowMin: 10 },
  { id: "window-10", label: "Price check blitz", windowMin: 5 },
  { id: "window-11", label: "Cooler temp log", windowMin: 5 },
  { id: "window-12", label: "Mail and packages sort", windowMin: 10 },
  { id: "window-13", label: "Copy room paper refill", windowMin: 5 },
  { id: "window-14", label: "Playground-side sweep", windowMin: 10 },
  { id: "window-15", label: "Soup station refill", windowMin: 10 },
  { id: "window-16", label: "Cart corral roundup", windowMin: 15 },
  { id: "window-17", label: "Break-room dishes reset", windowMin: 5 },
  { id: "window-18", label: "Endcap facing sprint", windowMin: 5 },
  { id: "window-19", label: "Closing floors mop pass", windowMin: 15 },
  { id: "window-20", label: "Register tape swap", windowMin: 5 },
  { id: "window-21", label: "Garden hose coil check", windowMin: 10 },
  { id: "window-22", label: "Late-bus surprise — Route 9 runs 20 min late, punch on arrival", windowMin: 20, graceNote: "Late-bus grace: punch within the extended window and you still score on time." },
  { id: "window-23", label: "Late-bus surprise — Route 4 detour, text dispatch then punch", windowMin: 20, graceNote: "Late-bus grace: detour counts as excused — steady recovery earns full credit." },
  { id: "window-24", label: "Late-bus surprise — Snow delay, backup ride at :15", windowMin: 25, graceNote: "Late-bus grace: backup-ride window stays open 25 min — use the plan, stay steady." },
  { id: "window-25", label: "Evening donation bin check", windowMin: 10 },
  { id: "window-26", label: "Front-window sign flip", windowMin: 5 },
];

export const vocrehabPack2Tools: readonly VocrehabPack2Tool[] = [
  { id: "tool-01", job: "Scan a full cart at checkout", tool: "Barcode scanner", needsSafety: false },
  { id: "tool-02", job: "Price mark canned goods", tool: "Pricing gun", needsSafety: false },
  { id: "tool-03", job: "Break down cardboard boxes", tool: "Safety box cutter", needsSafety: true },
  { id: "tool-04", job: "Move a heavy pallet", tool: "Pallet jack", needsSafety: true },
  { id: "tool-05", job: "Lift stock to top shelf", tool: "Rolling step ladder", needsSafety: true },
  { id: "tool-06", job: "Grill burgers to order", tool: "Flat-top grill + tongs", needsSafety: true },
  { id: "tool-07", job: "Chop onions for prep", tool: "Chef knife + cutting board", needsSafety: true },
  { id: "tool-08", job: "Mop the lobby floor", tool: "Wet-floor mop + sign", needsSafety: true },
  { id: "tool-09", job: "Clean restroom mirrors", tool: "Spray bottle + microfiber cloth", needsSafety: false },
  { id: "tool-10", job: "Take out greasy trash", tool: "Work gloves + trash cart", needsSafety: true },
  { id: "tool-11", job: "File invoices A–Z", tool: "Filing cabinet + labels", needsSafety: false },
  { id: "tool-12", job: "Print 50 event flyers", tool: "Copier + paper tray", needsSafety: false },
  { id: "tool-13", job: "Answer multi-line phones", tool: "Headset + hold button", needsSafety: false },
  { id: "tool-14", job: "Stock freezer bags", tool: "Insulated gloves", needsSafety: true },
  { id: "tool-15", job: "Brew morning coffee", tool: "Commercial coffee maker", needsSafety: false },
  { id: "tool-16", job: "Slice deli turkey thin", tool: "Deli slicer", needsSafety: true },
  { id: "tool-17", job: "Dust high vents", tool: "Extension duster", needsSafety: false },
  { id: "tool-18", job: "Unclog mop sink", tool: "Plunger + rubber gloves", needsSafety: true },
  { id: "tool-19", job: "Count register drawer", tool: "Cash tray + calculator", needsSafety: false },
  { id: "tool-20", job: "Assemble promo endcap", tool: "Rubber mallet + shelf clips", needsSafety: false },
  { id: "tool-21", job: "Carry hot soup pot", tool: "Oven mitts + cart", needsSafety: true },
  { id: "tool-22", job: "Shred old receipts", tool: "Paper shredder", needsSafety: true },
  { id: "tool-23", job: "Water storefront plants", tool: "Watering can", needsSafety: false },
  { id: "tool-24", job: "Change ceiling light", tool: "Step stool + spare bulb", needsSafety: true },
  { id: "tool-25", job: "Pack online grocery order", tool: "Tote bags + packing list", needsSafety: false },
  { id: "tool-26", job: "Scrub fry-station hood", tool: "Degreaser + goggles", needsSafety: true },
  { id: "tool-27", job: "Sort returned hangers", tool: "Sorting bins", needsSafety: false },
  { id: "tool-28", job: "Polish front windows", tool: "Squeegee + bucket", needsSafety: false },
  { id: "tool-29", job: "Load salt bags for display", tool: "Hand truck (dolly)", needsSafety: true },
  { id: "tool-30", job: "Log deliveries on computer", tool: "Keyboard + spreadsheet", needsSafety: false },
  { id: "tool-31", job: "Sweep warehouse dock", tool: "Push broom + dustpan", needsSafety: false },
  { id: "tool-32", job: "Handle broken glass", tool: "Broom + puncture-proof gloves", needsSafety: true },
  { id: "tool-33", job: "Restock condiment pump", tool: "Funnel + refill jug", needsSafety: false },
  { id: "tool-34", job: "Operate floor scrubber", tool: "Walk-behind scrubber", needsSafety: true },
];

function pack2Pick<T>(bank: readonly T[], count: number, rand: () => number): T[] {
  const copy = bank.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy.slice(0, Math.max(0, Math.min(count, copy.length)));
}

/** Deterministic Fisher-Yates draw of `count` callers using `rand`. */
export function drawPack2Callers(count: number, rand: () => number): VocrehabPack2Caller[] {
  return pack2Pick(vocrehabPack2Callers, count, rand);
}

/** Deterministic Fisher-Yates draw of `count` punch windows using `rand`. */
export function drawPack2Windows(count: number, rand: () => number): VocrehabPack2Window[] {
  return pack2Pick(vocrehabPack2Windows, count, rand);
}

/** Deterministic Fisher-Yates draw of `count` tool-match jobs using `rand`. */
export function drawPack2Tools(count: number, rand: () => number): VocrehabPack2Tool[] {
  return pack2Pick(vocrehabPack2Tools, count, rand);
}
