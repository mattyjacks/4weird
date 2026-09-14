/**
 * VocRehab Pack-1 seeded question/task banks (C3 domain lib).
 *
 * Seeded banks for file-sort, focus-shift, barrier-run. Every load picks a
 * different subset via a short shareable seed — fair practice, calm retries.
 *
 * Pure module: zero I/O, zero DOM, safe for client + server.
 */

import {
  vocrehabHashSeed,
  vocrehabMulberry32,
  vocrehabSeededSample,
} from "./vocrehab-seed";

export type VocrehabPack1GameId = "file-sort" | "focus-shift" | "barrier-run";

export type VocrehabBankDifficulty = "beginner" | "standard" | "brisk";

export interface VocrehabBankItem {
  id: string;
  gameId: VocrehabPack1GameId;
  prompt: string;
  choices?: readonly string[];
  answer?: string;
  difficulty: VocrehabBankDifficulty;
  criteria: string;
}

const FILE_SORT_CHOICES: readonly string[] = ["Invoices", "Schedules", "Client Notes"];

const FOCUS_SHIFT_CHOICES: readonly string[] = ["Match", "No match"];

function fileItem(
  id: string,
  prompt: string,
  answer: string,
  difficulty: VocrehabBankDifficulty,
  criteria: string,
): VocrehabBankItem {
  return { id, gameId: "file-sort", prompt, choices: FILE_SORT_CHOICES, answer, difficulty, criteria };
}

function focusItem(
  id: string,
  prompt: string,
  answer: string,
  difficulty: VocrehabBankDifficulty,
  criteria: string,
): VocrehabBankItem {
  return { id, gameId: "focus-shift", prompt, choices: FOCUS_SHIFT_CHOICES, answer, difficulty, criteria };
}

function barrierItem(
  id: string,
  prompt: string,
  choices: readonly string[],
  difficulty: VocrehabBankDifficulty,
  criteria: string,
): VocrehabBankItem {
  return { id, gameId: "barrier-run", prompt, choices, difficulty, criteria };
}

const fileSortBank: readonly VocrehabBankItem[] = [
  fileItem("fs-01", "File “March invoice — print shop” belongs in which folder?", "Invoices", "beginner", "sorting accuracy"),
  fileItem("fs-02", "File “Tuesday shift schedule” belongs in which folder?", "Schedules", "beginner", "sorting accuracy"),
  fileItem("fs-03", "File “Client note — prefers morning calls” belongs in which folder?", "Client Notes", "beginner", "sorting accuracy"),
  fileItem("fs-04", "File “Receipt — office supplies” belongs in which folder?", "Invoices", "beginner", "sorting accuracy"),
  fileItem("fs-05", "File “Holiday rota draft” belongs in which folder?", "Schedules", "beginner", "sorting accuracy"),
  fileItem("fs-06", "File “Client note — likes email summaries” belongs in which folder?", "Client Notes", "beginner", "sorting accuracy"),
  fileItem("fs-07", "File “Invoice #1042 — cleaning crew” belongs in which folder?", "Invoices", "beginner", "steady pace under time"),
  fileItem("fs-08", "File “Next-week opening hours” belongs in which folder?", "Schedules", "beginner", "steady pace under time"),
  fileItem("fs-09", "File “Refund receipt — delivery fee” belongs in which folder?", "Invoices", "standard", "sorting accuracy"),
  fileItem("fs-10", "File “Swap request — Friday evening shift” belongs in which folder?", "Schedules", "standard", "sorting accuracy"),
  fileItem("fs-11", "File “Client note — bring large-print forms” belongs in which folder?", "Client Notes", "standard", "sorting accuracy"),
  fileItem("fs-12", "File “Invoice reminder — second notice” belongs in which folder?", "Invoices", "standard", "sorting under mild pressure"),
  fileItem("fs-13", "File “Training schedule — register closing” belongs in which folder?", "Schedules", "standard", "sorting under mild pressure"),
  fileItem("fs-14", "File “Client note — asked about ramp access” belongs in which folder?", "Client Notes", "standard", "sorting under mild pressure"),
  fileItem("fs-15", "File “Credit note — returned toner” belongs in which folder?", "Invoices", "standard", "recovery after a misclick"),
  fileItem("fs-16", "File “Overtime log — last weekend” belongs in which folder?", "Schedules", "standard", "recovery after a misclick"),
  fileItem("fs-17", "File “Invoice with handwritten delivery note attached” belongs in which folder? (File by main purpose: billing.)", "Invoices", "brisk", "sorting tricky overlaps"),
  fileItem("fs-18", "File “Schedule change scribbled on an invoice copy” belongs in which folder? (File by newest purpose: schedule.)", "Schedules", "brisk", "sorting tricky overlaps"),
  fileItem("fs-19", "File “Client thank-you card mentioning appointment time” belongs in which folder? (File by main purpose: client note.)", "Client Notes", "brisk", "sorting tricky overlaps"),
  fileItem("fs-20", "File “Deposit slip for invoice #1099” belongs in which folder?", "Invoices", "brisk", "brisk steady pace"),
  fileItem("fs-21", "File “Split-shift calendar with cover names” belongs in which folder?", "Schedules", "brisk", "brisk steady pace"),
  fileItem("fs-22", "File “Client note — follow up after interview” belongs in which folder?", "Client Notes", "brisk", "brisk steady pace"),
  fileItem("fs-23", "File “Past-due invoice with new payment plan note” belongs in which folder? (File by main purpose: billing.)", "Invoices", "brisk", "recovery after a misclick"),
  fileItem("fs-24", "File “Client note quoting their preferred shift time” belongs in which folder? (File by main purpose: client note.)", "Client Notes", "brisk", "sorting tricky overlaps"),
];

