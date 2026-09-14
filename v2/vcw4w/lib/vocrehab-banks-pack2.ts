/**
 * lib/vocrehab-banks-pack2.ts — VocRehab pack-2 seeded item banks (self-contained).
 *
 * Three banks matching vocrehabGame2Registry ids: phone-greeting, time-punch,
 * tool-match. >=24 items each, tagged beginner / standard / brisk with a
 * criteria skill string per item.
 *
 * Pure module: zero DOM, zero I/O, no browser globals. Seeded draw via
 * ./vocrehab-seed (verified present at author time: xmur3, mulberry32,
 * makeSeed, parseSeed, shuffle, sample), so the same seed always yields
 * the same set; an omitted/blank seed draws with a fresh random seed.
 *
 * NOTE on fallback: no local PRNG fallback is bundled because
 * ./vocrehab-seed.ts is present in this tree. If that module ever goes
 * missing, re-add a local xmur3 + mulberry32 fallback here and note it.
 */

import { makeSeed, mulberry32, sample, xmur3 } from "./vocrehab-seed";

export type VocrehabPack2GameId = "phone-greeting" | "time-punch" | "tool-match";

export type VocrehabBank2Difficulty = "beginner" | "standard" | "brisk";

export interface VocrehabBank2Item {
  id: string;
  gameId: VocrehabPack2GameId;
  prompt: string;
  choices?: readonly string[];
  answer?: string;
  difficulty: VocrehabBank2Difficulty;
  criteria: string;
}

export interface VocrehabPack2Draw {
  seed: string;
  items: VocrehabBank2Item[];
  criteria: string[];
}

