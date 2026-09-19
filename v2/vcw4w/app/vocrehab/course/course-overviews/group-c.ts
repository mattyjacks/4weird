import type { CourseOverview } from "./overview";

// Group C overviews. Fill each entry: 3 overview paragraphs (60-100 words
// each) + 4-6 steps + 2 faq pairs. Unique prose per lesson.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_C_OVERVIEWS: CourseOverview[] = [
  {
    slug: "decision-one-pager",
    overview: [
      "Ending a course with a clear decision matters most for people who hold many pieces and no single picture yet. If you have tried sliders, walked timing maps, rehearsed scripts, and talked with a counselor, this lesson gathers those threads into one short page in your own words. It helps anyone who freezes when asked what they decided, because the page answers that question before the meeting starts. Bring it printed or on your phone, and the conversation starts from your words instead of a blank form.",
      "After finishing, scattered notes become a dated statement you can point to: your goal, your supports, your disclosure timing, and your money sketch on one page. The linked export practice builds this skill by turning saved choices into clean JSON you can review before sharing, so nothing vague or half remembered slips into the meeting. You rehearse reading the page aloud, trimming any line that sounds unclear. What changes is confidence: you walk in able to say what you decided, what help you need, and what you want to revisit later.",
      "A common mistake is writing wishes instead of decisions, such as listing five goals with no timing or supports attached. Another is copying slider numbers without noting they are estimates to review with a benefits counselor. Counselors note that the strongest pages name one goal, two or three supports, one timing choice, and one revisit trigger. Keep sentences short, keep numbers labeled as sketches, and leave one blank line at the bottom for what you discuss together. A page you can explain beats a perfect page you cannot.",
    ],
    steps: [
      "Open the export page and review each saved section: goal, supports, disclosure timing, and money sketch.",
      "Write your decision in one sentence using your own words, then add the date beside it.",
      "List two or three supports you need, each with who provides it and when.",
      "Note your disclosure timing choice plus the one sentence script starter you prefer.",
      "Label money numbers as estimates, print or save the page, and bring it to your counselor.",
    ],
    faq: [
      {
        q: "Do I need a final career decision before making my one pager?",
        a: "No. The page records your decision for now, not forever. Write the goal you lean toward today, the supports that fit this month, and one trigger that would make you revisit the choice, such as new hiring information or a change in hours you can sustain. Counselors expect these pages to evolve, and dating each version shows thoughtful progress rather than indecision.",
      },
      {
        q: "What should I bring to the counselor meeting besides the page?",
        a: "Bring the questions your page could not answer, plus any new facts about local hiring, hours you can sustain, or supports you still need to confirm. If slider numbers shaped your thinking, bring those sketches labeled as estimates so the counselor sees your reasoning. Most of all, bring what must stay private: mark any line you do not want filed, and say so at the start.",
      },
    ],
  },
  {
    slug: "what-ipes-are",
    overview: [
      "An Individualized Plan for Employment can feel mysterious until you see one built from your own words. This lesson helps first time plan holders, returning clients starting fresh, and anyone who has never seen their strengths written as goals. It shows how observed strengths, stated interests, and support needs become three suggested employment goals in plain language. You stay the author throughout: the draft prefills from your play signals, you edit every line, and your counselor approves the final version.",
      "After finishing, the IPE stops being paperwork done to you and becomes a plan you can explain. The linked builder practice develops this by letting you review prefilled strengths, rewrite goal lines in your own voice, and check that every support need appears in writing. You practice reading each goal aloud and asking whether the evidence supports it. What changes is ownership: instead of signing a form you barely recognize, you bring edited goals you understand and can defend in the meeting.",
      "A common mistake is letting the draft keep strengths you do not recognize, which makes the goals feel borrowed. Another is leaving support needs as hallway conversation instead of written plan lines, so they vanish when staff changes. Counselors note that strong plans lead with two or three evidenced strengths, name each support plainly, and keep goals narrow enough to measure. If a line embarrasses you to read aloud, rewrite it. The plan should sound like you on a clear day.",
    ],
    steps: [
      "Open the IPE builder and read the prefilled strengths beside your play history.",
      "Delete or rewrite any strength that does not sound like you.",
      "Draft three employment goals in plain words, each tied to one strength.",
      "Write every support need as a plan line, never as an assumption.",
      "Read the full draft aloud, then bring it to your counselor for approval.",
    ],
    faq: [
      {
        q: "Will my counselor accept goals I wrote myself?",
        a: "Yes, that is the point. The builder produces a draft for review, and your counselor approves, edits, or discusses each line with you. Goals written in your own words are easier to remember and follow through on. If a goal needs narrowing or evidence, your counselor will say so directly, and you revise together. Nothing becomes official until both of you agree on the wording.",
      },
      {
        q: "What if my game results show strengths I disagree with?",
        a: "Treat them as suggestions, not verdicts. Review which tasks produced each signal, keep what matches your experience, and delete or rewrite the rest before the meeting. Your counselor weighs your lived history alongside play signals, and your edits are part of the evidence. A plan built only on scores you reject will not motivate you, so speak up early.",
      },
    ],
  },
  {
    slug: "how-sessions-help",
    overview: [
      "Many people leave counselor sessions unsure what was actually recorded about them. This lesson helps anyone who wants clearer records: first time clients, people returning after a break, and those who have felt misheard before. It shows how one session's notes, with your consent, become four reviewable drafts: a case note, a progress measure, a coaching rationale, and outreach when relevant. Your counselor approves, edits, or discards each box, and nothing files itself without a human decision.",
      "After finishing, you know how to read session outputs and what each box is for. The linked sessions practice builds this skill by walking through sample drafts: checking the case note for accuracy, testing whether the progress measure is observable, and asking why the coaching rationale fits. You rehearse flagging lines that feel wrong before they are filed. What changes is partnership: sessions feel like work done with you, because you can review, question, and correct the record while it is still a draft.",
      "A common mistake is nodding along when a draft misstates your words, hoping to fix it later after filing. Another is treating the coaching rationale as criticism rather than the counselor's stated reason for a suggestion. Counselors note that the best sessions name one fact to get right about you and one boundary about what stays private. State both early, review every box before approval, and ask for edits in plain words. Corrections made as drafts cost nothing.",
    ],
    steps: [
      "Open the sessions view and read each of the four draft boxes slowly.",
      "Check the case note against your memory and flag any wrong detail.",
      "Test the progress measure: could a stranger observe it happening?",
      "Read the coaching rationale and ask why this suggestion fits you.",
      "Mark anything that must stay private, then approve or request edits.",
    ],
    faq: [
      {
        q: "Can session drafts be filed without my permission?",
        a: "No. Drafts stay drafts until your counselor reviews them, and your consent shapes what gets recorded. If a line feels wrong or too personal, ask for an edit or deletion before approval. Nothing files itself automatically. When you are unsure, ask which box a detail would land in and who could read it later, then decide together.",
      },
      {
        q: "What makes a coaching rationale useful instead of generic?",
        a: "A useful rationale connects one suggestion to one fact about you, such as a strength your play showed or a barrier you named. Generic lines could fit anyone and help no one. When you review drafts, look for your specifics quoted back accurately. If the reason does not match your situation, say so and supply the fact that fits better.",
      },
    ],
  },
  {
    slug: "next-3-steps",
    overview: [
      "Big goals stall when the next move stays vague. This lesson helps anyone leaving a planning meeting with energy but no calendar entries: job seekers, returning clients, and students balancing training with life. It turns intentions into three concrete steps, each with a measurable progress line stating what you will do, in what context, with what supports, measured by what evidence. Small, dated, and reviewable beats ambitious and foggy every time you check back.",
      "After finishing, you hold three steps you could put on a calendar today. The linked measures practice builds this skill by testing each step against four questions: what exactly, where and when, with whose help, and what evidence proves it happened. You rewrite fluffy lines until a stranger could verify them. What changes is follow through: review meetings compare evidence against the plan instead of trading vague updates, and small wins stack into visible momentum.",
      "A common mistake is writing three projects instead of three steps, such as get a job rather than call two shops Tuesday morning. Another is skipping the evidence line, which leaves no way to know a step worked. Counselors note that strong steps fit one week, name one support, and define done in observable terms. Date each step, keep the context realistic, and celebrate evidence honestly. A tiny finished step teaches more than a grand unfinished plan.",
    ],
    steps: [
      "Write three steps, each starting with a verb and a number you can count.",
      "Add context to each: where, when, and for how long.",
      "Name one support per step: who helps and how to reach them.",
      "Define evidence for each step in observable terms a stranger could check.",
      "Date all three steps, calendar the first one, and bring the list to review.",
    ],
    faq: [
      {
        q: "How small should each step be?",
        a: "Small enough to finish inside one week without heroics. Call two employers, attend one training block, or ask one person for one reference. If a step needs more than a week or three helpers, split it. Reviewers trust short finished steps more than long open ones, and each completion gives your counselor real evidence to record.",
      },
      {
        q: "What if life interrupts my three steps?",
        a: "Note what happened, keep any partial evidence, and bring both to your review. Interruption is information: it may reveal a barrier to plan around or a support to add. Your counselor can adjust dates, swap a step, or shrink the next round. Progress lines survive contact with real life when you record honestly instead of hiding the gap.",
      },
    ],
  },
];
