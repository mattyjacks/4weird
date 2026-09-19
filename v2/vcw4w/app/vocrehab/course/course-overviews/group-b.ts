import type { CourseOverview } from "./overview";

// Group B overviews. Fill each entry: 3 overview paragraphs (60-100 words
// each) + 4-6 steps + 2 faq pairs. Unique prose per lesson.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_B_OVERVIEWS: CourseOverview[] = [
  {
    slug: "the-pivot",
    overview: [
      "This lesson helps anyone whose work history raises questions they dread, including a criminal record, a long gap after caregiving or illness, or jobs that ended badly. If you freeze when an interviewer leans in and asks about your past, this module is built for you. It also helps counselors who need a calm, structured way to rehearse that moment with clients. You do not need a polished story to start, only a willingness to practice one short answer that respects both honesty and boundaries.",
      "After finishing, you will hold a spoken answer that runs thirty to sixty seconds and ends on your present strengths. The linked pivot builder walks you through three beats, one neutral line about the past, one concrete change, and two sentences about what is true now. Then the practice manager asks the hard question kindly and lets you rehearse delivery by text or voice with instant feedback. Repeating the loop until the words feel natural is what turns a memorized paragraph into steady confidence.",
      "A common mistake is telling the whole story with dates, charges, or apologies that never end, which pulls focus away from your skills. Another is sounding rehearsed to the point of stiffness, or skipping the present entirely. Keep it brief, factual, and forward looking, and never share identifiers or legal details. Counselor note: ask your client to bring their draft answer to your next session so you can check tone together and align it with their employment goal and support needs.",
    ],
    steps: [
      "Open the pivot builder and pick the work gap or history question that worries you most.",
      "Draft one neutral past line with no detail beyond what a stranger needs.",
      "Name one concrete change, such as training completed, steady work, or a support you use.",
      "Write two present tense sentences about reliability, skills, and supports.",
      "Rehearse out loud with the practice manager twice, then time yourself to stay under sixty seconds.",
    ],
    faq: [
      {
        q: "Do I have to mention my record if they do not ask?",
        a: "You do not have to volunteer details nobody asked for, and this lesson never tells you to disclose more than the moment requires. The pivot prepares you for the question when it comes, so you answer briefly and honestly without oversharing. If an application asks directly, answer truthfully in few words. Bring any disclosure decision to your counselor before you apply.",
      },
      {
        q: "What if I get emotional practicing this answer?",
        a: "That reaction is normal, and the rehearsal room is built for it, with retries that cost nothing and feedback that quotes your own words kindly. Pause, shorten the past line further, and lean on the present sentences where your voice feels strongest. Many learners need three or four calm repetitions before the answer steadies. If it stays painful, pause the lesson and bring the draft to your counselor.",
      },
    ],
  },
  {
    slug: "the-ask",
    overview: [
      "This lesson helps workers who are deciding whether to share disability related needs with an employer and how to ask for changes that make the job doable. It fits people who never disclosed before, people returning after a health change, and anyone nervous about saying the wrong thing. Counselors can use it to separate the timing decision from the wording task. You start from your own situation, not from a rule that fits everyone.",
      "After finishing, you will carry a short script you wrote yourself, two sentences of disclosure plus one sentence naming the accommodation and how it helps your work. The linked disclosure builder guides the wording, then the practice room rehearses it, including a branch where the manager sounds confused so you can practice staying calm and clear. Because the script uses your own words and an ending you chose, it sounds like you on a steady day.",
      "A common mistake is sharing a full diagnosis or medical history when only a functional need matters, which invites questions you never wanted. Another is asking vaguely for understanding instead of naming one concrete change. Keep the request specific, brief, and tied to job tasks, and remember that not disclosing now is always a valid choice. Counselor note: review the timing map with your client first, then check that the accommodation wording matches their documented support needs.",
    ],
    steps: [
      "Open the disclosure builder and decide the timing question first, now, later, or not at all.",
      "Write two short disclosure sentences that name the functional need, not the full history.",
      "Add one sentence requesting a specific accommodation tied to a job task.",
      "Add one sentence explaining how the change helps you do the role well.",
      "Rehearse with the practice manager, including the confused manager branch, and revise until it feels calm.",
    ],
    faq: [
      {
        q: "Do I have to disclose my disability in an interview?",
        a: "No, and this course never pressures you to share. Disclosure is a personal decision you can revisit at any stage, and many workers wait until after an offer or until a need arises on the job. The lesson gives you wording for each timing plus a respectful closing line for not sharing now. Talk through the tradeoffs with a counselor you trust.",
      },
      {
        q: "What makes an accommodation request work well?",
        a: "Specific requests tied to tasks work best, such as a schedule tweak, a seating change, or written instructions, plus one line on how it improves your work. Vague asks for patience leave managers guessing, while concrete asks give them something they can say yes to. Keep it to one need at a time. If you are unsure what to request, review old jobs and note which change would have helped.",
      },
    ],
  },
  {
    slug: "paper-trail",
    overview: [
      "This lesson helps people whose strongest experience never came with a job title, including caregivers, volunteers, gig workers, and recent trainees. If your resume looks thin only because unpaid work went uncounted, this module restores what counts. It also helps anyone returning after years away who needs language for skills kept sharp at home or in the community. You bring your history as lived, and the lesson shapes it into lines an employer can read.",
      "After finishing, you will hold a clean structured resume built from your goals and the strengths your course play already revealed. The linked resume builder turns short lines you approve into sections for experience and skills, with volunteer shifts, caregiving, gigs, and training all counting equally. Nothing submits itself anywhere, and you export JSON or print only when ready. Walking out with a printable page changes the next counselor meeting from brainstorming into review.",
      "A common mistake is leaving unpaid work off the page entirely, which erases years of reliability, or stuffing every task into dense paragraphs nobody scans. Another is listing strengths as vague adjectives instead of short proof lines. Keep bullets short, start each with a verb, and put the strongest evidence first. Counselor note: compare the draft against the client's observed game strengths and help them cut anything that does not serve the stated goal.",
    ],
    steps: [
      "Open the resume builder and write a one line goal naming the work you want.",
      "List strengths one per line, borrowing words from your earlier game feedback.",
      "Add experience lines for paid work, volunteering, caregiving, gigs, and training.",
      "Add skill lines as short verb led phrases an employer can scan quickly.",
      "Preview the JSON, download or print it, and bring it to your counselor for review.",
    ],
    faq: [
      {
        q: "I have almost no paid jobs. Can I still make a resume?",
        a: "Yes, because employers read evidence of reliability wherever it happened, and this builder treats caregiving, volunteering, gigs, and training as real experience. A year of school pickup routines proves punctuality, and regular volunteer shifts prove teamwork. Write each entry as what you did plus what it shows. Your counselor can help you phrase home and community work so it reads clearly.",
      },
      {
        q: "Should my resume mention accommodations I might need?",
        a: "Only if you choose to, since accommodation details are never required on a resume. Most job seekers leave them off and raise needs later through a short disclosure script instead. The builder keeps that section optional and separate, so nothing appears unless you type it. If you are unsure, leave it blank for now and discuss timing with your counselor before applying.",
      },
    ],
  },
  {
    slug: "money-maps",
    overview: [
      "This lesson helps anyone whose biggest work question is money, especially SSI recipients who fear a paycheck could sink their benefits. If rumors from friends or family have kept you from applying, this module replaces fear with a hands on sketch you control. It also helps counselors open the benefits talk early without giving advice they are not qualified to give. You only need your own guess at sustainable hours to begin.",
      "After finishing, you will understand in broad strokes how wage and hours relate to SSI, and you will carry numbers worth discussing. The linked slider tool lets you move hourly pay and weekly hours and watch an educational estimate respond, which makes abstract rules feel concrete. Because every figure is labeled an estimate using 2026 parameters, you learn the shape of tradeoffs without mistaking the sketch for advice. Confirming the numbers with a benefits counselor becomes the natural next step.",
      "A common mistake is reading the slider output as a promise about your own check, then making job decisions from it alone. Another is testing dream hours instead of hours you could truly sustain through transport, health needs, and rest. Keep estimates clearly labeled, test the lower hours first, and write down questions as they surface. Counselor note: use the learner's saved sketch to refer them promptly to a certified benefits counselor and record that referral.",
    ],
    steps: [
      "Open the SSI slider and enter an hourly wage close to jobs you actually see.",
      "Move weekly hours from low to high and watch how the estimate responds.",
      "Mark which hour range feels sustainable with your transport, health, and rest needs.",
      "Write down two questions the sketch raised for a benefits counselor.",
      "Save or print the sketch and bring it to your counselor before making any work decision.",
    ],
    faq: [
      {
        q: "Will this tool tell me exactly what happens to my benefits?",
        a: "No, and it is careful to say so on screen, because only a certified benefits counselor with your full record can give personal advice. The slider shows an educational estimate from 2026 parameters so you can explore patterns and arrive with better questions. Treat every number as a sketch, not a promise. Your counselor can connect you to the right specialist for a personal review.",
      },
      {
        q: "What should I bring to a benefits counselor after this lesson?",
        a: "Bring your saved sketch with the wage and hours you tested, plus notes on which schedule feels sustainable and why. Add your two biggest questions, such as how a specific hour level might interact with your current benefits. The more concrete your starting numbers, the faster the specialist can help. Keep a copy of everything you shared for your own records.",
      },
    ],
  },
  {
    slug: "when-to-share",
    overview: [
      "This lesson helps anyone stuck on the timing question, whether to share disability related needs before applying, at the interview, after an offer, on the job, or not now. If every option feels risky and advice from others conflicts, the structured map calms the choice. Counselors gain a shared visual they can walk through with clients instead of debating one right answer. You need no prior decision, only curiosity about tradeoffs.",
      "After finishing, you will name the timing that fits your situation today and know what to say if conditions change. The linked adventure map walks each moment in turn, showing honest tradeoffs, a script starter for that node, and an exit ramp that keeps every choice reversible. Trying all five timings instead of defending one reveals which fears are real and which fade. Many learners leave surprised that waiting can be a plan rather than avoidance.",
      "A common mistake is locking in one timing as a rule for every job, which ignores how much managers, tasks, and support needs vary. Another is deciding under application deadline pressure instead of rehearsing calmly ahead of time. Revisit the map per opportunity, keep notes on what swayed you, and keep an exit line ready. Counselor note: ask what would make the hardest timing feel safe, then turn that answer into a support or accommodation step.",
    ],
    steps: [
      "Open the disclosure timing map and walk all five nodes without choosing yet.",
      "For each timing, read the tradeoffs and copy the script starter that fits you.",
      "Mark your safest node and your hardest node in your own words.",
      "Write what support would make the hard node feel doable.",
      "Rehearse your current choice out loud, then note when you would revisit it.",
    ],
    faq: [
      {
        q: "Is there a single best time to share?",
        a: "There is no universal best moment, because the right timing depends on the job, the manager, and what support you need to perform well. Some workers share after an offer when requests feel concrete, while others wait until a need arises. The map compares all five timings honestly so you can match the moment to your situation. Review your pick with a counselor before acting.",
      },
      {
        q: "What if I choose not to share right now?",
        a: "That is a complete and respected outcome here, with its own script starter and a follow up line for later. Many learners pick this node while they build skills or wait to see the actual job demands. The map keeps your other options open, so a later change is a planned step rather than a crisis. Revisit the timing whenever your needs or the job change.",
      },
    ],
  },
];
