/**
 * lib/vocrehab-seed-pools2.ts — VocRehab arcade pack-2 seed pools.
 *
 * Strengths first: every seed replays the same warm, winnable set — steady
 * practice builds confidence, and sharing a seed lets a supporter cheer the
 * exact same round. Calm reps, fair retries, visible progress.
 *
 * Pure module: imports only deterministic helpers from @/lib/vocrehab-seed.
 * Selectors are seeded shuffles only — the same seed always deals the same set.
 */

import { mulberry32, sample, shuffle, xmur3 } from "@/lib/vocrehab-seed";

export interface VocrehabSeedPoolPhoneOption {
  text: string;
  courtesy: 0 | 1 | 2;
}

export interface VocrehabSeedPoolCaller {
  caller: string;
  line: string;
  context: string;
  options: [
    VocrehabSeedPoolPhoneOption,
    VocrehabSeedPoolPhoneOption,
    VocrehabSeedPoolPhoneOption,
  ];
  recallQuestion: string;
  recallOptions: [string, string, string];
  recallAnswer: number;
  kind: "standard" | "phishing" | "wrong-number";
}

export interface VocrehabSeedPoolShiftTask {
  id: string;
  label: string;
  openAt: number;
  closeAt: number;
}

export interface VocrehabSeedPoolToolJob {
  job: string;
  tools: [string, string, string, string];
  toolAnswer: number;
  gearNeeded: boolean;
  gearNote: string;
}

