/**
 * VocRehab inbox-sprint bank (VOCSEED-03, CHEAP lane).
 *
 * Extends the 12-scenario drill bank in vocrehab-inbox-drill.ts additively;
 * that file is never edited by this lane. This bank is a standalone,
 * workplace-flavored set of 40 scenarios (~60% phish / 40% legit) for
 * drawing 8-card practice rounds. Pure module: zero imports, zero I/O.
 * No real brands, no PII. All copy is strengths-first, phrased as
 * supports-not-scores (practice, not a test).
 *
 * Callers shuffle a copy — drawInbox() never mutates the bank.
 */

export type VocrehabInboxVerdict = "legit" | "phish";

export type VocrehabInboxAction = "reply" | "schedule" | "file" | "flag";

export interface VocrehabInboxScenario {
  id: string;
  sender: string;
  subject: string;
  bodySnippet: string;
  verdict: VocrehabInboxVerdict;
  safeAction: VocrehabInboxAction;
  /** Strengths-first: line 1 affirms what the learner did well, later lines teach. */
  debrief: readonly string[];
}

/** 40 inbox scenarios: 24 phishing, 16 legitimate. Order is fixed; callers shuffle a copy. */
export const vocrehabInboxBank: readonly VocrehabInboxScenario[] = [
  // ---- PHISH (24) ----
  {
    id: "b01",
    sender: "IT Helpdesk!",
    subject: "URGENT: verify your password in 24 hours",
    bodySnippet: "Your mailbox will be locked! Click here now to verify your password immediately.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You noticed the pressure tactic — urgency plus a link plus a password ask is the classic combo.",
      "Support to try next: flag it and delete. Real IT never asks for passwords by email.",
    ],
  },
  {
    id: "b02",
    sender: "Payroll Dept.",
    subject: "Update your direct deposit today",
    bodySnippet: "Your paycheck is on hold. Open the attached form and reply with your bank login to release it.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You caught the payoff lure — paycheck scares are designed to rush you past the red flags.",
      "Support to try next: flag it, then check pay through the known portal or ask payroll in person.",
    ],
  },
  {
    id: "b03",
    sender: "Chief Executive",
    subject: "Quick favor — buy gift cards",
    bodySnippet: "In a meeting, need you to buy 4 gift cards and send the codes back ASAP. Keep this between us.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You spotted the secrecy trick — real managers never ask for gift cards by email.",
      "Support to try next: flag it and confirm through a known number or face to face.",
    ],
  },
  {
    id: "b04",
    sender: "Mail Storage Team",
    subject: "Mailbox full — re-validate now",
    bodySnippet: "Your inbox is 99% full. Click to re-validate and keep receiving mail, expires tonight.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You saw through the fake deadline — quota warnings with links are a common lure.",
      "Support to try next: flag it; check storage in the real app instead of clicking.",
    ],
  },
  {
    id: "b05",
    sender: "Benefits Center",
    subject: "Open enrollment ends TODAY — confirm now",
    bodySnippet: "Your health coverage lapses tomorrow unless you confirm your SSN and login on our site.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You paused on the fear appeal — benefits scares plus an SSN ask are a strong phish signal.",
      "Support to try next: flag it and use the enrollment link from the staff handbook.",
    ],
  },
  {
    id: "b06",
    sender: "Delivery Courier",
    subject: "Package held — pay redelivery fee",
    bodySnippet: "A work supply package is held. Pay the $2.50 fee at this link within 12 hours or it returns.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You questioned the surprise fee — couriers don't hold work mail for link payments.",
      "Support to try next: flag it and track parcels through the front-desk log.",
    ],
  },
  {
    id: "b07",
    sender: "VPN Support",
    subject: "VPN certificate expired — reinstall",
    bodySnippet: "Your remote access expired. Run the attached installer to restore VPN access today.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated the attachment with care — surprise installers are a top malware route.",
      "Support to try next: flag it and get VPN help from the known support channel.",
    ],
  },
  {
    id: "b08",
    sender: "HR Rewards",
    subject: "You won a $500 bonus — claim here",
    bodySnippet: "Congratulations! You were selected for a bonus. Enter your employee login to claim by Friday.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You didn't bite on the prize — unexpected winnings that need your login are bait.",
      "Support to try next: flag it; real bonuses arrive through payroll, not claim links.",
    ],
  },
  {
    id: "b09",
    sender: "Shared Drive",
    subject: "Someone shared Q3-layoff-list.xlsx",
    bodySnippet: "A coworker shared a sensitive file with you. Sign in with email to preview the document.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You resisted the curiosity hook — scary filenames push clicks before thinking.",
      "Support to try next: flag it and ask the supposed sender through a known channel.",
    ],
  },
  {
    id: "b10",
    sender: "Building Security",
    subject: "Badge deactivated — reactivate online",
    bodySnippet: "Your badge was deactivated after a policy violation. Reactivate by entering your PIN at this link.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You noticed the authority costume — security scares plus a PIN ask don't add up.",
      "Support to try next: flag it and visit the security desk directly.",
    ],
  },
  {
    id: "b11",
    sender: "Travel Desk",
    subject: "Your flight credit expires — confirm card",
    bodySnippet: "Your unused travel credit expires Sunday. Confirm your card details at this link to keep it.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You held back on the card ask — legit travel teams don't collect cards by link.",
      "Support to try next: flag it and check travel credit in the booking tool.",
    ],
  },
  {
    id: "b12",
    sender: "Software Update",
    subject: "Critical patch — restart via attached tool",
    bodySnippet: "A critical flaw affects all workstations. Open the attached patch tool and enter admin approval.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated the attachment as guilty until proven safe — that's the right instinct.",
      "Support to try next: flag it; real patches come through the updater, never inbox attachments.",
    ],
  },
  {
    id: "b13",
    sender: "Client Invoices",
    subject: "Overdue invoice #4471 — pay to avoid fees",
    bodySnippet: "Your vendor account is overdue. Wire payment today using the new bank details in the attached letter.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You slowed down on changed bank details — that switch is the heart of invoice fraud.",
      "Support to try next: flag it and call the vendor at their known number before any payment.",
    ],
  },
  {
    id: "b14",
    sender: "Wellness Survey",
    subject: "Take a 2-min survey, get a gift card",
    bodySnippet: "Complete our staff wellness survey and receive a gift card. Just sign in with your full mailbox login.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You weighed the reward against the login price — mailbox logins are never survey payment.",
      "Support to try next: flag it; real surveys live on the intranet without password harvesting.",
    ],
  },
  {
    id: "b15",
    sender: "Phone Upgrade Team",
    subject: "You qualify for a free phone — ship it?",
    bodySnippet: "As a valued staffer you qualify for a free phone upgrade. Confirm your home address and employee ID here.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You paused before sharing home details — free-device offers harvest personal data.",
      "Support to try next: flag it and check device perks with your manager directly.",
    ],
  },
  {
    id: "b16",
    sender: "DocuSign-off",
    subject: "Action required: sign updated policy",
    bodySnippet: "Please e-sign the updated conduct policy. Your access pauses Friday if you don't sign at this link.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You checked the threat behind the politeness — access scares rush signatures.",
      "Support to try next: flag it and open policy docs from the handbook, not the email link.",
    ],
  },
  {
    id: "b17",
    sender: "Cafeteria Vendor",
    subject: "Scan QR to keep meal discount",
    bodySnippet: "Meal discounts reset Monday. Scan the attached QR and log in to keep your 20% staff discount.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated the QR like a link — because it is one, hiding the destination.",
      "Support to try next: flag it and ask the cafeteria staff about discounts in person.",
    ],
  },
  {
    id: "b18",
    sender: "New Hire Buddy",
    subject: "Hey it's me — new number, send schedules?",
    bodySnippet: "Hi! This is your new teammate, lost my phone. Send me everyone's shift schedule and phone list here?",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You protected the team list — newcomer stories that ask for rosters are a data grab.",
      "Support to try next: flag it and verify through the team channel you already know.",
    ],
  },
  {
    id: "b19",
    sender: "Cloud Storage",
    subject: "Your files will be deleted in 48 hours",
    bodySnippet: "Your cloud drive exceeds quota. Keep your files by confirming your login on the page linked below.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You saw the loss scare for what it is — deletion threats push fast logins.",
      "Support to try next: flag it and check storage in the real drive app.",
    ],
  },
  {
    id: "b20",
    sender: "Tax Filing Office",
    subject: "W-2 error — download corrected copy",
    bodySnippet: "There is an error on your W-2. Download the corrected copy from this link and confirm your SSN.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You guarded the SSN — tax topics plus downloads are prime identity-theft bait.",
      "Support to try next: flag it and get tax forms only from the official payroll portal.",
    ],
  },
  {
    id: "b21",
    sender: "Conference Organizer",
    subject: "Speaker slot confirmed — pay fee to hold it",
    bodySnippet: "Great news, your talk was accepted! Hold your slot by paying the speaker fee through this link today.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You checked flattery against process — real events invoice, they don't link-pressure speakers.",
      "Support to try next: flag it and confirm with the event site you already know.",
    ],
  },
  {
    id: "b22",
    sender: "Desk Neighbor",
    subject: "Forgot my badge — buzz me in via link?",
    bodySnippet: "Hey neighbor, locked out again! Click this remote-door link to buzz me in, quick?",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You kept the door closed — remote buzz-in links bypass building safety.",
      "Support to try next: flag it and point them to the front desk for a temp badge.",
    ],
  },
  {
    id: "b23",
    sender: "Charity Drive",
    subject: "Help sick kids — donate by wire today",
    bodySnippet: "Our charity partner needs urgent help. Wire your donation to the account in the attached note today.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "Your kindness stayed sharp — urgent wire asks misuse real generosity.",
      "Support to try next: flag it and give through the official giving page only.",
    ],
  },
  {
    id: "b24",
    sender: "Password Vault",
    subject: "Shared vault invite — import to view",
    bodySnippet: "A teammate shared a password vault with you. Import the attached vault file to unlock it.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You didn't import the mystery file — vault files can carry credential stealers.",
      "Support to try next: flag it and ask the teammate in person before opening anything.",
    ],
  },
  // ---- LEGIT (16) ----
  {
    id: "b25",
    sender: "Maria (Supervisor)",
    subject: "1:1 moved to Thursday 10am",
    bodySnippet: "Hi! Moving our check-in to Thursday at 10 in room B. Reply if that still works for you.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "You recognized a normal workplace note — known sender, no link, no pressure.",
      "Support to keep building: reply briefly to confirm, and add it to your calendar.",
    ],
  },
  {
    id: "b26",
    sender: "Scheduling Team",
    subject: "Next week's shift roster is posted",
    bodySnippet: "The roster for next week is posted on the break-room board and the usual scheduling app. Let us know about swaps.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "You noticed the safe pattern — it points to places you already use, not a surprise link.",
      "Support to keep building: check the usual app and plan swaps early.",
    ],
  },
  {
    id: "b27",
    sender: "Facilities",
    subject: "Elevator B out Tuesday morning",
    bodySnippet: "Elevator B is serviced Tuesday 8–11am. Please use elevator A. No action needed beyond planning your route.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You read it as the FYI it is — notices with no ask just need filing.",
      "Support to keep building: file it and allow a few extra minutes Tuesday.",
    ],
  },
  {
    id: "b28",
    sender: "Priya (Mentor)",
    subject: "Great work on the stockroom reset",
    bodySnippet: "You did a tidy job on the stockroom reset today. Want to show the new layout at Friday huddle?",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "You welcomed specific praise — real feedback names the actual work you did.",
      "Support to keep building: reply yes if willing; sharing wins builds teamwork.",
    ],
  },
  {
    id: "b29",
    sender: "Training Team",
    subject: "Reminder: safety refresher Thursday",
    bodySnippet: "Friendly reminder that the quarterly safety refresher is Thursday at 2pm in the training room. See you there.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "You treated a routine reminder routinely — known sender, matching time and place.",
      "Support to keep building: schedule it so nothing overlaps.",
    ],
  },
  {
    id: "b30",
    sender: "Cafeteria",
    subject: "New Friday menu taste test",
    bodySnippet: "We are taste-testing two new Friday specials this week. Stop by 11:30–1 if you'd like to vote for your favorite.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You spotted the zero-ask invite — no link, no login, just an optional visit.",
      "Support to keep building: file it and drop by if interested.",
    ],
  },
  {
    id: "b31",
    sender: "Dana (Coworker)",
    subject: "Can you cover my Saturday opener?",
    bodySnippet: "Family thing came up Saturday. Could you cover my 8–12 opener? Happy to swap your closing next week.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "You read the human context — a specific, checkable swap from someone you know.",
      "Support to keep building: reply clearly yes or no, and confirm the swap in the app.",
    ],
  },
  {
    id: "b32",
    sender: "Payroll Team",
    subject: "Pay stubs ready in employee portal",
    bodySnippet: "This month's pay stubs are ready in the employee portal you already use. Nothing to click here — just a heads-up.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You noticed what's missing — no link and no ask means nothing to steal.",
      "Support to keep building: file it and review the stub in the portal yourself.",
    ],
  },
  {
    id: "b33",
    sender: "Wellness Team",
    subject: "Walking group Wednesdays at noon",
    bodySnippet: "Join the optional walking group Wednesdays at noon, meeting by the front steps. All paces welcome.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "You recognized a low-pressure invite — optional, in-person, no sign-in link.",
      "Support to keep building: schedule it if it supports your routine.",
    ],
  },
  {
    id: "b34",
    sender: "Library Desk",
    subject: "Requested manual is ready for pickup",
    bodySnippet: "The customer-service manual you requested is waiting at the library desk until Friday. Bring your staff badge.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You matched it to your own request — expected mail about real history is trustworthy.",
      "Support to keep building: file it and pick the manual up before Friday.",
    ],
  },
  {
    id: "b35",
    sender: "Green Team",
    subject: "Recycling sorting tips (with photos)",
    bodySnippet: "We posted new sorting photos above each break-room bin after your great question. Thanks for asking!",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You saw the follow-through — it answers a question you actually raised, in person.",
      "Support to keep building: file it and use the bin photos as your cheat sheet.",
    ],
  },
  {
    id: "b36",
    sender: "Supervisor Alvarez",
    subject: "Overtime volunteers for inventory Sunday",
    bodySnippet: "We need two volunteers for Sunday inventory, paid overtime. Reply by Thursday if interested — no pressure either way.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "You weighed a fair offer — named task, named pay, real deadline, no link.",
      "Support to keep building: reply by Thursday with a clear yes or no.",
    ],
  },
  {
    id: "b37",
    sender: "IT Support",
    subject: "Planned email outage Saturday 6–7am",
    bodySnippet: "Email will be down Saturday 6–7am for maintenance. No need to do anything — just plan around the window.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You noticed the no-action notice — real maintenance tells you to wait, not to click.",
      "Support to keep building: file it and avoid scheduling sends in that window.",
    ],
  },
  {
    id: "b38",
    sender: "Book Club",
    subject: "Next pick + snacks signup",
    bodySnippet: "We picked a short novel for March. Add your snack in the break-room signup sheet if you're joining us.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "You recognized the in-person loop — signup sheet in the break room, nothing to log into.",
      "Support to keep building: schedule the meetup if you'd enjoy it.",
    ],
  },
  {
    id: "b39",
    sender: "HR Team",
    subject: "Your leave request was approved",
    bodySnippet: "Your time-off request for the dates you submitted was approved. You can view it in the usual HR portal.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "You connected it to your own action — approvals that match your request are expected mail.",
      "Support to keep building: file it and double-check the dates in the portal.",
    ],
  },
  {
    id: "b40",
    sender: "Supervisor Chen",
    subject: "Shadow shift Thursday — interested?",
    bodySnippet: "A cashier shadow shift opened Thursday afternoon if you want to try it. Reply and I'll hold you a spot.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "You saw a growth offer, not a lure — specific shift, known sender, simple reply.",
      "Support to keep building: reply with interest and any questions about the role.",
    ],
  },
];

/**
 * Deterministic Fisher-Yates draw of n scenarios using the provided rand.
 * Never mutates the bank: shuffles a copy and returns the first n entries.
 */
export function drawInbox(rand: () => number, n = 8): readonly VocrehabInboxScenario[] {
  const copy: VocrehabInboxScenario[] = vocrehabInboxBank.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}