const PHONE_BANK: readonly VocrehabBank2Item[] = [
  { id: "pg2-01", gameId: "phone-greeting", prompt: "Caller Rosa: “Hi, this is Rosa about invoice 4417.” Greet her warmly by name, then recall the detail.", choices: ["Invoice 4417", "Invoice 4471", "Package 4417"], answer: "Invoice 4417", difficulty: "beginner", criteria: "recall" },
  { id: "pg2-02", gameId: "phone-greeting", prompt: "Caller Devon: “Devon here — my pickup is Thursday at 3.” Greet him warmly, then recall the detail.", choices: ["Thursday at 3", "Friday at 3", "Thursday at 5"], answer: "Thursday at 3", difficulty: "beginner", criteria: "recall" },
  { id: "pg2-03", gameId: "phone-greeting", prompt: "Caller Priya: “It’s Priya, extension 214.” Greet her warmly, then recall the detail.", choices: ["Extension 214", "Extension 241", "Extension 124"], answer: "Extension 214", difficulty: "beginner", criteria: "listening" },
  { id: "pg2-04", gameId: "phone-greeting", prompt: "Caller Sam: “Sam calling — the delivery gate code is 7780.” Greet him warmly, then recall the detail.", choices: ["Gate code 7780", "Gate code 7708", "Gate code 7870"], answer: "Gate code 7780", difficulty: "beginner", criteria: "recall" },
  { id: "pg2-05", gameId: "phone-greeting", prompt: "Caller Ana: “Ana here, I’m here for the 10:30 interview.” Greet her warmly, then recall the detail.", choices: ["10:30 interview", "11:30 interview", "10:30 orientation"], answer: "10:30 interview", difficulty: "beginner", criteria: "phone courtesy" },
  { id: "pg2-06", gameId: "phone-greeting", prompt: "Caller Marcus: “Marcus — my order is the blue binder, 12 copies.” Greet him warmly, then recall the detail.", choices: ["Blue binder, 12 copies", "Blue binder, 20 copies", "Red binder, 12 copies"], answer: "Blue binder, 12 copies", difficulty: "beginner", criteria: "listening" },
  { id: "pg2-07", gameId: "phone-greeting", prompt: "Caller June: “June Park — please hold my table for 6 at 7.” Greet her warmly, then recall the detail.", choices: ["Table for 6 at 7", "Table for 7 at 6", "Table for 6 at 8"], answer: "Table for 6 at 7", difficulty: "beginner", criteria: "recall" },
  { id: "pg2-08", gameId: "phone-greeting", prompt: "Caller Leo: “Leo from BrightFix — the part arrives Tuesday.” Greet him warmly, then recall the detail.", choices: ["Part arrives Tuesday", "Part arrives Thursday", " Technician arrives Tuesday"], answer: "Part arrives Tuesday", difficulty: "beginner", criteria: "listening" },
  { id: "pg2-09", gameId: "phone-greeting", prompt: "Caller Nadia: “Nadia — my callback number is 555-0184.” Greet her warmly, then recall the detail.", choices: ["555-0184", "555-0814", "555-0188"], answer: "555-0184", difficulty: "standard", criteria: "recall" },
  { id: "pg2-10", gameId: "phone-greeting", prompt: "Caller Theo: “Theo Briggs — I need the west entrance held open.” Greet him warmly, then recall the detail.", choices: ["West entrance", "East entrance", "West exit"], answer: "West entrance", difficulty: "standard", criteria: "listening" },
  { id: "pg2-11", gameId: "phone-greeting", prompt: "Caller Grace: “Grace Okafor — confirming Maya’s 2:15 appointment.” Greet her warmly, then recall the detail.", choices: ["Maya, 2:15", "Maya, 2:50", "Mia, 2:15"], answer: "Maya, 2:15", difficulty: "standard", criteria: "recall" },
  { id: "pg2-12", gameId: "phone-greeting", prompt: "Caller Ray: “Ray Delgado — the meeting moved to Room 3B.” Greet him warmly, then recall the detail.", choices: ["Room 3B", "Room 3D", "Room 5B"], answer: "Room 3B", difficulty: "standard", criteria: "listening" },
  { id: "pg2-13", gameId: "phone-greeting", prompt: "Caller Ivy: “Ivy Chen — allergic to latex, please note it.” Greet her warmly, then recall the detail.", choices: ["Allergic to latex", "Allergic to peanuts", "Prefers latex"], answer: "Allergic to latex", difficulty: "standard", criteria: "recall" },
  { id: "pg2-14", gameId: "phone-greeting", prompt: "Caller Omar: “Omar Haddad — returning the drill, receipt 9920.” Greet him warmly, then recall the detail.", choices: ["Drill, receipt 9920", "Saw, receipt 9920", "Drill, receipt 9290"], answer: "Drill, receipt 9920", difficulty: "standard", criteria: "recall" },
  { id: "pg2-15", gameId: "phone-greeting", prompt: "Caller Bea: “Bea Fontaine — my dog Moose is with me, he’s a service animal.” Greet her warmly, then recall the detail.", choices: ["Service animal Moose", "Pet Moose, wait outside", "Service animal Max"], answer: "Service animal Moose", difficulty: "standard", criteria: "phone courtesy" },
  { id: "pg2-16", gameId: "phone-greeting", prompt: "Caller Kit: “Kit Alvarez — the password reset goes to k.alvarez@post.” Greet warmly, then recall the detail.", choices: ["k.alvarez@post", "k.alvarez@host", "kit@post"], answer: "k.alvarez@post", difficulty: "standard", criteria: "listening" },
  { id: "pg2-17", gameId: "phone-greeting", prompt: "Caller Wren: “Wren — I’m double-parked, I’ll be 2 minutes.” Greet them warmly, then recall the detail.", choices: ["Double-parked, 2 minutes", "Parked, 20 minutes", "Double-parked, 10 minutes"], answer: "Double-parked, 2 minutes", difficulty: "brisk", criteria: "phone courtesy" },
  { id: "pg2-18", gameId: "phone-greeting", prompt: "Caller Suki: “Suki Tanaka — confirming 40 chairs, Friday, loading dock B.” Greet her warmly, then recall the detail.", choices: ["40 chairs, Friday, dock B", "14 chairs, Friday, dock B", "40 chairs, Friday, dock A"], answer: "40 chairs, Friday, dock B", difficulty: "brisk", criteria: "recall" },
  { id: "pg2-19", gameId: "phone-greeting", prompt: "Caller Abe: “Abe Kowalski — my son Jayden will pick up my check.” Greet him warmly, then recall the detail.", choices: ["Jayden picks up check", "Abe picks up check", "Jayden drops off check"], answer: "Jayden picks up check", difficulty: "brisk", criteria: "listening" },
  { id: "pg2-20", gameId: "phone-greeting", prompt: "Caller Flo: “Flo Mendez — hard of hearing, please speak slow and clear.” Greet her warmly, then recall the detail.", choices: ["Speak slow and clear", "Call back later", "Send a text instead"], answer: "Speak slow and clear", difficulty: "brisk", criteria: "phone courtesy" },
  { id: "pg2-21", gameId: "phone-greeting", prompt: "Caller Gus: “Gus Ferreira — the freezer alarm beeped twice at 6.” Greet him warmly, then recall the detail.", choices: ["Freezer alarm, twice, at 6", "Fridge alarm, once, at 6", "Freezer alarm, twice, at 9"], answer: "Freezer alarm, twice, at 6", difficulty: "brisk", criteria: "recall" },
  { id: "pg2-22", gameId: "phone-greeting", prompt: "Caller Hal: “Hal Osei — upset about a late order, wants a supervisor.” Greet him calmly by name, then recall the detail.", choices: ["Wants a supervisor, late order", "Wants a refund now", "Wants to cancel everything"], answer: "Wants a supervisor, late order", difficulty: "brisk", criteria: "phone courtesy" },
  { id: "pg2-23", gameId: "phone-greeting", prompt: "Caller Dee: “Dee Washington — spelling it D-E-E, callback before noon.” Greet her warmly, then recall the detail.", choices: ["D-E-E, before noon", "D-E-A, before noon", "D-E-E, after noon"], answer: "D-E-E, before noon", difficulty: "brisk", criteria: "listening" },
  { id: "pg2-24", gameId: "phone-greeting", prompt: "Caller Paz: “Paz Rivera — confirming the plumber for unit 12, key at desk.” Greet them warmly, then recall the detail.", choices: ["Plumber, unit 12, key at desk", "Electrician, unit 12, key at desk", "Plumber, unit 21, key at desk"], answer: "Plumber, unit 12, key at desk", difficulty: "brisk", criteria: "recall" },
];