export const VOCREHAB_PHONE_POOL2: readonly VocrehabSeedPoolCaller[] = [
  {
    caller: "Rosa",
    line: "“Hi — is the manager in? It's about an invoice.”",
    context: "Your manager is on lunch until 1. The invoice folder is by the phone.",
    options: [
      { text: "“Good morning, thank you for calling! This is Sam at BrightLine. Rosa — my manager is on lunch until 1. Can I take a message or pull the invoice for you?”", courtesy: 2 },
      { text: "“She's out. Call back later.”", courtesy: 0 },
      { text: "“Manager's busy. What do you want?”", courtesy: 1 },
    ],
    recallQuestion: "What was the caller's name?",
    recallOptions: ["Rosa", "Rita", "Ruth"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Dev",
    line: "“My delivery is late and I need it today. This is the third time!”",
    context: "Dev sounds upset. The delivery log shows his box arrived this morning.",
    options: [
      { text: "“Dev, I hear you — late deliveries mess up your day. Let me check: it looks like your box arrived this morning. Can I confirm the tracking with you?”", courtesy: 2 },
      { text: "“Calm down. It's probably fine.”", courtesy: 0 },
      { text: "“Okay, what is your order number?”", courtesy: 1 },
    ],
    recallQuestion: "What does Dev need?",
    recallOptions: ["Today's delivery", "A refund", "A new catalog"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Priya",
    line: "“Hi! I'm coming in for an interview tomorrow. Where do I park?”",
    context: "Visitors park in the side lot. Interviews check in at the front desk.",
    options: [
      { text: "“Hi Priya, exciting — good luck tomorrow! Park in the side lot and check in with me at the front desk. I'll walk you in.”", courtesy: 2 },
      { text: "“Side lot. Bye.”", courtesy: 0 },
      { text: "“Park on the side and come to the desk.”", courtesy: 1 },
    ],
    recallQuestion: "Why is Priya coming in?",
    recallOptions: ["Job interview", "Delivery pickup", "Repairs"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Mr. Okafor",
    line: "“I can't understand your website. I just want to pay my bill.”",
    context: "He is frustrated with technology, not with you. Phone payments are allowed.",
    options: [
      { text: "“Mr. Okafor, let's do this together — I can take your payment right here on the phone. It takes about a minute. Ready when you are.”", courtesy: 2 },
      { text: "“It's easy, just click pay.”", courtesy: 0 },
      { text: "“I can help. What is your account number?”", courtesy: 1 },
    ],
    recallQuestion: "What does Mr. Okafor want to do?",
    recallOptions: ["Pay his bill", "Cancel service", "Update email"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "June",
    line: "“Is this the clinic? I think I left my scarf there yesterday.”",
    context: "Wrong number — this is BrightLine offices, not the clinic. Lost-and-found for our building is drawer 2.",
    options: [
      { text: "“Hi June — you've reached BrightLine offices, not the clinic, but let me still help: our building's lost-and-found is drawer 2. Want me to check it for a scarf while you're on the line?”", courtesy: 2 },
      { text: "“Wrong number.”", courtesy: 0 },
      { text: "“No, this isn't the clinic.”", courtesy: 1 },
    ],
    recallQuestion: "What did June lose?",
    recallOptions: ["A scarf", "A phone", "A set of keys"],
    recallAnswer: 0,
    kind: "wrong-number",
  },
  {
    caller: "Theo",
    line: "“Hey, it's Theo from IT. I need everyone's passwords for an update.”",
    context: "Real IT staff never ask for passwords. This smells like a trick call.",
    options: [
      { text: "“Thanks Theo — our policy is I never share passwords by phone, even with IT. Can you send the request through the help-desk ticket system so I can verify it?”", courtesy: 2 },
      { text: "“Sure, mine is sunshine123.”", courtesy: 0 },
      { text: "“I don't know. Let me ask someone.”", courtesy: 1 },
    ],
    recallQuestion: "Why is this call suspicious?",
    recallOptions: ["Asks for passwords", "Comes from IT", "Arrives by phone"],
    recallAnswer: 0,
    kind: "phishing",
  },
  {
    caller: "Marcus",
    line: "“Hi — what time do you open? I want to drop off an application early.”",
    context: "Doors open at 8. Early drop-offs are welcome and applications live in drawer 1.",
    options: [
      { text: "“Good morning Marcus, thanks for calling BrightLine! We open at 8 and early drop-offs are welcome — I'll have an application ready in drawer 1 with your name on it.”", courtesy: 2 },
      { text: "“Eight. Just come then.”", courtesy: 0 },
      { text: "“We open at 8. Bring your application.”", courtesy: 1 },
    ],
    recallQuestion: "What does Marcus want to drop off?",
    recallOptions: ["A job application", "A package", "A resume folder"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Ana",
    line: "“Hi, I'm volunteering tomorrow and I'm nervous. Who do I ask for?”",
    context: "Volunteers check in with you at the front desk. A friendly welcome calms first-day nerves.",
    options: [
      { text: "“Hi Ana, we're glad you're joining us! Ask for me at the front desk tomorrow — I'll show you around and introduce you to the team.”", courtesy: 2 },
      { text: "“Just show up.”", courtesy: 0 },
      { text: "“Come to the front desk tomorrow.”", courtesy: 1 },
    ],
    recallQuestion: "Why is Ana calling?",
    recallOptions: ["Volunteering tomorrow", "Ordering supplies", "Paying a bill"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Victor",
    line: "“Hello, this is Victor from bank security. I need your login code to stop a fraud charge.”",
    context: "Real banks never ask for login codes by phone. This is a trick call — protect the code and verify another way.",
    options: [
      { text: "“Thanks Victor — our policy is I never share login codes by phone, even with the bank. I'll hang up and call the number on my bank card so I can verify this safely.”", courtesy: 2 },
      { text: "“Sure, the code is 4419.”", courtesy: 0 },
      { text: "“I don't know. Maybe?”", courtesy: 1 },
    ],
    recallQuestion: "Why is this call suspicious?",
    recallOptions: ["Asks for a login code", "Comes from a bank", "Arrives by phone"],
    recallAnswer: 0,
    kind: "phishing",
  },
  {
    caller: "Ellis",
    line: "“Hey — is this Tony's Pizza? My extra-cheese order never showed up!”",
    context: "Wrong number — this is BrightLine offices, not Tony's Pizza. Ellis sounds hungry and a little frustrated.",
    options: [
      { text: "“Hi Ellis — you've reached BrightLine offices, not Tony's Pizza, but I want to help: the pizzeria's number is one digit off from ours. Want me to read it back so you can reach them?”", courtesy: 2 },
      { text: "“Wrong number.”", courtesy: 0 },
      { text: "“No, this isn't the pizza place.”", courtesy: 1 },
    ],
    recallQuestion: "What did Ellis order?",
    recallOptions: ["Extra-cheese pizza", "A salad", "A sandwich"],
    recallAnswer: 0,
    kind: "wrong-number",
  },
  {
    caller: "Grace",
    line: "“Hi, I need to move my Thursday appointment. Something came up with my kids.”",
    context: "Reschedules are normal and welcome. The appointment book is by the phone.",
    options: [
      { text: "“Of course Grace, family first — thank you for calling ahead! Let's find a new Thursday time together. I have the book right here.”", courtesy: 2 },
      { text: "“Fine. Thursday then.”", courtesy: 0 },
      { text: "“Okay, when do you want it?”", courtesy: 1 },
    ],
    recallQuestion: "Why is Grace moving her appointment?",
    recallOptions: ["Her kids", "Her car", "Her vacation"],
    recallAnswer: 0,
    kind: "standard",
  },
  {
    caller: "Henry",
    line: "“Delivery driver here — I'm at the back door with a heavy box. Need a signature.”",
    context: "Sign for deliveries at the back door. The hand truck is in the closet if the box is heavy.",
    options: [
      { text: "“Hi Henry, thanks for hauling that over! I'll meet you at the back door for the signature — one moment while I grab the hand truck.”", courtesy: 2 },
      { text: "“Leave it there.”", courtesy: 0 },
      { text: "“Okay, I'll come sign.”", courtesy: 1 },
    ],
    recallQuestion: "Where is Henry waiting?",
    recallOptions: ["The back door", "The front desk", "The side lot"],
    recallAnswer: 0,
    kind: "standard",
  },
];

export const VOCREHAB_TIME_PUNCH_POOL2: readonly VocrehabSeedPoolShiftTask[] = [
  { id: "open", label: "Unlock front door + lights", openAt: 5, closeAt: 35 },
  { id: "mail", label: "Sort morning mail", openAt: 25, closeAt: 65 },
  { id: "restock", label: "Restock supply shelf", openAt: 55, closeAt: 100 },
  { id: "calls", label: "Return morning callbacks", openAt: 95, closeAt: 140 },
  { id: "lunch", label: "Cover lunch phones", openAt: 130, closeAt: 175 },
  { id: "close", label: "Lock up + set alarm", openAt: 160, closeAt: 200 },
  { id: "wipe", label: "Wipe front-desk counter", openAt: 10, closeAt: 50 },
  { id: "plants", label: "Water lobby plants", openAt: 40, closeAt: 80 },
  { id: "late-bus-cover", label: "Cover phones during late-bus delay", openAt: 85, closeAt: 125 },
  { id: "trash", label: "Take out lobby trash", openAt: 110, closeAt: 150 },
  { id: "paper", label: "Refill printer paper", openAt: 140, closeAt: 180 },
  { id: "log", label: "Log visitors in binder", openAt: 150, closeAt: 190 },
];

export const VOCREHAB_TOOL_MATCH_POOL2: readonly VocrehabSeedPoolToolJob[] = [
  {
    job: "Mop the lobby floor after lunch rush",
    tools: ["Wet mop + bucket", "Dry duster", "Leaf blower", "Paint roller"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Wet-floor sign + non-slip shoes.",
  },
  {
    job: "Replace the flickering bulb in hallway B",
    tools: ["Step ladder + spare bulb", "Hammer", "Garden hose", "Stapler"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Power off at the switch + gloves.",
  },
  {
    job: "File 40 invoices alphabetically",
    tools: ["File trays + labels", "Chainsaw", "Floor buffer", "Lawn mower"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — just good lighting.",
  },
  {
    job: "Assemble a flat-pack shelf for the break room",
    tools: ["Allen key + instructions", "Sledgehammer", "Hedge trimmer", "Microwave"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — keep small parts off the floor.",
  },
  {
    job: "Clear the blocked break-room sink drain",
    tools: ["Plunger + bucket", "Hair dryer", "Crowbar", "Extension cord"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Rubber gloves + eye protection.",
  },
  {
    job: "Water the office plants on floor 2",
    tools: ["Watering can", "Pressure washer", "Snow shovel", "Jackhammer"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — wipe spills so nobody slips.",
  },
  {
    job: "Hang the new safety poster in the warehouse",
    tools: ["Tape measure + level + pins", "Welding torch", "Cement mixer", "Leaf blower"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "High-visibility vest in the warehouse.",
  },
  {
    job: "Shred a box of old receipts",
    tools: ["Cross-cut shredder", "Paper clips", "Coffee maker", "Space heater"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — feed a few sheets at a time.",
  },
  {
    job: "Sweep the warehouse aisle after deliveries",
    tools: ["Push broom + dustpan", "Wet mop", "Leaf blower", "Paint roller"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "High-visibility vest + sturdy shoes.",
  },
  {
    job: "Clean the break-room microwave",
    tools: ["All-purpose spray + cloth", "Steel wool", "Bleach jug", "Garden hose"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — unplug never needed, just wipe gently.",
  },
  {
    job: "Move a heavy box of paper to storage",
    tools: ["Hand truck + straps", "Backpack", "Broom", "Step ladder"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Gloves + ask a teammate for heavy lifts.",
  },
  {
    job: "Replace the restroom paper-towel roll",
    tools: ["Spare roll + dispenser key", "Hammer", "Plunger", "Stapler"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — wash hands after.",
  },
  {
    job: "Trim the hedge by the front entrance",
    tools: ["Hand shears + garden bag", "Chainsaw", "Mop", "Hedge paint"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Gloves + eye protection.",
  },
  {
    job: "Set up folding chairs for the morning meeting",
    tools: ["Chair cart + layout map", "Forklift", "Ladder", "Dolly straps"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — lift with legs, lock rows together.",
  },
  {
    job: "Unjam the office paper shredder",
    tools: ["Unplug + tweezers + manual reverse", "Fork", "Water cup", "Hair dryer"],
    toolAnswer: 0,
    gearNeeded: false,
    gearNote: "No gear — power off and unplug first, then clear gently.",
  },
  {
    job: "Polish the lobby glass doors",
    tools: ["Squeegee + glass spray", "Sandpaper", "Bleach jug", "Wire brush"],
    toolAnswer: 0,
    gearNeeded: true,
    gearNote: "Wet-floor sign + non-slip shoes.",
  },
];

function vocrehabRandFor(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

export function vocrehabSelectPhone(seed: string): {
  seed: string;
  callers: VocrehabSeedPoolCaller[];
} {
  const rand = vocrehabRandFor(seed);
  const phishing = VOCREHAB_PHONE_POOL2.filter((c) => c.kind === "phishing");
  const wrong = VOCREHAB_PHONE_POOL2.filter((c) => c.kind === "wrong-number");
  const pickedPhishing = shuffle(rand, phishing).slice(0, 1);
  const pickedWrong = shuffle(rand, wrong).slice(0, 1);
  const pickedNames = new Set([...pickedPhishing, ...pickedWrong].map((c) => c.caller));
  const rest = VOCREHAB_PHONE_POOL2.filter((c) => !pickedNames.has(c.caller));
  const filler = sample(rand, rest, 4);
  const callers = shuffle(rand, [...pickedPhishing, ...pickedWrong, ...filler]);
  return { seed, callers };
}

export function vocrehabSelectTimePunch(seed: string): {
  seed: string;
  tasks: VocrehabSeedPoolShiftTask[];
} {
  const rand = vocrehabRandFor(seed);
  const surprise = VOCREHAB_TIME_PUNCH_POOL2.filter((t) => t.id === "late-bus-cover").slice(0, 1);
  const rest = VOCREHAB_TIME_PUNCH_POOL2.filter((t) => t.id !== "late-bus-cover");
  const filler = sample(rand, rest, 5);
  const tasks = shuffle(rand, [...surprise, ...filler]);
  return { seed, tasks };
}

export function vocrehabSelectToolMatch(seed: string): {
  seed: string;
  jobs: VocrehabSeedPoolToolJob[];
} {
  const rand = vocrehabRandFor(seed);
  const gear = VOCREHAB_TOOL_MATCH_POOL2.filter((j) => j.gearNeeded);
  const pickedGear = sample(rand, gear, 2);
  const pickedNames = new Set(pickedGear.map((j) => j.job));
  const rest = VOCREHAB_TOOL_MATCH_POOL2.filter((j) => !pickedNames.has(j.job));
  const filler = sample(rand, rest, 6);
  const jobs = shuffle(rand, [...pickedGear, ...filler]);
  return { seed, jobs };
}