const focusShiftBank: readonly VocrehabBankItem[] = [
  focusItem("fx-01", "Pair 1: ● ▲ — ● ▲. Match or no match?", "Match", "beginner", "sustained focus"),
  focusItem("fx-02", "Pair 2: ■ ○ — ■ ○. Match or no match?", "Match", "beginner", "sustained focus"),
  focusItem("fx-03", "Pair 3: ▲ ● — ● ▲. Match or no match?", "No match", "beginner", "sustained focus"),
  focusItem("fx-04", "Pair 4: ◆ ■ — ◆ ■. Match or no match?", "Match", "beginner", "sustained focus"),
  focusItem("fx-05", "Pair 5: ○ ◆ — ○ ■. Match or no match?", "No match", "beginner", "sustained focus"),
  focusItem("fx-06", "Pair 6: ▲ ▲ — ▲ ▲. Match or no match?", "Match", "beginner", "steady pace"),
  focusItem("fx-07", "Pair 7: ● ■ — ■ ●. Match or no match?", "No match", "beginner", "steady pace"),
  focusItem("fx-08", "Pair 8: ◆ ○ — ◆ ○. Match or no match?", "Match", "beginner", "steady pace"),
  focusItem("fx-09", "Pair 9: ■ ▲ ● — ■ ● ▲. Match or no match?", "No match", "standard", "sustained focus"),
  focusItem("fx-10", "Pair 10: ○ ● ◆ — ○ ● ◆. Match or no match?", "Match", "standard", "sustained focus"),
  focusItem("fx-11", "Pair 11: ▲ ■ ◆ — ▲ ◆ ■. Match or no match?", "No match", "standard", "refocus after interruption"),
  focusItem("fx-12", "Pair 12: ● ○ ■ — ● ○ ■. Match or no match?", "Match", "standard", "refocus after interruption"),
  focusItem("fx-13", "A message pops up mid-round (“Can you check the back room?”). Notice it, pause, then answer — Pair 13: ◆ ▲ ● — ◆ ▲ ●. Match or no match?", "Match", "standard", "refocus after interruption"),
  focusItem("fx-14", "After the interruption, settle back in — Pair 14: ○ ■ ▲ — ▲ ■ ○. Match or no match?", "No match", "standard", "refocus after interruption"),
  focusItem("fx-15", "Pair 15: ■ ◆ ○ ▲ — ■ ◆ ○ ▲. Match or no match?", "Match", "standard", "sustained focus"),
  focusItem("fx-16", "Pair 16: ● ▲ ■ ◆ — ● ■ ▲ ◆. Match or no match?", "No match", "standard", "sustained focus"),
  focusItem("fx-17", "Pair 17: ◆ ○ ▲ ■ ● — ◆ ○ ■ ■ ●. Match or no match?", "No match", "brisk", "brisk refocus"),
  focusItem("fx-18", "Pair 18: ▲ ● ◆ ○ ■ — ▲ ● ◆ ○ ■. Match or no match?", "Match", "brisk", "brisk refocus"),
  focusItem("fx-19", "A second interruption flashes (“Phone ringing at the desk”). Pause, breathe, then answer — Pair 19: ■ ○ ● ▲ ◆ — ■ ○ ● ▲ ◆. Match or no match?", "Match", "brisk", "refocus after interruption"),
  focusItem("fx-20", "Right after that interruption — Pair 20: ○ ▲ ■ ◆ ● — ○ ▲ ◆ ■ ●. Match or no match?", "No match", "brisk", "recovery after a snag"),
  focusItem("fx-21", "Pair 21: ● ◆ ■ ▲ ○ — ● ◆ ■ ▲ ○. Match or no match?", "Match", "brisk", "brisk refocus"),
  focusItem("fx-22", "Pair 22: ▲ ○ ○ ● ■ — ▲ ○ ● ● ■. Match or no match?", "No match", "brisk", "sustained focus"),
  focusItem("fx-23", "Pair 23: ◆ ■ ▲ ● ○ — ◆ ■ ▲ ● ○. Match or no match?", "Match", "brisk", "steady pace"),
  focusItem("fx-24", "Final pair, take your time — Pair 24: ○ ● ■ ▲ ◆ — ○ ● ▲ ■ ◆. Match or no match?", "No match", "brisk", "recovery after a snag"),
];

