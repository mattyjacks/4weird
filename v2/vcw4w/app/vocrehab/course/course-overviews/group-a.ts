import type { CourseOverview } from "./overview";

// Group A overviews. Fill each entry: 3 overview paragraphs (60-100 words
// each) + 4-6 steps + 2 faq pairs. Unique prose per lesson.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_A_OVERVIEWS: CourseOverview[] = [
  {
    slug: "welcome",
    overview: [
      "This opening lesson is for anyone starting vocational rehabilitation who wants a clear, low pressure tour before committing to anything. It helps first time participants, returning clients, family members, and support staff understand how the course flows. Nothing is graded and nothing is timed, so you can explore each chapter, preview the games, and see how progress, XP, and badges work at your own pace.",
      "After finishing, you will know exactly what to do first, second, and third, and how your choices stay in your control. You will understand guest play with local progress, what signing in saves, and how reflections and counselor conversations fit together. That clarity replaces nervous guessing with a simple plan, so the next lesson feels like a next step instead of a leap. Keep your first goal small and visible while the routine becomes familiar.",
      "A common mistake is trying to finish everything in one sitting or skipping the reflection prompts because they look optional. Slow down, answer in your own words, and retry any activity that felt rushed. Short sessions with notes beat one long blur. Counselor note: use this lesson to agree on pacing, communication preferences, and which supports should be visible from the start, then record those choices together.",
    ],
    steps: [
      "Open the course outline and read each chapter title so the full path feels familiar.",
      "Play one short activity as a guest to confirm sound, text size, and pacing work for you.",
      "Write one sentence about the kind of work that sounds good right now.",
      "List one barrier that often gets in the way and one support that has helped before.",
      "Decide with your counselor how often to check in and how to share progress.",
    ],
    faq: [
      {
        q: "Do I need to prepare anything before starting the course?",
        a: "No preparation is needed. Bring your own words about work you like and any schedule limits you already know. Everything else is learned inside the lessons through short scenarios, guided practice, and reflection prompts you can redo as often as you want.",
      },
      {
        q: "What if I need more time or want to redo a lesson?",
        a: "Extra time is expected and retries are unlimited. Progress stays saved on your device as a guest and syncs when you sign in. Replaying a lesson adds practice depth, refreshes your confidence, and often improves the strengths shown in your profile.",
      },
    ],
  },
  {
    slug: "know-strengths",
    overview: [
      "This lesson turns everyday work behavior into visible strengths you can name on applications and in interviews. It helps people who struggle to describe what they are good at, especially when past jobs, schooling, or gaps make confidence low. Instead of labels, it focuses on observable actions like steady pace, careful checking, recovery after errors, and asking for help at useful moments. Those behaviors transfer directly to paid work and training settings.",
      "The linked File Sort game builds the skill by putting you inside a realistic office task with twelve files, three folders, and one manager message midway. Sorting under mild interruption shows speed, accuracy, and refocus in action. Your results translate directly into profile lines such as kept a steady pace or bounced back after snags, which later prefill resumes and counselor drafts.",
      "A common mistake is chasing perfect speed and treating one misfile as failure, when recovery counts just as much. Another is copying generic strengths instead of using your own game words, which makes interviews sound vague. Keep the exact phrases the game gives you and add real examples. Counselor note: compare the game summary with real life examples from the client, then pick two strengths to carry forward into goals and interview stories.",
    ],
    steps: [
      "Play File Sort once at a comfortable pace and notice which part felt smoothest.",
      "Replay one round, practicing calm recovery when a file lands in the wrong folder.",
      "Copy two result lines into your own words for your strengths list.",
      "Match each strength to a real task from past work, volunteering, or home life.",
      "Bring your top two strengths to your next counselor or goal conversation.",
    ],
    faq: [
      {
        q: "What if my File Sort score feels low?",
        a: "Scores are practice signals, not grades. Low speed with strong recovery still shows reliability, and careful checking still shows accuracy. Replay at your own pace, keep the lines that feel true, and add one real life example that proves each strength.",
      },
      {
        q: "How do I use these strengths outside the game?",
        a: "Use the exact short phrases on your goals page, your interview prep answers, and your resume draft. Two specific strengths with real examples beat a long generic list, and counselors can quote them directly when writing support notes and plans.",
      },
    ],
  },
  {
    slug: "barriers-supports",
    overview: [
      "This lesson helps people whose plans stall on logistics like transportation, scheduling, stamina, tools, or benefits worry. It is built for clients who hear try harder when the real problem is a missing support. By naming each barrier in plain language, you shift the conversation from blame to problem solving and give your counselor concrete details to act on quickly. Small, dated trials then show which supports truly change the week.",
      "The linked Barrier Run game builds the skill through four work stories covering commutes, shift swaps, disclosure choices, and tool failures. Each choice maps to a barrier plus two or three practical strategies with exit ramps. Walking the stories first makes the later checklist faster and calmer, because you have already rehearsed asking for schedule changes, backup rides, or clearer instructions. That rehearsal lowers stress when the real conversation happens.",
      "A common mistake is selecting every barrier at once and ending with a vague list, or picking strategies you would never actually use in a real week. Choose the two barriers that bite most often, then commit to one strategy each with a clear start date. Counselor note: review the shortlist together, confirm handoffs for medical, legal, or benefits questions, and date the first trial.",
    ],
    steps: [
      "Play Barrier Run and note which story felt most familiar to your life.",
      "Pick your top two barriers and write one recent example for each.",
      "Choose one realistic strategy per barrier that you would actually try.",
      "Set a start date and a backup option if the first strategy fails.",
      "Review the shortlist with your counselor and confirm any referrals needed.",
    ],
    faq: [
      {
        q: "Should I list every barrier that applies to me?",
        a: "Start with the two most frequent barriers so your energy goes toward workable trials. You can add more later once the first strategies show results. A short, honest shortlist helps counselors arrange supports faster than a long unchecked list with no priorities.",
      },
      {
        q: "What if a strategy does not work in real life?",
        a: "That outcome is useful data, not failure. Note what broke down, whether timing, cost, coverage, or communication, then switch to the backup strategy or request a different support. Bring the dated notes to your counselor so the plan reflects real life.",
      },
    ],
  },
  {
    slug: "pick-direction",
    overview: [
      "This lesson helps undecided explorers narrow a wide field into one direction worth testing first. It fits people choosing between office, retail, warehouse, remote, food service, healthcare support, or other local options. Rather than predicting hiring, it combines your observed game strengths with your own notes about nearby openings, shifts, pay, commute time, and certificate requirements. Your counselor reviews the draft with you before anything becomes official.",
      "After finishing, you will leave with one written goal in your own words, one closest category, and a short list of alignment reasons tied to evidence. That package changes vague interest into a testable plan you can discuss, schedule around, and revise. It also feeds later lessons, because interview questions, resumes, and counselor drafts all build on the goal you pick here. A dated trial keeps momentum while details are still fresh. Bring the results to your next session for quick feedback.",
      "A common mistake is picking what sounds impressive instead of what fits your stamina, schedule, and strengths, or skipping the local market notes entirely. A goal without commute, hours, and certificate facts is only a wish. Counselor note: check the goal against transportation, hours, and required certificates, then define what a two week trial would look like before adding more goals.",
    ],
    steps: [
      "Write your leading job goal in one concrete sentence with place and shift.",
      "Choose the closest category and list two game strengths that support it.",
      "Add two local facts about hiring, hours, or requirements near you.",
      "Read the alignment signals and mark whether it looks like fit or stretch.",
      "Set one small trial step, such as a visit, call, or practice task, with a date.",
    ],
    faq: [
      {
        q: "What if I like two very different goals?",
        a: "Pick one to trial first while parking the second in your notes with its own reasons. Run a small two week test of hours, tasks, and commute, then compare evidence. Counselors prefer one active trial plus one backup over two half started plans.",
      },
      {
        q: "Does this lesson predict whether I will get hired?",
        a: "No, it shows alignment between demonstrated strengths and a goal plus local facts you supply. Hiring depends on employers and timing, which no lesson can predict. The value is a clear, honest starting point you can revise with your counselor as new facts arrive.",
      },
    ],
  },
  {
    slug: "interview-basics",
    overview: [
      "This lesson helps job seekers who dread open ended questions, freeze on tell me about yourself, or struggle to sound natural under pressure. It fits first time applicants, returners after a gap, and anyone who wants structured rehearsal instead of generic tips. Practice happens with an AI hiring manager by text or voice, with feedback that quotes your own words. Short rounds fit easily between other lessons and errands.",
      "The linked interview prep builder creates five tailored questions from your chosen job goal, then each answer earns one praise, one tweak, and one invitation to retry. That loop builds delivery skill faster than reading advice, because you hear your own phrasing improve across attempts and retries. Strong lines can later move into your resume and your background pivot for consistent storytelling.",
      "A common mistake is memorizing long perfect answers that sound stiff, or rehearsing only once and stopping before the delivery feels natural. Keep answers short, true, and spoken in your own voice with one example each. Counselor note: listen to one retry together, pick the tweak with the biggest payoff, and set a six turn practice target before moving to disclosure or resume work. End the lesson by writing your two best lines somewhere easy to find.",
    ],
    steps: [
      "Enter one specific job goal so the five practice questions match real duties.",
      "Answer the first question out loud in thirty to sixty seconds using a true story.",
      "Read the feedback, keep the praise line, and apply the one tweak on retry.",
      "Rehearse each remaining question once, then retry your weakest answer.",
      "Save your two strongest lines for your resume and counselor review.",
    ],
    faq: [
      {
        q: "How long should each practice answer be?",
        a: "Aim for thirty to sixty seconds with one clear example and one closing strength. Shorter answers stay memorable and leave room for follow up questions. If you run long, cut background detail and keep the action you took plus the result.",
      },
      {
        q: "What if speaking out loud feels uncomfortable?",
        a: "Start by typing answers, then read them aloud once before recording or rehearsing live. Many people improve quickly after two retries with the same question. Ask your counselor to rehearse one question together so the first live attempt feels supported.",
      },
    ],
  },
];