const TIME_BANK: readonly VocrehabBank2Item[] = [
  { id: "tp2-01", gameId: "time-punch", prompt: "Task: wipe tables. Window 9:00–9:20. When do you punch?", choices: ["Punch at 9:10", "Punch at 8:40", "Punch at 9:45"], answer: "Punch at 9:10", difficulty: "beginner", criteria: "punctuality" },
  { id: "tp2-02", gameId: "time-punch", prompt: "Task: unlock front door. Window 8:55–9:05. When do you punch?", choices: ["Punch at 9:00", "Punch at 8:30", "Punch at 9:30"], answer: "Punch at 9:00", difficulty: "beginner", criteria: "punctuality" },
  { id: "tp2-03", gameId: "time-punch", prompt: "Task: restock cups. Window 10:00–10:15. When do you punch?", choices: ["Punch at 10:07", "Punch at 9:30", "Punch at 11:00"], answer: "Punch at 10:07", difficulty: "beginner", criteria: "time management" },
  { id: "tp2-04", gameId: "time-punch", prompt: "Task: sweep entry. Window 11:00–11:20. When do you punch?", choices: ["Punch at 11:10", "Punch at 10:20", "Punch at 12:00"], answer: "Punch at 11:10", difficulty: "beginner", criteria: "time management" },
  { id: "tp2-05", gameId: "time-punch", prompt: "Task: clock in for shift. Window 1:55–2:05. When do you punch?", choices: ["Punch at 2:00", "Punch at 1:20", "Punch at 2:40"], answer: "Punch at 2:00", difficulty: "beginner", criteria: "punctuality" },
  { id: "tp2-06", gameId: "time-punch", prompt: "Task: water plants. Window 3:00–3:30. When do you punch?", choices: ["Punch at 3:15", "Punch at 2:00", "Punch at 4:00"], answer: "Punch at 3:15", difficulty: "beginner", criteria: "time management" },
  { id: "tp2-07", gameId: "time-punch", prompt: "Task: take out trash. Window 4:00–4:15. When do you punch?", choices: ["Punch at 4:08", "Punch at 3:00", "Skip it, punch tomorrow"], answer: "Punch at 4:08", difficulty: "beginner", criteria: "punctuality" },
  { id: "tp2-08", gameId: "time-punch", prompt: "Task: refill napkins. Window 12:00–12:10. When do you punch?", choices: ["Punch at 12:05", "Punch at 11:00", "Punch at 1:00"], answer: "Punch at 12:05", difficulty: "beginner", criteria: "time management" },
  { id: "tp2-09", gameId: "time-punch", prompt: "Task: mop spill in aisle 4. Window 9:30–9:40. When do you punch?", choices: ["Punch at 9:35", "Punch at 9:10", "Punch at 10:30"], answer: "Punch at 9:35", difficulty: "standard", criteria: "time management" },
  { id: "tp2-10", gameId: "time-punch", prompt: "Task: count register. Window 5:00–5:10. When do you punch?", choices: ["Punch at 5:04", "Punch at 4:30", "Punch at 5:45"], answer: "Punch at 5:04", difficulty: "standard", criteria: "punctuality" },
  { id: "tp2-11", gameId: "time-punch", prompt: "Task: rotate milk stock. Window 7:00–7:25. When do you punch?", choices: ["Punch at 7:12", "Punch at 6:20", "Punch at 8:00"], answer: "Punch at 7:12", difficulty: "standard", criteria: "time management" },
  { id: "tp2-12", gameId: "time-punch", prompt: "Task: sanitize carts. Window 2:00–2:30. When do you punch?", choices: ["Punch at 2:15", "Punch at 1:00", "Punch at 3:30"], answer: "Punch at 2:15", difficulty: "standard", criteria: "time management" },
  { id: "tp2-13", gameId: "time-punch", prompt: "Task: lunch break ends. Window back by 12:30–12:35. When do you punch?", choices: ["Punch at 12:32", "Punch at 12:00", "Punch at 1:15"], answer: "Punch at 12:32", difficulty: "standard", criteria: "punctuality" },
  { id: "tp2-14", gameId: "time-punch", prompt: "Task: delivery check-in. Window 6:00–6:20. When do you punch?", choices: ["Punch at 6:10", "Punch at 5:20", "Punch at 7:00"], answer: "Punch at 6:10", difficulty: "standard", criteria: "time management" },
  { id: "tp2-15", gameId: "time-punch", prompt: "Task: restock shelves before rush. Window 4:30–4:45. When do you punch?", choices: ["Punch at 4:38", "Punch at 4:00", "Punch at 5:30"], answer: "Punch at 4:38", difficulty: "standard", criteria: "punctuality" },
  { id: "tp2-16", gameId: "time-punch", prompt: "Task: lock supply closet. Window 8:00–8:10. When do you punch?", choices: ["Punch at 8:05", "Punch at 7:30", "Punch at 9:00"], answer: "Punch at 8:05", difficulty: "standard", criteria: "time management" },
  { id: "tp2-17", gameId: "time-punch", prompt: "LATE-BUS SURPRISE: bus runs 15 min late. Task: open register, window 9:00–9:10. You arrive 9:12. Best recovery?", choices: ["Grace punch at 9:12 + tell your lead right away", "Skip the punch so nobody notices", "Backdate the punch to 9:05"], answer: "Grace punch at 9:12 + tell your lead right away", difficulty: "brisk", criteria: "recovery" },
  { id: "tp2-18", gameId: "time-punch", prompt: "LATE-BUS SURPRISE: bus late. Task: morning huddle, window 8:30–8:40. You arrive 8:42. Best recovery?", choices: ["Join quietly, grace punch, check with lead after", "Turn around and go home", "Punch in as 8:25"], answer: "Join quietly, grace punch, check with lead after", difficulty: "brisk", criteria: "recovery" },
  { id: "tp2-19", gameId: "time-punch", prompt: "Task: two overlapping windows — trash 4:00–4:10, restock 4:05–4:20. What first?", choices: ["Punch trash at 4:05, then restock inside its window", "Do restock first, let trash slide", "Punch both at 3:30 early"], answer: "Punch trash at 4:05, then restock inside its window", difficulty: "brisk", criteria: "time management" },
  { id: "tp2-20", gameId: "time-punch", prompt: "LATE-BUS SURPRISE: bus late 20 min. Task: safety walk, window 7:00–7:15. You arrive 7:18. Best recovery?", choices: ["Grace punch, do the walk fully, note the delay", "Rush the walk in 2 minutes", "Skip the walk, punch on time next task"], answer: "Grace punch, do the walk fully, note the delay", difficulty: "brisk", criteria: "recovery" },
  { id: "tp2-21", gameId: "time-punch", prompt: "Task: close-out count. Window 9:00–9:10 PM, no grace left. You finish at 9:09. Best move?", choices: ["Punch at 9:09 with the true time", "Wait and punch at 9:20", "Ask a coworker to punch for you"], answer: "Punch at 9:09 with the true time", difficulty: "brisk", criteria: "punctuality" },
  { id: "tp2-22", gameId: "time-punch", prompt: "Task: temp check on cooler. Window every hour :00–:05. It is 2:03. Best move?", choices: ["Punch and log it now at 2:03", "Wait until 2:30 when free", "Log yesterday's reading"], answer: "Punch and log it now at 2:03", difficulty: "brisk", criteria: "time management" },
  { id: "tp2-23", gameId: "time-punch", prompt: "LATE-BUS SURPRISE: second late bus this week. Task: stock dairy, window 6:00–6:15. You arrive 6:10. Best recovery?", choices: ["Grace punch, start dairy now, thank your lead after", "Hide the delay and punch 6:00", "Take a long break first"], answer: "Grace punch, start dairy now, thank your lead after", difficulty: "brisk", criteria: "recovery" },
  { id: "tp2-24", gameId: "time-punch", prompt: "Task: end-of-shift handoff note. Window 4:50–5:00. You finish at 4:56. Best move?", choices: ["Punch at 4:56 with a complete note", "Leave early without a note", "Punch at 4:30 before finishing"], answer: "Punch at 4:56 with a complete note", difficulty: "brisk", criteria: "punctuality" },
];