const barrierRunBank: readonly VocrehabBankItem[] = [
  barrierItem("br-01", "Morning commute: your usual bus is running 15 minutes late and you open at 9. What do you try first?", ["Text your supervisor the new arrival time", "Wait quietly and hope it speeds up", "Ask a coworker about a backup route for next time"], "beginner", "planning ahead"),
  barrierItem("br-02", "You arrive a few minutes late and feel flustered. What helps you reset?", ["Take a slow breath and check the opening checklist", "Skip the checklist to catch up fast", "Ask a teammate where to jump in"], "beginner", "refocus routine"),
  barrierItem("br-03", "A customer asks a question you do not know. What do you do?", ["Say you will find out and ask a teammate", "Guess so the line keeps moving", "Send them to another store"], "beginner", "help-seeking strength"),
  barrierItem("br-04", "Your shift-swap request was declined. What is a steady next step?", ["Ask what swaps usually work and try again", "Give up on ever swapping", "Trade without telling anyone"], "beginner", "problem solving"),
  barrierItem("br-05", "The register freezes with a line forming. What do you do first?", ["Greet the line and call for support", "Keep pressing buttons quickly", "Step away without a word"], "beginner", "staying steady under pressure"),
  barrierItem("br-06", "A coworker shows you a shortcut you missed. How do you respond?", ["Thank them and practice it once together", "Say you already knew it", "Avoid them the rest of the shift"], "beginner", "learning from feedback"),
  barrierItem("br-07", "Lunch break is shorter than expected. How do you recharge?", ["Eat a snack and step outside for fresh air", "Skip eating to keep working", "Vent loudly in front of customers"], "beginner", "energy planning"),
  barrierItem("br-08", "End of shift: the handover note is blank. What do you leave?", ["Two lines: what got done, what is next", "Nothing — the next shift will figure it out", "A long apology note"], "beginner", "communication"),
  barrierItem("br-09", "Schedule post: you are on closing two Fridays in a row and Fridays drain you. What do you do?", ["Ask your supervisor about rotating one Friday", "Call out without notice", "Quietly take both and burn out"], "standard", "self-advocacy"),
  barrierItem("br-10", "Disclosure moment: a supervisor asks what supports help you do your best. What do you share?", ["One clear support: written task lists", "Nothing — change the subject", "Your full personal history"], "standard", "self-advocacy"),
  barrierItem("br-11", "Tool failure: the label printer jams during a rush. What is your move?", ["Switch to handwritten labels and flag the jam", "Keep reprinting until it works", "Stop serving customers"], "standard", "problem solving"),
  barrierItem("br-12", "A regular seems frustrated with the wait. What do you try?", ["Acknowledge the wait and give a time estimate", "Ignore them and work faster silently", "Offer something you cannot promise"], "standard", "customer communication"),
  barrierItem("br-13", "Two coworkers disagree about who covers the break. You are the third person. What helps?", ["Suggest splitting the break window evenly", "Take sides loudly", "Leave the floor to avoid it"], "standard", "teamwork"),
  barrierItem("br-14", "You misheard an instruction and stocked the wrong shelf. What now?", ["Flag it, fix one shelf, ask for a re-check", "Hide the mistake", "Blame the morning crew"], "standard", "recovery after a snag"),
  barrierItem("br-15", "Training block overlaps with your transport home. What do you do?", ["Ask if the training has a second session", "Skip training without telling anyone", "Miss your ride and figure it out later"], "standard", "planning ahead"),
  barrierItem("br-16", "Your energy dips mid-afternoon every shift. What pattern could you test?", ["Ask for one short movement break mid-shift", "Push through and crash at close", "Use energy drinks daily"], "standard", "energy planning"),
  barrierItem("br-17", "Back-to-back interruptions: phone, delivery, spill — all in ten minutes. You feel flooded. First step?", ["Pause, pick the safety issue first, then sequence the rest", "Try all three at once", "Freeze until someone rescues you"], "brisk", "sequencing under pressure"),
  barrierItem("br-18", "A supervisor corrects you in front of customers. It stings. What keeps the shift steady?", ["Thank them briefly and ask for details after the rush", "Argue it out on the floor", "Shut down for the rest of the day"], "brisk", "learning from feedback"),
  barrierItem("br-19", "Holiday rota: everyone wants the same Saturday off. What is a fair proposal?", ["Offer to swap a Friday close for that Saturday", "Demand the Saturday because you asked first", "Say nothing and resent the rota"], "brisk", "negotiation"),
  barrierItem("br-20", "New till software drops with no training. Orders pile up. What do you do?", ["Use one practiced flow and ask for a 10-minute walkthrough", "Refuse to touch the new till", "Experiment on live orders at full speed"], "brisk", "adapting to change"),
  barrierItem("br-21", "You notice a teammate struggling with heavy boxes. Your own tasks are done. What do you do?", ["Offer to team-lift and check the safe-lifting steps", "Watch and keep to yourself", "Lift everything alone to impress"], "brisk", "teamwork"),
  barrierItem("br-22", "A customer reports a spill and you are mid-task with a queue. Order of operations?", ["Secure the spill zone first, then return to the queue", "Finish the queue, spill can wait", "Ask the customer to clean it"], "brisk", "sequencing under pressure"),
  barrierItem("br-23", "End-of-week review: which win do you name first?", ["A strength: what worked and how you did it", "Only the mistakes", "Nothing — reviews are pointless"], "brisk", "strengths-first reflection"),
  barrierItem("br-24", "Next-week plan: one support to carry forward?", ["A written checklist at the register", "Longer hours with no breaks", "Avoiding all feedback"], "brisk", "planning ahead"),
];

export const vocrehabPack1Banks: Record<VocrehabPack1GameId, readonly VocrehabBankItem[]> = {
  "file-sort": fileSortBank,
  "focus-shift": focusShiftBank,
  "barrier-run": barrierRunBank,
};

export interface VocrehabPack1Draw {
  seed: string;
  items: VocrehabBankItem[];
  criteria: string[];
}

/** Draw up to n items from a game's bank, deterministically per seed. Pure. */
export function vocrehabDrawPack1(
  gameId: VocrehabPack1GameId,
  seed: string,
  n: number,
): VocrehabPack1Draw {
  const bank = vocrehabPack1Banks[gameId] ?? [];
  const count = Math.max(0, Math.min(Math.floor(n), bank.length));
  const rand = vocrehabMulberry32(vocrehabHashSeed(String(seed)));
  const items = vocrehabSeededSample(bank, count, rand);
  const seen: string[] = [];
  for (const item of items) {
    if (seen.indexOf(item.criteria) < 0) seen.push(item.criteria);
  }
  return { seed: String(seed), items, criteria: seen };
}
