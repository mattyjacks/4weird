/**
 * VocRehab 20-job interview catalog (Wave 2) — PURE module.
 *
 * Zero I/O, zero imports, SSR-safe. Counselor-reviewed static content only:
 * model-generated job text is banned in v1. Q1-4 share one frame for every
 * job; only Q5 + follow-ups + curveball are role-tailored.
 *
 * Spinoff-safe: flat lib/vocrehab-* file, no shared imports.
 */

export type VocrehabInterviewJobId =
  | "retail" | "warehouse" | "food" | "janitorial" | "admin"
  | "csr" | "hha" | "delivery" | "helpdesk" | "childcare"
  | "grocery" | "custodial" | "fastfood" | "fileclerk" | "frontdesk"
  | "kitchen" | "mailroom" | "clinic" | "grounds" | "security";

export interface VocrehabInterviewJobContent {
  id: VocrehabInterviewJobId;
  title: string;
  /** Exactly [Q1..Q5]: Q1-4 shared frame, Q5 role-tailored. */
  questions: [string, string, string, string, string];
  followUps: [string, string];
  curveball: string;
}

const Q1 = "Tell me a little about yourself and why this role interests you.";
const Q2 = "What is a strength you bring to this work? Give me one short example of using it.";
const Q3 = "Tell me about a challenge you handled — what happened, and what did you do next?";
const Q4 = "How do you work with a team? Give me one example of helping a coworker.";

function job(
  id: VocrehabInterviewJobId,
  title: string,
  q5: string,
  fu1: string,
  fu2: string,
  curveball: string,
): VocrehabInterviewJobContent {
  return { id, title, questions: [Q1, Q2, Q3, Q4, q5], followUps: [fu1, fu2], curveball };
}