const TOOL_BANK: readonly VocrehabBank2Item[] = [
  { id: "tm2-01", gameId: "tool-match", prompt: "Job: sweep the shop floor. Which tool? Flag safety gear if needed.", choices: ["Push broom", "Chainsaw", "Soldering iron"], answer: "Push broom", difficulty: "beginner", criteria: "task knowledge" },
  { id: "tm2-02", gameId: "tool-match", prompt: "Job: tighten a loose shelf bolt. Which tool? Flag safety gear if needed.", choices: ["Adjustable wrench", "Paint roller", "Garden hose"], answer: "Adjustable wrench", difficulty: "beginner", criteria: "task knowledge" },
  { id: "tm2-03", gameId: "tool-match", prompt: "Job: cut a cardboard box down. Which tool? Flag safety gear if needed.", choices: ["Box cutter", "Hammer", "Mop"], answer: "Box cutter", difficulty: "beginner", criteria: "task knowledge + safety gear: gloves" },
  { id: "tm2-04", gameId: "tool-match", prompt: "Job: hammer a nail into a frame. Which tool? Flag safety gear if needed.", choices: ["Claw hammer", "Screwdriver", "Level"], answer: "Claw hammer", difficulty: "beginner", criteria: "task knowledge + safety gear: safety glasses" },
  { id: "tm2-05", gameId: "tool-match", prompt: "Job: measure a shelf for new brackets. Which tool? Flag safety gear if needed.", choices: ["Tape measure", "Drill", "Bucket"], answer: "Tape measure", difficulty: "beginner", criteria: "task knowledge" },
  { id: "tm2-06", gameId: "tool-match", prompt: "Job: drive screws into drywall. Which tool? Flag safety gear if needed.", choices: ["Power drill", "Paintbrush", "Broom"], answer: "Power drill", difficulty: "beginner", criteria: "task knowledge + safety gear: safety glasses" },
  { id: "tm2-07", gameId: "tool-match", prompt: "Job: mop up a spill. Which tool? Flag safety gear if needed.", choices: ["Mop + wet-floor sign", "Leaf blower", "Angle grinder"], answer: "Mop + wet-floor sign", difficulty: "beginner", criteria: "task knowledge + safety gear: non-slip shoes" },
  { id: "tm2-08", gameId: "tool-match", prompt: "Job: carry a heavy crate. Which tool? Flag safety gear if needed.", choices: ["Hand truck (dolly)", "Ladder", "Stapler"], answer: "Hand truck (dolly)", difficulty: "beginner", criteria: "task knowledge + safety gear: back support" },
  { id: "tm2-09", gameId: "tool-match", prompt: "Job: cut a 2x4 to length. Which tool? Flag safety gear if needed.", choices: ["Circular saw", "Wrench", "Duster"], answer: "Circular saw", difficulty: "standard", criteria: "task knowledge + safety gear: safety glasses + ear protection" },
  { id: "tm2-10", gameId: "tool-match", prompt: "Job: mix paint for a touch-up wall. Which tool? Flag safety gear if needed.", choices: ["Paint stirrer + roller", "Jackhammer", "Multimeter"], answer: "Paint stirrer + roller", difficulty: "standard", criteria: "task knowledge" },
  { id: "tm2-11", gameId: "tool-match", prompt: "Job: unclog a sink drain. Which tool? Flag safety gear if needed.", choices: ["Plunger + drain snake", "Blowtorch", "Sander"], answer: "Plunger + drain snake", difficulty: "standard", criteria: "task knowledge + safety gear: gloves" },
  { id: "tm2-12", gameId: "tool-match", prompt: "Job: check if an outlet is live. Which tool? Flag safety gear if needed.", choices: ["Multimeter", "Hammer", "Caulk gun"], answer: "Multimeter", difficulty: "standard", criteria: "task knowledge + safety gear: insulated gloves" },
  { id: "tm2-13", gameId: "tool-match", prompt: "Job: grind a sharp burr off metal. Which tool? Flag safety gear if needed.", choices: ["Angle grinder", "Paintbrush", "Broom"], answer: "Angle grinder", difficulty: "standard", criteria: "task knowledge + safety gear: face shield + gloves" },
  { id: "tm2-14", gameId: "tool-match", prompt: "Job: reach a high bulb to replace it. Which tool? Flag safety gear if needed.", choices: ["Step ladder", "Office chair", "Crate stack"], answer: "Step ladder", difficulty: "standard", criteria: "task knowledge" },
  { id: "tm2-15", gameId: "tool-match", prompt: "Job: spray weeds along the fence. Which tool? Flag safety gear if needed.", choices: ["Pump sprayer", "Pressure washer", "Leaf rake"], answer: "Pump sprayer", difficulty: "standard", criteria: "task knowledge + safety gear: gloves + eye protection" },
  { id: "tm2-16", gameId: "tool-match", prompt: "Job: jump-start a dead van battery. Which tool? Flag safety gear if needed.", choices: ["Jumper cables", "Extension cord", "Air hose"], answer: "Jumper cables", difficulty: "standard", criteria: "task knowledge + safety gear: safety glasses" },
  { id: "tm2-17", gameId: "tool-match", prompt: "Job: weld a cracked bracket. Which tool? Flag safety gear if needed.", choices: ["Welder", "Glue gun", "Staple gun"], answer: "Welder", difficulty: "brisk", criteria: "task knowledge + safety gear: welding helmet + gloves" },
  { id: "tm2-18", gameId: "tool-match", prompt: "Job: fell a small dead tree limb. Which tool? Flag safety gear if needed.", choices: ["Chainsaw", "Handsaw only", "Hedge trimmer"], answer: "Chainsaw", difficulty: "brisk", criteria: "task knowledge + safety gear: chaps + helmet + eye protection" },
  { id: "tm2-19", gameId: "tool-match", prompt: "Job: clear a dusty attic with mold spots. Which tool? Flag safety gear if needed.", choices: ["HEPA vacuum + respirator", "Feather duster", "Box fan"], answer: "HEPA vacuum + respirator", difficulty: "brisk", criteria: "task knowledge + safety gear: respirator + gloves" },
  { id: "tm2-20", gameId: "tool-match", prompt: "Job: pour concrete for a pad. Which tool? Flag safety gear if needed.", choices: ["Cement mixer + wheelbarrow", "Paint tray", "Shop vac"], answer: "Cement mixer + wheelbarrow", difficulty: "brisk", criteria: "task knowledge + safety gear: boots + gloves" },
  { id: "tm2-21", gameId: "tool-match", prompt: "Job: cut tile for a backsplash. Which tool? Flag safety gear if needed.", choices: ["Wet tile saw", "Wood saw", "Scissors"], answer: "Wet tile saw", difficulty: "brisk", criteria: "task knowledge + safety gear: safety glasses + gloves" },
  { id: "tm2-22", gameId: "tool-match", prompt: "Job: work under a raised car. Which tool? Flag safety gear if needed.", choices: ["Jack stands", "Bumper jack alone", "Cinder blocks"], answer: "Jack stands", difficulty: "brisk", criteria: "task knowledge + safety gear: jack stands required, never improvise" },
  { id: "tm2-23", gameId: "tool-match", prompt: "Job: handle bleach + ammonia smell in a closet — stop and pick protection first. Which gear?", choices: ["Leave + ventilate + respirator, never mix", "Mix and scrub faster", "Hold breath and finish"], answer: "Leave + ventilate + respirator, never mix", difficulty: "brisk", criteria: "task knowledge + safety gear: respirator, stop-work rule" },
  { id: "tm2-24", gameId: "tool-match", prompt: "Job: nail shingles on a sloped roof. Which tool? Flag safety gear if needed.", choices: ["Roofing nailer + harness", "Staple gun", "Glue stick"], answer: "Roofing nailer + harness", difficulty: "brisk", criteria: "task knowledge + safety gear: fall harness required" },
];

