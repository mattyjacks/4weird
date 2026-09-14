/**
 * lib/vocrehab-seed-pools3.ts — VocRehab deterministic seed pools, pack 3.
 *
 * Strengths first: every seed replays the same fair practice set, so a
 * learner can retry calmly and build on what already worked. Blocked cells,
 * curveballs, and resume misses are planning information only — never marks.
 *
 * Pure module: imports only from @/lib/vocrehab-seed, zero I/O, no browser
 * globals. Selectors are deterministic from the seed string.
 */

import { mulberry32, pick, sample, xmur3 } from "@/lib/vocrehab-seed";

function vocrehabPoolRand(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/* ------------------------------------------------------------------ */
/* (a) barrier-run story variants                                      */
/* ------------------------------------------------------------------ */

export interface VocrehabBarrierPoolChoice {
  label: string;
  barrier: string;
  strategy: string;
}

export interface VocrehabBarrierPoolBeat {
  id: string;
  scene: string;
  text: string;
  choices: readonly VocrehabBarrierPoolChoice[];
}

export interface VocrehabBarrierPoolVariant {
  variantId: string;
  title: string;
  briefing: string;
  beats: readonly VocrehabBarrierPoolBeat[];
}

export const vocrehabBarrierPoolVariants: readonly VocrehabBarrierPoolVariant[] = [
  {
    variantId: "day-shift",
    title: "Day Shift Path",
    briefing:
      "You already handle day-shift surprises well — this path replays the familiar commute, swap, disclosure, and tool beats so you can try new strategies.",
    beats: [
      {
        id: "commute",
        scene: "Morning commute",
        text: "Your bus is running 20 minutes late and your shift starts in 30. What do you do?",
        choices: [
          {
            label: "Text your supervisor now and catch the next bus",
            barrier: "Getting to work",
            strategy: "Backup ride plan",
          },
          {
            label: "Call your backup ride and save the bus fare",
            barrier: "Getting to work",
            strategy: "Backup ride plan",
          },
          {
            label: "Wait it out and rush in silently",
            barrier: "Getting to work",
            strategy: "Ask about schedule-shifted starts",
          },
        ],
      },
      {
        id: "swap",
        scene: "Shift swap",
        text: "A coworker asks you to cover Friday evening, but that clashes with family care. How do you answer?",
        choices: [
          {
            label: "Offer a trade: Sunday morning for Friday evening",
            barrier: "Schedule conflicts",
            strategy: "Shift-swap script",
          },
          {
            label: "Say no plainly and suggest another coworker",
            barrier: "Schedule conflicts",
            strategy: "Weekly planning habit",
          },
        ],
      },
      {
        id: "disclosure",
        scene: "Disclosure moment",
        text: "Training is all fast videos and you need written steps. Your new manager seems rushed. What now?",
        choices: [
          {
            label: "Share the one-sentence ask: written steps help me start confidently",
            barrier: "Whether to share disability information",
            strategy: "One-sentence accommodation ask",
          },
          {
            label: "Hold off and try the disclosure helper paths first",
            barrier: "Whether to share disability information",
            strategy: "Disclosure timing options",
          },
          {
            label: "Ask a coworker for their notes instead",
            barrier: "Schedule conflicts",
            strategy: "Weekly planning habit",
          },
        ],
      },
      {
        id: "tool",
        scene: "Tool failure",
        text: "The shared tablet you trained on freezes mid-task with a line waiting. What helps most?",
        choices: [
          {
            label: "Switch to the paper backup steps and report the freeze calmly",
            barrier: "Tools and technology access",
            strategy: "Keyboard-path check",
          },
          {
            label: "Ask for a trial of a different tool for this task",
            barrier: "Tools and technology access",
            strategy: "Assistive technology trial",
          },
        ],
      },
    ],
  },
  {
    variantId: "commute-focus",
    title: "Commute Focus",
    briefing:
      "Getting to work on time is already a strength you practice daily — this commute-themed morning gives you room to try backup-ride options.",
    beats: [
      {
        id: "commute-bus-late",
        scene: "Late bus",
        text: "The morning bus is cancelled and the next one arrives close to clock-in. What supports you best?",
        choices: [
          {
            label: "Message the team now, then board the next bus",
            barrier: "Getting to work",
            strategy: "Early heads-up message",
          },
          {
            label: "Split a ride with a neighbor and track the fare",
            barrier: "Getting to work",
            strategy: "Backup ride plan",
          },
        ],
      },
      {
        id: "commute-rain",
        scene: "Rainy walk",
        text: "Rain slows your walk to the stop and the shelter is full. What keeps the morning steady?",
        choices: [
          {
            label: "Wait under cover and text that you may be a few minutes behind",
            barrier: "Getting to work",
            strategy: "Early heads-up message",
          },
          {
            label: "Take the alternate stop with a shelter on the next street",
            barrier: "Getting to work",
            strategy: "Scouted alternate route",
          },
        ],
      },
      {
        id: "commute-shift-start",
        scene: "Shifted start",
        text: "Your supervisor offers a start time 30 minutes later on bus-delay days. How do you respond?",
        choices: [
          {
            label: "Accept the shifted start and confirm it in writing",
            barrier: "Schedule conflicts",
            strategy: "Ask about schedule-shifted starts",
          },
          {
            label: "Ask to trial it for two weeks, then review together",
            barrier: "Schedule conflicts",
            strategy: "Trial-and-review ask",
          },
        ],
      },
      {
        id: "commute-tool",
        scene: "Frozen kiosk",
        text: "The check-in kiosk at the entrance freezes when you arrive. A line forms behind you. What helps?",
        choices: [
          {
            label: "Step aside, use the paper sign-in, and flag the freeze kindly",
            barrier: "Tools and technology access",
            strategy: "Paper backup steps",
          },
          {
            label: "Ask a teammate to log you in while you try the second kiosk",
            barrier: "Tools and technology access",
            strategy: "Teammate assist",
          },
        ],
      },
    ],
  },
  {
    variantId: "swap-focus",
    title: "Shift-Swap Focus",
    briefing:
      "You balance team needs and home needs thoughtfully — this swap-themed week lets you practice trades that protect both.",
    beats: [
      {
        id: "swap-weekend",
        scene: "Weekend cover",
        text: "A teammate asks you to cover Saturday, but you planned weekend training. What do you try?",
        choices: [
          {
            label: "Offer Sunday instead and keep Saturday training protected",
            barrier: "Schedule conflicts",
            strategy: "Shift-swap script",
          },
          {
            label: "Split the Saturday shift in half with the teammate",
            barrier: "Schedule conflicts",
            strategy: "Split-shift offer",
          },
        ],
      },
      {
        id: "swap-care",
        scene: "Care clash",
        text: "Friday evening coverage clashes with family care pickup. What wording feels right?",
        choices: [
          {
            label: "Name the clash kindly and suggest two alternate teammates",
            barrier: "Schedule conflicts",
            strategy: "Weekly planning habit",
          },
          {
            label: "Offer a trade: your Thursday for their Friday",
            barrier: "Schedule conflicts",
            strategy: "Shift-swap script",
          },
        ],
      },
      {
        id: "swap-disclosure",
        scene: "Asking for steps",
        text: "The swap board is a fast-moving group chat. You need written confirmations. What now?",
        choices: [
          {
            label: "Share the one-sentence ask: written confirmation helps me cover reliably",
            barrier: "Whether to share disability information",
            strategy: "One-sentence accommodation ask",
          },
          {
            label: "Ask the scheduler to confirm swaps with a short message",
            barrier: "Schedule conflicts",
            strategy: "Written-confirmation habit",
          },
        ],
      },
      {
        id: "swap-tool",
        scene: "Scheduling app glitch",
        text: "The scheduling app will not save your swap request. What keeps things moving?",
        choices: [
          {
            label: "Screenshot the request and send it to the scheduler directly",
            barrier: "Tools and technology access",
            strategy: "Screenshot-and-send backup",
          },
          {
            label: "Ask for a short trial of the web version of the scheduler",
            barrier: "Tools and technology access",
            strategy: "Assistive technology trial",
          },
        ],
      },
    ],
  },
  {
    variantId: "disclosure-toolkit",
    title: "Disclosure Toolkit",
    briefing:
      "You know your work style well — this disclosure and tools path practices short, confident asks plus calm backups when tech hiccups.",
    beats: [
      {
        id: "disclosure-training",
        scene: "Training format",
        text: "Orientation is all live demos with no handouts. You learn best from written steps. What helps?",
        choices: [
          {
            label: "Share the one-sentence ask: a checklist helps me start strong",
            barrier: "Whether to share disability information",
            strategy: "One-sentence accommodation ask",
          },
          {
            label: "Ask a buddy to share notes while you explore the helper paths",
            barrier: "Whether to share disability information",
            strategy: "Disclosure timing options",
          },
        ],
      },
      {
        id: "disclosure-quiet",
        scene: "Noisy floor",
        text: "The work floor is loud and instructions get lost. You focus best with written cues. What now?",
        choices: [
          {
            label: "Ask for key steps in writing after each briefing",
            barrier: "Whether to share disability information",
            strategy: "Written-confirmation habit",
          },
          {
            label: "Wear the site-approved ear loop and check the posted task board",
            barrier: "Tools and technology access",
            strategy: "Low-distraction setup",
          },
        ],
      },
      {
        id: "tool-freeze",
        scene: "Scanner freeze",
        text: "The handheld scanner freezes mid-aisle with orders waiting. What steadies the moment?",
        choices: [
          {
            label: "Switch to the paper tally and report the freeze calmly",
            barrier: "Tools and technology access",
            strategy: "Paper backup steps",
          },
          {
            label: "Restart with the posted steps, then ask for a device check",
            barrier: "Tools and technology access",
            strategy: "Restart-with-steps routine",
          },
        ],
      },
      {
        id: "tool-trial",
        scene: "New tool trial",
        text: "A different scanner model is available to trial. How do you explore it?",
        choices: [
          {
            label: "Ask for a short trial and note what feels easier",
            barrier: "Tools and technology access",
            strategy: "Assistive technology trial",
          },
          {
            label: "Ask a teammate to demo one task, then try one yourself",
            barrier: "Tools and technology access",
            strategy: "Buddy-demo routine",
          },
        ],
      },
    ],
  },
];

export interface VocrehabBarrierSelection {
  seed: string;
  variantId: string;
}

export function vocrehabSelectBarrier(seed: string): VocrehabBarrierSelection {
  const rand = vocrehabPoolRand(seed);
  const picked = pick(rand, vocrehabBarrierPoolVariants);
  return { seed, variantId: picked ? picked.variantId : "day-shift" };
}

/* ------------------------------------------------------------------ */
/* (b) schedule-juggle constraint sets                                 */
/* ------------------------------------------------------------------ */

export interface VocrehabJugglePoolBlock {
  id: string;
  label: string;
}

export interface VocrehabJugglePoolConstraint {
  id: string;
  title: string;
  blocked: readonly string[];
  why: string;
}

export interface VocrehabJugglePoolSet {
  setId: string;
  title: string;
  briefing: string;
  blocks: readonly VocrehabJugglePoolBlock[];
  constraints: readonly VocrehabJugglePoolConstraint[];
}

export const vocrehabJugglePoolSets: readonly VocrehabJugglePoolSet[] = [
  {
    setId: "day-baseline",
    title: "Day Baseline",
    briefing:
      "You already juggle day schedules well — place all 4 blocks where they fit best. Blocked cells are planning information, never mistakes.",
    blocks: [
      { id: "shift1", label: "Shift A" },
      { id: "shift2", label: "Shift B" },
      { id: "shift3", label: "Shift C" },
      { id: "training", label: "Training block" },
    ],
    constraints: [
      {
        id: "transport",
        title: "Transport windows",
        blocked: ["Mon-Evening", "Tue-Evening", "Wed-Evening", "Thu-Evening", "Fri-Evening"],
        why: "the bus does not run weekday evenings",
      },
      {
        id: "medication",
        title: "Medication appointment",
        blocked: ["Wed-Morning"],
        why: "a Wednesday morning appointment",
      },
      {
        id: "childcare",
        title: "Childcare pickup",
        blocked: ["Sat-Afternoon"],
        why: "Saturday afternoon pickup",
      },
      {
        id: "rest",
        title: "Rest day",
        blocked: ["Sun-Morning", "Sun-Afternoon", "Sun-Evening"],
        why: "Sunday is a protected rest day",
      },
      {
        id: "class",
        title: "Class",
        blocked: ["Tue-Afternoon", "Thu-Afternoon"],
        why: "class meets Tuesday and Thursday afternoons",
      },
    ],
  },
  {
    setId: "night-shift",
    title: "Night-Shift Edition",
    briefing:
      "You have already shown you can juggle a day schedule — that planning strength carries over here. This night-shift week adds overnight hours, protected sleep, and daytime appointments.",
    blocks: [
      { id: "pack2-night-a", label: "Night Shift A" },
      { id: "pack2-night-b", label: "Night Shift B" },
      { id: "pack2-day-training", label: "Day Training" },
      { id: "pack2-oncall", label: "On-call shadow" },
    ],
    constraints: [
      {
        id: "pack2-bus-gap",
        title: "Overnight bus gap",
        blocked: ["Fri-Evening", "Sun-Evening", "Mon-Evening"],
        why: "the overnight bus does not run weekend evenings, so plan a backup ride",
      },
      {
        id: "pack2-sleep-window",
        title: "Sleep-protection window",
        blocked: ["Tue-Morning", "Fri-Morning", "Sat-Morning"],
        why: "protected sleep window after a night shift",
      },
      {
        id: "pack2-childcare",
        title: "Daylight childcare",
        blocked: ["Mon-Afternoon", "Wed-Afternoon", "Fri-Afternoon"],
        why: "daylight childcare pickup",
      },
      {
        id: "pack2-overtime-cap",
        title: "Weekend overtime cap",
        blocked: ["Sat-Afternoon", "Sat-Evening", "Sun-Afternoon"],
        why: "the site caps extra weekend hours",
      },
      {
        id: "pack2-clinic",
        title: "Clinic morning",
        blocked: ["Thu-Morning"],
        why: "a Thursday morning clinic check-in",
      },
    ],
  },
  {
    setId: "weekend-training",
    title: "Weekend Training",
    briefing:
      "Your weekend planning is getting strong — this set protects training time plus family time while you place 4 blocks.",
    blocks: [
      { id: "wt-sat-shift", label: "Saturday Shift" },
      { id: "wt-sun-shift", label: "Sunday Shift" },
      { id: "wt-training", label: "Weekend Training" },
      { id: "wt-mentor", label: "Mentor shadow" },
    ],
    constraints: [
      {
        id: "wt-family-dinner",
        title: "Family dinner",
        blocked: ["Fri-Evening", "Sat-Evening"],
        why: "Friday and Saturday evenings are protected family time",
      },
      {
        id: "wt-course",
        title: "Morning course",
        blocked: ["Sat-Morning", "Sun-Morning"],
        why: "a weekend morning skills course",
      },
      {
        id: "wt-transit",
        title: "Sunday transit gap",
        blocked: ["Sun-Evening", "Sun-Afternoon"],
        why: "Sunday buses run a limited schedule",
      },
      {
        id: "wt-rest",
        title: "Rest pocket",
        blocked: ["Mon-Morning"],
        why: "Monday morning is a protected rest pocket after the weekend",
      },
      {
        id: "wt-visit",
        title: "Support visit",
        blocked: ["Wed-Afternoon"],
        why: "a Wednesday afternoon support visit",
      },
    ],
  },
];

export interface VocrehabJuggleSelection {
  seed: string;
  setId: string;
  blocks: readonly VocrehabJugglePoolBlock[];
  constraints: readonly VocrehabJugglePoolConstraint[];
}

export function vocrehabSelectJuggle(seed: string): VocrehabJuggleSelection {
  const rand = vocrehabPoolRand(seed);
  const picked = pick(rand, vocrehabJugglePoolSets);
  const set = picked ?? vocrehabJugglePoolSets[0];
  return { seed, setId: set.setId, blocks: set.blocks, constraints: set.constraints };
}

/* ------------------------------------------------------------------ */
/* (c) paycheck-plan budget scenarios (bank 8, play 3)                 */
/* ------------------------------------------------------------------ */

export interface VocrehabPaycheckPoolScenario {
  id: string;
  title: string;
  wage: number;
  hours: number;
  deductionRate: number;
  deductionLabel: string;
  curveball: string;
  curveballCost: number;
  strengthNote: string;
}

export const vocrehabPaycheckPoolScenarios: readonly VocrehabPaycheckPoolScenario[] = [
  {
    id: "pool-retail-floors",
    title: "Retail Floors",
    wage: 16,
    hours: 24,
    deductionRate: 0.14,
    deductionLabel: "Taxes + fees",
    curveball: "Bus pass renewal came due early.",
    curveballCost: 35,
    strengthNote: "You are building a steady first-paycheck routine.",
  },
  {
    id: "pool-warehouse-nights",
    title: "Warehouse Nights",
    wage: 21,
    hours: 32,
    deductionRate: 0.17,
    deductionLabel: "Taxes + health share",
    curveball: "Work boots wore out and need replacing.",
    curveballCost: 60,
    strengthNote: "You plan overtime thoughtfully when it appears.",
  },
  {
    id: "pool-internship-stipend",
    title: "Internship Stipend",
    wage: 18,
    hours: 20,
    deductionRate: 0.12,
    deductionLabel: "Taxes + fees",
    curveball: "Laptop charger died the week a project is due.",
    curveballCost: 45,
    strengthNote: "You keep learning costs from crowding out rent.",
  },
  {
    id: "pool-cafe-mornings",
    title: "Cafe Mornings",
    wage: 15,
    hours: 28,
    deductionRate: 0.13,
    deductionLabel: "Taxes + fees",
    curveball: "Uniform apron needs replacing.",
    curveballCost: 25,
    strengthNote: "You stretch morning-shift pay with care.",
  },
  {
    id: "pool-grocery-crew",
    title: "Grocery Crew",
    wage: 17,
    hours: 30,
    deductionRate: 0.15,
    deductionLabel: "Taxes + fees",
    curveball: "Bike tire went flat on the way to work.",
    curveballCost: 30,
    strengthNote: "You keep a repair fund in mind while you plan.",
  },
  {
    id: "pool-delivery-weekend",
    title: "Delivery Weekend",
    wage: 19,
    hours: 22,
    deductionRate: 0.14,
    deductionLabel: "Taxes + mileage share",
    curveball: "Phone mount broke mid-route.",
    curveballCost: 20,
    strengthNote: "You adapt weekend earnings into the plan smoothly.",
  },
  {
    id: "pool-library-aide",
    title: "Library Aide",
    wage: 16,
    hours: 18,
    deductionRate: 0.11,
    deductionLabel: "Taxes + fees",
    curveball: "Library card fine plus printing costs arrived together.",
    curveballCost: 15,
    strengthNote: "You keep small costs visible before they pile up.",
  },
  {
    id: "pool-landscaping-crew",
    title: "Landscaping Crew",
    wage: 20,
    hours: 26,
    deductionRate: 0.16,
    deductionLabel: "Taxes + gear share",
    curveball: "Gloves and sunscreen ran out the same week.",
    curveballCost: 28,
    strengthNote: "You plan seasonal gear without losing savings momentum.",
  },
];

export interface VocrehabPaycheckSelection {
  seed: string;
  scenarios: readonly VocrehabPaycheckPoolScenario[];
}

export function vocrehabSelectPaycheck(seed: string): VocrehabPaycheckSelection {
  const rand = vocrehabPoolRand(seed);
  const scenarios = sample(rand, vocrehabPaycheckPoolScenarios, 3);
  return { seed, scenarios };
}

/* ------------------------------------------------------------------ */
/* (d) resume-rescue lines (bank 16, play 8)                           */
/* ------------------------------------------------------------------ */

export interface VocrehabResumePoolLine {
  id: string;
  text: string;
  errorHint: string;
  fix: string;
  strengthNote: string;
}

export const vocrehabResumePoolLines: readonly VocrehabResumePoolLine[] = [
  {
    id: "resume-01",
    text: "stocked shelves nightly at green grocer",
    errorHint: "A strong bullet starts with a capital letter.",
    fix: "Stocked shelves nightly at Green Grocer",
    strengthNote: "You are sharpening capital-by-capital attention.",
  },
  {
    id: "resume-02",
    text: "Assisted 40+ customers daily with returns and pickup orders",
    errorHint: "Check the number style against the rest of the resume.",
    fix: "Assisted more than 40 customers daily with returns and pickup orders",
    strengthNote: "You keep customer wins clear and consistent.",
  },
  {
    id: "resume-03",
    text: "worked june 2023 - august 2024 as barista",
    errorHint: "Months and job titles follow capitalization habits.",
    fix: "Worked June 2023–August 2024 as Barista",
    strengthNote: "You are making dates easy to scan.",
  },
  {
    id: "resume-04",
    text: "Trained 3 new hires on opening checklists",
    errorHint: "One digit style keeps the whole page calm.",
    fix: "Trained three new hires on opening checklists",
    strengthNote: "You highlight mentoring strengths well.",
  },
  {
    id: "resume-05",
    text: " Operated pallet jack safely in busy aisles",
    errorHint: "Leading space can hide a careful bullet.",
    fix: "Operated pallet jack safely in busy aisles",
    strengthNote: "You catch spacing others glide past.",
  },
  {
    id: "resume-06",
    text: "Cashiered with 100% till accuracy across holliday rush",
    errorHint: "One word in this line is spelled differently than it sounds.",
    fix: "Cashiered with 100% till accuracy across holiday rush",
    strengthNote: "You steady the details under rush pressure.",
  },
  {
    id: "resume-07",
    text: "answered phones, scheduled pickups, and filed invoices.",
    errorHint: "Match the starting style of nearby bullets.",
    fix: "Answered phones, scheduled pickups, and filed invoices",
    strengthNote: "You keep verb energy consistent.",
  },
  {
    id: "resume-08",
    text: "References available apon request",
    errorHint: "The closing line has a small spelling slip.",
    fix: "References available upon request",
    strengthNote: "You finish documents with care.",
  },
  {
    id: "resume-09",
    text: "stockroom lead, march 2024–present",
    errorHint: "Titles and months shine with capitals.",
    fix: "Stockroom Lead, March 2024–present",
    strengthNote: "You give current roles a clean header.",
  },
  {
    id: "resume-10",
    text: "Cut restock time by double-checking labels each morning,",
    errorHint: "End punctuation shapes a tidy bullet.",
    fix: "Cut restock time by double-checking labels each morning",
    strengthNote: "You quantify wins while keeping punctuation tidy.",
  },
  {
    id: "resume-11",
    text: "Helped train weekend crew on safty procedures",
    errorHint: "One safety word needs a second look.",
    fix: "Helped train weekend crew on safety procedures",
    strengthNote: "You keep safety language trustworthy.",
  },
  {
    id: "resume-12",
    text: "email: jamie.example@mail.com  phone: 555-0142",
    errorHint: "Contact lines read best with a capital start.",
    fix: "Email: jamie.example@mail.com  Phone: 555-0142",
    strengthNote: "You make contact details easy to find.",
  },
  {
    id: "resume-13",
    text: "Volunteered weekly at food bank sorting donations",
    errorHint: "Place names carry capitals with them.",
    fix: "Volunteered weekly at Food Bank sorting donations",
    strengthNote: "You honor community work with clean formatting.",
  },
  {
    id: "resume-14",
    text: "Recieved Employee of the Month, November 2023",
    errorHint: "The first word flips two letters.",
    fix: "Received Employee of the Month, November 2023",
    strengthNote: "You let recognition lines shine correctly.",
  },
  {
    id: "resume-15",
    text: "Can operate forklift, pallet jack, and hand truck,",
    errorHint: "A trailing comma asks for a calmer ending.",
    fix: "Can operate forklift, pallet jack, and hand truck",
    strengthNote: "You list equipment skills in a tidy row.",
  },
  {
    id: "resume-16",
    text: "Attendence: perfect across six-month probation",
    errorHint: "The first word has an extra letter hiding inside.",
    fix: "Attendance: perfect across six-month probation",
    strengthNote: "You back up reliability with accurate spelling.",
  },
];

export interface VocrehabResumeSelection {
  seed: string;
  lines: readonly VocrehabResumePoolLine[];
}

export function vocrehabSelectResume(seed: string): VocrehabResumeSelection {
  const rand = vocrehabPoolRand(seed);
  const lines = sample(rand, vocrehabResumePoolLines, 8);
  return { seed, lines };
}

/* ------------------------------------------------------------------ */
/* (e) energy-budget items (bank 12, play 6)                           */
/* ------------------------------------------------------------------ */

export interface VocrehabEnergyPoolItem {
  id: string;
  label: string;
  kind: string;
  cost: number;
  strengthNote: string;
}

export const vocrehabEnergyPoolItems: readonly VocrehabEnergyPoolItem[] = [
  {
    id: "energy-morning-shift",
    label: "Morning shift block",
    kind: "work",
    cost: 3,
    strengthNote: "You pace morning energy with a plan.",
  },
  {
    id: "energy-rest-break",
    label: "Lunch rest break",
    kind: "rest",
    cost: 1,
    strengthNote: "You protect recharge time like a strength.",
  },
  {
    id: "energy-training",
    label: "Afternoon training",
    kind: "work",
    cost: 2,
    strengthNote: "You invest energy in new skills steadily.",
  },
  {
    id: "energy-clinic",
    label: "Clinic appointment",
    kind: "appointment",
    cost: 2,
    strengthNote: "You keep health appointments on the calendar.",
  },
  {
    id: "energy-evening-walk",
    label: "Evening wind-down walk",
    kind: "rest",
    cost: 1,
    strengthNote: "You close the day with gentle recovery.",
  },
  {
    id: "energy-deep-clean",
    label: "Deep-clean stretch",
    kind: "work",
    cost: 3,
    strengthNote: "You tackle big tasks in focused bursts.",
  },
  {
    id: "energy-mentor-chat",
    label: "Mentor check-in",
    kind: "appointment",
    cost: 1,
    strengthNote: "You draw energy from supportive check-ins.",
  },
  {
    id: "energy-commute",
    label: "Bus commute each way",
    kind: "work",
    cost: 2,
    strengthNote: "You budget travel energy honestly.",
  },
  {
    id: "energy-study-hour",
    label: "Quiet study hour",
    kind: "work",
    cost: 2,
    strengthNote: "You guard focus time with care.",
  },
  {
    id: "energy-family-dinner",
    label: "Family dinner",
    kind: "rest",
    cost: 1,
    strengthNote: "You refill energy with people who matter.",
  },
  {
    id: "energy-overtime",
    label: "Optional overtime hour",
    kind: "work",
    cost: 3,
    strengthNote: "You weigh extra hours against recovery wisely.",
  },
  {
    id: "energy-support-group",
    label: "Peer support circle",
    kind: "appointment",
    cost: 1,
    strengthNote: "You build steady routines with community support.",
  },
];

export interface VocrehabEnergySelection {
  seed: string;
  items: readonly VocrehabEnergyPoolItem[];
}

export function vocrehabSelectEnergy(seed: string): VocrehabEnergySelection {
  const rand = vocrehabPoolRand(seed);
  const items = sample(rand, vocrehabEnergyPoolItems, 6);
  return { seed, items };
}