export const vocrehabInterviewJobs: VocrehabInterviewJobContent[] = [
  job("retail", "Retail Associate", "A long checkout line forms while shelves need restocking — what do you do first?", "A customer is in a rush and the register line is long — walk me through it.", "A customer wants to return an item and is upset — what do you say?", "Customer cuts in: \u2018This is taking too long!\u2019 — reply in 2 sentences."),
  job("warehouse", "Warehouse Picker", "How do you hit your pick rate while staying safe?", "A box feels heavy and unsafe to lift alone — what do you do?", "You are behind quota near end of shift — what do you do?", "Alarm: spill in aisle 7 — what do you do first?"),
  job("food", "Food Service Worker", "Lunch rush hits and an order comes out wrong — what do you do?", "Name one food-safety step you never skip.", "A diner is rude about a wait — how do you respond?", "Phone rings while the line grows — answer in 2 sentences."),
  job("janitorial", "Janitor", "Walk me through your nightly close routine.", "You find a bio-spill in a restroom — what is your first step?", "A zone got missed last night — what do you do?", "Guest reports a flood right now — first 2 sentences."),
  job("admin", "Admin Assistant", "Calls are ringing and the calendar needs updating — how do you juggle both?", "You spot a filing error in an important record — what do you do?", "Someone asks you for confidential information — how do you respond?", "Boss interrupts: urgent memo needed now — reply briefly."),
  job("csr", "Customer Service Rep", "A caller is upset about a bill — how do you calm the call?", "Policy says no but the caller keeps pushing — what do you say?", "The system goes down mid-call — what do you tell the customer?", "Caller yells \u2018get me your manager!\u2019 — de-escalate in 2 sentences."),
  job("hha", "Home Health Aide", "Walk me through a morning care routine visit.", "A client refuses their medication — what do you do?", "You notice a fall risk in the home — what do you do?", "Client feels dizzy mid-answer — respond now, safety first."),
  job("delivery", "Delivery Driver", "You are running late in heavy traffic — what do you do?", "The address on the package is wrong — what is your next step?", "A package arrives damaged — how do you handle it?", "Dispatch reroutes you mid-stop — acknowledge in 2 sentences."),
  job("helpdesk", "Helpdesk Tier 1", "Walk me through your first password-reset call.", "A user is panicking about a deadline and a locked account — what do you say?", "You cannot solve it on the first call — what do you do next?", "Chat pings while the caller waits — handle both in 2 sentences."),
  job("childcare", "Childcare Assistant", "A child will not settle at nap time and is crying — what do you do?", "Two kids fight over a toy — how do you step in?", "A parent is running late for pickup — what do you do?", "A child falls and cries mid-answer — respond in 2 sentences."),
  job("grocery", "Grocery Stocker", "Walk me through your overnight shelf-stocking plan.", "You find an expired item on the shelf — what do you do?", "A customer blocks your bay with a full cart — what do you say?", "A pallet tips nearby — what do you say and do first?"),
  job("custodial", "Custodial Helper", "Walk me through your daytime school tidy route.", "A teacher complains a restroom was missed — what do you do?", "You run out of supplies mid-shift — what is your next step?", "Vomit in the hall right now — 2-sentence response."),
  job("fastfood", "Fast-Food Crew", "Fries are up, register is beeping, and the line is long — what do you do?", "An order goes out wrong at the window — how do you fix it?", "A teammate is moving slowly during rush — what do you do?", "Drive-thru beeps nonstop — respond in 2 sentences."),
  job("fileclerk", "Office File Clerk", "You get 100 files to sort before lunch — how do you start?", "You find a misfiled record — what do you do?", "Two deadlines clash — how do you decide what goes first?", "Manager needs one file NOW — reply briefly."),
  job("frontdesk", "Front-Desk Receptionist", "Walk me through greeting and signing in a visitor.", "Two appointments are double-booked — what do you do?", "A visitor is upset about a long wait — what do you say?", "Two visitors arrive together — greet both in 2 sentences."),
  job("kitchen", "Kitchen Prep", "Walk me through your prep-list order for a dinner shift.", "Name one knife-safety and one diet-safety step you never skip.", "Prep is running behind before service — what do you do?", "Chef adds a rush dish — acknowledge in 2 sentences."),
  job("mailroom", "Mailroom / Shipping Clerk", "A rush of parcels lands at once — how do you sort and label?", "You spot a wrong label on an outgoing box — what do you do?", "A fragile item needs packing — walk me through it.", "Truck arrives early at the dock — respond now."),
  job("clinic", "Clinic Scheduler", "Walk me through booking and confirming a full day of visits.", "A no-show leaves a gap — what do you do with the slot?", "A patient is anxious about a visit — what do you say?", "Phone rings while a line patient waits — handle both in 2 sentences."),
  job("grounds", "Grounds / Landscaping Helper", "Walk me through a mow-and-trash route for a property.", "It is very hot and a tool feels unsafe — what do you do?", "You find vandalism on the grounds — what is your first step?", "Storm debris blocks the path — first 2 sentences."),
  job("security", "Security Greeter", "Walk me through your post-and-rounds routine.", "A visitor has no badge and wants in — what do you say?", "Someone tries to distract you from your post — what do you do?", "Alarm chirps mid-answer — respond calmly in 2 sentences."),
];

export function vocrehabInterviewJobFor(id: string): VocrehabInterviewJobContent {
  const found = vocrehabInterviewJobs.find((j) => j.id === id);
  return found ?? vocrehabInterviewJobs[0];
}

export function vocrehabIsInterviewJobId(id: unknown): id is VocrehabInterviewJobId {
  return typeof id === "string" && vocrehabInterviewJobs.some((j) => j.id === id);
}

/** Scripted question for a job-interview turn (0-based): Q1..Q5 then follow-ups. */
export function vocrehabInterviewQuestionFor(
  jobId: string,
  turn: number,
): string {
  const j = vocrehabInterviewJobFor(jobId);
  const t = Number.isFinite(turn) && turn >= 0 ? Math.floor(turn) : 0;
  if (t < 5) return j.questions[t];
  return j.followUps[(t - 5) % j.followUps.length];
}