export const vocrehabPack2Banks: Record<VocrehabPack2GameId, readonly VocrehabBank2Item[]> = {
  "phone-greeting": PHONE_BANK,
  "time-punch": TIME_BANK,
  "tool-match": TOOL_BANK,
};

const PACK2_IDS: readonly VocrehabPack2GameId[] = [
  "phone-greeting",
  "time-punch",
  "tool-match",
];

/** True for the three pack-2 game ids. */
export function vocrehabIsPack2GameId(id: unknown): id is VocrehabPack2GameId {
  return typeof id === "string" && (PACK2_IDS as readonly string[]).includes(id);
}

/**
 * Seeded draw: same gameId + seed + n always returns the same items.
 * Unknown gameId yields []. n <= 0 yields []. n larger than the bank
 * returns the whole bank in seeded order. A missing/blank seed gets a
 * fresh random seed (reported back in the result).
 */
export function vocrehabDrawPack2(
  gameId: VocrehabPack2GameId,
  seed?: string,
  n?: number,
): VocrehabPack2Draw {
  const bank = (vocrehabIsPack2GameId(gameId) ? vocrehabPack2Banks[gameId] : []) as readonly VocrehabBank2Item[];
  const resolvedSeed = typeof seed === "string" && seed.trim().length > 0 ? seed.trim() : makeSeed();
  const count =
    typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : bank.length;
  const rand = mulberry32(xmur3(resolvedSeed)());
  const items = sample(rand, bank, Math.min(count, bank.length));
  const seen = new Set<string>();
  const criteria: string[] = [];
  for (const item of items) {
    if (!seen.has(item.criteria)) {
      seen.add(item.criteria);
      criteria.push(item.criteria);
    }
  }
  return { seed: resolvedSeed, items, criteria };
}
